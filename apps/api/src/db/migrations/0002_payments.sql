-- Online payments: a booking can wait for a payment, which holds its slot until a deadline.

ALTER TABLE bookings ADD COLUMN payment_due_at timestamptz;

ALTER TABLE bookings DROP CONSTRAINT bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('awaiting_payment', 'pending', 'confirmed', 'rejected', 'cancelled', 'completed'));

-- An unpaid hold blocks the slot too (expired holds are cancelled before new bookings are checked).
ALTER TABLE bookings DROP CONSTRAINT bookings_no_overlap;
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (field_id WITH =, tstzrange(start_at, end_at) WITH &&)
  WHERE (status IN ('awaiting_payment', 'pending', 'confirmed'));

CREATE INDEX bookings_awaiting_idx ON bookings (payment_due_at) WHERE status = 'awaiting_payment';

CREATE TABLE payments (
  id          uuid PRIMARY KEY,
  booking_id  uuid NOT NULL REFERENCES bookings (id),
  provider    text NOT NULL,                -- 'sandbox' until a real provider is configured
  method      text NOT NULL,
  reference   text NOT NULL UNIQUE,         -- what the provider sends back in its webhook
  amount_usd  numeric(10,2) NOT NULL,
  amount_khr  integer NOT NULL,
  status      text NOT NULL CHECK (status IN ('pending', 'paid', 'expired')),
  qr_payload  text,
  deeplink    text,
  expires_at  timestamptz NOT NULL,
  paid_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_booking_idx ON payments (booking_id);
