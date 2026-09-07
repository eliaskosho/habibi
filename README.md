# Habibi ($HABIBI)

Marketing site for **Habibi ($HABIBI)** on Robinhood Chain.
Plain HTML, CSS and vanilla JS. No framework, no build step, no npm.

```
index.html          the whole page
styles.css          styles (sand/cream base, sunset orange + gold, oil-black panels)
main.js             CONFIG + all behaviour (live panel, gallery, wallet button)
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

Open `main.js`. The first thing in the file is the `CONFIG` block. It is the only thing you edit; every other file reads from it. Everything is `null` until launch, and the site works with everything `null`: buy buttons read "Launching soon", the CA reads "CA revealed at launch", missing links are removed (never a dead `#`), the live panel shows `—` with "Live after launch".

| Key | Fill in with | What it switches on |
|---|---|---|
| `contractAddress` | the $HABIBI token contract | CA in topbar + hero, copy button, Blockscout link, live panel (holders, supply, price, market cap, volume) |
| `buyUrl` | pons trade page, `https://www.ponsfamily.com/launchpad/<contractAddress>` | Every "Buy" button and the footer pons link. If `null` while `contractAddress` is set, it is derived automatically |
| `dexscreener` | pair page on DEXScreener | Hero button, chip under the live panel, footer link. The pair id in the URL is also what the live panel reads price, market cap and 24 h volume from |
| `explorer` | Blockscout token page | All "Blockscout" links. `null` = derived from the chain explorer + `contractAddress` |
| `telegram`, `x` | community links | Every Telegram / X link on the page. `null` = those links are removed |
| `dextools`, `coinmarketcap`, `coingecko` | listing pages, when listed | Chips under the live panel. `null` = removed from the page |
| `rewardTokenAddress` | the Oil instrument on Robinhood Chain (the pair's quote asset) | Distribution stats, and picks the Oil-quoted pair on DEXScreener |
| `distributorAddress` | the pons vault / distributor that sends Oil to holders (the pool's creator-fee recipient) | "Oil poured to holders", "Last pour", measured cadence |
| `distributionFromBlock` | block just before the pool went live | Where the pour scan starts. Without it the scan is capped to the last ~3.5 days and the total is shown with "≈" |
| `feeEscrowAddress` | pons V2 fee escrow | "… Oil collected, waiting for the next pour" under the total |
| `totalDistributedCall` | `null` | Optional `{ to, data }` `eth_call` returning the lifetime total as `uint256`, if the vault ever exposes one |

Setting a key back to `null` returns that part of the page to its pre-launch state.

**Domain.** `index.html`, `robots.txt` and `sitemap.xml` contain the placeholder `DOMAIN-TBD` in the canonical URL, the Open Graph URL and the `og:image` URL. Replace it with the real domain (one find-and-replace) once the site has one, otherwise link previews on X and Telegram will not find the image.

### Where the live numbers come from

| Stat | Source |
|---|---|
| Supply, decimals | Robinhood Chain RPC (`eth_call`) |
| Holders | Blockscout API v2 (`/api/v2/tokens/<address>`, fallback `/counters`) |
| Price, market cap, 24 h volume, trade count | DEXScreener public API, pair taken from `dexscreener` |
| Oil poured, last pour, pour count | Robinhood Chain RPC: `eth_getLogs` for Oil transfers sent by `distributorAddress` since `distributionFromBlock`, chunked (250k blocks, halved on failure) and cached in the browser so only new blocks are scanned on refresh. Blockscout as a bounded fallback; `totalDistributedCall` if set |
| Oil collected, waiting for the next pour | `feeEscrowAddress.balanceOfToken(distributorAddress, rewardTokenAddress)` via RPC |
| Next pour in | Median gap between the newest pours (up to 8), counted from the last one. Shows "—" until two pours exist. **Never a fixed timer**: the copy says the vault runs on a five-minute cycle, the panel shows what the chain actually did |

If a source is down, the panel keeps the last known values (cached in the browser) with an "Updated HH:MM" stamp and the status "Reconnecting". It never shows a spinner forever.

### How the fee reaches holders

Every swap pays the 1 % creator tax in Oil to the pons hook, which sweeps it into the pons fee escrow. The escrow credits it to `distributorAddress`, the pons V2 token vault for this launch. The vault then multi-sends Oil to holders pro rata in one transaction per pour; each pour shows up as ERC-20 transfers from `distributorAddress`, which is what the live panel reads. Oil amounts are summed in raw units and displayed through the token's ERC-8056 `uiMultiplier()` if it has one. USD values use the Oil price implied by the DEXScreener pair.

---

## 2. Gallery: adding and removing memes

The gallery reads `assets/gallery/` automatically. Static hosts cannot list a folder, so the loader looks for files named:

```
assets/gallery/meme-01.webp
assets/gallery/meme-02.webp
...
```

`.webp`, `.jpg`, `.jpeg` and `.png` all work. Numbering can have gaps of up to five. Remove a file and it simply disappears; add `meme-19.webp` and it shows up. No code changes.

**Captions** are optional. `GALLERY_CAPTIONS` in `main.js` (section 9) maps `meme-NN` to a one-liner shown under the polaroid and in the lightbox. A meme without a caption shows no caption strip.

**Optional custom order:** create `assets/gallery/manifest.json` with a JSON array of filenames, e.g. `["meme-05.webp", "meme-01.webp"]`. If that file exists, it wins over the probing.

**Optimizing new memes** (recommended, keeps the page fast):

```bash
python -m pip install pillow            # once
python tools/optimize-images.py path/to/new-memes --out assets/gallery
```

It converts to WebP (max 1080 px), skips duplicates, and continues the numbering from the highest existing `meme-NN`.

### Images held back in `review/`

Eight images from the launch batch are in `review/`, not in the gallery. Each file name says why (a third-party wordmark or logo in the picture, or a joke at a group's expense). See `review/README.md`. To publish one anyway, move it to `assets/gallery/meme-NN.webp` with the next free number. `review/` is excluded from Vercel deploys via `.vercelignore`.

### The mascot's chest emblem

The mascot wears a small feather-shaped emblem on the chest, and the same mark appears on barrels, flags and vehicles in most of the artwork, including the logo and the banner. It resembles the Robinhood feather. The project owner chose the logo and banner with this mark; swapping in mark-free artwork is a matter of replacing the files in `assets/` and `assets/gallery/`.

---

## 3. Deploy

No build step. Upload the folder as-is.

**Vercel**
1. Push this folder to a Git repo (GitHub, GitLab).
2. vercel.com → Add New Project → import the repo.
3. Framework preset: **Other**. Build command: empty. Output directory: `./` (root).
4. Deploy. Add the domain under Settings → Domains and point the DNS as Vercel shows.
5. Replace `DOMAIN-TBD` (see above) with that domain and push again.

Or from a terminal: `npx vercel --prod` inside the folder.

**GitHub Pages** also works: Settings → Pages → Source *Deploy from a branch*, branch `main`, folder `/ (root)`. The `.nojekyll` file is there for that case.

**Test locally**

```bash
python -m http.server 8080
# open http://localhost:8080
```

Opening `index.html` directly from disk works too, except the gallery manifest lookup (probing still works).

---

## 4. Facts baked into the site

| | |
|---|---|
| Chain | Robinhood Chain, chain ID 4663 (`0x1237`), Arbitrum Orbit L2, gas in ETH |
| RPC | `https://rpc.mainnet.chain.robinhood.com` |
| Explorer | `https://robinhoodchain.blockscout.com` |
| Launchpad | pons V2, `https://www.ponsfamily.com/launchpad` |
| Paired asset / reward | Oil, a tokenized oil instrument on Robinhood Chain |
| Supply | 1,000,000,000, fixed |
| Fee | 1 % creator tax on every trade, collected in Oil |
| Distribution | to all holders, pro rata, on a five-minute cycle, handled natively by the pons V2 token vault. The live panel shows the real cadence |

To change any copy, edit `index.html` directly. The "Add network to wallet" button calls `wallet_addEthereumChain` with the values in the `CHAIN` object at the top of `main.js`.

## 5. House rules the copy follows

- Jokes about oil, abundance and generosity. Never a people, an accent or a group as the punchline.
- No "APY", "earn", "passive income", "guaranteed", no price predictions. Mechanics only.
- No made-up numbers. If data is missing, the site says so.
- No third-party logos or wordmarks (Robinhood, pons, the Oil issuer). The site may say it lives *on* Robinhood Chain and pays out *in* Oil.
- `pons` in lowercase.
- Risk text in the footer, including the US restriction for markets paired against tokenized instruments on pons. The risk text does not joke.
- No private key or seed phrase input anywhere. Ever.
