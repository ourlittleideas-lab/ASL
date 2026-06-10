/* ── Private Messaging Module ────────────────────────────────
   Opening: click username → "ASL Please?" in context menu.
   First message is always the preset "ASL Please?" — sender's input
   is disabled until the recipient replies.
   Max 10 open PM windows; extras queue silently.
   Realtime: postgres_changes on private_messages filtered to_user_id.
   ──────────────────────────────────────────────────────────── */

const PM = (() => {
  const MAX_OPEN  = 10;
  const OPENER    = 'ASL Please?';
  const windowMap = {}; /* targetUsername → { el, replied, unread } */

  return { init, openPM, closePM };

  /* ── Subscribe to incoming PMs ──────────────────────────── */
  function init() {
    if (!ASL.currentUser) return;

    const sub = ASL.db
      .channel(`pm_in:${ASL.currentUser.userId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'private_messages',
          filter: `to_user_id=eq.${ASL.currentUser.userId}`,
        },
        (payload) => _receive(payload.new)
      )
      .subscribe();

    ASL.realtimeChannels['pm_incoming'] = sub;
  }

  /* ── Open (or focus) a PM window ───────────────────────── */
  function openPM(targetUsername) {
    if (windowMap[targetUsername]) {
      windowMap[targetUsername].el.querySelector('.pm-input')?.focus();
      return;
    }

    /* Verify target is in the current channel */
    if (!Presence.getUsersInChannel(ASL.currentChannel).includes(targetUsername)) {
      Toast.show(`${targetUsername} is not online here.`);
      return;
    }

    if (Object.keys(windowMap).length >= MAX_OPEN) {
      ASL.pmQueue.push(targetUsername);
      Toast.show(`PM queued — close a window to open chat with ${targetUsername}.`);
      return;
    }

    _createWindow(targetUsername);
    _sendOpener(targetUsername);
  }

  /* ── Handle incoming PM ─────────────────────────────────── */
  function _receive(msg) {
    const from = msg.from_user;

    if (!windowMap[from]) {
      if (Object.keys(windowMap).length >= MAX_OPEN) {
        ASL.pmQueue.push(from);
        return;
      }
      _createWindow(from);
    }

    _appendMsg(from, from, msg.text, msg.created_at);

    /* Unlock sender's input on first non-opener reply */
    if (!msg.is_asl_opener && !windowMap[from]?.replied) {
      windowMap[from].replied = true;
      _unlockInput(from);
    }

    windowMap[from].unread = (windowMap[from].unread || 0) + 1;
    _updateBadge(from);
  }

  /* ── Build PM window DOM ────────────────────────────────── */
  function _createWindow(targetUsername) {
    const win = document.createElement('div');
    win.className = 'pm-window';
    win.dataset.target = targetUsername;

    win.innerHTML = `
      <div class="pm-header">
        <span class="pm-title">${_esc(targetUsername)}<span class="pm-unread-badge" style="display:none"></span></span>
        <div class="pm-header-actions">
          <button class="pm-close-btn icon-btn" title="Close">✕</button>
        </div>
      </div>
      <div class="pm-messages"></div>
      <div class="pm-input-area">
        <input class="pm-input" type="text" maxlength="500"
               placeholder="Waiting for reply…" disabled autocomplete="off" />
        <button class="pm-send-btn icon-btn" disabled>▶</button>
      </div>
    `;

    const input   = win.querySelector('.pm-input');
    const sendBtn = win.querySelector('.pm-send-btn');

    win.querySelector('.pm-close-btn').addEventListener('click', () => closePM(targetUsername));
    sendBtn.addEventListener('click',  () => _sendPM(targetUsername, input));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') _sendPM(targetUsername, input); });
    input.addEventListener('focus',   () => { windowMap[targetUsername].unread = 0; _updateBadge(targetUsername); });

    document.getElementById('pm-container').appendChild(win);
    windowMap[targetUsername] = { el: win, replied: false, unread: 0 };
    ASL.pmWindows.push(targetUsername);
  }

  /* ── Send typed PM ──────────────────────────────────────── */
  async function _sendPM(targetUsername, inputEl) {
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';

    _appendMsg(targetUsername, ASL.currentUser.username, text, new Date().toISOString());

    const toUserId = await _getTargetId(targetUsername);
    if (!toUserId) { Toast.show(`${targetUsername} went offline.`); return; }

    const { error } = await ASL.db.from('private_messages').insert({
      from_user_id:  ASL.currentUser.userId,
      to_user_id:    toUserId,
      from_user:     ASL.currentUser.username,
      to_user:       targetUsername,
      text,
      is_asl_opener: false,
    });

    if (error) { Toast.show('PM failed.'); console.error('PM send error:', error); }
  }

  /* ── Send the mandatory opener ──────────────────────────── */
  async function _sendOpener(targetUsername) {
    _appendMsg(targetUsername, ASL.currentUser.username, OPENER, new Date().toISOString());

    const toUserId = await _getTargetId(targetUsername);
    if (!toUserId) { Toast.show(`${targetUsername} went offline.`); return; }

    await ASL.db.from('private_messages').insert({
      from_user_id:  ASL.currentUser.userId,
      to_user_id:    toUserId,
      from_user:     ASL.currentUser.username,
      to_user:       targetUsername,
      text:          OPENER,
      is_asl_opener: true,
    });
  }

  /* ── Resolve target username → user_id via DB function ─── */
  async function _getTargetId(username) {
    const { data } = await ASL.db.rpc('get_user_id_by_username', { p_username: username });
    return data || null;
  }

  /* ── Unlock input after recipient's first reply ─────────── */
  function _unlockInput(targetUsername) {
    const win = windowMap[targetUsername]?.el;
    if (!win) return;
    const input   = win.querySelector('.pm-input');
    const sendBtn = win.querySelector('.pm-send-btn');
    input.disabled   = false;
    sendBtn.disabled = false;
    input.placeholder = `Message ${targetUsername}…`;
    input.focus();
  }

  /* ── Append a message row ───────────────────────────────── */
  function _appendMsg(targetUsername, fromUser, text, createdAt) {
    const win = windowMap[targetUsername]?.el;
    if (!win) return;
    const pane  = win.querySelector('.pm-messages');
    const d     = new Date(createdAt);
    const t     = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    const isSelf = fromUser === ASL.currentUser?.username;

    const line = document.createElement('div');
    line.className = 'pm-msg-line';
    line.innerHTML =
      `<span class="pm-msg-time">[${t}]</span> ` +
      `<span class="pm-msg-from${isSelf ? ' is-self' : ''}">&lt;${_esc(fromUser)}&gt;</span> ` +
      _esc(text);

    pane.appendChild(line);
    pane.scrollTop = pane.scrollHeight;
  }

  /* ── Update unread badge ────────────────────────────────── */
  function _updateBadge(targetUsername) {
    const win = windowMap[targetUsername]?.el;
    if (!win) return;
    const badge = win.querySelector('.pm-unread-badge');
    const n     = windowMap[targetUsername]?.unread || 0;
    badge.textContent  = n || '';
    badge.style.display = n > 0 ? 'inline' : 'none';
  }

  /* ── Close PM window ────────────────────────────────────── */
  function closePM(targetUsername) {
    windowMap[targetUsername]?.el.remove();
    delete windowMap[targetUsername];
    ASL.pmWindows = ASL.pmWindows.filter((u) => u !== targetUsername);

    /* Drain queue */
    if (ASL.pmQueue.length > 0) openPM(ASL.pmQueue.shift());
  }

  function _esc(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
})();
