import type { PostgrestError } from "@supabase/supabase-js";

export function assertNoError(error: PostgrestError | null, label: string) {
  if (error) {
    throw new Error(`${label}: ${error.message} (${error.code ?? "unknown"})`);
  }
}

export function assertRow<T>(row: T | null, label: string): T {
  if (row == null) throw new Error(`${label}: expected row, got null`);
  return row;
}
