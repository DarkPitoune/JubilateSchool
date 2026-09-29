-- ============================================================
-- Recurring slots: instances of one series share a group id
-- ============================================================

ALTER TABLE availability_slots
  ADD COLUMN recurrence_group_id UUID;

CREATE INDEX availability_slots_recurrence_group_id_idx
  ON availability_slots (recurrence_group_id)
  WHERE recurrence_group_id IS NOT NULL;

DROP FUNCTION IF EXISTS public.get_teacher_slots();

CREATE FUNCTION public.get_teacher_slots()
RETURNS TABLE (
  id UUID,
  teacher_id UUID,
  start_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  reserved_for_student_id UUID,
  recurrence_group_id UUID,
  booking_id UUID,
  booking_status TEXT,
  student_first_name TEXT,
  student_last_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT
    s.id,
    s.teacher_id,
    s.start_time,
    s.created_at,
    s.reserved_for_student_id,
    s.recurrence_group_id,
    b.id,
    b.status,
    p.first_name,
    p.last_name
  FROM public.availability_slots s
  LEFT JOIN public.bookings b
    ON b.availability_slot_id = s.id
    AND b.status IN ('pending_confirmation', 'confirmed')
  LEFT JOIN public.profiles p
    ON p.id = b.student_id
  WHERE s.teacher_id = (SELECT auth.uid())
    AND public.is_teacher()
  ORDER BY s.start_time;
$$;

REVOKE EXECUTE ON FUNCTION public.get_teacher_slots() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_teacher_slots() TO authenticated;
