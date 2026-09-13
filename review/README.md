# Held back for a decision

Images in this folder are **not** shown on the site and are excluded from Vercel deploys
(`.vercelignore`). The `.webp` files here are also kept out of git (`.gitignore`), so this
README is the record of what was set aside and why.

Two house rules put an image here:

1. **No third-party logos or wordmarks as graphics.** The site may *say* it lives on Solana
   and launched via pump.fun — that is a description. A launchpad's mark printed on the
   mascot's clothing, a flag, a mug or a licence plate reads as a partnership instead, and
   the project has no such partnership. Car badges, fashion monograms and real company
   signage fall under the same rule.
2. **No joke at a group's expense.** The humour is abundance and generosity. Never a people,
   an accent, a religion or a real conflict as the punchline.

| File | Why it was held back |
|---|---|
| _(none — see below)_ | |

## The Solana batch was published in full, on instruction

Nothing is held back right now. That is a decision, not an oversight: rule 1 would otherwise
catch most of the set, and the owner asked twice for the supplied artwork to be used as-is
after the marks were pointed out. What is in the gallery, and what each one carries:

| File | Scene | Third-party marks in frame |
|---|---|---|
| `meme-01` | G-Wagon, Dubai night | Mercedes-Benz badge, `pump` wordmark on the plate |
| `meme-02` | Rooftop, skyline | whisky bottle and glass |
| `meme-03` | Couch, controller, dog | `pump` wordmark on the can |
| `meme-04` | Trading desk | Razer logo on the chair |
| `meme-05` | Lamborghini, villa | Lamborghini badge |
| `meme-06` | Graffiti wall | "PUMP" gold chain |
| `meme-07` | Flag on a ridge | `pump` wordmark on the flag |
| `meme-08` | On the moon | capsule only |
| `meme-09` | Santorini | `pump` wordmark on the backpack |
| `meme-10` | Yacht, cash | champagne bottle |
| `meme-11` | Private jet | capsule only |
| `meme-12` | Mars flag | `pump` wordmark on the flag |
| `meme-13` | Yacht, laptop | champagne bottle |
| `meme-14` | Villa, helicopter | `pump` wordmark on the bag, Lamborghini |
| `meme-15` | Skydiving | capsule only |

**The capsule is the bigger one.** The green-and-white capsule the mascot wears on the chest
is pump.fun's logo mark, and it is in every image including `logo.webp`, `mascot.webp` and
the favicons — it is part of the character design, so no crop reaches it. Only different
artwork would. The previous Robinhood Chain set had exactly the same problem with a feather.

Three images carry the capsule and nothing else: `meme-08`, `meme-11`, `meme-15`. If the rule
is ever enforced strictly, those three and a redrawn mascot are the starting point.

To publish a held-back image: move it to `assets/gallery/meme-NN.webp` with the next free
number, and optionally add a caption to `GALLERY_CAPTIONS` in `main.js`.
