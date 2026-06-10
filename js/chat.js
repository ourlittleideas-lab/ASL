/* ── Chat Module ─────────────────────────────────────────────
   Send: inserts into messages table with user_id (RLS enforced).
   Receive: postgres_changes INSERT subscription per channel.
   Format: [HH:MM] <Username> message
   /me command: * Username action (italic, purple)
   ──────────────────────────────────────────────────────────── */

const Chat = (() => {
  let subscription = null;

  return { init, subscribeToChannel, clearMessages, appendSystemMessage };

  /* ── Wire input + send button ───────────────────────────── */
  function init() {
    const input   = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');

    sendBtn.addEventListener('click', _send);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _send(); }
    });
  }

  /* ── Send a message ─────────────────────────────────────── */
  async function _send() {
    const input = document.getElementById('message-input');
    const raw   = input.value.trim();
    if (!raw || !ASL.currentUser || !ASL.currentChannel) return;

    input.value = '';
    Auth.resetIdleTimer();

    const isMe = raw.toLowerCase().startsWith('/me ');
    const text = isMe ? raw.slice(4).trim() : raw;
    if (!text) return;

    /* Heartbeat — keep last_seen fresh */
    ASL.db.from('online_users')
      .update({ last_seen: new Date().toISOString() })
      .eq('session_id', ASL.currentUser.sessionId)
      .then(() => {});

    const { error } = await ASL.db.from('messages').insert({
      user_id:    ASL.currentUser.userId,
      channel_id: ASL.currentChannel,
      username:   ASL.currentUser.username,
      text,
      is_me:      isMe,
      is_godmode: ASL.currentUser.isGodmode,
    });

    if (error) {
      console.error('[ASL] Send error:', error);
      Toast.show(`Send failed: ${error.message}`);
    }
  }

  /* ── Subscribe to incoming messages ────────────────────── */
  function subscribeToChannel(channelId) {
    if (subscription) {
      ASL.db.removeChannel(subscription);
      subscription = null;
    }

    subscription = ASL.db
      .channel(`chat:${channelId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => _render(payload.new)
      )
      .subscribe();

    ASL.realtimeChannels[`chat:${channelId}`] = subscription;
  }

  /* ── Clear messages pane on channel switch ──────────────── */
  function clearMessages() {
    document.getElementById('messages').innerHTML = '';
  }

  /* ── Render a single message row ────────────────────────── */
  function _render(msg) {
    const pane = document.getElementById('messages');
    const line = document.createElement('div');
    line.className = 'chat-line';

    const time = _fmt(msg.created_at || new Date().toISOString());

    if (msg.is_me) {
      line.classList.add('msg-me');
      line.innerHTML =
        `<span class="msg-time">[${time}]</span> ` +
        `<em>* <span class="msg-username" data-user="${_esc(msg.username)}">${_esc(msg.username)}</span>` +
        ` ${_esc(msg.text)}</em>`;
    } else {
      line.classList.add('msg-normal');
      if (msg.is_godmode) line.classList.add('msg-godmode');
      line.innerHTML =
        `<span class="msg-time">[${time}]</span>` +
        ` &lt;<span class="msg-username" data-user="${_esc(msg.username)}">${_esc(msg.username)}</span>&gt;` +
        ` <span class="msg-text">${_esc(msg.text)}</span>`;
    }

    line.querySelector('.msg-username')?.addEventListener('click', (e) => {
      const user = e.target.dataset.user;
      if (user && user !== ASL.currentUser?.username) ContextMenu.show(e, user);
    });

    pane.appendChild(line);
    pane.scrollTop = pane.scrollHeight;
  }

  /* ── Local system message (no DB insert) ────────────────── */
  function appendSystemMessage(text) {
    const pane = document.getElementById('messages');
    const line = document.createElement('div');
    line.className = 'chat-line msg-system';
    line.textContent = `[${_fmtNow()}] *** ${text}`;
    pane.appendChild(line);
    pane.scrollTop = pane.scrollHeight;
  }

  /* ── Helpers ────────────────────────────────────────────── */
  function _fmt(iso) {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }
  function _fmtNow() { return _fmt(new Date().toISOString()); }
  function _esc(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
})();
