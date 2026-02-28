-- ============================================================
-- Availability slots: replace arbitrary ranges with 1-hour slots
-- ============================================================

-- 1. Create availability_slots table
CREATE TABLE availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- start_time must be on a round hour (no minutes, no seconds)
  CONSTRAINT valid_slot_hour CHECK (
    EXTRACT(MINUTE FROM start_time AT TIME ZONE 'UTC') = 0
    AND EXTRACT(SECOND FROM start_time AT TIME ZONE 'UTC') = 0
  ),
  CONSTRAINT unique_slot UNIQUE (teacher_id, start_time)
);

ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read slots"
  ON availability_slots FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teacher can manage own slots"
  ON availability_slots FOR ALL TO authenticated
  USING (teacher_id = auth.uid() AND public.is_teacher())
  WITH CHECK (teacher_id = auth.uid() AND public.is_teacher());

CREATE POLICY "Admin can read slots"
  ON availability_slots FOR SELECT
  USING (public.is_admin());

-- 2. Add availability_slot_id to bookings (nullable during migration)
ALTER TABLE bookings
  ADD COLUMN availability_slot_id UUID REFERENCES availability_slots(id) ON DELETE SET NULL;

-- 3. Migrate existing availability_ranges into slots
-- Decompose each range into 1-hour slots at whole hours
INSERT INTO availability_slots (teacher_id, start_time)
SELECT DISTINCT r.teacher_id, slot_time
FROM availability_ranges r
CROSS JOIN LATERAL (
  SELECT
    CASE
      WHEN r.start_time = date_trunc('hour', r.start_time) THEN r.start_time
      ELSE date_trunc('hour', r.start_time) + interval '1 hour'
    END + (n * interval '1 hour') AS slot_time
  FROM generate_series(0, 24) n
) slots
WHERE slots.slot_time + interval '1 hour' <= r.end_time
ON CONFLICT DO NOTHING;

-- 4. Link existing bookings (exactly 60 min, starting on whole hour) to their slots
UPDATE bookings b
SET availability_slot_id = s.id
FROM availability_slots s, availability_ranges r
WHERE r.id = b.availability_range_id
  AND b.start_time = s.start_time
  AND s.teacher_id = r.teacher_id
  AND b.duration_minutes = 60;

-- 5. Drop old EXCLUDE constraint (overlap prevention via range)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_availability_range_id_tstzrange_excl;

-- 6. New overlap prevention: one active booking per slot
CREATE UNIQUE INDEX bookings_slot_unique_active
  ON bookings (availability_slot_id)
  WHERE status IN ('pending_confirmation', 'confirmed');

-- 7. Drop duration_minutes (always 60 now, derivable from start/end times)
ALTER TABLE bookings DROP COLUMN duration_minutes;

-- 8. Make availability_range_id nullable (keep historical FK, no new bookings use it)
ALTER TABLE bookings ALTER COLUMN availability_range_id DROP NOT NULL;
