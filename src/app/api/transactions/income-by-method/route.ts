import { ok, serverError } from "@/lib/api/response";
import { getSupabaseAdmin, type Row } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("transactions")
      .select("method,amount")
      .eq("source", "schedule")
      .eq("kind", "income");
    if (error) throw error;
    const rows = (data ?? []) as Row[];
    const kplus = sumByMethod(rows, "kplus");
    const cash = sumByMethod(rows, "cash");
    const truemoney = sumByMethod(rows, "truemoney");
    return ok({ kplus, cash, truemoney, total: kplus + cash + truemoney });
  } catch (error) {
    return serverError(error);
  }
}

function sumByMethod(rows: Row[], method: string) {
  return rows
    .filter((transaction) => transaction.method === method)
    .reduce((total, transaction) => total + Number(transaction.amount ?? 0), 0);
}
