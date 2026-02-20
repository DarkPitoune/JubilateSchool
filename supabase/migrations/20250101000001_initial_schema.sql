-- Enable btree_gist for exclusion constraints on tstzrange
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- Helper: check if current user is a teacher (bypasses RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES
-- Auto-created via trigger when a user signs up in auth.users
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  preferred_lang TEXT NOT NULL DEFAULT 'fr' CHECK (preferred_lang IN ('fr', 'en')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: auto-create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, preferred_lang)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'preferred_lang', 'fr')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Teacher can read all profiles"
  ON profiles FOR SELECT
  USING (public.is_teacher());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- AVAILABILITY RANGES (teacher creates these)
-- ============================================================
CREATE TABLE availability_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_range CHECK (end_time > start_time)
);

ALTER TABLE availability_ranges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read availability"
  ON availability_ranges FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teacher can insert own availability"
  ON availability_ranges FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id = auth.uid()
    AND public.is_teacher()
  );

CREATE POLICY "Teacher can update own availability"
  ON availability_ranges FOR UPDATE
  TO authenticated
  USING (
    teacher_id = auth.uid()
    AND public.is_teacher()
  )
  WITH CHECK (
    teacher_id = auth.uid()
  );

CREATE POLICY "Teacher can delete own availability"
  ON availability_ranges FOR DELETE
  TO authenticated
  USING (
    teacher_id = auth.uid()
    AND public.is_teacher()
  );

-- ============================================================
-- BOOKINGS (students book within availability ranges)
-- ============================================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  availability_range_id UUID NOT NULL REFERENCES availability_ranges(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL CHECK (duration_minutes BETWEEN 15 AND 120 AND duration_minutes % 15 = 0),
  note TEXT DEFAULT '',
  price_cents INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_confirmation'
    CHECK (status IN ('pending_confirmation', 'confirmed', 'rejected', 'expired', 'payment_failed')),
  stripe_payment_intent_id TEXT,
  confirmation_token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_booking CHECK (end_time > start_time),
  -- Prevent overlapping bookings (pending or confirmed) within same availability range
  EXCLUDE USING gist (
    availability_range_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status IN ('pending_confirmation', 'confirmed'))
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Teacher can read all bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (public.is_teacher());

-- Inserts/updates done via Edge Functions with service_role key
-- No direct insert/update policies for regular users

-- ============================================================
-- PRICING (simple config table)
-- ============================================================
CREATE TABLE pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hourly_rate_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read pricing"
  ON pricing FOR SELECT
  TO authenticated
  USING (true);

-- Seed initial pricing (35 EUR/hour)
INSERT INTO pricing (hourly_rate_cents) VALUES (3500);

-- ============================================================
-- Seed teacher role (run after the teacher has signed up)
-- UPDATE profiles SET role = 'teacher' WHERE email = 'jubilateschool@yahoo.com';
-- ============================================================
