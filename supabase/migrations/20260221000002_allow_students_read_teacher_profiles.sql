-- Allow students to read teacher profiles (needed for timezone, etc.)
CREATE POLICY "Students can read teacher profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (role = 'teacher');
