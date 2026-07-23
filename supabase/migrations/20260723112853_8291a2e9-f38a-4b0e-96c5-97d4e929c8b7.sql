ALTER TABLE public.allowed_users
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS mobile text,
  ADD COLUMN IF NOT EXISTS ip_username text;