import "server-only";

import { getSupabaseAdmin, isMissingTableError, type Row } from "@/lib/supabase/server";

type SlipRow = Pick<Row, "transaction_id" | "slip_url" | "slip_pathname">;

export async function attachSlipDataToTransactions(rows: Row[]): Promise<Row[]> {
  const transactionIds = rows.map((row) => String(row.id || "")).filter(Boolean);
  if (transactionIds.length === 0) return rows;

  const [archiveRows, requestRows] = await Promise.all([
    listSlipRowsByTransactionIds("line_payment_slip_archives", transactionIds),
    listSlipRowsByTransactionIds("line_payment_requests", transactionIds),
  ]);
  const slipByTransactionId = buildSlipLookup([...archiveRows, ...requestRows]);

  return rows.map((row) => {
    const slip = slipByTransactionId.get(String(row.id));
    if (!slip) return row;
    return {
      ...row,
      slip_url: slip.slip_url ?? null,
      slip_pathname: slip.slip_pathname ?? null,
    };
  });
}

export async function attachSlipDataToTransaction(row: Row | null): Promise<Row | null> {
  if (!row) return null;
  const [transaction] = await attachSlipDataToTransactions([row]);
  return transaction;
}

async function listSlipRowsByTransactionIds(table: string, transactionIds: string[]): Promise<SlipRow[]> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from(table)
      .select("transaction_id, slip_url, slip_pathname")
      .in("transaction_id", transactionIds);

    if (error) throw error;
    return (data || []) as SlipRow[];
  } catch (error) {
    if (isMissingTableError(error, table)) return [];
    throw error;
  }
}

function buildSlipLookup(rows: SlipRow[]) {
  const lookup = new Map<string, SlipRow>();
  for (const row of rows) {
    const transactionId = typeof row.transaction_id === "string" ? row.transaction_id : "";
    if (!transactionId || lookup.has(transactionId)) continue;
    if (!row.slip_url && !row.slip_pathname) continue;
    lookup.set(transactionId, row);
  }
  return lookup;
}
