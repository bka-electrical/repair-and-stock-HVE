// api/_lib/supabase.js
// Helper untuk membuat Supabase client dengan pengecekan env var
import { createClient } from "@supabase/supabase-js";

export function getSupabase(env) {
  const url = env?.SUPABASE_URL || process.env.SUPABASE_URL;
  const key = env?.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus diisi di environment variable");
  }
  return createClient(url, key);
}
