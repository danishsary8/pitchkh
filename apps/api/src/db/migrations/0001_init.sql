-- PitchKH v1 schema. Mirrors docs/DATA_MODEL.md.
-- Money is USD numeric(10,2). Calendar dates and wall-clock times are Asia/Phnom_Penh.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE users (
  id            uuid PRIMARY KEY,
  role          text NOT NULL CHECK (role IN ('player', 'owner', 'admin')),
  name          text NOT NULL,
  email         text NOT NULL,
  phone         text NOT NULL,
  password_hash text NOT NULL,
  avatar_url    text,
  locale        text NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'km')),
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  team_id       uuid,  -- teams arrive with matches in v1.1
  home_province text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_key ON users (lower(email));
CREATE INDEX users_role_idx ON users (role);

CREATE TABLE refresh_tokens (
  token_hash text PRIMARY KEY,  -- sha-256 of the token; the token itself is never stored
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id);

CREATE TABLE venues (
  id              uuid PRIMARY KEY,
  owner_id        uuid NOT NULL REFERENCES users (id),
  slug            text NOT NULL UNIQUE,
  name            text NOT NULL,
  name_km         text NOT NULL DEFAULT '',
  description     text NOT NULL DEFAULT '',
  description_km  text NOT NULL DEFAULT '',
  province        text NOT NULL,
  district        text NOT NULL,
  address         text NOT NULL,
  lat             double precision NOT NULL,
  lng             double precision NOT NULL,
  sports          text[] NOT NULL DEFAULT '{football}',
  photos          text[] NOT NULL DEFAULT '{}',
  amenities       text[] NOT NULL DEFAULT '{}',
  opening_hours   jsonb NOT NULL,  -- 7 x { weekday, open, close, closed }
  phone           text NOT NULL,
  rating          numeric(2,1) NOT NULL DEFAULT 0,
  review_count    integer NOT NULL DEFAULT 0,
  verified        boolean NOT NULL DEFAULT false,
  featured        boolean NOT NULL DEFAULT false,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  moderation_note text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX venues_status_idx ON venues (status, province, district);
CREATE INDEX venues_owner_idx ON venues (owner_id);

CREATE TABLE fields (
  id                      uuid PRIMARY KEY,
  venue_id                uuid NOT NULL REFERENCES venues (id) ON DELETE CASCADE,
  sport                   text NOT NULL CHECK (sport IN ('football', 'volleyball', 'tennis')),
  name                    text NOT NULL,
  position                text NOT NULL DEFAULT '',
  surface                 text NOT NULL,
  indoor                  boolean NOT NULL,
  format                  text NOT NULL,
  max_players             integer NOT NULL,
  price_per_hour_usd      numeric(10,2) NOT NULL,
  peak_price_per_hour_usd numeric(10,2) NOT NULL,
  lit                     boolean NOT NULL DEFAULT true,
  status                  text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance')),
  layout                  jsonb  -- { x, y, w, h } in metres on the venue plan; NULL = not placed
);
CREATE INDEX fields_venue_idx ON fields (venue_id, sport);

CREATE TABLE bookings (
  id               uuid PRIMARY KEY,
  code             text NOT NULL UNIQUE,
  user_id          uuid NOT NULL REFERENCES users (id),
  venue_id         uuid NOT NULL REFERENCES venues (id),
  field_id         uuid NOT NULL REFERENCES fields (id),
  sport            text NOT NULL,
  date             date NOT NULL,
  start_at         timestamptz NOT NULL,
  end_at           timestamptz NOT NULL CHECK (end_at > start_at),
  team_size        integer NOT NULL,
  referee          boolean NOT NULL DEFAULT false,
  extras           jsonb NOT NULL,
  notes            text NOT NULL DEFAULT '',
  opponent_mode    text NOT NULL DEFAULT 'have',
  match_request_id uuid,
  price            jsonb NOT NULL,  -- PriceBreakdown, frozen at booking time
  payment_method   text NOT NULL CHECK (payment_method IN ('khqr', 'aba', 'wing', 'cash')),
  payment_status   text NOT NULL CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  status           text NOT NULL CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled', 'completed')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  cancelled_at     timestamptz,
  -- The real guard against double booking: two holding bookings of one field
  -- can never overlap, even when two requests arrive at the same moment.
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist (field_id WITH =, tstzrange(start_at, end_at) WITH &&)
    WHERE (status IN ('pending', 'confirmed'))
);
CREATE INDEX bookings_user_idx ON bookings (user_id, start_at);
CREATE INDEX bookings_venue_date_idx ON bookings (venue_id, date);
CREATE INDEX bookings_field_date_idx ON bookings (field_id, date);

CREATE TABLE availability_blocks (
  id         uuid PRIMARY KEY,
  field_id   uuid NOT NULL REFERENCES fields (id) ON DELETE CASCADE,
  date       date NOT NULL,
  start_time text NOT NULL,
  end_time   text NOT NULL,
  reason     text NOT NULL DEFAULT ''
);
CREATE INDEX blocks_field_date_idx ON availability_blocks (field_id, date);

CREATE TABLE favorites (
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  venue_id   uuid NOT NULL REFERENCES venues (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, venue_id)
);

CREATE TABLE notifications (
  id         uuid PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type       text NOT NULL,
  params     jsonb NOT NULL DEFAULT '{}',
  href       text NOT NULL,
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications (user_id, created_at DESC);

CREATE TABLE reports (
  id          uuid PRIMARY KEY,
  reporter_id uuid NOT NULL REFERENCES users (id),
  target_type text NOT NULL CHECK (target_type IN ('venue', 'user', 'review', 'match')),
  target_id   uuid NOT NULL,
  reason      text NOT NULL,
  details     text NOT NULL DEFAULT '',
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolution  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reports_status_idx ON reports (status, created_at DESC);

-- Owners link their Telegram chat to get booking alerts.
CREATE TABLE telegram_links (
  user_id    uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  chat_id    bigint,               -- NULL until the owner presses Start in the bot
  link_code  text NOT NULL UNIQUE, -- one-time code in the t.me/<bot>?start=<code> link
  created_at timestamptz NOT NULL DEFAULT now()
);
