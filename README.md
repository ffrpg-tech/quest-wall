# kodyy's Farm RPG Quest Wall Calculator

A static web app for [FarmRPG](https://farmrpg.com) players. Paste your in-game
inventory, pick a questline, and instantly see which quest in that chain you'll
run out of materials on (the "wall point") — no more manually cross-referencing
requirement lists quest by quest.

This is a fan project, not affiliated with FarmRPG. It will never be
monetized. All credit for FarmRPG itself goes to its developers.

## How it works

1. Run a small browser-console scraper script on FarmRPG's own Inventory page
   (walked through in-app via the "How do I get my inventory?" tutorial modal)
   to copy your inventory to the clipboard as tab-separated text.
2. Paste that text into the Inventory box on this site and parse it.
3. Pick a questline from the scrollable, filterable list.
4. The app walks the questline's quests in order, decrementing a simulated
   copy of your inventory as each quest's requirements are consumed, and
   reports the first quest where you don't have enough on hand.
5. Mark quests done as you complete them — progress is saved to
   `localStorage` and can be exported/imported as JSON.

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
  diff.ts             Core calculation: walks a questline against inventory, finds the wall point
  persistence.ts     localStorage read/write for completed-quest tracking, dark mode, JSON export/import
static/
  questlines.json    Generated — quests grouped into questlines, fetched by the client at runtime
src/lib/data/
  items.json          Generated — all known item names (for autosuggest/validation)
src/routes/
  +page.svelte        The whole app UI (inventory input, questline picker, results, tutorial modal)
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
npm run test:unit    # vitest (quest engine + persistence unit tests)
npm run check         # svelte-check / TypeScript
npm run lint          # prettier + eslint
```

## Building

```sh
npm run build
```

Preview the production build with `npm run preview`. Deploys to Cloudflare
Pages via `@sveltejs/adapter-cloudflare`.
