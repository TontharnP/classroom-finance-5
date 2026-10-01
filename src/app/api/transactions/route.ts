import { badRequest, ok, serverError } from "@/lib/api/response";
import { attachSlipDataToTransactions } from "@/lib/server/transactionSlips";
import { createRecord, emptyToNull, getSupabaseAdmin, type Row } from "@/lib/supabase/server";
import { mapTransaction } from "@/lib/supabase/mappers";
import type { TransactionInput } from "@/types/supabase";

function monthRange(month: string) {
  const startDate = `${month}-01`;
  const endDate = new Date(`${month}-01T00:00:00.000Z`);
  endDate.setUTCMonth(endDate.getUTCMonth() + 1);
  return [startDate, endDate.toISOString().split("T")[0]];
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind");
    const source = url.searchParams.get("source");
    const scheduleId = url.searchParams.get("scheduleId");
    const studentId = url.searchParams.get("studentId");
    const month = url.searchParams.get("month");
    const categorySummary = url.searchParams.get("summary") === "category";

    const columns: string = categorySummary
      ? "category,kind,amount"
      : "id,name,kind,amount,method,category,category_id,description,source,schedule_id,student_id,created_at,updated_at,pocket_id,source_pocket_id,destination_pocket_id";
    let query = getSupabaseAdmin().from("transactions").select(columns);
    if (kind) query = query.eq("kind", kind);
    if (source) query = query.eq("source", source);
    if (scheduleId) query = query.eq("schedule_id", scheduleId);
    if (studentId) query = query.eq("student_id", studentId);
    if (month) {
      const [startDate, endDate] = monthRange(month);
      query = query.gte("created_at", startDate).lt("created_at", endDate);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    let rows = (data ?? []) as unknown as Row[];

    if (categorySummary) {
      const totals = new Map<string, { category: string; kind: string; amount: number }>();
      for (const transaction of rows.filter((row) => row.category)) {
        const category = String(transaction.category);
        const transactionKind = String(transaction.kind);
        const key = `${category}:${transactionKind}`;
        const current = totals.get(key) ?? { category, kind: transactionKind, amount: 0 };
        current.amount += Number(transaction.amount ?? 0);
        totals.set(key, current);
      }

      return ok(
        Array.from(totals.values()).sort((a, b) => a.category.localeCompare(b.category))
      );
    }

    rows = await attachSlipDataToTransactions(rows);
    return ok(rows.map(mapTransaction));
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TransactionInput | TransactionInput[];
    const inputs = Array.isArray(body) ? body : [body];

    if (inputs.length === 0) return badRequest("At least one transaction is required");

    const rows = await Promise.all(
      inputs.map((transaction) =>
        createRecord<Row>("transactions", {
          name: transaction.name,
          kind: transaction.kind,
          amount: transaction.amount,
          method: emptyToNull(transaction.method),
          category: emptyToNull(transaction.category),
          category_id: emptyToNull(transaction.category_id),
          description: emptyToNull(transaction.description),
          source: transaction.source,
          schedule_id: emptyToNull(transaction.schedule_id),
          student_id: emptyToNull(transaction.student_id),
          pocket_id: emptyToNull(transaction.pocket_id),
          source_pocket_id: emptyToNull(transaction.source_pocket_id),
          destination_pocket_id: emptyToNull(transaction.destination_pocket_id),
        })
      )
    );

    const transactions = rows.map(mapTransaction);
    return ok(Array.isArray(body) ? transactions : transactions[0], 201);
  } catch (error) {
    return serverError(error);
  }
}
