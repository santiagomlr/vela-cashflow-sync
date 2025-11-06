-- Add theme preference support for users

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'users'
  ) THEN
    CREATE TABLE public.users (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      theme text NOT NULL DEFAULT 'system',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'theme'
  ) THEN
    ALTER TABLE public.users
    ADD COLUMN theme text NOT NULL DEFAULT 'system';
  END IF;
END $$;

ALTER TABLE public.users
  ALTER COLUMN theme SET DEFAULT 'system';

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own theme" ON public.users;
CREATE POLICY "Users can view own theme"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own theme" ON public.users;
CREATE POLICY "Users can insert own theme"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own theme" ON public.users;
CREATE POLICY "Users can update own theme"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

DROP TRIGGER IF EXISTS trg_update_users_updated_at ON public.users;
CREATE TRIGGER trg_update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.users (id, theme)
SELECT au.id, 'system'
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1
  FROM public.users pu
  WHERE pu.id = au.id
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if email is in allowlist
  IF NOT EXISTS (SELECT 1 FROM public.allowlist WHERE email = NEW.email) THEN
    RAISE EXCEPTION 'Email no está en la lista de usuarios autorizados';
  END IF;

  -- Create profile
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'editor');

  -- Create user preference row
  INSERT INTO public.users (id, theme)
  VALUES (NEW.id, 'system')
  ON CONFLICT (id) DO UPDATE SET theme = EXCLUDED.theme;

  RETURN NEW;
END;
$$;
