# Habibi ($HABIBI)

Marketing site for **Habibi ($HABIBI)** on Solana, launched via pump.fun.
Plain HTML, CSS and vanilla JS. No framework, no build step, no npm.

```
index.html          the whole page
styles.css          styles (palette measured from the artwork — see §4)
main.js             CONFIG + all behaviour (live panel, Telegram gate, gallery)
assets/
  logo.webp         square logo (topbar, footer)
  mascot.webp       cut-out mascot with alpha (hero)
  og.jpg            1200×630 social preview
  favicon-*.png, apple-touch-icon.png
  (banner.webp)     wide banner above the gallery — NOT PRESENT, see §4
  gallery/          memes shown on the site (read automatically, meme-01.webp ...)
review/             images held back for a decision (not read by the site, not deployed)
tools/
  optimize-images.py  resizes + converts memes to WebP and names them meme-NN.webp
```

---

## 1. CONFIG (launch data)

Open `main.js`. The first thing in the file is the `CONFIG` block. It is the only thing you edit; every other file reads from it.

**The launch keys are filled in.** Set any of them back to `null` and that part of the page returns to its pre-launch state on its own: buy buttons read "Launching soon" and stop being clickable, the CA reads "CA revealed at launch" with the copy button disabled, missing links are removed from the DOM entirely rather than left as a dead `#`, and the live panel shows `—`. No other file needs touching.

The mint keypair was generated ahead of the launch, so there is a window in which the address is real but the account does not exist on-chain yet. The site handles it: DEXScreener answers with an empty array, the panel shows `—` with "No pair yet" and the status reads "Waiting for the first trade". It fills itself in on the next poll once trading starts — no redeploy.

| Key | Value now | What it switches on |
|---|---|---|
| `x` | `x.com/habibionsol_` | Every X link on the page. `null` = those links are removed |
| `telegram` | `t.me/HabibiOnSolanaa` | Where the Telegram buttons point **once the group is open** — see §2. On its own it shows nothing |
| `telegramOpensAt` | `2026-09-15T17:09:35+02:00` | The countdown and the Telegram buttons. See §2 |
| `contractAddress` | `CmFur…a8pump` | CA in topbar + hero, copy button, Solscan link, and the whole live panel. Must be a base58 Solana mint (32–44 chars) |
| `buyUrl` | pump.fun coin page | Every "Buy" button. If `null` while `contractAddress` is set, it is derived as `https://pump.fun/coin/<contractAddress>` |
| `dexscreener` | DEXScreener token page | Hero button, chip under the live panel, footer link |
| `solscan` | Solscan token page | All "Solscan" links. `null` = derived as `https://solscan.io/token/<contractAddress>` |
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

DEXScreener, CORS-open and no key needed, which matters because this is a static site with no server to keep a key in. Two endpoints are tried in order:

```
1. https://api.dexscreener.com/tokens/v1/solana/<mint>     -> a bare ARRAY of pairs
2. https://api.dexscreener.com/latest/dex/tokens/<mint>    -> an OBJECT with .pairs
```

**The shapes differ**, which was confirmed against real responses rather than assumed: the first answers with a plain array (`[]` when nothing is indexed), the second with an object whose `pairs` key is `null` in that case. The per-pair fields are identical, so `pairsFrom()` normalises both to a list before anything reads them. The fallback runs when the primary errors *or* returns nothing.

When several pairs come back, **the one with the deepest liquidity wins** — never simply the first in the array, which is often a dust pair with a meaningless price.

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
- **Cashback figures.** Checked against pump.fun's own program documentation, not guessed. Cashback is tracked in **per-user** `UserVolumeAccumulator` accounts — a PDA from the seed `"user_volume_accumulator"` plus the wallet and the program id, one for the bonding-curve program and one for the AMM. Unclaimed cashback is read as the account's lamports minus rent-exempt (bonding curve) or its WSOL ATA balance (AMM), and claimed with a `claim_cashback` instruction.

  Two things follow. There is **no token-wide aggregate** anywhere — no "total cashback paid for $HABIBI" figure exists to read. And the per-user figure needs the viewer's wallet address, which means wallet connection; this site deliberately has no wallet code and asks the visitor's wallet for nothing. So there is nothing a static page can honestly display, and there are no cashback tiles in the live panel. The site states the 0.3 % fee and where it was pointed, and prints no amount, rate or cadence.


---

## 4. Palette

Every colour in `styles.css` is measured from the supplied artwork, not picked by eye, and
every one of them is a custom property in the `:root` block. **Nothing below that block
hardcodes a colour** — if you need a new shade, add a token.

How they were sampled: the logo and the fourteen meme originals were quantised and counted.
The most common non-white colour in the mascot artwork is the thobe green at **12.5 %** of
all pixels, and across the whole meme set the greens cluster tightly at hue 138–146 with full
saturation. That green is the brand; the rest of the palette is built from its hue.

| Role | Token | Value | Where it came from |
|---|---|---|---|
| Accent | `--green` | `#007028` | the mascot's thobe — the single most common colour in the logo |
| Accent, lighter | `--green-2` | `#00913a` | same hue, lifted for hover and for the live dot |
| Accent, deep | `--green-deep` | `#00461a` | the shadowed folds of the thobe; the hero's lower field |
| Ground | `--bg` | `#eef4ef` | hue 140 taken down to a tint, so the page and the logo share a hue |
| Ground, second | `--bg-2` | `#dde9e0` | one step darker, for disabled controls and insets |
| Neutral | `--ink` | `#0c1a11` | the artwork's outline black, carrying the same green cast |
| Neutral, muted | `--ink-2` | `#3d5244` | body copy |
| Neutral, quiet | `--ink-3` | `#55695b` | labels, fineprint, disabled button text |
| Panel | `--panel` | `#05160c` | the darkest greens in the night-time memes |
| Warm highlight | `--warm` | `#f8b068` | the mascot's own skin tone — the only non-green in the logo |

**The hero runs into the logo's green.** The hero background ends on `--green-deep` and the
disc behind the mascot is a `--green-2` → `--green` radial, so the cut-out sits on the same
field it was drawn on. Without that the hero read as two different pictures stacked on top of
each other.

**Contrast.** Every foreground/background pairing the site actually uses was checked against
WCAG AA (4.5:1 for body text, 3:1 for large). The audit is scripted, not eyeballed: it walks
the rendered DOM, resolves each element's real background through transparency, and compares.
All pass. Two things were changed to get there — the numbered circles in "How it works",
"How to buy" and the roadmap were near-black on the accent green (2.97:1) and are now white
(6.27:1); the disabled "Launching soon" button was re-checked at 4.72:1.

The one element the script still flags is `.hero__title`, at 1.12:1. That is a limit of the
checker, not a defect: the title is a white fill carried by a dark `-webkit-text-stroke`
contour, which `getComputedStyle` cannot see. The contour is what provides the contrast, and
it was thickened to `0.045em` so the letterform edge stays dark where the hero gradient is
still light.

### The banner is missing

`assets/banner.webp` does not exist. The wide banner was not in the supplied batch — that
folder held the logo artwork, fourteen meme originals and fifteen square crops, all of them
square or near-square. `initBanner()` probes for `assets/banner.{webp,jpg,png}` and hides the
figure when it finds nothing, so the gallery is correct without it. Drop a wide file in at
that path and it appears; no code change.

---

## 5. How the fee reaches traders

pump.fun charges **0.3 % on every buy and every sell**. Before launch the creator chooses, once and irreversibly, between keeping that fee and redirecting it to traders as cashback. Habibi redirects it.

This is the part the old Robinhood Chain version of this site got differently, and the difference matters: **cashback follows trading, not balances.** It is not a holder payout. Holding $HABIBI does not earn it, and no copy on the site may imply otherwise. The mechanism is pump.fun's from end to end — this site runs no distribution logic, holds no keys and never touches the money.

> **Check after launch.** The cashback choice is made in the pump.fun launch flow and cannot be changed afterwards. Confirm on the coin's own pump.fun page that cashback actually reads as enabled before pointing anyone at this copy. If it does not, §5 of this README, the "How it works" section, the Habibinomics cards and the hero lede all have to change — they are the only places that describe it.

---

## 6. Gallery: adding and removing memes

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

The mascot wears a small green-and-white capsule on the chest, and the same mark recurs on flags, mugs, cans, backpacks and licence plates across the artwork, including `logo.webp`, `mascot.webp` and the favicons. That capsule is pump.fun's logo mark, and several memes carry the `pump` wordmark outright. The previous artwork had the same problem with a different owner — a feather that resembled Robinhood's.

A launchpad's mark worn on the mascot's clothing reads as a partnership rather than as a description of where the token lives, which is what the house rule below forbids. The set was published in full anyway, on the owner's explicit instruction after the marks were pointed out. `review/README.md` lists what each image carries, and names the three that carry the capsule and nothing else. Because the capsule is part of the character design rather than an overlay, no crop reaches it — only redrawn artwork would.

---

## 7. Deploy

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

## 8. Facts baked into the site

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

## 9. House rules the copy follows

- Jokes about oil, abundance and generosity. Never a people, an accent or a group as the punchline.
- No "APY", "earn", "passive income", "guaranteed", no price predictions. Mechanics only.
- **No percentage anywhere except the real 0.3 % trading fee.**
- No made-up numbers. If data is missing, the site says so.
- Nothing that implies hold-to-earn. Cashback follows trades, not balances.
- No third-party logos or wordmarks as graphics — not pump.fun's, not Solana's. Writing "on Solana, launched via pump.fun" in text is a description and is fine; the same mark on the mascot's clothing is not.
- Risk text in the footer. It does not joke.
- No private key or seed phrase input anywhere. Ever.
