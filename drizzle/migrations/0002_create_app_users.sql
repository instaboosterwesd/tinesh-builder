CREATE TABLE public.app_users (
  uid text PRIMARY KEY,
  email text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  telegram_id text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_users TO service_role;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;