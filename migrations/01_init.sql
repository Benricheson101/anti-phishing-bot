CREATE TABLE IF NOT EXISTS domains (
  id       SERIAL PRIMARY KEY,
  url      TEXT UNIQUE NOT NULL,
  hits     INT NOT NULL DEFAULT 0,
  added_at TIMESTAMP NOT NULL DEFAULT NOW()
);
