import { ok, serverError } from "@/lib/api/response";
import { listRecords, type Row } from "@/lib/supabase/server";

export async function GET() {
  try {
    const rows = await listRecords<Row>("transactions");
    const income = rows
      .filter((transaction) => transaction.kind === "income")
      .reduce((total, transaction) => total + Number(transaction.amount ?? 0), 0);
    const expense = rows
      .filter((transaction) => transaction.kind === "expense")
      .reduce((total, transaction) => total + Number(transaction.amount ?? 0), 0);
    return ok({ income, expense, balance: income - expense });
  } catch (error) {
    return serverError(error);
  }
}
