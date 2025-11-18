-- Users table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'renter' CHECK (role IN ('admin','renter')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Listings table
CREATE TABLE IF NOT EXISTS listings (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL,
  beds INT,
  baths INT,
  city TEXT,
  address TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Basic indexes
CREATE INDEX IF NOT EXISTS listings_price_idx ON listings(price);
CREATE INDEX IF NOT EXISTS listings_city_idx ON listings(city);
CREATE INDEX IF NOT EXISTS listings_owner_idx ON listings(owner_id);
