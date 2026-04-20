-- ============================================================
-- Extraordinary expenses: one-off costs shown in the admin accounting tab
-- (e.g. hardware purchase) separate from Stripe fees and maintenance.
-- ============================================================

CREATE TABLE extraordinary_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  incurred_on DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX extraordinary_expenses_incurred_on_idx
  ON extraordinary_expenses (incurred_on DESC);

ALTER TABLE extraordinary_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_expenses"
  ON extraordinary_expenses FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_insert_expenses"
  ON extraordinary_expenses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_update_expenses"
  ON extraordinary_expenses FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_delete_expenses"
  ON extraordinary_expenses FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
