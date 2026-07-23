
CREATE TABLE public.packages (
  id text PRIMARY KEY,
  name text NOT NULL,
  speed text NOT NULL,
  price integer NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.packages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packages TO authenticated;
GRANT ALL ON public.packages TO service_role;

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view enabled packages"
  ON public.packages FOR SELECT
  USING (enabled = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert packages"
  ON public.packages FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update packages"
  ON public.packages FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete packages"
  ON public.packages FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER packages_set_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.packages (id, name, speed, price, description, sort_order, enabled) VALUES
  ('basic', 'বেসিক', '5 Mbps', 500, 'সাধারণ ব্রাউজিং ও ভিডিও দেখার জন্য', 1, true),
  ('standard', 'স্ট্যান্ডার্ড', '10 Mbps', 800, 'HD স্ট্রিমিং ও একাধিক ডিভাইসের জন্য', 2, true),
  ('premium', 'প্রিমিয়াম', '20 Mbps', 1200, '4K স্ট্রিমিং ও গেমিংয়ের জন্য', 3, true),
  ('pro', 'প্রো', '50 Mbps', 2000, 'অফিস ও হেভি ইউজারদের জন্য', 4, true);
