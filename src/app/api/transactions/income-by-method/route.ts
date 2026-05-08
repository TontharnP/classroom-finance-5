import { ok, serverError } from "@/lib/api/response";
import { listRecords, type Row } from "@/lib/supabase/server";

export async function GET() {
  try {
    const rows = (await listRecords<Row>("transactions")).filter(
      (transaction) => transaction.source === "schedule" && transaction.kind === "income"
    );
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
