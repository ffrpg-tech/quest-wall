# Farm RPG Quest Wall Calculator

A static web app for [FarmRPG](https://farmrpg.com) players. Paste your in-game
inventory, pick one or more questlines, and instantly see which quest in each
chain you'll run out of materials on (the "wall point") — no more manually
cross-referencing requirement lists quest by quest.

This is a fan project, not affiliated with FarmRPG. It will never be
monetized. All credit for FarmRPG itself goes to its developers.

> Notice: This project is created with the assistance of Claude Code.

## How it works

1. Select all the text on FarmRPG's own Inventory page (browser Ctrl/Cmd+A,
   or the Steam client's Edit > Select All) and copy it — walked through
   in-app via the "How do I get my inventory?" tutorial modal.
2. Paste that text into the Inventory box on this site and parse it.
3. Pick one or more questlines from the scrollable, filterable list to build a
   queue — order matters and can be changed by drag-and-drop, since queued
   questlines share one simulated inventory (whichever questline is first in
   the queue gets first claim on scarce shared items).
4. The app walks each queued questline's quests in order, decrementing the
   shared simulated inventory as each quest's requirements are consumed, and
   reports the first quest in each chain where you don't have enough on hand.
   A combined "Shortfall summary" section rolls up every missing item across
   the whole queue, broken down by questline and quest. Shortfalls that
   exceed a known storage cap (from a "MAX ON HAND" line in your inventory
   paste) are flagged as CAPPED, since no amount of farming clears those
   until the cap is raised or the item is spent down elsewhere.
5. You can also paste the FarmRPG Bank page (Deposit All / Withdraw All
   figures) to fold your Silver on hand into the simulated inventory, and
   paste your completed-requests list to bulk-mark quests done.
6. Mark quests done as you complete them — progress, inventory, and the
   questline queue are all saved to `localStorage` and progress can be
   exported/imported as JSON.

Quest and item data (`static/questlines.json`, `src/lib/data/items.json`) is
generated and **not committed to this repo**. `questlines.json` lives under
`static/` (not `src/lib/data/`) and is fetched by the client at runtime
rather than bundled into the page's JS, so it ships as its own cacheable
request — see `_headers` for the cache headers.

## Project structure

```
src/lib/quest/
  types.ts             Shared types (Quest, Questline, InventoryEntry) + questKey()
  parsing/
    pasteParsing.ts    Low-level helpers shared by inventory.ts/bank.ts (case-insensitive anchor
                       search, comma-number parsing, line splitting) over messy pasted page text
    inventory.ts       Parses a pasted Inventory-page paste into structured items (incl. "MAX ON
                       HAND" storage caps), merges into state
    bank.ts            Parses a pasted Bank-page paste into wallet/bank Silver figures
    completed.ts       Parses a pasted "Completed Requests" paste into a list of quest names
  calc/
    diff.ts            Core calculation: walks questline(s) against inventory, finds the wall
                       point(s) and flags CAPPED shortfalls against known storage caps;
                       diffQuestline (single) and diffQuestlineQueue/aggregateQueueShortfalls (queue)
  storage/
    persistence.ts     localStorage read/write for completed-quest tracking, inventory, questline
                       queue, dark mode, JSON export/import
    questlinesStore.svelte.ts  Fetches/caches questlines.json + questlines-meta.json once per tab
static/
  questlines.json      Generated, not committed — quests grouped into questlines, fetched by the
                       client at runtime
  questlines-meta.json Generated, not committed — metadata about the last data regeneration
src/lib/data/
  items.json            Generated, not committed — all known item names (for autosuggest/validation)
src/lib/
  seo.ts                Site metadata constants + canonicalUrl() helper, used for meta tags/JSON-LD
  changelog.ts           Parses CHANGELOG.md (Keep a Changelog format) for display on /changelog
  paraglide/              Generated i18n runtime (Paraglide/inlang) — do not hand-edit; messages
                         live in messages/en.json and messages/es.json
src/routes/
  +page.svelte          The whole app UI (inventory/Bank/completed-requests import tabs,
                       questline queue picker, results, shortfall summary, tutorial modal)
  about/+page.svelte     Static "about" page
  changelog/+page.svelte Renders CHANGELOG.md via changelog.ts
  credits/+page.svelte   Static credits/acknowledgements page
  layout.css             Tailwind entry + dark mode variant
api/
  fetch-questlines.mjs  Gitignored data-regeneration script — not committed, see api/README.md
```

## Developing

Install dependencies, then start the dev server:

```sh
npm install
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Quest data

`static/questlines.json` and `src/lib/data/items.json` are generated and not
committed to this repo — see `api/README.md` (gitignored, maintainer-only)
for how to regenerate them. Note: "Silver" (in-game currency) does show up
as an item requirement on some quests — that's expected, not a data bug.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Quest/item data isn't edited via
pull request — use the in-app "Feedback / report an issue" button instead.

## Internationalization

UI strings are managed via [Paraglide](https://inlang.com/m/gerre34r/library-inlang-paraglideJs)
(`messages/en.json`, `messages/es.json`); `src/lib/paraglide/` is generated
from those and shouldn't be hand-edited.

## Testing & checks

```sh
npm run test:unit    # vitest (diff.spec.ts, persistence.spec.ts, types.spec.ts, etc.)
npm run test:e2e      # playwright install && playwright test
npm test              # test:unit --run, then test:e2e
npm run check         # svelte-check / TypeScript
npm run lint          # prettier + eslint
```

## Building & deploying

```sh
npm run build
npm run deploy   # vite build && wrangler pages deploy .svelte-kit/cloudflare
```

Preview the production build with `npm run preview`. Deploys to Cloudflare
Pages manually via `wrangler` (see `api/README.md`) rather than Cloudflare's
git-triggered auto-build, since the generated data files aren't in git.
