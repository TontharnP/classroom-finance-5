-- Apply, revise, and remove late-charge rounds in a single database transaction.
-- Older LINE requests use schedule_id and amount when allocations is null.
ALTER TABLE public.line_payment_requests ADD COLUMN IF NOT EXISTS allocations jsonb;
CREATE OR REPLACE FUNCTION public.mutate_additional_cost_round(
  p_action text, p_id uuid, p_percentage numeric DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
DECLARE
  v_run additional_cost_runs%ROWTYPE;
  v_items jsonb;
BEGIN
  IF p_action NOT IN ('create', 'update', 'delete') OR p_id IS NULL THEN
    RAISE EXCEPTION 'Invalid additional cost operation' USING ERRCODE = '22023';
  END IF;
  IF p_action <> 'delete' AND (
    p_percentage IS NULL OR p_percentage <= 0 OR p_percentage > 100 OR round(p_percentage, 4) <> p_percentage
  ) THEN
    RAISE EXCEPTION 'กรุณาระบุเปอร์เซ็นต์ที่ถูกต้อง' USING ERRCODE = '22023';
  END IF;

  -- Serialize round changes, and read stable balances while changing them.
  LOCK TABLE additional_cost_runs IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE schedules IN SHARE MODE;
  LOCK TABLE transactions IN SHARE MODE;

  IF p_action = 'create' THEN
    SELECT * INTO v_run FROM additional_cost_runs WHERE request_key = p_id;
    IF NOT FOUND THEN
      WITH paid AS (
        SELECT schedule_id, student_id, sum(amount) AS amount
        FROM transactions WHERE source = 'schedule' AND kind = 'income'
        GROUP BY schedule_id, student_id
      ), charges AS (
        SELECT schedule_id, student_id, sum(amount) AS amount
        FROM additional_cost_items GROUP BY schedule_id, student_id
      ), balances AS (
        SELECT DISTINCT s.id AS schedule_id, st.id AS student_id,
          s.amount_per_item + coalesce(c.amount, 0) - coalesce(p.amount, 0) AS base
        FROM schedules s
        CROSS JOIN LATERAL unnest(s.student_ids) AS member(student_id)
        JOIN students st ON st.id = member.student_id
        LEFT JOIN paid p ON p.schedule_id = s.id AND p.student_id = st.id
        LEFT JOIN charges c ON c.schedule_id = s.id AND c.student_id = st.id
        WHERE s.end_date < (now() AT TIME ZONE 'Asia/Bangkok')::date
      ), candidates AS (
        SELECT *, round(base * p_percentage / 100, 2) AS amount
        FROM balances WHERE base > 0
      )
      SELECT jsonb_agg(to_jsonb(c)) INTO v_items FROM candidates c WHERE amount > 0;

      IF v_items IS NULL THEN
        RAISE EXCEPTION 'ไม่พบรายการค้างชำระที่เพิ่มค่าใช้จ่ายได้' USING ERRCODE = '22023';
      END IF;

      INSERT INTO additional_cost_runs (
        request_key, percentage, affected_student_count, overdue_item_count, base_total, additional_total
      )
      SELECT p_id, p_percentage, count(DISTINCT c.student_id), count(*), sum(c.base), sum(c.amount)
      FROM jsonb_to_recordset(v_items) AS c(student_id uuid, base numeric, amount numeric)
      RETURNING * INTO v_run;

      INSERT INTO additional_cost_items (run_id, schedule_id, student_id, base_outstanding, percentage, amount)
      SELECT v_run.id, c.schedule_id, c.student_id, c.base, p_percentage, c.amount
      FROM jsonb_to_recordset(v_items) AS c(schedule_id uuid, student_id uuid, base numeric, amount numeric);
    END IF;
  ELSE
    LOCK TABLE line_payment_requests IN SHARE MODE;
    SELECT * INTO v_run FROM additional_cost_runs WHERE id = p_id;
    IF NOT FOUND THEN
      IF p_action = 'delete' THEN RETURN NULL; END IF;
      RAISE EXCEPTION 'ไม่พบรอบค่าใช้จ่ายนี้' USING ERRCODE = 'P0002';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM additional_cost_items i
      JOIN schedules s ON s.id = i.schedule_id
      CROSS JOIN LATERAL (
        SELECT CASE WHEN p_action = 'delete' THEN 0 ELSE round(i.base_outstanding * p_percentage / 100, 2) END AS amount
      ) revised
      WHERE i.run_id = p_id AND revised.amount < i.amount
        AND s.amount_per_item + revised.amount + coalesce((
          SELECT sum(other.amount) FROM additional_cost_items other
          WHERE other.schedule_id = i.schedule_id AND other.student_id = i.student_id AND other.run_id <> p_id
        ), 0) < coalesce((
          SELECT sum(t.amount) FROM transactions t
          WHERE t.schedule_id = i.schedule_id AND t.student_id = i.student_id
            AND t.source = 'schedule' AND t.kind = 'income'
        ), 0) + coalesce((
          SELECT sum(a.amount)
          FROM line_payment_requests r
          CROSS JOIN LATERAL jsonb_to_recordset(coalesce(r.allocations,
            jsonb_build_array(jsonb_build_object('schedule_id', r.schedule_id, 'amount', r.amount))
          )) AS a(schedule_id uuid, amount numeric)
          WHERE r.student_id = i.student_id AND a.schedule_id = i.schedule_id
            AND r.status IN ('awaiting_slip', 'cash_pending', 'pending_review', 'pending_slip_review')
        ), 0)
    ) THEN
      RAISE EXCEPTION 'ยอดใหม่ต่ำกว่ายอดที่ชำระแล้วหรืออยู่ระหว่างชำระ กรุณาตรวจสอบรายการชำระเงินก่อน' USING ERRCODE = '22023';
    END IF;

    IF p_action = 'delete' THEN
      DELETE FROM additional_cost_runs WHERE id = p_id;
      RETURN NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM additional_cost_items WHERE run_id = p_id) THEN
      RAISE EXCEPTION 'รอบนี้ไม่มีรายการแล้ว สามารถลบรอบได้' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (
      SELECT 1 FROM additional_cost_items
      WHERE run_id = p_id AND round(base_outstanding * p_percentage / 100, 2) = 0
    ) THEN
      RAISE EXCEPTION 'เปอร์เซ็นต์นี้ทำให้บางรายการปัดเป็น 0 บาท กรุณาเพิ่มเปอร์เซ็นต์หรือลบรอบ' USING ERRCODE = '22023';
    END IF;

    UPDATE additional_cost_items
    SET percentage = p_percentage, amount = round(base_outstanding * p_percentage / 100, 2)
    WHERE run_id = p_id;

    UPDATE additional_cost_runs
    SET percentage = p_percentage,
        affected_student_count = totals.students,
        overdue_item_count = totals.items,
        base_total = totals.base,
        additional_total = totals.amount
    FROM (
      SELECT count(DISTINCT student_id) AS students, count(*) AS items,
        sum(base_outstanding) AS base, sum(amount) AS amount
      FROM additional_cost_items WHERE run_id = p_id
    ) totals
    WHERE id = p_id RETURNING additional_cost_runs.* INTO v_run;
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb) INTO v_items
  FROM additional_cost_items i WHERE i.run_id = v_run.id;
  RETURN jsonb_build_object('run', to_jsonb(v_run), 'items', v_items);
END;
$$;

REVOKE ALL ON FUNCTION public.mutate_additional_cost_round(text, uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mutate_additional_cost_round(text, uuid, numeric) TO service_role;

COMMENT ON TABLE public.additional_cost_runs IS 'Manageable late-charge rounds with original per-item calculation bases';
