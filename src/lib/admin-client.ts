import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Admin (service-role) client. On hosting providers where SUPABASE_URL /
// SUPABASE_SERVICE_ROLE_KEY may be pinned to stale values by an old
// integration, APP_SUPABASE_URL / APP_SUPABASE_SERVICE_ROLE_KEY take
// precedence. Falls back to the generated client.server otherwise.
let cached: SupabaseClient<Database> | undefined;

export async function getAdminClient(): Promise<SupabaseClient<Database>> {
  if (cached) return cached;
  const url = process.env["APP_SUPABASE_URL"];
  const key = process.env["APP_SUPABASE_SERVICE_ROLE_KEY"];
  if (url && key) {
    const { createClient } = await import("@supabase/supabase-js");
    cached = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    return cached;
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  cached = supabaseAdmin;
  return cached;
}
