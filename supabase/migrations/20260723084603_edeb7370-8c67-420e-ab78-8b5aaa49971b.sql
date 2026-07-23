
CREATE TABLE public.allowed_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.allowed_users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allowed_users TO authenticated;
GRANT ALL ON public.allowed_users TO service_role;
ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view allowed users" ON public.allowed_users FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert allowed users" ON public.allowed_users FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update allowed users" ON public.allowed_users FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete allowed users" ON public.allowed_users FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER set_allowed_users_updated_at BEFORE UPDATE ON public.allowed_users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
