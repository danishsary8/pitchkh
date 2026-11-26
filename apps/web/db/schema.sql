-- PitchKH database schema. The app also runs this automatically on start-up
-- (every statement is IF NOT EXISTS), so you never have to run it by hand.
-- Kept in sync with SCHEMA in src/server/store.ts.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS bookings (
    id uuid PRIMARY KEY,
    code text NOT NULL UNIQUE,
    branch text NOT NULL,
    field_id text NOT NULL,
    date date NOT NULL,
    start_min int NOT NULL CHECK (start_min >= 0 AND start_min < 1440),
    end_min int NOT NULL CHECK (end_min > start_min AND end_min <= 1440),
    status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    name text NOT NULL,
    phone text NOT NULL,
    players int NOT NULL CHECK (players BETWEEN 1 AND 40),
    note text NOT NULL DEFAULT '',
    price_usd numeric(8, 2) NOT NULL,
    source text NOT NULL CHECK (source IN ('customer', 'admin')),
    telegram_user_id text,
    telegram_username text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
      field_id WITH =, date WITH =, int4range(start_min, end_min) WITH &&
    ) WHERE (status <> 'cancelled')
  );

CREATE INDEX IF NOT EXISTS bookings_branch_date ON bookings (branch, date);

CREATE INDEX IF NOT EXISTS bookings_pending ON bookings (date) WHERE status = 'pending';
