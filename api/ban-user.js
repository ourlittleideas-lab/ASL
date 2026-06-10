/* ── Vercel Serverless Function: /api/ban-user ───────────────
   POST { targetUsername, godmodeSession }
   Verifies GODMODE session, looks up target IP, inserts ban for 2h.
   Returns { ok: bool, error?: string }
   ──────────────────────────────────────────────────────────── */

const { createClient } = require('@supabase/supabase-js');

const BAN_HOURS = 2;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { targetUsername, godmodeSession } = req.body || {};

  if (!targetUsername || !godmodeSession) {
    return res.status(400).json({ ok: false, error: 'Missing params' });
  }

  const db = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  /* Verify the request comes from an active GODMODE session */
  const { data: godUser } = await db
    .from('online_users')
    .select('username, is_godmode')
    .eq('session_id', godmodeSession)
    .eq('is_godmode', true)
    .maybeSingle();

  if (!godUser) {
    return res.status(403).json({ ok: false, error: 'Not authorised' });
  }

  /* Look up the target's IP */
  const { data: target } = await db
    .from('online_users')
    .select('ip')
    .eq('username', targetUsername)
    .maybeSingle();

  if (!target) {
    return res.status(404).json({ ok: false, error: 'User not found or not online' });
  }

  if (!target.ip || target.ip === 'unknown') {
    return res.status(422).json({ ok: false, error: 'Cannot ban: IP unknown' });
  }

  const expiresAt = new Date(Date.now() + BAN_HOURS * 3_600_000).toISOString();

  const { error: insertErr } = await db.from('bans').insert({
    ip:         target.ip,
    banned_by:  'GODMODE',
    expires_at: expiresAt,
  });

  if (insertErr) {
    console.error('ban-user insert error:', insertErr);
    return res.status(500).json({ ok: false, error: 'Database error' });
  }

  /* Remove the user from online_users (they'll be shown the ban screen on reconnect) */
  await db.from('online_users').delete().eq('username', targetUsername);

  return res.status(200).json({ ok: true, expires_at: expiresAt });
};
