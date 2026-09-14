/* ============================================================
   Habibi — main.js
   Plain JS, no dependencies. Everything that changes at launch
   lives in CONFIG below. Nothing else needs to be edited.
   ============================================================ */
'use strict';

/* ------------------------------------------------------------
   1. CONFIG — launch data. This is the only block you edit.
   ------------------------------------------------------------
   - null = unknown. The site handles it: buy buttons show
     "Launching soon", the CA reads "CA revealed at launch",
     missing links are removed (never a dead "#"), stats show "—"
     with "Live after launch".
   - As soon as a value is set, the matching UI switches on.
   ------------------------------------------------------------ */
const CONFIG = {
  x:        'https://x.com/habibionsol_',
  telegram: 'https://t.me/HabibiOnSolanaa',

  /* ---- Launch data ---------------------------------------------------- */
  contractAddress: 'CmFurHrGGaodeAbgWvH5ewSU63woJKr1tLdLKWa8pump',   // Solana mint, base58
  buyUrl:          'https://pump.fun/coin/CmFurHrGGaodeAbgWvH5ewSU63woJKr1tLdLKWa8pump',
  dexscreener:     'https://dexscreener.com/solana/CmFurHrGGaodeAbgWvH5ewSU63woJKr1tLdLKWa8pump',
  solscan:         'https://solscan.io/token/CmFurHrGGaodeAbgWvH5ewSU63woJKr1tLdLKWa8pump',

  /* ---- When the Telegram group opens --------------------------------
     ISO 8601 with an offset, e.g. '2026-09-14T14:00:00+02:00'.
     This timestamp — not the link above — decides what is shown:
     null = neither countdown nor button, future = countdown,
     past = the Telegram buttons appear.
  --------------------------------------------------------------------- */
  telegramOpensAt: '2026-09-15T17:09:35+02:00',

  website: 'https://www.habibioil.xyz/',   // footer link

  // Not listed yet. null = hidden.
  dextools: null,
  coinmarketcap: null,
  coingecko: null,
};

/* ------------------------------------------------------------
   2. Constants (facts about the chain and project, not launch data)
   ------------------------------------------------------------ */
const SOLANA = { name: 'Solana', explorer: 'https://solscan.io' };
const TICKER = '$HABIBI';
const PUMP_FUN = 'https://pump.fun';
// The fee pump.fun charges on every trade. The creator chooses once, before
// launch and irreversibly, between keeping it and redirecting it to traders
// as cashback. Habibi redirects it. This is the only percentage on the site.
const TRADE_FEE = '0.3%';
const STATS_POLL_MS = 30_000;
const FETCH_TIMEOUT_MS = 9_000;
const GALLERY_DIR = 'assets/gallery/';
const BANNER_CANDIDATES = ['assets/banner.webp', 'assets/banner.jpg', 'assets/banner.png'];
const STORAGE_KEY = 'habibi.stats.v2';

/* ------------------------------------------------------------
   3. Small helpers
   ------------------------------------------------------------ */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* A Solana mint is a base58-encoded 32-byte public key: 32–44 characters
   from the base58 alphabet, which omits 0, O, I and l. No 0x prefix. */
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const isAddress = (a) => typeof a === 'string' && BASE58_RE.test(a);
// No fixed prefix to throw away, so both ends carry meaning.
const shortAddr = (a) => (a.length <= 13 ? a : `${a.slice(0, 5)}…${a.slice(-5)}`);

function fmtCompact(n, digits = 2) {
  if (n == null || !isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(digits) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(digits) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(digits) + 'K';
  return n.toLocaleString('en-US', { maximumFractionDigits: digits });
}
function fmtAmount(n, unit = '') {
  if (n == null || !isFinite(n)) return '—';
  let s;
  if (n === 0) s = '0';
  else if (Math.abs(n) < 0.0001) s = n.toLocaleString('en-US', { maximumSignificantDigits: 3 });   // 0.00000131, never 1.31e-6
  else if (Math.abs(n) < 1) s = n.toLocaleString('en-US', { maximumSignificantDigits: 4 });
  else if (Math.abs(n) < 10_000) s = n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  else s = fmtCompact(n);
  return unit ? `${s} ${unit}` : s;
}
function fmtInt(n) { return (n == null || !isFinite(n)) ? '—' : Math.round(n).toLocaleString('en-US'); }
function fmtUsd(n) {
  if (n == null || !isFinite(n)) return null;
  const abs = Math.abs(n);
  if (abs >= 1000) return '$' + fmtCompact(n, 2);
  if (abs >= 1) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (abs === 0) return '$0';
  return '$' + n.toLocaleString('en-US', { maximumSignificantDigits: 4 });   // sub-cent prices keep their digits
}
async function fetchJson(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  } finally { clearTimeout(t); }
}
let toastTimer;
function toast(msg, isError = false) {
  const el = $('[data-toast]');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('toast--error', isError);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older mobile browsers / non-secure contexts
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

/* ------------------------------------------------------------
   4. Launch-state UI: contract address, buy buttons, links
   ------------------------------------------------------------ */
function resolvedBuyUrl() {
  if (CONFIG.buyUrl) return CONFIG.buyUrl;
  if (isAddress(CONFIG.contractAddress)) return `${PUMP_FUN}/coin/${CONFIG.contractAddress}`;
  return null;
}

function initContractAddress() {
  const ca = isAddress(CONFIG.contractAddress) ? CONFIG.contractAddress : null;

  $$('[data-ca-text]').forEach((el) => {
    if (!ca) { el.textContent = 'CA revealed at launch'; return; }
    el.textContent = el.dataset.caText === 'short' ? shortAddr(ca) : ca;
  });

  $$('[data-copy-ca]').forEach((btn) => {
    if (!ca) {
      btn.disabled = true;
      btn.title = 'Contract address is revealed at launch';
      btn.setAttribute('aria-disabled', 'true');
      return;
    }
    btn.disabled = false;
    btn.addEventListener('click', async () => {
      const ok = await copyText(ca);
      toast(ok ? 'Contract address copied, habibi' : 'Could not copy. Long-press the address instead.', !ok);
      if (ok) { btn.classList.add('is-copied'); setTimeout(() => btn.classList.remove('is-copied'), 1400); }
    });
  });

  $$('[data-explorer-link]').forEach((a) => {
    if (ca) { a.href = CONFIG.solscan || `${SOLANA.explorer}/token/${ca}`; a.hidden = false; }
    else if (a.dataset.explorerFallback) { a.href = a.dataset.explorerFallback; a.hidden = false; }
    else { a.hidden = true; }
  });
}

function initBuyButtons() {
  const url = resolvedBuyUrl();
  $$('[data-buy-link]').forEach((a) => { if (url) a.href = url; });   // plain links (footer): keep their fallback when unknown
  $$('[data-buy]').forEach((a) => {
    if (url) {
      a.href = url; a.target = '_blank'; a.rel = 'noopener';
      a.classList.remove('is-disabled'); a.removeAttribute('aria-disabled');
      return;
    }
    a.textContent = 'Launching soon';
    a.classList.add('is-disabled');
    a.setAttribute('aria-disabled', 'true');
    a.setAttribute('role', 'button');
    a.removeAttribute('href');
    a.tabIndex = -1;
  });
}

function initListingLinks() {
  const box = $('[data-listing-links]');
  let any = false;
  $$('[data-link]').forEach((a) => {
    const url = CONFIG[a.dataset.link];
    if (url) { a.href = url; any = true; } else { a.remove(); }   // hidden entirely, never a dead "#"
  });
  if (isAddress(CONFIG.contractAddress)) any = true;   // Solscan chip is shown in that case
  if (box) box.hidden = !any;
}

// X links carry data-social="x". Unknown = removed, never a dead "#".
// Telegram is deliberately not handled here: it belongs to the gate in section 8,
// which decides whether the group is open yet.
function initSocialLinks() {
  $$('[data-social]').forEach((a) => {
    if (a.dataset.social === 'telegram') return;
    const url = CONFIG[a.dataset.social];
    if (url) a.href = url; else a.remove();
  });
}

// The site's own domain (footer). Unknown = removed.
function initWebsiteLink() {
  $$('[data-website]').forEach((a) => {
    if (!CONFIG.website) { a.remove(); return; }
    a.href = CONFIG.website;
    a.textContent = CONFIG.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
    a.hidden = false;
  });
}

/* ------------------------------------------------------------
   5. Generic copy buttons
   ------------------------------------------------------------ */
function initCopyButtons() {
  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ok = await copyText(btn.dataset.copy);
      toast(ok ? 'Copied' : 'Could not copy', !ok);
      if (ok) { btn.classList.add('is-copied'); setTimeout(() => btn.classList.remove('is-copied'), 1400); }
    });
  });
}

/* ------------------------------------------------------------
   6. Live panel — data
   ------------------------------------------------------------
   One source, one request: the DEXScreener public token endpoint.
   It is CORS-open, needs no key, and is the only market data a
   static page can read straight from the browser.

   Solana's public RPC is deliberately not used. It cannot answer
   the question people actually ask — how many holders — without an
   indexer and an API key, and this site has no server to keep a key
   in. A number that cannot be read honestly is not shown at all.

   Nothing about trader cashback is fetched either: pump.fun exposes
   no public endpoint for it, so the site never prints a cashback
   figure it cannot verify.
   ------------------------------------------------------------ */
/* Two endpoints, checked against real responses on 2026-09-14:

     tokens/v1/solana/<mint>    -> a bare ARRAY of pair objects, [] when
                                   nothing is indexed
     latest/dex/tokens/<mint>   -> an OBJECT with a `pairs` array, which is
                                   null when nothing is indexed

   The shapes differ but the per-pair fields are identical, so both are
   normalised to a plain list before anything reads them. */
const DEXS_PRIMARY = 'https://api.dexscreener.com/tokens/v1/solana/';
const DEXS_FALLBACK = 'https://api.dexscreener.com/latest/dex/tokens/';

function pairsFrom(json) {
  if (Array.isArray(json)) return json.filter(Boolean);
  if (json && Array.isArray(json.pairs)) return json.pairs.filter(Boolean);
  return [];
}

const liqUsd = (p) => {
  const n = Number(p && p.liquidity && p.liquidity.usd);
  return isFinite(n) ? n : 0;
};

function pickPair(pairs) {
  const onSolana = pairs.filter((p) => p.chainId === 'solana');
  const pool = onSolana.length ? onSolana : pairs;
  // Deepest liquidity wins — never simply the first entry in the array,
  // which is often a dust pair with a meaningless price.
  return pool.slice().sort((a, b) => liqUsd(b) - liqUsd(a))[0] || null;
}

const num = (v) => { const n = Number(v); return isFinite(n) ? n : null; };

async function fetchStats() {
  const mint = encodeURIComponent(CONFIG.contractAddress);
  let pairs = [];
  try {
    pairs = pairsFrom(await fetchJson(DEXS_PRIMARY + mint));
  } catch {
    pairs = [];   // primary down: fall through to the older endpoint
  }
  if (!pairs.length) pairs = pairsFrom(await fetchJson(DEXS_FALLBACK + mint));

  const pair = pickPair(pairs);
  const updatedAt = Math.floor(Date.now() / 1000);
  if (!pair) return { updatedAt, noPair: true };

  const t = pair.txns && pair.txns.h24;
  return {
    updatedAt,
    noPair: false,
    priceUsd:  num(pair.priceUsd),
    priceSol:  num(pair.priceNative),
    marketCap: num(pair.marketCap != null ? pair.marketCap : pair.fdv),
    liquidity: num(pair.liquidity && pair.liquidity.usd),
    volume24h: num(pair.volume && pair.volume.h24),
    trades24h: t ? (num(t.buys) || 0) + (num(t.sells) || 0) : null,
  };
}

/* ------------------------------------------------------------
   7. Live panel — rendering and caching
   ------------------------------------------------------------ */
const live = { stats: null, timer: null };
const STAT_KEYS = ['price', 'marketCap', 'volume', 'trades', 'liquidity'];

function setStat(key, value, note) {
  const v = $(`[data-stat="${key}"]`);
  const n = $(`[data-stat-note="${key}"]`);
  if (v && value !== undefined) v.textContent = value;
  if (n && note !== undefined) n.textContent = note;
}

function loadCached() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw);
    return j && j.contract === CONFIG.contractAddress ? j.stats : null;
  } catch { return null; }
}
function saveCached(stats) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ contract: CONFIG.contractAddress, stats })); } catch { /* ignore */ }
}

function renderStats(s, { stale = false, unreachable = false, loading = false } = {}) {
  const dot = $('[data-live-dot]');
  const status = $('[data-live-status]');
  const meta = $('[data-live-meta]');

  // Pre-launch, first fetch still running, every source down, or listed but not yet traded.
  if (!s || s.noPair) {
    const note = unreachable ? 'Not available right now'
      : loading ? 'Reading the market…'
      : (s && s.noPair) ? 'No pair yet'
      : 'Live after launch';
    STAT_KEYS.forEach((k) => setStat(k, '—', note));
    if (status) {
      status.textContent = unreachable ? 'Market data unreachable'
        : loading ? 'Reading the market'
        : (s && s.noPair) ? 'Waiting for the first trade'
        : 'Live after launch';
    }
    if (dot) dot.className = unreachable ? 'dot is-stale' : 'dot';
    if (meta) {
      meta.textContent = unreachable ? 'Retrying every 30 seconds' : '';
      meta.hidden = !unreachable;
    }
    return;
  }

  setStat('price', fmtUsd(s.priceUsd) || '—',
    s.priceSol != null ? `${fmtAmount(s.priceSol, 'SOL')} per ${TICKER}` : `per ${TICKER}`);
  setStat('marketCap', fmtUsd(s.marketCap) || '—', s.marketCap != null ? 'USD' : 'Not available right now');
  setStat('volume', fmtUsd(s.volume24h) || '—', s.volume24h != null ? 'USD · last 24 h' : 'Not available right now');
  setStat('trades', fmtInt(s.trades24h), s.trades24h != null ? 'Buys and sells · last 24 h' : 'Not available right now');
  setStat('liquidity', fmtUsd(s.liquidity) || '—', s.liquidity != null ? 'In the pool' : 'Not available right now');

  if (status) status.textContent = stale ? 'Reconnecting' : 'Trading';
  if (dot) dot.className = `dot ${stale ? 'is-stale' : 'is-live'}`;
  if (meta) {
    const t = new Date(s.updatedAt * 1000);
    meta.textContent = `${stale ? 'Showing last known values · ' : ''}Updated ${t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    meta.hidden = false;
  }
}

async function refreshStats() {
  try {
    const s = await fetchStats();
    live.stats = s;
    saveCached(s);
    renderStats(s);
  } catch {
    const cached = loadCached();
    if (cached) { live.stats = cached; renderStats(cached, { stale: true }); }
    else renderStats(null, { unreachable: true });
  }
}

function initLivePanel() {
  if (!isAddress(CONFIG.contractAddress)) { renderStats(null); return; }

  const cached = loadCached();
  if (cached) { live.stats = cached; renderStats(cached, { stale: true }); }
  else renderStats(null, { loading: true });
  refreshStats();

  const schedule = () => {
    clearInterval(live.timer);
    if (!document.hidden) live.timer = setInterval(refreshStats, STATS_POLL_MS);
  };
  schedule();
  document.addEventListener('visibilitychange', () => { schedule(); if (!document.hidden) refreshStats(); });
}

/* ------------------------------------------------------------
   8. Telegram gate — the countdown until the group opens
   ------------------------------------------------------------
   Three states, all decided by CONFIG.telegramOpensAt:

     null           nothing is rendered. No countdown, no Telegram
                    button, no placeholder.
     in the future  the countdown runs; every Telegram button stays
                    hidden until it reaches zero.
     in the past    the countdown is gone and the buttons point at
                    CONFIG.telegram.

   The clock always counts toward the fixed timestamp, never
   "now + 24 h", so someone arriving ten minutes before opening sees
   ten minutes. The switch happens live, without a reload, and the
   remaining time is clamped at zero so it can never read negative.
   ------------------------------------------------------------ */
const tg = { at: null, timer: null };

// HH:MM:SS, or DD:HH:MM:SS once the gap is longer than a day.
// Clamped at zero, so it can never render negative time.
function fmtCountdown(ms) {
  let s = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600);  s -= h * 3600;
  const m = Math.floor(s / 60);    s -= m * 60;
  const pad = (n) => String(n).padStart(2, '0');
  const clock = `${pad(h)}:${pad(m)}:${pad(s)}`;
  return d > 0 ? `${pad(d)}:${clock}` : clock;
}

function paintTelegramGate() {
  const box = $('[data-tg-gate]');
  const btns = $$('[data-social="telegram"]');
  const remaining = tg.at - Date.now();

  if (remaining <= 0) {
    clearInterval(tg.timer);
    tg.timer = null;
    if (box) box.hidden = true;
    btns.forEach((a) => { a.hidden = false; });
    return;
  }

  btns.forEach((a) => { a.hidden = true; });
  if (!box) return;
  box.hidden = false;
  const clock = $('[data-tg-clock]', box);
  if (clock) clock.textContent = fmtCountdown(remaining);
  const when = $('[data-tg-when]', box);
  if (when && !when.dataset.filled) {
    when.textContent = new Date(tg.at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    when.dataset.filled = '1';
  }
}

function initTelegramGate() {
  const parsed = CONFIG.telegramOpensAt ? Date.parse(CONFIG.telegramOpensAt) : NaN;
  tg.at = isFinite(parsed) ? parsed : null;

  const box = $('[data-tg-gate]');
  const btns = $$('[data-social="telegram"]');

  // No opening time, or nowhere to send people: show nothing at all.
  if (tg.at == null || !CONFIG.telegram) {
    if (box) box.remove();
    btns.forEach((a) => a.remove());
    return;
  }

  btns.forEach((a) => { a.href = CONFIG.telegram; });
  paintTelegramGate();
  if (Date.now() < tg.at) tg.timer = setInterval(paintTelegramGate, 1000);
}

/* ------------------------------------------------------------
   9. Gallery — reads assets/gallery/ without a build step
   ------------------------------------------------------------
   Static hosts can't list a folder, so the loader does this:
     1. If assets/gallery/manifest.json exists (a JSON array of
        filenames), use it. Handy if you want a custom order.
     2. Otherwise probe meme-01, meme-02, … (webp/jpg/jpeg/png),
        six at a time, and stop after a whole batch is missing.
   Add or remove files freely; the code never changes.
   Captions are optional: keyed by file name without extension.
   ------------------------------------------------------------ */
const GALLERY_EXTS = ['webp', 'jpg', 'jpeg', 'png'];
const GALLERY_BATCH = 6;
const GALLERY_MAX = 300;
const GALLERY_CAPTIONS = {
  'meme-01': 'Habibi, come to Dubai.',
  'meme-02': 'Rooftop, skyline, no notifications.',
  'meme-03': 'Trade, chill, repeat.',
  'meme-04': 'Habibi, the chart is beautiful today.',
  'meme-05': 'Green car. Green candles. Coincidence, habibi?',
  'meme-06': 'Street cred, habibi.',
  'meme-07': 'Small buys. Big dreams.',
  'meme-08': 'Habibi in orbit. The family follows.',
  'meme-09': 'Same guy. Bigger plans.',
  'meme-10': 'Counting blessings, habibi.',
  'meme-11': 'Boarding now. Destination: anywhere.',
  'meme-12': 'From earth to Mars, habibi.',
  'meme-13': 'Good trades. Better views.',
  'meme-14': 'No limits, habibi.',
  'meme-15': 'Higher, faster, further.',
};
const captionFor = (url) => {
  const m = url.match(/([^/]+)\.[a-z0-9]+$/i);
  return (m && GALLERY_CAPTIONS[m[1]]) || '';
};

function probeImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}
async function exists(url) {
  // HEAD is cheap on http(s); fall back to an Image probe on file:// or if HEAD is blocked.
  if (location.protocol.startsWith('http')) {
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      if (!res.ok) return false;
      // Some hosts answer every unknown path with the HTML page (SPA fallback); treat that as "missing".
      const type = res.headers.get('content-type') || '';
      return !type.startsWith('text/html');
    } catch { /* fall through */ }
  }
  return probeImage(url);
}
async function findImage(base) {
  for (const ext of GALLERY_EXTS) {
    const url = `${base}.${ext}`;
    if (await exists(url)) return url;
  }
  return null;
}

async function discoverGallery() {
  // 1. Manifest
  if (location.protocol.startsWith('http')) {
    try {
      const res = await fetch(`${GALLERY_DIR}manifest.json`, { cache: 'no-store' });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length) return list.map((f) => (f.startsWith('http') || f.includes('/') ? f : GALLERY_DIR + f));
      }
    } catch { /* no manifest, fine */ }
  }

  // 2. Sequential probing
  const found = [];
  for (let start = 1; start <= GALLERY_MAX; start += GALLERY_BATCH) {
    const batch = [];
    for (let i = start; i < start + GALLERY_BATCH; i++) batch.push(findImage(`${GALLERY_DIR}meme-${String(i).padStart(2, '0')}`));
    const results = await Promise.all(batch);
    const hits = results.filter(Boolean);
    found.push(...hits);
    if (!hits.length) break;
  }
  return found;
}

const lightbox = { urls: [], index: 0, lastFocus: null };

function openLightbox(i) {
  const lb = $('[data-lightbox]');
  if (!lb || !lightbox.urls.length) return;
  lightbox.index = (i + lightbox.urls.length) % lightbox.urls.length;
  const url = lightbox.urls[lightbox.index];
  const cap = captionFor(url);
  const img = $('[data-lb-img]', lb);
  img.src = url;
  img.alt = cap || `Meme ${lightbox.index + 1}`;
  $('[data-lb-caption]', lb).textContent = `${cap ? cap + ' · ' : ''}${lightbox.index + 1} / ${lightbox.urls.length}`;
  if (lb.hidden) {
    lightbox.lastFocus = document.activeElement;
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    $('[data-lb-close]', lb).focus();
  }
  // Preload neighbours
  [1, -1].forEach((d) => { const n = new Image(); n.src = lightbox.urls[(lightbox.index + d + lightbox.urls.length) % lightbox.urls.length]; });
}
function closeLightbox() {
  const lb = $('[data-lightbox]');
  if (!lb || lb.hidden) return;
  lb.hidden = true;
  document.body.style.overflow = '';
  if (lightbox.lastFocus && lightbox.lastFocus.focus) lightbox.lastFocus.focus();
}
function initLightbox() {
  const lb = $('[data-lightbox]');
  if (!lb) return;
  $('[data-lb-close]', lb).addEventListener('click', closeLightbox);
  $('[data-lb-prev]', lb).addEventListener('click', () => openLightbox(lightbox.index - 1));
  $('[data-lb-next]', lb).addEventListener('click', () => openLightbox(lightbox.index + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') openLightbox(lightbox.index - 1);
    else if (e.key === 'ArrowRight') openLightbox(lightbox.index + 1);
  });
  // Swipe
  let x0 = null;
  lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) openLightbox(lightbox.index + (dx < 0 ? 1 : -1));
  }, { passive: true });
}

async function initGallery() {
  const grid = $('[data-gallery]');
  const empty = $('[data-gallery-empty]');
  if (!grid) return;

  const urls = await discoverGallery();
  lightbox.urls = urls;

  if (!urls.length) { grid.hidden = true; if (empty) empty.hidden = false; return; }
  if (empty) empty.hidden = true;

  const frag = document.createDocumentFragment();
  urls.forEach((url, i) => {
    const cap = captionFor(url);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'polaroid';
    btn.setAttribute('aria-label', `Open meme ${i + 1} of ${urls.length}${cap ? ': ' + cap : ''}`);
    const img = document.createElement('img');
    img.className = 'polaroid__img';
    img.src = url;
    img.alt = cap || `Habibi meme ${i + 1}`;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('load', () => img.classList.add('is-loaded'));
    if (img.complete && img.naturalWidth) img.classList.add('is-loaded');
    btn.appendChild(img);
    const label = document.createElement('span');
    label.className = 'polaroid__caption';
    label.textContent = cap;
    btn.appendChild(label);
    btn.addEventListener('click', () => openLightbox(i));
    frag.appendChild(btn);
  });
  grid.appendChild(frag);
}

async function initBanner() {
  const fig = $('[data-banner]');
  if (!fig) return;
  for (const url of BANNER_CANDIDATES) {
    if (await exists(url)) { $('img', fig).src = url; fig.hidden = false; return; }
  }
}

/* ------------------------------------------------------------
   10. Scroll reveal + misc
   ------------------------------------------------------------ */
function initReveal() {
  const els = $$('.reveal');
  if (!('IntersectionObserver' in window)) { document.documentElement.classList.add('no-io'); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  els.forEach((el) => io.observe(el));
  // Anything already in view still shows even if the observer is slow to fire
  setTimeout(() => $$('.reveal:not(.is-visible)').forEach((el) => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('is-visible'); }), 400);
}

function initMisc() {
  const y = $('[data-year]');
  if (y) y.textContent = String(new Date().getFullYear());
}

/* ------------------------------------------------------------
   Boot
   ------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  initContractAddress();
  initBuyButtons();
  initListingLinks();
  initSocialLinks();
  initWebsiteLink();
  initCopyButtons();
  initTelegramGate();
  initLivePanel();
  initLightbox();
  initGallery();
  initBanner();
  initReveal();
  initMisc();
});
