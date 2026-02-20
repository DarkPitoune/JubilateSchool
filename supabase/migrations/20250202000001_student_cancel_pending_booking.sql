-- Allow students to delete their own pending bookings (e.g. when canceling checkout)
CREATE POLICY "Students can delete own pending bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING (student_id = auth.uid() AND status = 'pending_confirmation');
