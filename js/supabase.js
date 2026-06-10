/* ── Supabase Client ──────────────────────────────────────────
   Reads credentials from js/config.js (gitignored).
   Exposes window.ASL.db — the single Supabase client instance.
   ──────────────────────────────────────────────────────────── */

(function () {
  /* Debug: confirm config loaded */
  console.log('[ASL] config check →',
    'URL:', typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL.substring(0, 30) + '…' : 'MISSING',
    '| KEY:', typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY.substring(0, 20) + '…' : 'MISSING',
    '| LOCAL:', typeof IS_LOCAL !== 'undefined' ? IS_LOCAL : '?'
  );

  if (typeof SUPABASE_URL === 'undefined' || !SUPABASE_URL ||
      typeof SUPABASE_ANON_KEY === 'undefined' || !SUPABASE_ANON_KEY) {
    document.body.innerHTML =
      '<div style="background:#1e1e1e;color:#f44747;font-family:\'Courier New\',monospace;' +
      'display:flex;align-items:center;justify-content:center;height:100vh;padding:20px;text-align:center">' +
      '<p>Missing Supabase credentials.<br>' +
      'Check that <code>js/config.js</code> is loading (open DevTools → Network tab).</p></div>';
    throw new Error('[ASL] Missing SUPABASE_URL / SUPABASE_ANON_KEY');
  }

  /* The Supabase CDN exposes the library as window.supabase */
  if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
    document.body.innerHTML =
      '<div style="background:#1e1e1e;color:#f44747;font-family:\'Courier New\',monospace;' +
      'display:flex;align-items:center;justify-content:center;height:100vh;padding:20px;text-align:center">' +
      '<p>Failed to load Supabase library from CDN.<br>Check your internet connection.</p></div>';
    throw new Error('[ASL] Supabase CDN not loaded');
  }

  const { createClient } = supabase;

  let db;
  try {
    db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 20 } },
    });
  } catch (e) {
    console.error('[ASL] createClient failed:', e);
    document.body.innerHTML =
      '<div style="background:#1e1e1e;color:#f44747;font-family:\'Courier New\',monospace;' +
      'display:flex;align-items:center;justify-content:center;height:100vh;padding:20px;text-align:center">' +
      `<p>Supabase client error: ${e.message}<br>` +
      'Check js/config.js values and open DevTools → Console for details.</p></div>';
    throw e;
  }

  /* Initialise shared state namespace */
  window.ASL = {
    db,
    currentUser: null,
    currentChannel: null,
    presence: {},
    pmWindows: [],
    pmQueue: [],
    idleTimer: null,
    channels: {},
    realtimeChannels: {},
  };

  console.log('[ASL] Supabase client ready. Local mode:', IS_LOCAL);
})();
