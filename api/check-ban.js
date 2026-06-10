/* ── Vercel Serverless Function: /api/check-ban ──────────────
   GET — reads caller's IP, checks bans table via service role.
   Returns { banned: bool, expires_at?: string }
   ──────────────────────────────────────────────────────────── */

const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  const db = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await db
    .from('bans')
    .select('expires_at')
    .eq('ip', ip)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('check-ban DB error:', error);
    return res.status(500).json({ error: 'Database error' });
  }

  if (data) {
    return res.status(200).json({ banned: true, expires_at: data.expires_at });
  }

  return res.status(200).json({ banned: false });
};
