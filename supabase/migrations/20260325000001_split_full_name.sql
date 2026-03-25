-- Phase 1: Add first_name/last_name, populate from full_name, keep full_name for now

ALTER TABLE profiles ADD COLUMN first_name TEXT NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN last_name TEXT NOT NULL DEFAULT '';

-- Migrate existing data: first word → first_name, rest → last_name
UPDATE profiles SET
  first_name = CASE
    WHEN position(' ' IN full_name) > 0 THEN left(full_name, position(' ' IN full_name) - 1)
    ELSE full_name
  END,
  last_name = CASE
    WHEN position(' ' IN full_name) > 0 THEN substring(full_name FROM position(' ' IN full_name) + 1)
    ELSE ''
  END;

-- Drop defaults (columns are now populated)
ALTER TABLE profiles ALTER COLUMN first_name DROP DEFAULT;
ALTER TABLE profiles ALTER COLUMN last_name DROP DEFAULT;

-- Update trigger to use first_name/last_name from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, preferred_lang)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'preferred_lang', 'fr')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
