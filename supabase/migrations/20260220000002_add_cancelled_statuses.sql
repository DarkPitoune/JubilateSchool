-- Add cancelled_by_student and cancelled_by_teacher to the booking status check constraint
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check,
  ADD CONSTRAINT bookings_status_check
    CHECK (status IN (
      'pending_confirmation',
      'confirmed',
      'rejected',
      'expired',
      'payment_failed',
      'cancelled_by_student',
      'cancelled_by_teacher'
    ));
