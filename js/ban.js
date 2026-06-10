/* ── Ban Module ──────────────────────────────────────────────
   checkBan(): skipped on localhost (no API server locally).
   showBanScreen(): callable from auth.js.
   banUser() / kickUser(): GODMODE only.
   ──────────────────────────────────────────────────────────── */

const Ban = (() => {
  let _countdown = null;

  return { init, checkBan, showBanScreen, banUser, kickUser };

  function init() {}

  /* ── Check ban — skip entirely in local dev ─────────────── */
  async function checkBan() {
    if (IS_LOCAL) return false; /* no API server, skip */

    try {
      const res  = await fetch('/api/check-ban');
      const data = await res.json();
      if (data.banned) {
        showBanScreen(data.expires_at);
        document.getElementById('login-screen').classList.add('hidden');
        return true;
      }
    } catch (e) {
      console.warn('[ASL] Ban check failed (non-fatal):', e.message);
    }
    return false;
  }

  /* ── Show ban screen with live countdown ────────────────── */
  function showBanScreen(expiresAt) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.add('hidden');
    document.getElementById('ban-screen').classList.remove('hidden');

    const expiry = new Date(expiresAt).getTime();
    if (_countdown) clearInterval(_countdown);

    _countdown = setInterval(() => {
      const rem = expiry - Date.now();
      if (rem <= 0) {
        clearInterval(_countdown);
        document.getElementById('ban-countdown').textContent = 'Reload to try again.';
        return;
      }
      const h = Math.floor(rem / 3_600_000);
      const m = Math.floor((rem % 3_600_000) / 60_000);
      const s = Math.floor((rem % 60_000) / 1000);
      document.getElementById('ban-countdown').textContent =
        `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }, 1000);
  }

  /* ── Ban (GODMODE only) ─────────────────────────────────── */
  async function banUser(targetUsername) {
    if (!ASL.currentUser?.isGodmode) return;
    if (IS_LOCAL) { Toast.show('IP ban not available in local dev.'); return; }

    const res  = await fetch('/api/ban-user', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ targetUsername, godmodeSession: ASL.currentUser.sessionId }),
    });
    const data = await res.json();

    if (data.ok) {
      Chat.appendSystemMessage(`GODMODE banned ${targetUsername} for 2 hours.`);
    } else {
      Toast.show(`Ban failed: ${data.error}`);
    }
  }

  /* ── Kick (GODMODE only) ────────────────────────────────── */
  async function kickUser(targetUsername) {
    if (!ASL.currentUser?.isGodmode) return;

    const { error } = await ASL.db
      .from('online_users').delete().eq('username', targetUsername);

    if (!error) Chat.appendSystemMessage(`GODMODE kicked ${targetUsername}.`);
    else        Toast.show('Kick failed.');
  }
})();
