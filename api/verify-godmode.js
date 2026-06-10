/* ── Vercel Serverless Function: /api/verify-godmode ─────────
   POST { passcode, userId, sessionId }
   Verifies passcode, then inserts GODMODE row via service role (bypasses RLS).
   Returns { ok: true } or { ok: false, error: string }
   ──────────────────────────────────────────────────────────── */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { passcode, userId, sessionId } = req.body || {};

  if (!passcode || typeof passcode !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing passcode' });
  }

  const correct = process.env.GODMODE_PASSCODE;
  if (!correct) {
    console.error('GODMODE_PASSCODE env variable not set');
    return res.status(500).json({ ok: false, error: 'Server misconfiguration' });
  }

  /* Constant-time comparison to prevent timing attacks */
  let match = false;
  try {
    const a = Buffer.from(passcode);
    const b = Buffer.from(correct);
    match = a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (_) {
    match = false;
  }

  if (!match) {
    return res.status(200).json({ ok: false });
  }

  /* Passcode correct — register GODMODE session if userId provided */
  if (userId && sessionId) {
    const ip =
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      'unknown';

    const db = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    /* Remove any stale GODMODE session */
    await db.from('online_users').delete().eq('username', 'GODMODE');

    const { error } = await db.from('online_users').insert({
      user_id:         userId,
      username:        'GODMODE',
      session_id:      sessionId,
      ip,
      is_godmode:      true,
      current_channel: 'main',
      last_seen:       new Date().toISOString(),
    });

    if (error) {
      console.error('GODMODE registration error:', error);
      return res.status(500).json({ ok: false, error: 'Registration failed' });
    }
  }

  return res.status(200).json({ ok: true });
};
