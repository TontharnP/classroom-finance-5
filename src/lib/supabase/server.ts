import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Row = Record<string, unknown>;

export const DEFAULT_SCHEDULE_FOLDER: Row = {
  id: "default",
  name: "Default",
  parent_id: null,
  sort_order: 0,
  is_hidden: false,
  created_at: "1970-01-01T00:00:00.000Z",
  updated_at: "1970-01-01T00:00:00.000Z",
};

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn(
    "[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. API routes will fail until they are set."
  );
}

let client: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  if (client) return client;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase server environment variables");
  }

  client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return client;
}

export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

export function emptyToNull<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

export function isMissingTableError(error: unknown, table: string) {
  return (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "PGRST205" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.includes(`'public.${table}'`)
  );
}

export function normalizeForSupabase(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeForSupabase);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Row)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, normalizeForSupabase(entryValue)])
    );
  }
  return value;
}

export async function listRecords<T extends Row>(table: string): Promise<T[]> {
  const { data, error } = await getSupabaseAdmin().from(table).select("*");
  if (error) throw error;
  return (data ?? []) as T[];
}

export async function getRecord<T extends Row>(
  table: string,
  id: string
): Promise<T | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as T | null) ?? null;
}

export async function createRecord<T extends Row>(
  table: string,
  values: Row
): Promise<T> {
  const { data, error } = await getSupabaseAdmin()
    .from(table)
    .insert(normalizeForSupabase(values) as Row)
    .select("*")
    .single();
  if (error) throw error;
  return data as T;
}

export async function updateRecord<T extends Row>(
  table: string,
  id: string,
  values: Row,
  allowedColumns: string[]
): Promise<T | null> {
  const updates = Object.fromEntries(
    Object.entries(values).filter(
      ([key, value]) => allowedColumns.includes(key) && value !== undefined
    )
  );

  if (Object.keys(updates).length === 0) return getRecord<T>(table, id);

  const { data, error } = await getSupabaseAdmin()
    .from(table)
    .update(normalizeForSupabase(updates) as Row)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as T | null) ?? null;
}

export async function deleteRecord(table: string, id: string): Promise<boolean> {
  const existing = await getRecord(table, id);
  if (!existing) return false;

  const { error } = await getSupabaseAdmin().from(table).delete().eq("id", id);
  if (error) throw error;
  return true;
}

let scheduleFolderSchemaPromise: Promise<void> | null = null;

export async function ensureScheduleFolderSchema() {
  scheduleFolderSchemaPromise ??= createDefaultScheduleFolder();
  return scheduleFolderSchemaPromise;
}

async function createDefaultScheduleFolder() {
  let folders: Row[] = [];
  try {
    folders = await listRecords("schedule_folders");
  } catch (error) {
    if (isMissingTableError(error, "schedule_folders")) return;
    throw error;
  }
  if (folders.length > 0) return;

  await createRecord("schedule_folders", {
    name: "Default",
    parent_id: null,
    sort_order: 0,
    is_hidden: false,
  });
}
