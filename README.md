# Habibi ($HABIBI)

Marketing site for **Habibi ($HABIBI)** on Solana, launched via pump.fun.
Plain HTML, CSS and vanilla JS. No framework, no build step, no npm.

```
index.html          the whole page
styles.css          styles (sand/cream base, thobe green + gold, oil-black panels)
main.js             CONFIG + all behaviour (live panel, Telegram gate, gallery)
assets/
  logo.webp         square logo (topbar, footer)
  mascot.webp       cut-out mascot with alpha (hero)
  og.jpg            1200×630 social preview
  favicon-*.png, apple-touch-icon.png
  banner.webp       wide banner shown above the gallery
  gallery/          memes shown on the site (read automatically, meme-01.webp ...)
review/             images held back for a decision (not read by the site, not deployed)
tools/
  optimize-images.py  resizes + converts memes to WebP and names them meme-NN.webp
```

---

## 1. CONFIG (launch data)

Open `main.js`. The first thing in the file is the `CONFIG` block. It is the only thing you edit; every other file reads from it.

**The token has not launched yet, so the launch keys are `null`.** That is a working state, not a broken one: buy buttons read "Launching soon" and are not clickable, the CA reads "CA revealed at launch" with the copy button disabled, missing links are removed from the DOM entirely (never a dead `#`), and the live panel shows `—` with "Live after launch". Fill a key in and that part of the page switches itself on. No other file needs touching.

| Key | Value now | What it switches on |
|---|---|---|
| `x` | `x.com/habibionsol_` | Every X link on the page. `null` = those links are removed |
| `telegram` | `t.me/HabibiOnSolanaa` | Where the Telegram buttons point **once the group is open** — see §2. On its own it shows nothing |
| `telegramOpensAt` | `null` | The countdown and the Telegram buttons. See §2 |
| `contractAddress` | `null` | CA in topbar + hero, copy button, Solscan link, and the whole live panel. Must be a base58 Solana mint (32–44 chars) |
| `buyUrl` | `null` | Every "Buy" button. If `null` while `contractAddress` is set, it is derived as `https://pump.fun/coin/<contractAddress>` |
| `dexscreener` | `null` | Hero button, chip under the live panel, footer link |
| `solscan` | `null` | All "Solscan" links. `null` = derived as `https://solscan.io/token/<contractAddress>` |
| `website` | `https://www.habibioil.xyz/` | The domain chip in the footer. `null` = removed |
| `dextools`, `coinmarketcap`, `coingecko` | `null`, not listed yet | Chips under the live panel. `null` = removed from the page |

**Address format.** `isAddress()` validates base58: `/^[1-9A-HJ-NP-Za-km-z]{32,44}$/`. The base58 alphabet has no `0`, `O`, `I` or `l`, and Solana addresses carry no `0x` prefix. The shortener keeps five characters at each end (`2Rbed…zpump`), because on Solana both ends carry meaning — unlike a hex address, there is no fixed prefix to throw away.

**Domain.** The canonical URL, the Open Graph URL and `og:image` in `index.html`, plus `robots.txt` and `sitemap.xml`, all point at `https://www.habibioil.xyz/`. If the domain changes, that is a find-and-replace across those three files; `CONFIG.website` only drives the footer chip.

---

## 2. The Telegram countdown

The Telegram link lives in `CONFIG` from the start, but the group is not announced until it is actually staffed. `CONFIG.telegramOpensAt` is what decides that — not whether the link is filled in.

Set it to an ISO 8601 string **with an offset**, so it means the same instant everywhere:

```js
telegramOpensAt: '2026-09-14T14:00:00+02:00',
```

Three states, all handled:

| `telegramOpensAt` | What renders |
|---|---|
| `null` | Nothing. No countdown, no Telegram button, no placeholder. The gate section is removed from the DOM |
| in the future | The countdown band under the hero. Every Telegram button stays hidden |
| in the past | The band is gone; the Telegram buttons appear and point at `CONFIG.telegram` |

The clock counts toward that **fixed timestamp**, never `Date.now() + 24h`. Someone arriving ten minutes before opening sees ten minutes, not a fresh day. The switch to the open state happens live, on the running one-second tick, with no reload — and the remaining time is clamped at zero, so it can never render negative. The digits use `font-variant-numeric: tabular-nums` so they keep their width instead of twitching once a second.

The gate is `hidden` in the markup and only revealed by JS, so no countdown flashes on a page where there is nothing to count.

---

## 3. Where the live numbers come from

One source, one request: the DEXScreener public token endpoint (`/latest/dex/tokens/<mint>`). It is CORS-open and needs no key, which matters because this is a static site with no server to keep a key in. When several pairs exist, the one with the deepest liquidity wins — that is the pair whose price means anything.

| Stat | Source |
|---|---|
| Market cap | DEXScreener `marketCap`, falling back to `fdv` |
| Price | DEXScreener `priceUsd` and `priceNative` (in SOL) |
| 24 h volume | DEXScreener `volume.h24` |
| Trades | DEXScreener `txns.h24`, buys + sells |
| Liquidity | DEXScreener `liquidity.usd` |

If the source is down, the panel keeps the last known values (cached in the browser) with an "Updated HH:MM" stamp and the status "Reconnecting". It never shows a spinner forever. Before a pair exists the status reads "Waiting for the first trade".

**What is deliberately not shown.**

- **Holder count.** Solana's public RPC cannot give one. `getTokenLargestAccounts` returns the top accounts only; a real total needs an indexer (Helius, Birdeye, Solscan Pro) and every one of them wants an API key. A static page cannot hold a key without publishing it. So the tile is not on the page at all, rather than showing a number that is quietly wrong.
- **Cashback figures.** pump.fun exposes no public endpoint for trader cashback. The site therefore states the 0.3 % fee and where it was pointed, and prints no amount, rate, or cadence it cannot verify.

---

## 4. How the fee reaches traders

pump.fun charges **0.3 % on every buy and every sell**. Before launch the creator chooses, once and irreversibly, between keeping that fee and redirecting it to traders as cashback. Habibi redirects it.

This is the part the old Robinhood Chain version of this site got differently, and the difference matters: **cashback follows trading, not balances.** It is not a holder payout. Holding $HABIBI does not earn it, and no copy on the site may imply otherwise. The mechanism is pump.fun's from end to end — this site runs no distribution logic, holds no keys and never touches the money.

> **Check after launch.** The cashback choice is made in the pump.fun launch flow and cannot be changed afterwards. Confirm on the coin's own pump.fun page that cashback actually reads as enabled before pointing anyone at this copy. If it does not, §4 of this README, the "How it works" section, the Habibinomics cards and the hero lede all have to change — they are the only places that describe it.

---

## 5. Gallery: adding and removing memes

The gallery reads `assets/gallery/` automatically. Static hosts cannot list a folder, so the loader looks for files named:

```
assets/gallery/meme-01.webp
assets/gallery/meme-02.webp
...
```

`.webp`, `.jpg`, `.jpeg` and `.png` all work. Numbering can have gaps of up to five. Remove a file and it simply disappears; add the next number and it shows up. No code changes.

**Captions** are optional. `GALLERY_CAPTIONS` in `main.js` (section 9) maps `meme-NN` to a one-liner shown under the polaroid and in the lightbox. A meme without a caption shows no caption strip.

**Optional custom order:** create `assets/gallery/manifest.json` with a JSON array of filenames, e.g. `["meme-05.webp", "meme-01.webp"]`. If that file exists, it wins over the probing.

**Optimizing new memes** (recommended, keeps the page fast):

```bash
python -m pip install pillow            # once
python tools/optimize-images.py path/to/new-memes --out assets/gallery
```

It converts to WebP (max 1080 px), skips duplicates, and continues the numbering from the highest existing `meme-NN`.

### Images held back in `review/`

Images that fail a house rule are kept out of the gallery and out of the deploy (`.vercelignore`), with the reason written down in `review/README.md`. To publish one anyway, move it to `assets/gallery/meme-NN.webp` with the next free number.

### The mascot's chest emblem

The mascot wears a small green-and-white capsule on the chest, and the same mark appears on flags, mugs, cans and vehicles across the artwork, including the logo and the banner. That capsule is pump.fun's logo mark. The previous artwork had the same problem with a different owner — a feather that resembled Robinhood's. A launchpad's mark worn on the mascot's clothing reads as a partnership rather than as a description of where the token lives, which is why the house rules below forbid it and why several images sit in `review/`. Swapping in mark-free artwork is a matter of replacing the files in `assets/` and `assets/gallery/`.

---

## 6. Deploy

No build step. Upload the folder as-is.

**Vercel**
1. Push this folder to a Git repo (GitHub, GitLab).
2. vercel.com → Add New Project → import the repo.
3. Framework preset: **Other**. Build command: empty. Output directory: `./` (root).
4. Deploy. Add the domain under Settings → Domains and point the DNS as Vercel shows.

Or from a terminal: `npx vercel --prod` inside the folder.

**GitHub Pages** also works: Settings → Pages → Source *Deploy from a branch*, branch `main`, folder `/ (root)`. The `.nojekyll` file is there for that case.

**Test locally**

```bash
python -m http.server 8080
# open http://localhost:8080
```

Opening `index.html` directly from disk works too, except the gallery manifest lookup (probing still works).

---

## 7. Facts baked into the site

| | |
|---|---|
| Chain | Solana |
| Launchpad | pump.fun |
| Explorer | `https://solscan.io` |
| Wallets named in "How to buy" | Phantom, Solflare |
| Address format | base58, 32–44 characters, no `0x` prefix |
| Contract | not launched yet — `CONFIG.contractAddress` is `null` |
| Supply | 1,000,000,000, fixed |
| Fee | 0.3 % on every trade, charged by pump.fun |
| Where the fee goes | redirected to traders as cashback. Chosen once before launch, irreversible. **Not** a holder distribution |

There is no wallet-connection code and no network-switch button on this site. Those were Robinhood Chain artefacts (`wallet_addEthereumChain`, chain ID 4663, an RPC URL to copy) and they are gone — Solana wallets need none of it. The page never asks the visitor's wallet for anything.

To change any copy, edit `index.html` directly.

## 8. House rules the copy follows

- Jokes about oil, abundance and generosity. Never a people, an accent or a group as the punchline.
- No "APY", "earn", "passive income", "guaranteed", no price predictions. Mechanics only.
- **No percentage anywhere except the real 0.3 % trading fee.**
- No made-up numbers. If data is missing, the site says so.
- Nothing that implies hold-to-earn. Cashback follows trades, not balances.
- No third-party logos or wordmarks as graphics — not pump.fun's, not Solana's. Writing "on Solana, launched via pump.fun" in text is a description and is fine; the same mark on the mascot's clothing is not.
- Risk text in the footer. It does not joke.
- No private key or seed phrase input anywhere. Ever.
