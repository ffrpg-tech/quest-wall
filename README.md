# Farm RPG Quest Wall Calculator

A static web app for [FarmRPG](https://farmrpg.com) players. Paste your in-game
inventory, pick one or more questlines, and instantly see which quest in each
chain you'll run out of materials on (the "wall point") — no more manually
cross-referencing requirement lists quest by quest.

This is a fan project, not affiliated with FarmRPG. It will never be
monetized. All credit for FarmRPG itself goes to its developers.

> Notice: This project is created with the assistance of Claude Code.

## How it works

1. Run a small browser-console scraper script on FarmRPG's own Inventory page
   (walked through in-app via the "How do I get my inventory?" tutorial modal)
   to copy your inventory to the clipboard as tab-separated text.
2. Paste that text into the Inventory box on this site and parse it.
3. Pick one or more questlines from the scrollable, filterable list to build a
   queue — order matters and can be changed by drag-and-drop, since queued
   questlines share one simulated inventory (whichever questline is first in
   the queue gets first claim on scarce shared items and on rewards earned
   along the way).
4. The app walks each queued questline's quests in order, decrementing the
   shared simulated inventory as each quest's requirements are consumed, and
   reports the first quest in each chain where you don't have enough on hand.
   A combined "Shortfall summary" section rolls up every missing item across
   the whole queue, broken down by questline and quest.
5. Mark quests done as you complete them — progress, inventory, and the
   questline queue are all saved to `localStorage` and progress can be
   exported/imported as JSON.

Quest and item data (`static/questlines.json`, `src/lib/data/items.json`)
is generated at build time from a CSV export of the quest database — see
[Regenerating quest data](#regenerating-quest-data) below. `questlines.json`
lives under `static/` (not `src/lib/data/`) and is fetched by the client at
runtime rather than bundled into the page's JS, so it ships as its own
cacheable request — see `_headers` for the cache headers.

## Project structure

```
src/lib/quest/
  types.ts          Shared types (Quest, Questline, InventoryEntry) + questKey()
  inventory.ts       Parses the clipboard inventory dump, merges updates into inventory state
  diff.ts             Core calculation: walks questline(s) against inventory, finds the wall point(s);
                      diffQuestline (single) and diffQuestlineQueue/aggregateQueueShortfalls (queue)
  persistence.ts     localStorage read/write for completed-quest tracking, inventory, questline
                      queue, dark mode, JSON export/import
static/
  questlines.json    Generated — quests grouped into questlines, fetched by the client at runtime
src/lib/data/
  items.json          Generated — all known item names (for autosuggest/validation)
src/lib/
  seo.ts              Site metadata constants + canonicalUrl() helper, used for meta tags/JSON-LD
src/routes/
  +page.svelte        The whole app UI (inventory input, questline queue picker, results,
                      shortfall summary, tutorial modal)
  about/+page.svelte   Static "about" page
  credits/+page.svelte Static credits/acknowledgements page
  layout.css           Tailwind entry + dark mode variant
scripts/
  build-questlines.mjs  Node script that generates the two data/ JSON files from the source CSV
data/
  farm_rpg_quests_master.csv  Source of truth quest database (not committed data pipeline output)
```

## Developing

Install dependencies, then start the dev server:

```sh
npm install
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Regenerating quest data

If `data/farm_rpg_quests_master.csv` changes, regenerate the derived JSON:

```sh
node scripts/build-questlines.mjs
```

This writes `static/questlines.json`, `src/lib/data/items.json`, and
`scripts/grouping-report.txt` (a human-readable dump of every detected
questline chain, for spot-checking the grouping logic against the raw CSV).

Note: currency (e.g. "Silver") never appears in `items.json` because it never
appears as a quest requirement/reward line item in the source CSV — that's a
property of the data, not a bug in the script.

## Testing & checks

```sh
npm run test:unit    # vitest (diff.spec.ts, persistence.spec.ts, types.spec.ts, etc.)
npm run test:e2e      # playwright install && playwright test
npm test              # test:unit --run, then test:e2e
npm run check         # svelte-check / TypeScript
npm run lint          # prettier + eslint
```

## Building

```sh
npm run build
```

Preview the production build with `npm run preview`. Deploys to Cloudflare
Pages via `@sveltejs/adapter-cloudflare`.
