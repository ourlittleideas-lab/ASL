/* ── Presence Module ─────────────────────────────────────────
   Per-channel Supabase Realtime Presence.
   Tracks who's in the current channel, updates Tambay list,
   shows join/leave system messages in chat.
   ──────────────────────────────────────────────────────────── */

const Presence = (() => {
  let _ch   = null; /* current Realtime channel subscription */
  let _prev = new Set(); /* usernames in channel before last sync */

  return { joinChannel, leaveChannel, getUsersInChannel, updateLastSeen };

  /* ── Join a channel presence room ─────────────────────── */
  async function joinChannel(channelId) {
    if (_ch) await leaveChannel();
    _prev = new Set();

    _ch = ASL.db.channel(`presence:${channelId}`, {
      config: { presence: { key: ASL.currentUser.sessionId } },
    });

    _ch
      .on('presence', { event: 'sync' }, () => {
        const state = _ch.presenceState();
        const users = Object.values(state).flat().map((p) => p.username);
        ASL.presence[channelId] = new Set(users);
        Channels.updateChannelCount(channelId, users.length);
        _renderTambay(users);
        _prev = new Set(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach((p) => {
          ASL.presence[channelId] = ASL.presence[channelId] || new Set();
          ASL.presence[channelId].add(p.username);

          /* System message — suppress for own join */
          if (p.username !== ASL.currentUser?.username && !_prev.has(p.username)) {
            Chat.appendSystemMessage(`${p.username} joined ${_channelName(channelId)}`);
          }
          _prev.add(p.username);
        });
        Channels.updateChannelCount(channelId, ASL.presence[channelId]?.size || 0);
        _renderTambay([...ASL.presence[channelId]]);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach((p) => {
          ASL.presence[channelId]?.delete(p.username);
          _prev.delete(p.username);
          if (p.username !== ASL.currentUser?.username) {
            Chat.appendSystemMessage(`${p.username} left ${_channelName(channelId)}`);
          }
        });
        Channels.updateChannelCount(channelId, ASL.presence[channelId]?.size || 0);
        _renderTambay([...(ASL.presence[channelId] || [])]);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await _ch.track({
            username:  ASL.currentUser.username,
            isGodmode: ASL.currentUser.isGodmode,
          });
        }
      });

    ASL.realtimeChannels[`presence:${channelId}`] = _ch;
  }

  /* ── Leave current channel ─────────────────────────────── */
  async function leaveChannel() {
    if (_ch) {
      try { await _ch.untrack(); } catch (_) {}
      try { await ASL.db.removeChannel(_ch); } catch (_) {}
      _ch   = null;
      _prev = new Set();
    }
  }

  /* ── Get current usernames in a channel ─────────────────── */
  function getUsersInChannel(channelId) {
    return [...(ASL.presence[channelId] || [])];
  }

  /* ── Heartbeat: refresh last_seen every 60s ─────────────── */
  function updateLastSeen() {
    setInterval(async () => {
      if (!ASL.currentUser) return;
      await ASL.db
        .from('online_users')
        .update({ last_seen: new Date().toISOString() })
        .eq('session_id', ASL.currentUser.sessionId);
    }, 60_000);
  }

  /* ── Render the Active Tambay list ─────────────────────── */
  function _renderTambay(users) {
    const list = document.getElementById('tambay-list');
    list.innerHTML = '';

    const sorted = [...users].sort((a, b) => {
      if (a === 'GODMODE') return -1;
      if (b === 'GODMODE') return 1;
      if (a === ASL.currentUser?.username) return -1;
      if (b === ASL.currentUser?.username) return 1;
      return a.localeCompare(b);
    });

    for (const username of sorted) {
      const li = document.createElement('li');
      li.className     = 'tambay-item';
      li.textContent   = username;
      li.dataset.user  = username;
      if (username === 'GODMODE')                   li.classList.add('is-godmode');
      if (username === ASL.currentUser?.username)   li.classList.add('is-self');

      if (username !== ASL.currentUser?.username) {
        li.addEventListener('click',       (e) => ContextMenu.show(e, username));
        li.addEventListener('contextmenu', (e) => ContextMenu.show(e, username));
      }
      list.appendChild(li);
    }
  }

  /* ── Friendly channel display name ─────────────────────── */
  function _channelName(channelId) {
    const ch = CHANNEL_MAP[channelId];
    return ch ? `#${ch.name.toLowerCase()}` : `#${channelId}`;
  }
})();
