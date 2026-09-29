-- ============================================================
-- Expenses are now paid out of the 10% maintenance cut (they reduce the
-- admin's profit, not the charity net), so the table is no longer
-- "extraordinary".
-- ============================================================

ALTER TABLE extraordinary_expenses RENAME TO expenses;
ALTER INDEX extraordinary_expenses_incurred_on_idx RENAME TO expenses_incurred_on_idx;
