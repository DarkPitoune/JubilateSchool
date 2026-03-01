ALTER TABLE profiles
  ADD COLUMN personal_access_token UUID DEFAULT gen_random_uuid();

UPDATE profiles SET personal_access_token = gen_random_uuid() WHERE personal_access_token IS NULL;

ALTER TABLE profiles
  ALTER COLUMN personal_access_token SET NOT NULL,
  ADD CONSTRAINT profiles_personal_access_token_unique UNIQUE (personal_access_token);
