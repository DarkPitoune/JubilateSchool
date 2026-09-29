-- Reserved slots stay visible to other students as unavailable,
-- without exposing which student they are reserved for.

CREATE OR REPLACE FUNCTION public.get_student_slots()
RETURNS TABLE (
  id UUID,
  teacher_id UUID,
  start_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  reserved_for_student_id UUID,
  is_booked BOOLEAN
) AS $$
  SELECT
    s.id, s.teacher_id, s.start_time, s.created_at,
    CASE WHEN s.reserved_for_student_id = auth.uid()
         THEN s.reserved_for_student_id END,
    (b.id IS NOT NULL)
      OR (s.reserved_for_student_id IS NOT NULL AND s.reserved_for_student_id <> auth.uid())
  FROM availability_slots s
  LEFT JOIN bookings b
    ON b.availability_slot_id = s.id
    AND b.status IN ('pending_confirmation', 'confirmed')
  WHERE s.start_time >= now()
  ORDER BY s.start_time;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
