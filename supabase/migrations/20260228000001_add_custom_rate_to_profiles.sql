ALTER TABLE profiles
  ADD COLUMN custom_hourly_rate_cents INT DEFAULT NULL;

-- Allow teacher to update custom rate on student profiles
CREATE POLICY "Teacher can update student custom rate"
  ON profiles FOR UPDATE
  TO authenticated
  USING (public.is_teacher() AND role = 'student')
  WITH CHECK (public.is_teacher() AND role = 'student');
