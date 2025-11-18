-- Add status column to listings
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','rented'));

-- Optional: existing rows will have default applied automatically
