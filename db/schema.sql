CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE booking_status AS ENUM ('confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE booking_source AS ENUM ('online', 'manual');
CREATE TYPE media_kind AS ENUM ('video', 'photo');
CREATE TYPE service_category AS ENUM ('hair', 'beard', 'color');

CREATE TABLE services (
  id             serial PRIMARY KEY,
  slug           text NOT NULL UNIQUE,
  category       service_category NOT NULL DEFAULT 'hair',
  name_ro        text NOT NULL,
  name_ru        text NOT NULL,
  description_ro text NOT NULL DEFAULT '',
  description_ru text NOT NULL DEFAULT '',
  price          integer NOT NULL CHECK (price >= 0),
  duration_min   integer NOT NULL CHECK (duration_min > 0),
  active         boolean NOT NULL DEFAULT true,
  sort_order     integer NOT NULL DEFAULT 0,
  image          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clients (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  phone      text NOT NULL UNIQUE,
  notes      text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bookings (
  id           serial PRIMARY KEY,
  client_id    integer NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id   integer NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  starts_at    timestamptz NOT NULL,
  ends_at      timestamptz NOT NULL,
  status       booking_status NOT NULL DEFAULT 'confirmed',
  price        integer NOT NULL CHECK (price >= 0),
  comment      text NOT NULL DEFAULT '',
  source       booking_source NOT NULL DEFAULT 'online',
  locale       text NOT NULL DEFAULT 'ro',
  manage_token text NOT NULL UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  -- The database itself refuses two live bookings in the same time range,
  -- so concurrent online bookings cannot double-book the chair.
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status IN ('confirmed', 'completed'))
);
CREATE INDEX bookings_starts_at_idx ON bookings (starts_at);
CREATE INDEX bookings_client_idx ON bookings (client_id);

CREATE TABLE working_hours (
  weekday    smallint PRIMARY KEY CHECK (weekday BETWEEN 1 AND 7),
  is_open    boolean NOT NULL DEFAULT true,
  open_time  text NOT NULL DEFAULT '10:00',
  close_time text NOT NULL DEFAULT '19:00'
);

CREATE TABLE time_off (
  id         serial PRIMARY KEY,
  starts_at  timestamptz NOT NULL,
  ends_at    timestamptz NOT NULL,
  reason     text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX time_off_range_idx ON time_off (starts_at, ends_at);

CREATE TABLE media (
  id            serial PRIMARY KEY,
  kind          media_kind NOT NULL DEFAULT 'video',
  src           text NOT NULL,
  poster        text,
  caption_ro    text NOT NULL DEFAULT '',
  caption_ru    text NOT NULL DEFAULT '',
  instagram_url text,
  featured      boolean NOT NULL DEFAULT false,
  published     boolean NOT NULL DEFAULT true,
  width         integer NOT NULL DEFAULT 720,
  height        integer NOT NULL DEFAULT 1280,
  duration_s    integer,
  sort_order    integer NOT NULL DEFAULT 0,
  taken_at      timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE posts (
  id           serial PRIMARY KEY,
  slug         text NOT NULL UNIQUE,
  title_ro     text NOT NULL,
  title_ru     text NOT NULL,
  excerpt_ro   text NOT NULL DEFAULT '',
  excerpt_ru   text NOT NULL DEFAULT '',
  body_ro      text NOT NULL DEFAULT '',
  body_ru      text NOT NULL DEFAULT '',
  cover        text,
  video_id     integer REFERENCES media(id) ON DELETE SET NULL,
  published    boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Edits to the public site copy. A row overrides one string of the built-in dictionary
-- (src/i18n/messages/*.site.json, *.book.json); no row means the default text is shown.
CREATE TABLE site_texts (
  locale     text NOT NULL,
  key        text NOT NULL,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (locale, key)
);

-- Structured site settings, one JSON document per key: contact, nav, home.
CREATE TABLE site_config (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
