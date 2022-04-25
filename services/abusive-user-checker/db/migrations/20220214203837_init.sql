-- migrate:up
CREATE TABLE images (
  id SERIAL PRIMARY KEY,
  source text UNIQUE,

  md5 TEXT UNIQUE NOT NULL,
  sha256 TEXT UNIQUE NOT NULL,
  phash BIT VARYING UNIQUE NOT NULL
);

-- migrate:down

