// Runtime env override: some hosting providers pin SUPABASE_URL /
// SUPABASE_SERVICE_ROLE_KEY to stale values (e.g. an old integration).
// APP_SUPABASE_* variables, when present, take precedence and are copied
// into the conventional names before the generated server client reads them.
if (process.env["APP_SUPABASE_URL"]) {
  process.env["SUPABASE_URL"] = process.env["APP_SUPABASE_URL"];
}
if (process.env["APP_SUPABASE_SERVICE_ROLE_KEY"]) {
  process.env["SUPABASE_SERVICE_ROLE_KEY"] = process.env["APP_SUPABASE_SERVICE_ROLE_KEY"];
}
if (process.env["APP_SUPABASE_PUBLISHABLE_KEY"]) {
  process.env["SUPABASE_PUBLISHABLE_KEY"] = process.env["APP_SUPABASE_PUBLISHABLE_KEY"];
}
