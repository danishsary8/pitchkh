-- v1.1: teams, the match board, chat threads and reviews.

CREATE TABLE teams (
  id                  uuid PRIMARY KEY,
  name                text NOT NULL,
  sport               text NOT NULL CHECK (sport IN ('football', 'volleyball')),
  captain_id          uuid NOT NULL REFERENCES users (id),
  level               text NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  member_count        integer NOT NULL,
  color               text NOT NULL,
  bio                 text NOT NULL DEFAULT '',
  home_province       text NOT NULL,
  matches_played      integer NOT NULL DEFAULT 0,
  wins                integer NOT NULL DEFAULT 0,
  sportsmanship       numeric(2,1) NOT NULL DEFAULT 0,  -- average of team reviews
  sportsmanship_count integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE match_requests (
  id           uuid PRIMARY KEY,
  host_user_id uuid NOT NULL REFERENCES users (id),
  host_team_id uuid NOT NULL REFERENCES teams (id),
  sport        text NOT NULL,
  venue_id     uuid NOT NULL REFERENCES venues (id),
  field_id     uuid REFERENCES fields (id),
  booking_id   uuid REFERENCES bookings (id),
  date         date NOT NULL,
  start_at     timestamptz NOT NULL,
  end_at       timestamptz NOT NULL,
  level        text NOT NULL,
  team_size    integer NOT NULL,
  cost_split   text NOT NULL,
  note         text NOT NULL DEFAULT '',
  status       text NOT NULL CHECK (status IN ('open', 'matched', 'cancelled', 'expired')),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX match_requests_board_idx ON match_requests (status, start_at);

CREATE TABLE join_requests (
  id               uuid PRIMARY KEY,
  match_request_id uuid NOT NULL REFERENCES match_requests (id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES users (id),
  team_id          uuid NOT NULL REFERENCES teams (id),
  message          text NOT NULL DEFAULT '',
  status           text NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_request_id, user_id)  -- one request per player per match
);

CREATE TABLE conversations (
  id               uuid PRIMARY KEY,
  kind             text NOT NULL CHECK (kind IN ('match', 'venue', 'support')),
  title            text NOT NULL,
  match_request_id uuid REFERENCES match_requests (id),
  participant_ids  uuid[] NOT NULL,
  read_at          jsonb NOT NULL DEFAULT '{}',  -- { userId: ISO time they last read }
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX conversations_participants_idx ON conversations USING gin (participant_ids);

CREATE TABLE messages (
  id              uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES users (id),
  body            text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_idx ON messages (conversation_id, created_at);

CREATE TABLE reviews (
  id          uuid PRIMARY KEY,
  target_type text NOT NULL CHECK (target_type IN ('venue', 'team')),
  target_id   uuid NOT NULL,
  author_id   uuid NOT NULL REFERENCES users (id),
  booking_id  uuid REFERENCES bookings (id),
  rating      integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reviews_target_idx ON reviews (target_type, target_id, created_at DESC);
-- One review per booking and target type, even under double submits.
CREATE UNIQUE INDEX reviews_booking_once ON reviews (booking_id, author_id, target_type) WHERE booking_id IS NOT NULL;
