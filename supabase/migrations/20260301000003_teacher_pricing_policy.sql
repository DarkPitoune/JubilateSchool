-- Allow teacher to insert new pricing rows (preserves history via effective_from)
CREATE POLICY "Teacher can insert pricing"
  ON pricing FOR INSERT
  TO authenticated
  WITH CHECK (public.is_teacher());
