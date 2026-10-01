import { ok, serverError } from "@/lib/api/response";
import { getSupabaseAdmin, type Row } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("transactions")
      .select("kind,amount")
      .in("kind", ["income", "expense"]);
    if (error) throw error;
    const rows = (data ?? []) as Row[];
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
