CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE activity_types (
  id       SERIAL PRIMARY KEY,
  user_id  INT NOT NULL REFERENCES users ON DELETE CASCADE,
  name     TEXT NOT NULL,
  color    TEXT NOT NULL,
  nature   TEXT NOT NULL DEFAULT 'productive' CHECK (nature IN ('productive', 'leisure', 'essential')),
  archived BOOLEAN NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX activity_types_user_name ON activity_types (user_id, lower(name)) WHERE NOT archived;

CREATE TABLE categories (
  id      SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users ON DELETE CASCADE,
  name    TEXT NOT NULL,
  color   TEXT NOT NULL
);

CREATE TABLE template_activities (
  id          SERIAL PRIMARY KEY,
  category_id INT NOT NULL REFERENCES categories ON DELETE CASCADE,
  title       TEXT NOT NULL,
  type_id     INT NOT NULL REFERENCES activity_types,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL
);

CREATE TABLE daily_activities (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users ON DELETE CASCADE,
  day         DATE NOT NULL,
  title       TEXT NOT NULL,
  type_id     INT NOT NULL REFERENCES activity_types,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  status      TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'done', 'skipped'))
);

CREATE TABLE pomodoro_sessions (
  id              SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES users ON DELETE CASCADE,
  kind            TEXT NOT NULL CHECK (kind IN ('focus', 'short_break', 'long_break')),
  type_id         INT NOT NULL REFERENCES activity_types,
  label           TEXT NOT NULL DEFAULT '',
  planned_minutes INT NOT NULL CHECK (planned_minutes > 0),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at        TIMESTAMPTZ
);

CREATE INDEX daily_activities_user_day ON daily_activities (user_id, day);
CREATE INDEX pomodoro_sessions_user_started ON pomodoro_sessions (user_id, started_at);
CREATE UNIQUE INDEX pomodoro_one_active ON pomodoro_sessions (user_id) WHERE ended_at IS NULL;
