-- ============================================================
-- Cache actual Stripe fees on the booking row.
-- Populated at capture time by confirm-booking and backfilled
-- on demand by fetch-stripe-fees for historical rows.
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN stripe_fee_cents INTEGER;
