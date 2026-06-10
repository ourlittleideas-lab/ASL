/* ── Auth Module ─────────────────────────────────────────────
   Production: API routes capture IP + handle GODMODE passcode.
   Local dev (IS_LOCAL = true): direct Supabase insert, no IP.
   ──────────────────────────────────────────────────────────── */

const Auth = (() => {
  const IDLE_MS  = 2 * 60 * 60 * 1000;
  const NAME_RE  = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]{1,12}$/;
  const EMOJI_RE = /\p{Emoji_Presentation}/u;

  return { init, logout, resetIdleTimer };

  /* ── Wire login screen ─────────────────────────────────── */
  function init() {
    const input = document.getElementById('username-input');
    const btn   = document.getElementById('login-btn');
    const err   = document.getElementById('login-error');

    btn.addEventListener('click',  () => _attempt(input.value.trim(), err));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') _attempt(input.value.trim(), err);
    });
    document.getElementById('logout-btn').addEventListener('click', logout);
    input.focus();
  }

  /* ── Validate → route ──────────────────────────────────── */
  async function _attempt(username, errEl) {
    errEl.textContent = '';
    if (!username)              { errEl.textContent = 'Enter a username.'; return; }
    if (EMOJI_RE.test(username)){ errEl.textContent = 'No emoticons allowed.'; return; }
    if (!NAME_RE.test(username)){ errEl.textContent = 'Invalid. Max 12 chars, no spaces.'; return; }

    if (username.toUpperCase() === 'GODMODE') {
      await _godmodeLogin(errEl);
    } else {
      await _login(username, errEl);
    }
  }

  /* ── Regular login ─────────────────────────────────────── */
  async function _login(username, errEl) {
    const btn = document.getElementById('login-btn');
    btn.textContent = 'Connecting…';
    btn.disabled    = true;

    try {
      /* Ping Supabase first so we can give a useful error */
      const reachable = await _ping();
      if (!reachable) {
        errEl.textContent = 'Cannot reach Supabase. Check: (1) project is not paused at supabase.com, (2) no ad-blocker blocking the request.';
        return;
      }

      /* Production uses a fresh anonymous user each time so the API sees a clean IP.
         Local dev reuses the existing session so the same user_id can clean up its old row. */
      if (!IS_LOCAL) await ASL.db.auth.signOut();

      const { data: authData, error: authErr } = await ASL.db.auth.signInAnonymously();
      if (authErr) {
        console.error('[ASL] signInAnonymously error:', authErr);
        errEl.textContent = (authErr.message || '').toLowerCase().includes('anonymous')
          ? 'Anonymous sign-ins are disabled. Go to Supabase → Authentication → Providers → Anonymous → Enable.'
          : `Auth error: ${authErr.message}`;
        return;
      }

      const userId    = authData.user.id;
      const sessionId = crypto.randomUUID();

      if (IS_LOCAL) {
        /* SECURITY DEFINER function handles stale cleanup + uniqueness + insert atomically */
        const { data: result, error: rpcErr } = await ASL.db.rpc('local_register_user', {
          p_user_id:    userId,
          p_username:   username,
          p_session_id: sessionId,
        });
        if (rpcErr) throw new Error(rpcErr.message);
        if (!result.ok) throw new Error(result.error);
      } else {
        /* ── Production: API route (captures real IP) ── */
        const res  = await fetch('/api/register-session', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ userId, username, sessionId }),
        });
        const data = await res.json();

        if (data.banned) {
          await ASL.db.auth.signOut();
          Ban.showBanScreen(data.expires_at);
          document.getElementById('login-screen').classList.add('hidden');
          return;
        }
        if (!data.ok) {
          await ASL.db.auth.signOut();
          errEl.textContent = data.error || 'Registration failed.';
          return;
        }
      }

      ASL.currentUser = { username, isGodmode: false, sessionId, userId };
      await _onSuccess();
    } catch (e) {
      console.error('[ASL] Login error:', e);
      errEl.textContent = `Error: ${e.message}`;
    } finally {
      btn.textContent = 'Enter Chat';
      btn.disabled    = false;
    }
  }

  /* ── GODMODE login ─────────────────────────────────────── */
  async function _godmodeLogin(errEl) {
    const passcode = prompt('GODMODE passcode:');
    if (!passcode) return;

    const btn = document.getElementById('login-btn');
    btn.textContent = 'Verifying…';
    btn.disabled    = true;

    try {
      const reachable = await _ping();
      if (!reachable) {
        errEl.textContent = 'Cannot reach Supabase. Check project is not paused at supabase.com.';
        return;
      }

      /* Same as regular login: keep existing session in local dev so user_id stays stable */
      if (!IS_LOCAL) await ASL.db.auth.signOut();

      const { data: authData, error: authErr } = await ASL.db.auth.signInAnonymously();
      if (authErr) {
        errEl.textContent = (authErr.message || '').toLowerCase().includes('anonymous')
          ? 'Anonymous sign-ins are disabled. Go to Supabase → Authentication → Providers → Anonymous → Enable.'
          : `Auth error: ${authErr.message}`;
        return;
      }

      const userId    = authData.user.id;
      const sessionId = crypto.randomUUID();

      if (IS_LOCAL) {
        /* Validate passcode first, then register via the same RPC as regular users */
        if (passcode !== GODMODE_PASSCODE_DEV) {
          errEl.textContent = 'Wrong passcode.';
          return;
        }
        const { data: result, error: rpcErr } = await ASL.db.rpc('local_register_user', {
          p_user_id:    userId,
          p_username:   'GODMODE',
          p_session_id: sessionId,
        });
        if (rpcErr) throw new Error(rpcErr.message);
        if (!result.ok) throw new Error(result.error);
      } else {
        /* ── Production: API route ── */
        const res  = await fetch('/api/verify-godmode', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ passcode, userId, sessionId }),
        });
        const data = await res.json();
        if (!data.ok) {
          await ASL.db.auth.signOut();
          errEl.textContent = 'Wrong passcode.';
          return;
        }
      }

      ASL.currentUser = { username: 'GODMODE', isGodmode: true, sessionId, userId };
      await _onSuccess();
    } catch (e) {
      console.error('[ASL] GODMODE login error:', e);
      errEl.textContent = `Error: ${e.message}`;
    } finally {
      btn.textContent = 'Enter Chat';
      btn.disabled    = false;
    }
  }

  /* ── Post-login ─────────────────────────────────────────── */
  async function _onSuccess() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('topbar-username').textContent = ASL.currentUser.username;
    resetIdleTimer();
    /* Wait for channel switch so ASL.currentChannel is set before input is enabled */
    await App.onLogin();
    document.getElementById('message-input').disabled = false;
    document.getElementById('send-btn').disabled      = false;
  }

  /* ── Logout ────────────────────────────────────────────── */
  async function logout() {
    if (!ASL.currentUser) return;
    clearTimeout(ASL.idleTimer);
    try {
      await ASL.db.from('online_users').delete().eq('session_id', ASL.currentUser.sessionId);
      await ASL.db.auth.signOut();
    } catch (_) {}
    ASL.currentUser = null;
    location.reload();
  }

  /* ── Connectivity ping ──────────────────────────────────── */
  async function _ping() {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/`, {
        method: 'GET',
        headers: { apikey: SUPABASE_ANON_KEY },
        signal: AbortSignal.timeout(5000),
      });
      /* Any HTTP response (even 4xx) means the server is reachable */
      return res.status < 600;
    } catch (e) {
      console.error('[ASL] Supabase ping failed:', e.message);
      return false;
    }
  }

  /* ── Idle timer ─────────────────────────────────────────── */
  function resetIdleTimer() {
    clearTimeout(ASL.idleTimer);
    ASL.idleTimer = setTimeout(async () => {
      if (ASL.currentUser) {
        try {
          await ASL.db.from('online_users').delete().eq('session_id', ASL.currentUser.sessionId);
          await ASL.db.auth.signOut();
        } catch (_) {}
        location.reload();
      }
    }, IDLE_MS);
  }
})();
