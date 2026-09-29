-- ============================================================
-- Charity donations: track when the net benefit (gross - 10% maintenance
-- - extraordinary expenses) is given away. Used to compute the
-- "to give" balance shown in the admin accounting tab and to avoid
-- forgetting / double-giving.
-- ============================================================

CREATE TABLE charity_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  donated_on DATE NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX charity_donations_donated_on_idx
  ON charity_donations (donated_on DESC);

ALTER TABLE charity_donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_donations"
  ON charity_donations FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_insert_donations"
  ON charity_donations FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_update_donations"
  ON charity_donations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_delete_donations"
  ON charity_donations FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
