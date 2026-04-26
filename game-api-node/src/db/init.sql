-- Game Server Control Panel — Database Schema
-- Run once: psql $DATABASE_URL -f src/db/init.sql

CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL,  -- bcrypt hash
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS servers (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  game        VARCHAR(50) NOT NULL CHECK (game IN ('minecraft','gta5','gta6','other')),
  max_players INT NOT NULL DEFAULT 20,
  status      VARCHAR(50) NOT NULL DEFAULT 'provisioning'
                CHECK (status IN ('provisioning','running','stopped','restarting','error')),
  ip_address  VARCHAR(50),
  port        INT,
  region      VARCHAR(50) DEFAULT 'us-east-1',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing (
  id           SERIAL PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  server_id    INT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  amount       DECIMAL(10,2) NOT NULL,
  currency     VARCHAR(3) NOT NULL DEFAULT 'USD',
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  status       VARCHAR(50) NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','paid','failed','refunded')),
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_servers_user_id   ON servers(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_user_id   ON billing(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_server_id ON billing(server_id);
