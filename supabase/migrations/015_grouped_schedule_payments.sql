-- One LINE request can settle several schedules, with one receipt and a transaction per schedule.
ALTER TABLE public.line_payment_requests ALTER COLUMN amount TYPE numeric(12,2);
ALTER TABLE public.line_payment_slip_archives ALTER COLUMN amount TYPE numeric(12,2);

CREATE TABLE IF NOT EXISTS public.line_payment_carts (
  line_user_id text PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  revision uuid NOT NULL,
  schedule_ids uuid[] NOT NULL DEFAULT '{}'
);
ALTER TABLE public.line_payment_carts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.line_payment_carts TO service_role;
ALTER TABLE public.line_payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_payment_slip_archives ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.student_schedule_balances(p_student_id uuid)
RETURNS TABLE (schedule_id uuid, remaining numeric)
LANGUAGE sql STABLE SET search_path = public, pg_temp
AS $$
  SELECT s.id, greatest(0, s.amount_per_item
    + coalesce((SELECT sum(i.amount) FROM additional_cost_items i
                WHERE i.schedule_id = s.id AND i.student_id = p_student_id), 0)
    - coalesce((SELECT sum(t.amount) FROM transactions t
                WHERE t.schedule_id = s.id AND t.student_id = p_student_id
                  AND t.kind = 'income' AND t.source = 'schedule'), 0))
  FROM schedules s
  WHERE p_student_id = ANY(s.student_ids)
$$;

CREATE OR REPLACE FUNCTION public.checkout_line_payment_cart(
  p_line_user_id text, p_student_id uuid, p_revision uuid, p_allocations jsonb
) RETURNS jsonb
LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
DECLARE
  v_cart line_payment_carts%ROWTYPE;
  v_request line_payment_requests%ROWTYPE;
  v_schedule_ids uuid[];
  v_amount numeric;
BEGIN
  SELECT * INTO v_cart FROM line_payment_carts
  WHERE line_user_id = p_line_user_id FOR UPDATE;
  IF NOT FOUND OR v_cart.student_id <> p_student_id OR v_cart.revision <> p_revision THEN
    RETURN NULL;
  END IF;

  SELECT array_agg(a.schedule_id ORDER BY a.schedule_id), sum(a.amount)
  INTO v_schedule_ids, v_amount
  FROM jsonb_to_recordset(p_allocations) AS a(schedule_id uuid, amount numeric);

  IF v_amount IS NULL OR array_length(v_schedule_ids, 1) < 2 OR v_schedule_ids <> ARRAY(
    SELECT id FROM unnest(v_cart.schedule_ids) AS selected(id) ORDER BY id
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO line_payment_requests (id, line_user_id, student_id, schedule_id, amount, allocations)
  VALUES (p_revision, p_line_user_id, p_student_id, v_schedule_ids[1], v_amount, p_allocations)
  RETURNING * INTO v_request;

  DELETE FROM line_payment_carts WHERE line_user_id = p_line_user_id;
  RETURN to_jsonb(v_request);
END;
$$;

CREATE OR REPLACE FUNCTION public.select_line_payment_method(
  p_request_id uuid, p_line_user_id text, p_method text
) RETURNS jsonb
LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
DECLARE
  v_request line_payment_requests%ROWTYPE;
  v_status text := CASE WHEN p_method = 'cash' THEN 'cash_pending' ELSE 'awaiting_slip' END;
BEGIN
  IF p_method IS NULL OR p_method NOT IN ('cash', 'kplus', 'truemoney') THEN RETURN NULL; END IF;

  LOCK TABLE additional_cost_runs IN SHARE MODE;
  LOCK TABLE schedules IN SHARE MODE;
  LOCK TABLE transactions IN SHARE MODE;
  LOCK TABLE line_payment_requests IN SHARE ROW EXCLUSIVE MODE;

  SELECT r.* INTO v_request FROM line_payment_requests r
  JOIN students s ON s.id = r.student_id AND s.line_user_id = p_line_user_id
  WHERE r.id = p_request_id AND r.line_user_id = p_line_user_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_request.status = v_status AND v_request.method = p_method THEN RETURN to_jsonb(v_request); END IF;
  IF v_request.status <> 'selecting' THEN RETURN NULL; END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(coalesce(v_request.allocations,
      jsonb_build_array(jsonb_build_object('schedule_id', v_request.schedule_id, 'amount', v_request.amount))
    )) AS a(schedule_id uuid, amount numeric)
    LEFT JOIN student_schedule_balances(v_request.student_id) b USING (schedule_id)
    WHERE b.remaining IS NULL OR a.amount > b.remaining
      OR (v_request.allocations IS NOT NULL AND a.amount <> b.remaining)
  ) THEN
    RAISE EXCEPTION 'ยอดค้างเปลี่ยนแล้ว กรุณาเปิดเมนูชำระเงินและเลือกใหม่';
  END IF;

  -- An image sent to the bot must identify a single request. Never supersede submitted proofs.
  IF EXISTS (
    SELECT 1 FROM line_payment_requests r
    WHERE r.id <> v_request.id AND r.line_user_id = p_line_user_id
      AND (
        (p_method <> 'cash' AND r.status = 'awaiting_slip')
        OR (r.status IN ('awaiting_slip', 'cash_pending', 'pending_review', 'pending_slip_review')
          AND EXISTS (
            SELECT 1
            FROM jsonb_to_recordset(coalesce(r.allocations,
              jsonb_build_array(jsonb_build_object('schedule_id', r.schedule_id))
            )) AS active(schedule_id uuid)
            JOIN jsonb_to_recordset(coalesce(v_request.allocations,
              jsonb_build_array(jsonb_build_object('schedule_id', v_request.schedule_id))
            )) AS selected(schedule_id uuid) USING (schedule_id)
          ))
      )
  ) THEN
    RAISE EXCEPTION 'มีรายการชำระเงินอยู่ระหว่างดำเนินการ กรุณาทำรายการเดิมให้เสร็จก่อน';
  END IF;

  UPDATE line_payment_requests SET method = p_method, status = v_status
  WHERE id = v_request.id RETURNING * INTO v_request;
  RETURN to_jsonb(v_request);
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_schedule_line_payment(p_request_id uuid, p_reviewer text)
RETURNS jsonb
LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
DECLARE
  v_request line_payment_requests%ROWTYPE;
  v_allocations jsonb;
  v_transactions jsonb;
  v_first_transaction_id uuid;
  v_now timestamptz := now();
BEGIN
  LOCK TABLE additional_cost_runs IN SHARE MODE;
  LOCK TABLE schedules IN SHARE MODE;
  LOCK TABLE transactions IN SHARE ROW EXCLUSIVE MODE;
  SELECT * INTO v_request FROM line_payment_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบรายการชำระเงิน'; END IF;
  IF v_request.status = 'approved' AND v_request.transaction_id IS NOT NULL THEN
    -- Complete legacy approvals that recorded a transaction before archiving the slip.
    SELECT jsonb_build_array(to_jsonb(t)) INTO v_transactions
    FROM transactions t WHERE t.id = v_request.transaction_id;
    v_now := coalesce(v_request.paid_at, v_request.reviewed_at, v_now);
  ELSE
    IF v_request.status NOT IN ('pending_slip_review', 'pending_review', 'cash_pending') THEN
      RAISE EXCEPTION 'รายการนี้ยังไม่พร้อมอนุมัติ';
    END IF;

    v_allocations := coalesce(v_request.allocations,
      jsonb_build_array(jsonb_build_object('schedule_id', v_request.schedule_id, 'amount', v_request.amount)));
    IF EXISTS (
      SELECT 1 FROM jsonb_to_recordset(v_allocations) AS a(schedule_id uuid, amount numeric)
      LEFT JOIN student_schedule_balances(v_request.student_id) b USING (schedule_id)
      WHERE b.remaining IS NULL OR a.amount > b.remaining
    ) THEN
      RAISE EXCEPTION 'ยอดค้างเปลี่ยนแล้ว กรุณาตรวจสอบยอดและหลักฐานก่อนอนุมัติ';
    END IF;

    WITH inserted AS (
      INSERT INTO transactions (name, kind, amount, method, category, description, source,
        schedule_id, student_id, pocket_id)
      SELECT s.name, 'income', a.amount, coalesce(v_request.method, 'cash'), 'การชำระเงินตามกำหนดการ',
        CASE WHEN v_request.allocations IS NOT NULL THEN
               format('ชำระรวมผ่าน LINE %s รายการ ยอดรวม %s บาท', jsonb_array_length(v_allocations), v_request.amount)
             WHEN v_request.slip_url IS NOT NULL THEN 'LINE payment proof: ' || v_request.slip_url
             ELSE 'LINE cash payment approved' END,
        'schedule', s.id, v_request.student_id, 'pocket-' || coalesce(v_request.method, 'cash')
      FROM jsonb_to_recordset(v_allocations) AS a(schedule_id uuid, amount numeric)
      JOIN schedules s ON s.id = a.schedule_id
      RETURNING *
    )
    SELECT jsonb_agg(to_jsonb(i) ORDER BY (i.schedule_id = v_request.schedule_id) DESC, i.schedule_id)
    INTO v_transactions FROM inserted i;
  END IF;

  v_first_transaction_id := (v_transactions -> 0 ->> 'id')::uuid;
  IF coalesce(v_request.slip_url, v_request.slip_pathname, v_request.slip_qr_payload,
              v_request.slip_image_hash, v_request.slip_transaction_id) IS NOT NULL THEN
    INSERT INTO line_payment_slip_archives (line_user_id, student_id, schedule_id, transaction_id,
      method, amount, slip_url, slip_pathname, slip_qr_payload, slip_image_hash,
      slip_transaction_id, slip_auto_check_result, paid_at)
    VALUES (v_request.line_user_id, v_request.student_id, v_request.schedule_id, v_first_transaction_id,
      v_request.method, v_request.amount, v_request.slip_url, v_request.slip_pathname,
      v_request.slip_qr_payload, v_request.slip_image_hash, v_request.slip_transaction_id,
      v_request.slip_auto_check_result, v_now)
    ON CONFLICT (transaction_id) DO NOTHING;
  END IF;

  DELETE FROM line_payment_requests WHERE id = v_request.id;
  RETURN jsonb_build_object('transactions', v_transactions, 'request', to_jsonb(v_request) || jsonb_build_object(
    'transaction_id', v_first_transaction_id, 'status', 'approved', 'slip_status', 'approved',
    'reviewed_by', p_reviewer, 'reviewed_at', v_now, 'paid_at', v_now
  ));
END;
$$;

REVOKE ALL ON FUNCTION public.student_schedule_balances(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.checkout_line_payment_cart(text, uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.select_line_payment_method(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_schedule_line_payment(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_schedule_balances(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.checkout_line_payment_cart(text, uuid, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.select_line_payment_method(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_schedule_line_payment(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.record_grouped_schedule_payment(
  p_request_key uuid, p_student_id uuid, p_method text, p_pocket_id text, p_allocations jsonb
) RETURNS jsonb
LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
DECLARE
  v_transactions jsonb;
  v_existing_count integer;
  v_match_count integer;
  v_count integer;
BEGIN
  LOCK TABLE additional_cost_runs IN SHARE MODE;
  LOCK TABLE schedules IN SHARE MODE;
  LOCK TABLE transactions IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE line_payment_requests IN SHARE MODE;

  v_count := jsonb_array_length(p_allocations);
  SELECT count(*), count(*) FILTER (
    WHERE t.student_id = p_student_id AND t.schedule_id = a.schedule_id AND t.amount = a.amount
      AND t.method = p_method AND t.pocket_id IS NOT DISTINCT FROM p_pocket_id
  ), jsonb_agg(to_jsonb(t) ORDER BY t.schedule_id)
  INTO v_existing_count, v_match_count, v_transactions
  FROM jsonb_to_recordset(p_allocations) AS a(schedule_id uuid, amount numeric)
  JOIN transactions t ON t.id = md5(p_request_key::text || ':' || a.schedule_id::text)::uuid;
  IF v_existing_count > 0 THEN
    IF v_match_count = v_count THEN RETURN v_transactions; END IF;
    RAISE EXCEPTION 'รายการนี้ถูกบันทึกหรือแก้ไขแล้ว กรุณาโหลดข้อมูลล่าสุด' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_allocations) AS a(schedule_id uuid, amount numeric)
    LEFT JOIN student_schedule_balances(p_student_id) b USING (schedule_id)
    WHERE b.remaining IS NULL OR a.amount <> b.remaining
  ) THEN
    RAISE EXCEPTION 'ยอดค้างเปลี่ยนแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนชำระ' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM line_payment_requests r
    CROSS JOIN LATERAL jsonb_to_recordset(coalesce(r.allocations,
      jsonb_build_array(jsonb_build_object('schedule_id', r.schedule_id))
    )) AS active(schedule_id uuid)
    JOIN jsonb_to_recordset(p_allocations) AS a(schedule_id uuid) ON a.schedule_id = active.schedule_id
    WHERE r.student_id = p_student_id
      AND r.status IN ('awaiting_slip', 'cash_pending', 'pending_review', 'pending_slip_review')
  ) THEN
    RAISE EXCEPTION 'บางรายการอยู่ระหว่างชำระผ่าน LINE กรุณาตรวจสอบรายการเดิมก่อน' USING ERRCODE = '22023';
  END IF;

  WITH inserted AS (
    INSERT INTO transactions (id, name, kind, amount, method, category, description, source,
      schedule_id, student_id, pocket_id)
    SELECT md5(p_request_key::text || ':' || s.id::text)::uuid, s.name, 'income', a.amount, p_method,
      'การชำระเงินตามกำหนดการ', 'ชำระรวม', 'schedule', s.id, p_student_id, p_pocket_id
    FROM jsonb_to_recordset(p_allocations) AS a(schedule_id uuid, amount numeric)
    JOIN schedules s ON s.id = a.schedule_id
    RETURNING *
  )
  SELECT jsonb_agg(to_jsonb(t) ORDER BY t.schedule_id) INTO v_transactions FROM inserted t;
  RETURN v_transactions;
END;
$$;

REVOKE ALL ON FUNCTION public.record_grouped_schedule_payment(uuid, uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_grouped_schedule_payment(uuid, uuid, text, text, jsonb) TO service_role;
