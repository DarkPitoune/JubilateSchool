-- Push notification subscriptions (one row per device/browser)
CREATE TABLE push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

-- RLS: users can manage their own subscriptions only
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own subscriptions"
  ON push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own subscriptions"
  ON push_subscriptions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can read own subscriptions"
  ON push_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Idempotency guard: track when reminder was sent for a booking
ALTER TABLE bookings ADD COLUMN reminder_sent_at TIMESTAMPTZ;
