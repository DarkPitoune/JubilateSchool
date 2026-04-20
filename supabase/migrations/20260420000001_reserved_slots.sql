-- ============================================================
-- Reserved slots: a teacher can privately reserve a slot for a student
-- ============================================================

-- 1. Add nullable reservation column
ALTER TABLE availability_slots
  ADD COLUMN reserved_for_student_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX availability_slots_reserved_for_student_id_idx
  ON availability_slots (reserved_for_student_id)
  WHERE reserved_for_student_id IS NOT NULL;

-- 2. Update get_student_slots to hide reserved slots from other students
DROP FUNCTION IF EXISTS public.get_student_slots();

CREATE FUNCTION public.get_student_slots()
RETURNS TABLE (
  id UUID,
  teacher_id UUID,
  start_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  reserved_for_student_id UUID,
  is_booked BOOLEAN
) AS $$
  SELECT
    s.id, s.teacher_id, s.start_time, s.created_at, s.reserved_for_student_id,
    (b.id IS NOT NULL) AS is_booked
  FROM availability_slots s
  LEFT JOIN bookings b
    ON b.availability_slot_id = s.id
    AND b.status IN ('pending_confirmation', 'confirmed')
  WHERE s.start_time >= now()
    AND (s.reserved_for_student_id IS NULL OR s.reserved_for_student_id = auth.uid())
  ORDER BY s.start_time;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
