CREATE OR REPLACE FUNCTION public.get_student_slots()
RETURNS TABLE (
  id UUID,
  teacher_id UUID,
  start_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  is_booked BOOLEAN
) AS $$
  SELECT
    s.id, s.teacher_id, s.start_time, s.created_at,
    (b.id IS NOT NULL) AS is_booked
  FROM availability_slots s
  LEFT JOIN bookings b
    ON b.availability_slot_id = s.id
    AND b.status IN ('pending_confirmation', 'confirmed')
  WHERE s.start_time >= now()
  ORDER BY s.start_time;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
