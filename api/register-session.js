/* ── Vercel Serverless Function: /api/register-session ────────
   POST { userId, username, sessionId }
   Captures the caller's IP, inserts into online_users via service role.
   Returns { ok: true, sessionId } or { ok: false, error: string }
   ──────────────────────────────────────────────────────────── */

const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { userId, username, sessionId } = req.body || {};

  if (!userId || !username || !sessionId) {
    return res.status(400).json({ ok: false, error: 'Missing params' });
  }

  /* Basic username validation (mirrors client-side check) */
  const USERNAME_RE = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]{1,12}$/;
  if (!USERNAME_RE.test(username) || username.toUpperCase() === 'GODMODE') {
    return res.status(400).json({ ok: false, error: 'Invalid username' });
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  const db = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  /* Check if username is taken */
  const { data: existing } = await db
    .from('online_users')
    .select('username')
    .eq('username', username)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ ok: false, error: `"${username}" is already taken.` });
  }

  /* Check if IP is banned */
  const { data: ban } = await db
    .from('bans')
    .select('expires_at')
    .eq('ip', ip)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (ban) {
    return res.status(403).json({ ok: false, banned: true, expires_at: ban.expires_at });
  }

  /* Insert the user row */
  const { error } = await db.from('online_users').insert({
    user_id:         userId,
    username,
    session_id:      sessionId,
    ip,
    is_godmode:      false,
    current_channel: 'main',
    last_seen:       new Date().toISOString(),
  });

  if (error) {
    /* Unique violation — username was just claimed between check and insert */
    if (error.code === '23505') {
      return res.status(409).json({ ok: false, error: `"${username}" is already taken.` });
    }
    console.error('register-session DB error:', error);
    return res.status(500).json({ ok: false, error: 'Database error' });
  }

  return res.status(200).json({ ok: true, sessionId });
};
