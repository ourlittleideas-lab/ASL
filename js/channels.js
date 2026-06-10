/* ── Channels Module ─────────────────────────────────────────
   Renders left sidebar channel list.
   - Main channel always pinned at top
   - Active channels (1+ users) float below Main with green dot + count
   - Inactive channels show grey dot only, no count
   - NCR grouped under NCR label
   - Updates online_users.current_channel on switch (feeds get_channel_counts)
   ──────────────────────────────────────────────────────────── */

const Channels = (() => {
  const liveCounts = {}; /* channelId → number */

  return { init, switchChannel, updateChannelCount };

  /* ── Init: render sidebar + start polling counts ────────── */
  function init() {
    _renderFull();
    _pollCounts();
  }

  /* ── Switch to a different channel ─────────────────────── */
  async function switchChannel(channelId) {
    if (channelId === ASL.currentChannel) return;

    await Presence.leaveChannel();

    ASL.currentChannel = channelId;

    const ch          = CHANNEL_MAP[channelId];
    const displayName = ch ? `#${ch.name.toLowerCase()}` : `#${channelId}`;
    document.getElementById('current-channel-display').textContent = displayName;
    document.title = `${displayName} — ASL Please?`;

    Chat.clearMessages();

    /* Update .active highlight */
    document.querySelectorAll('.channel-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.channelId === channelId);
    });

    /* Persist current channel to DB so get_channel_counts() is accurate */
    if (ASL.currentUser) {
      ASL.db.from('online_users')
        .update({ current_channel: channelId })
        .eq('session_id', ASL.currentUser.sessionId)
        .then(() => {});
    }

    await Presence.joinChannel(channelId);
    Chat.subscribeToChannel(channelId);
  }

  /* ── Update live count for one channel ──────────────────── */
  function updateChannelCount(channelId, count) {
    liveCounts[channelId] = count;
    _refreshItem(channelId);
    _floatActive();
  }

  /* ── Refresh a single sidebar item ─────────────────────── */
  function _refreshItem(channelId) {
    const el = document.querySelector(`.channel-item[data-channel-id="${channelId}"]`);
    if (!el) return;
    const count   = liveCounts[channelId] || 0;
    const dot     = el.querySelector('.dot');
    const countEl = el.querySelector('.channel-count');
    if (dot)     dot.className           = count > 0 ? 'dot dot-active' : 'dot dot-inactive';
    if (countEl) { countEl.textContent   = count > 0 ? count : ''; countEl.style.display = count > 0 ? '' : 'none'; }
  }

  /* ── Float active channels below Main ──────────────────── */
  function _floatActive() {
    const sec = document.getElementById('active-channels-section');
    if (!sec) return;
    sec.innerHTML = '';

    ALL_CHANNELS
      .filter((ch) => !ch.pinned && (liveCounts[ch.id] || 0) > 0)
      .sort((a, b) => (liveCounts[b.id] || 0) - (liveCounts[a.id] || 0))
      .forEach((ch) => sec.appendChild(_makeItem(ch, liveCounts[ch.id] || 0)));
  }

  /* ── Build full sidebar ─────────────────────────────────── */
  function _renderFull() {
    const list = document.getElementById('channel-list');
    list.innerHTML = '';

    /* Main (pinned) */
    const mainEl = _makeItem(MAIN_CHANNEL, 0);
    mainEl.classList.add('pinned', 'active');
    list.appendChild(mainEl);

    /* Active float section */
    const sec = document.createElement('div');
    sec.id = 'active-channels-section';
    list.appendChild(sec);

    /* Divider */
    const div = document.createElement('div');
    div.style.cssText = 'border-top:1px solid var(--border);margin:4px 0';
    list.appendChild(div);

    /* NCR */
    list.appendChild(_makeLabel('NCR'));
    ALL_CHANNELS.filter((c) => c.isNCR).forEach((ch) => list.appendChild(_makeItem(ch, 0)));

    /* Regions */
    for (const region of REGIONS) {
      list.appendChild(_makeLabel(region.label));
      ALL_CHANNELS
        .filter((c) => c.region === region.label)
        .forEach((ch) => list.appendChild(_makeItem(ch, 0)));
    }
  }

  /* ── DOM helpers ────────────────────────────────────────── */
  function _makeItem(ch, count) {
    const el      = document.createElement('div');
    el.className  = 'channel-item';
    el.dataset.channelId = ch.id;
    if (ch.id === ASL.currentChannel) el.classList.add('active');

    const dot     = document.createElement('span');
    dot.className = count > 0 ? 'dot dot-active' : 'dot dot-inactive';

    const name    = document.createElement('span');
    name.textContent = `#${ch.name.toLowerCase()}`;
    name.style.cssText = 'overflow:hidden;text-overflow:ellipsis;flex:1';

    const countEl = document.createElement('span');
    countEl.className   = 'channel-count';
    countEl.textContent = count > 0 ? count : '';
    countEl.style.display = count > 0 ? '' : 'none';

    el.append(dot, name, countEl);
    el.addEventListener('click', () => {
      switchChannel(ch.id);
      /* Close mobile sidebar */
      document.getElementById('left-sidebar').classList.remove('open');
      document.getElementById('sidebar-overlay').classList.add('hidden');
    });
    return el;
  }

  function _makeLabel(text) {
    const el      = document.createElement('div');
    el.className  = 'channel-group-label';
    el.textContent = text;
    return el;
  }

  /* ── Poll get_channel_counts() every 10s ────────────────── */
  function _pollCounts() {
    const run = async () => {
      const { data } = await ASL.db.rpc('get_channel_counts');
      if (!data) return;
      for (const row of data) updateChannelCount(row.channel_id, row.user_count);
    };
    run();
    setInterval(run, 10_000);
  }
})();
