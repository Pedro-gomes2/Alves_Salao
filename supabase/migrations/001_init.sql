-- =====================================================================
-- Alves Estética — initial schema
-- =====================================================================
-- Notes:
-- * Column names are kept in camelCase (quoted) to match the existing
--   TypeScript types/queries in supabase.ts. Postgres convention is
--   snake_case; if you migrate later, also adjust supabase.ts selects.
-- * Run this once on a fresh Supabase project's SQL editor.

-- 1. SERVICES ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  duration  INTEGER NOT NULL,
  price     NUMERIC(10,2) NOT NULL,
  category  TEXT NOT NULL,
  icon      TEXT NOT NULL
);

-- 2. SPECIALISTS ------------------------------------------------------
CREATE TABLE IF NOT EXISTS specialists (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  role               TEXT NOT NULL,
  specialty          TEXT,
  commission         INTEGER NOT NULL DEFAULT 35,
  "avatarUrl"        TEXT NOT NULL,
  rating             NUMERIC(3,2) NOT NULL DEFAULT 5.0,
  services           TEXT[] NOT NULL DEFAULT '{}',
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  "attendanceCount"  INTEGER NOT NULL DEFAULT 0,
  -- Auth columns (new in this version)
  username           TEXT UNIQUE,
  "passwordHash"     TEXT,
  "roleType"         TEXT NOT NULL DEFAULT 'professional'
                     CHECK ("roleType" IN ('admin', 'professional'))
);

CREATE INDEX IF NOT EXISTS idx_specialists_username ON specialists (username);
CREATE INDEX IF NOT EXISTS idx_specialists_services_gin ON specialists USING GIN (services);

-- 3. BOOKINGS ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id                TEXT PRIMARY KEY,
  "specialistId"    TEXT REFERENCES specialists(id) ON DELETE SET NULL,
  "specialistName"  TEXT NOT NULL,
  "userName"        TEXT NOT NULL,
  "userWhatsapp"    TEXT NOT NULL,
  "serviceIds"      TEXT[] NOT NULL,
  "serviceNames"    TEXT[] NOT NULL,
  date              TEXT NOT NULL,
  time              TEXT NOT NULL,
  status            TEXT NOT NULL
                    CHECK (status IN ('pendente', 'confirmado', 'finalizado', 'cancelado')),
  "totalPrice"      NUMERIC(10,2) NOT NULL,
  "totalDuration"   INTEGER NOT NULL,
  "createdAt"       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookings_date_time      ON bookings (date, time);
CREATE INDEX IF NOT EXISTS idx_bookings_specialist     ON bookings ("specialistId");
CREATE INDEX IF NOT EXISTS idx_bookings_status         ON bookings (status);

-- 4. TRANSACTIONS -----------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id                TEXT PRIMARY KEY,
  type              TEXT NOT NULL CHECK (type IN ('entrada', 'saida')),
  description       TEXT NOT NULL,
  amount            NUMERIC(10,2) NOT NULL,
  date              TEXT NOT NULL,
  category          TEXT NOT NULL,
  "specialistId"    TEXT REFERENCES specialists(id) ON DELETE SET NULL,
  "specialistName"  TEXT
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);

-- 5. ROW LEVEL SECURITY ----------------------------------------------
-- Enable RLS on every table. The Express server uses the service role
-- key (or a privileged anon key) — these policies primarily protect the
-- DB if accessed directly with the public anon key from a browser.

ALTER TABLE services      ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialists   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions  ENABLE ROW LEVEL SECURITY;

-- Public can read services and (non-sensitive) specialists
DROP POLICY IF EXISTS services_read_public ON services;
CREATE POLICY services_read_public
  ON services FOR SELECT USING (true);

DROP POLICY IF EXISTS specialists_read_public ON specialists;
CREATE POLICY specialists_read_public
  ON specialists FOR SELECT USING (true);

-- Public can insert bookings (so the booking flow works without auth)
DROP POLICY IF EXISTS bookings_insert_public ON bookings;
CREATE POLICY bookings_insert_public
  ON bookings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS bookings_read_public ON bookings;
CREATE POLICY bookings_read_public
  ON bookings FOR SELECT USING (true);

-- Mutations on services/specialists/transactions and updates on
-- bookings are intentionally NOT exposed to the public anon key.
-- The Express backend uses the service-role key (or a server-side
-- session) for these, bypassing RLS.

-- =====================================================================
-- Reminder: store JWT_SECRET in the server's environment, not in DB.
-- =====================================================================
