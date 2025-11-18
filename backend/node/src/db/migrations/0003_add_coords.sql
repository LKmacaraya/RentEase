-- Add latitude/longitude to listings for map support
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS lat NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS lng NUMERIC(9,6);
