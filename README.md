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

Open `main.js`. The first thing in the file is the `CONFIG` block. It is the only thing you edit; every other file reads from it. The token launched on 2026-09-08, so the block now holds real values. Any key set back to `null` returns that part of the page to its pre-launch state on its own: buy buttons read "Launching soon", the CA reads "CA revealed at launch", missing links are removed (never a dead `#`), the live panel shows `—` with "Live after launch".

| Key | Live value | What it switches on |
|---|---|---|
| `contractAddress` | `0x79b5E43aA2e43eee21B9ddf1855a6dd2833Ac533` (checksummed; this exact string is shown and copied) | CA in topbar + hero, copy button, Blockscout link, live panel (holders, supply, price, market cap, volume) |
| `buyUrl` | pons trade page for the token | Every "Buy" button and the footer pons link. If `null` while `contractAddress` is set, it is derived as `https://www.ponsfamily.com/launchpad/<contractAddress>` |
| `dexscreener` | pair `0x6575c060…77d81` (HABIBI / USO on Uniswap v4) | Hero button, chip under the live panel, footer link. The pair id in the URL is also what the live panel reads price, market cap and 24 h volume from |
| `explorer` | Blockscout token page | All "Blockscout" links. `null` = derived from the chain explorer + `contractAddress` |
| `website` | `https://www.habibioil.xyz/` | The domain chip in the footer. `null` = removed |
| `telegram`, `x` | `t.me/HabibimemesRh`, `x.com/HabibiOilRH` | Every Telegram / X link on the page. `null` = those links are removed |
| `dextools`, `coinmarketcap`, `coingecko` | `null`, not listed yet | Chips under the live panel. `null` = removed from the page |
| `rewardTokenAddress` | `0xa30FA36Db767ad9eD3f7a60fC79526fB4d56D344` — USO, the tokenized United States Oil Fund token on Robinhood Chain, the pair's quote asset | Distribution stats, and picks the USO-quoted pair on DEXScreener |
| `distributorAddress` | `0x62283AAae4C807807ddbC51ff85C694cd5582cdd` — the pons holder-distributor for this launch | "Oil poured to holders", "Last pour", measured cadence |
| `distributionFromBlock` | `57601180`, the block of the token's creation transaction | Where the pour scan starts. Without it the scan is capped to the last ~3.5 days and the total is shown with "≈" |
| `feeEscrowAddress` | `0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e` — pons V2 fee escrow | "… USO collected, waiting for the next pour" under the total |
| `totalDistributedCall` | `null` | Optional `{ to, data }` `eth_call` returning the lifetime total as `uint256`, if the vault ever exposes one |

### How the distributor was identified (2026-09-08)

Not guessed. `PonsV2LaunchFactory` (`0x7eD598Bc…`) exposes `getLaunchedToken(address)`; called with the Habibi contract it returns the launch record, whose `creatorFeeRecipient` is `0x62283AAae4C807807ddbC51ff85C694cd5582cdd`. That contract's own `token()` returns the Habibi address, and the pons fee escrow's `balanceOfToken(distributor, USO)` returns a growing USO balance credited to it. The same record confirms `creatorTaxBps = 100` (1 %) and `pairToken = USO`.

**Domain.** The canonical URL, the Open Graph URL and `og:image` in `index.html`, plus `robots.txt` and `sitemap.xml`, all point at `https://www.habibioil.xyz/`. If the domain ever changes, that is a find-and-replace across those three files; `CONFIG.website` only drives the footer chip.

### Where the live numbers come from

| Stat | Source |
|---|---|
| Supply, decimals | Robinhood Chain RPC (`eth_call`) |
| Holders | Blockscout API v2 (`/api/v2/tokens/<address>`, fallback `/counters`) |
| Price, market cap, 24 h volume, trade count | DEXScreener public API, pair taken from `dexscreener` |
| Oil poured, last pour, pour count | Robinhood Chain RPC: `eth_getLogs` for Oil transfers sent by `distributorAddress` since `distributionFromBlock`, chunked (250k blocks, halved on failure) and cached in the browser so only new blocks are scanned on refresh. Blockscout as a bounded fallback; `totalDistributedCall` if set |
| Oil collected, waiting for the next pour | Two RPC reads added together: `feeEscrowAddress.balanceOfToken(distributorAddress, rewardTokenAddress)` (still in the escrow) plus `rewardToken.balanceOf(distributorAddress)` (already claimed out of the escrow, held by the vault). Reading only the escrow understates it badly right after a claim |
| Next pour in | Median gap between the newest pours (up to 8), counted from the last one. **The card is not rendered at all until two real pours have been measured**, so the site never counts down to an event that has not happened. Never a fixed timer |

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
| Contract | `0x79b5E43aA2e43eee21B9ddf1855a6dd2833Ac533`, verified on Blockscout, launched 2026-09-08 09:58 UTC in block 57601180 |
| Pair | HABIBI / USO on Uniswap v4, DEXScreener id `0x6575c060…77d81` |
| Paired asset / reward | USO (`0xa30FA36D…D344`), the tokenized United States Oil Fund token on Robinhood Chain. The copy calls it "Oil"; every number on the page carries the real ticker, USO |
| Supply | 1,000,000,000, fixed |
| Fee | 1 % creator tax on every trade (`creatorTaxBps = 100` in the pons launch record), collected in USO |
| Distribution | to all holders, pro rata, handled natively by the pons V2 token vault: fees accrue in the pons escrow credited to the distributor, and the vault claims and multi-sends them in rounds. **The site does not state an interval.** 80 minutes after launch the escrow held 7.9 USO and no pour had happened yet, so the live panel showed "No pour yet" and hid the countdown. It shows only the cadence it measures |

To change any copy, edit `index.html` directly. The "Add network to wallet" button calls `wallet_addEthereumChain` with the values in the `CHAIN` object at the top of `main.js`.

## 5. House rules the copy follows

- Jokes about oil, abundance and generosity. Never a people, an accent or a group as the punchline.
- No "APY", "earn", "passive income", "guaranteed", no price predictions. Mechanics only.
- No made-up numbers. If data is missing, the site says so.
- No third-party logos or wordmarks (Robinhood, pons, the Oil issuer). The site may say it lives *on* Robinhood Chain and pays out *in* Oil.
- `pons` in lowercase.
- Risk text in the footer, including the US restriction for markets paired against tokenized instruments on pons. The risk text does not joke.
- No private key or seed phrase input anywhere. Ever.
