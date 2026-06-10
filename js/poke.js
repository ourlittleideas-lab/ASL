/* ── Poke Module ─────────────────────────────────────────────
   Classic mIRC beep (Web Audio API) + CSS shake animation.
   Once per hour per target. Cooldown toast if spammed.
   Incoming pokes: postgres_changes filtered to to_user_id.
   ──────────────────────────────────────────────────────────── */

const Poke = (() => {
  const COOLDOWN_MS = 60 * 60 * 1000; /* 1 hour per target */
  const lastPokedAt = {};             /* { targetUsername: timestamp } */

  return { init, poke };

  /* ── Subscribe to incoming pokes ────────────────────────── */
  function init() {
    if (!ASL.currentUser) return;

    const sub = ASL.db
      .channel(`pokes_in:${ASL.currentUser.userId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'pokes',
          filter: `to_user_id=eq.${ASL.currentUser.userId}`,
        },
        (payload) => _receive(payload.new)
      )
      .subscribe();

    ASL.realtimeChannels['poke_incoming'] = sub;
  }

  /* ── Send a poke ────────────────────────────────────────── */
  async function poke(targetUsername) {
    const now  = Date.now();
    const last = lastPokedAt[targetUsername] || 0;

    if (now - last < COOLDOWN_MS) {
      const mins = Math.ceil((COOLDOWN_MS - (now - last)) / 60_000);
      Toast.show(`Cooldown: ${mins} min before you can poke ${targetUsername} again.`);
      return;
    }

    if (!Presence.getUsersInChannel(ASL.currentChannel).includes(targetUsername)) {
      Toast.show(`${targetUsername} is not in this channel.`);
      return;
    }

    lastPokedAt[targetUsername] = now;

    const toUserId = await _getTargetId(targetUsername);
    if (!toUserId) { Toast.show(`${targetUsername} went offline.`); return; }

    const { error } = await ASL.db.from('pokes').insert({
      from_user_id: ASL.currentUser.userId,
      to_user_id:   toUserId,
      from_user:    ASL.currentUser.username,
      to_user:      targetUsername,
    });

    if (error) {
      Toast.show('Poke failed.');
      console.error('Poke error:', error);
      return;
    }

    Chat.appendSystemMessage(`You poked ${targetUsername}!`);
  }

  /* ── Handle incoming poke ───────────────────────────────── */
  function _receive(pokeData) {
    _beep();
    _shake();
    Chat.appendSystemMessage(`${pokeData.from_user} poked you! 👉`);
  }

  /* ── Resolve username → user_id ─────────────────────────── */
  async function _getTargetId(username) {
    const { data } = await ASL.db.rpc('get_user_id_by_username', { p_username: username });
    return data || null;
  }

  /* ── Web Audio beep (no external file needed) ───────────── */
  function _beep() {
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
      osc.onended = () => ctx.close();
    } catch (_) {}
  }

  /* ── CSS shake animation on the chat area ───────────────── */
  function _shake() {
    const el = document.getElementById('chat-area');
    el.classList.remove('poke-shake');
    void el.offsetWidth; /* force reflow */
    el.classList.add('poke-shake');
    el.addEventListener('animationend', () => el.classList.remove('poke-shake'), { once: true });
  }
})();
