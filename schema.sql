/* ============================================================
   ASL Please? — Supabase Schema
   Run this entire file in the Supabase SQL Editor once.

   Prerequisites (do these in the Supabase dashboard first):
     1. Authentication → Providers → Anonymous Sign-ins → ENABLE
     2. Copy your Project URL + anon key into js/config.js
     3. Set SUPABASE_SERVICE_ROLE_KEY in Vercel env vars
   ============================================================ */

-- ── ONLINE USERS ─────────────────────────────────────────────
-- One row per connected user. Removed on logout or after 2h idle.
CREATE TABLE IF NOT EXISTS online_users (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username         TEXT        NOT NULL UNIQUE,
  session_id       UUID        NOT NULL UNIQUE,
  ip               TEXT,
  is_godmode       BOOLEAN     NOT NULL DEFAULT false,
  current_channel  TEXT        NOT NULL DEFAULT 'main',
  last_seen        TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_online_users_username ON online_users (username);
CREATE INDEX IF NOT EXISTS idx_online_users_channel  ON online_users (current_channel);

ALTER TABLE online_users ENABLE ROW LEVEL SECURITY;

-- Anyone can see who's online (public info)
CREATE POLICY "online_users: select all"
  ON online_users FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users can insert only their own row, and cannot self-elevate to GODMODE
CREATE POLICY "online_users: insert own"
  ON online_users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_godmode = false);

-- Authenticated users can update their own row; cannot change is_godmode or user_id
CREATE POLICY "online_users: update own"
  ON online_users FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_godmode = false);

-- Authenticated users can remove their own row (logout).
-- Also allows cleaning up a stale GODMODE row (last_seen > 2 min) so re-login works
-- when a previous GODMODE session was abandoned without logout.
CREATE POLICY "online_users: delete own"
  ON online_users FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (username = 'GODMODE' AND last_seen < now() - INTERVAL '2 minutes')
  );


-- ── MESSAGES ─────────────────────────────────────────────────
-- Live only. No history returned on page load (app never SELECTs on init).
-- Cleaned up after 24h by cleanup_old_data().
CREATE TABLE IF NOT EXISTS messages (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id  TEXT        NOT NULL,
  username    TEXT        NOT NULL,
  text        TEXT        NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
  is_me       BOOLEAN     NOT NULL DEFAULT false,
  is_godmode  BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_channel_time ON messages (channel_id, created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- All messages are public (live chat)
CREATE POLICY "messages: select all"
  ON messages FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only authenticated users can send messages as themselves
CREATE POLICY "messages: insert own"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);


-- ── PRIVATE MESSAGES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS private_messages (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user      TEXT        NOT NULL,
  to_user        TEXT        NOT NULL,
  text           TEXT        NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
  is_asl_opener  BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_to_user_id   ON private_messages (to_user_id,   created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pm_from_user_id ON private_messages (from_user_id, created_at DESC);

ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;

-- Users can only read PMs they sent or received
CREATE POLICY "pm: select own"
  ON private_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Users can only send PMs as themselves
CREATE POLICY "pm: insert own"
  ON private_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = from_user_id);


-- ── POKES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pokes (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user     TEXT        NOT NULL,
  to_user       TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pokes_to_user_id ON pokes (to_user_id, created_at DESC);

ALTER TABLE pokes ENABLE ROW LEVEL SECURITY;

-- Users can only read pokes sent to them
CREATE POLICY "pokes: select own"
  ON pokes FOR SELECT
  TO authenticated
  USING (auth.uid() = to_user_id);

-- Users can only send pokes as themselves
CREATE POLICY "pokes: insert own"
  ON pokes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = from_user_id);


-- ── BANS ─────────────────────────────────────────────────────
-- IP-based. Only accessible via service role key (Vercel API routes).
CREATE TABLE IF NOT EXISTS bans (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ip          TEXT        NOT NULL,
  banned_by   TEXT        NOT NULL DEFAULT 'GODMODE',
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bans_ip_expires ON bans (ip, expires_at);

-- RLS on with NO permissive policies = zero client access
ALTER TABLE bans ENABLE ROW LEVEL SECURITY;


-- ── FUNCTIONS ────────────────────────────────────────────────

-- Live user count per channel (called by channels.js every 10s)
CREATE OR REPLACE FUNCTION get_channel_counts()
RETURNS TABLE(channel_id TEXT, user_count BIGINT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT current_channel AS channel_id, COUNT(*)::BIGINT AS user_count
  FROM online_users
  WHERE current_channel IS NOT NULL
  GROUP BY current_channel;
$$;

-- Look up auth user_id by username (used by pm.js and poke.js to address inserts)
CREATE OR REPLACE FUNCTION get_user_id_by_username(p_username TEXT)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT user_id FROM online_users WHERE username = p_username LIMIT 1;
$$;

-- Cleanup stale data — wire this to pg_cron or call it periodically
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- No message history; purge anything older than 24h as a safety net
  DELETE FROM messages        WHERE created_at < now() - INTERVAL '24 hours';
  DELETE FROM private_messages WHERE created_at < now() - INTERVAL '24 hours';
  DELETE FROM pokes            WHERE created_at < now() - INTERVAL '24 hours';
  -- Remove expired bans
  DELETE FROM bans             WHERE expires_at < now();
  -- Remove crash-orphaned user sessions (last_seen > 2h 5m ago as safety buffer)
  DELETE FROM online_users     WHERE last_seen < now() - INTERVAL '2 hours 5 minutes';
END;
$$;

-- Registers a user in local dev: handles stale row cleanup + uniqueness + insert atomically.
-- SECURITY DEFINER bypasses RLS so it can delete rows owned by other anonymous users.
-- The 5-minute stale threshold prevents stealing an active user's username.
CREATE OR REPLACE FUNCTION local_register_user(
  p_user_id    UUID,
  p_username   TEXT,
  p_session_id UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_taken_by  UUID;
  v_last_seen TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN json_build_object('ok', false, 'error', 'Unauthorized');
  END IF;

  SELECT user_id, last_seen INTO v_taken_by, v_last_seen
  FROM online_users WHERE username = p_username;

  IF FOUND AND v_taken_by IS DISTINCT FROM p_user_id THEN
    IF v_last_seen > now() - INTERVAL '5 minutes' THEN
      RETURN json_build_object('ok', false, 'error', '"' || p_username || '" is already taken.');
    END IF;
    DELETE FROM online_users WHERE username = p_username;
  END IF;

  DELETE FROM online_users WHERE user_id = p_user_id;

  INSERT INTO online_users (user_id, username, session_id, is_godmode, current_channel, last_seen)
  VALUES (p_user_id, p_username, p_session_id, false, 'main', now());

  RETURN json_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION local_register_user(UUID, TEXT, UUID) TO authenticated;

-- Clears the GODMODE row unconditionally (SECURITY DEFINER bypasses RLS).
-- Used by local-dev GODMODE re-login to clean up an abandoned session.
CREATE OR REPLACE FUNCTION cleanup_godmode_session()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM online_users WHERE username = 'GODMODE';
END;
$$;

-- Grant execute to anon/authenticated for public-facing functions
GRANT EXECUTE ON FUNCTION get_channel_counts()            TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_id_by_username(TEXT)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_godmode_session()        TO authenticated;


-- ── REALTIME ────────────────────────────────────────────────
-- Enable postgres_changes realtime on live tables.
-- Presence (online_users) is handled by Supabase Realtime Presence, not this.
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE private_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE pokes;


-- ── OPTIONAL: pg_cron cleanup job ───────────────────────────
-- If pg_cron extension is enabled in your Supabase project:
-- Extensions → pg_cron → Enable
--
-- SELECT cron.schedule(
--   'asl-cleanup',
--   '*/30 * * * *',   -- every 30 minutes
--   'SELECT cleanup_old_data()'
-- );


/* ============================================================
   After running this file:

   1. In Supabase Dashboard → Authentication → URL Configuration:
      Add your Vercel domain to "Site URL" and "Redirect URLs"

   2. In Vercel Dashboard → Project → Settings → Environment Variables:
      SUPABASE_URL              = https://xxx.supabase.co
      SUPABASE_SERVICE_ROLE_KEY = your-service-role-key  (secret!)
      GODMODE_PASSCODE          = your-secret-passcode

   3. Copy js/config.example.js → js/config.js
      Fill in SUPABASE_URL and SUPABASE_ANON_KEY (the public one)

   4. Deploy to Vercel: `vercel --prod`
   ============================================================ */
