/* ── App Entry Point ─────────────────────────────────────────
   Load order (index.html):
     supabase → auth → presence → channels → chat → pm → poke → ban → app
   ──────────────────────────────────────────────────────────── */

/* ── Toast ──────────────────────────────────────────────────── */
const Toast = (() => {
  let _t = null;
  function show(msg, ms = 3000) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    el.style.opacity = '1';
    clearTimeout(_t);
    _t = setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.classList.add('hidden'), 300);
    }, ms);
  }
  return { show };
})();

/* ── Context Menu ───────────────────────────────────────────── */
const ContextMenu = (() => {
  let _target = null;

  /* Close on outside click */
  document.addEventListener('click', (e) => {
    if (!document.getElementById('context-menu').contains(e.target)) hide();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });

  function show(e, username) {
    e.preventDefault();
    e.stopPropagation();
    _target = username;

    const menu = document.getElementById('context-menu');
    document.getElementById('ctx-target-name').textContent = username;

    /* Show/hide GODMODE section */
    const godSection = document.getElementById('ctx-godmode-section');
    if (ASL.currentUser?.isGodmode && username !== 'GODMODE') {
      godSection.classList.remove('hidden');
    } else {
      godSection.classList.add('hidden');
    }

    menu.classList.remove('hidden');

    /* Position near click, keep inside viewport */
    const x0 = e.clientX ?? e.pageX ?? 100;
    const y0 = e.clientY ?? e.pageY ?? 100;
    menu.style.left = '0'; menu.style.top = '0'; /* reset for measurement */
    const mw = menu.offsetWidth  || 170;
    const mh = menu.offsetHeight || 100;
    const x  = x0 + mw > window.innerWidth  ? window.innerWidth  - mw - 8 : x0;
    const y  = y0 + mh > window.innerHeight ? window.innerHeight - mh - 8 : y0;
    menu.style.left = `${x}px`;
    menu.style.top  = `${y}px`;
  }

  function hide() {
    document.getElementById('context-menu').classList.add('hidden');
    _target = null;
  }

  /* Wire menu actions */
  document.getElementById('ctx-asl').addEventListener('click', () => {
    if (_target) PM.openPM(_target); hide();
  });
  document.getElementById('ctx-poke').addEventListener('click', () => {
    if (_target) Poke.poke(_target); hide();
  });
  document.getElementById('ctx-kick').addEventListener('click', () => {
    if (_target) Ban.kickUser(_target); hide();
  });
  document.getElementById('ctx-ban').addEventListener('click', () => {
    if (_target && confirm(`Ban ${_target} for 2 hours?`)) Ban.banUser(_target); hide();
  });

  return { show, hide };
})();

/* ── Mobile sidebar toggles ─────────────────────────────────── */
function initMobileUI() {
  const sidebar   = document.getElementById('left-sidebar');
  const overlay   = document.getElementById('sidebar-overlay');
  const rightBar  = document.getElementById('right-sidebar');
  const tambayFab = document.getElementById('tambay-fab');

  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('hidden');
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.add('hidden');
  });
  tambayFab.addEventListener('click', () => rightBar.classList.toggle('open'));
  document.getElementById('tambay-toggle').addEventListener('click', () => {
    rightBar.classList.remove('open');
  });
}

/* ── Called by Auth after successful login ──────────────────── */
async function onLogin() {
  /* Boot all feature modules */
  Presence.updateLastSeen();
  Channels.init();
  Chat.init();
  PM.init();
  Poke.init();
  Ban.init();

  /* Start in Main channel */
  await Channels.switchChannel('main');
}

const App = { onLogin };

/* ── Bootstrap ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  initMobileUI();

  /* Check ban before showing the login screen */
  const isBanned = await Ban.checkBan();

  document.getElementById('loading-screen').classList.add('hidden');

  if (!isBanned) {
    Auth.init();
    document.getElementById('login-screen').classList.remove('hidden');
  }
});
