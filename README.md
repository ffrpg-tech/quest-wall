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
   the whole queue, broken down by questline and quest.
5. Mark quests done as you complete them — progress, inventory, and the
   questline queue are all saved to `localStorage` and progress can be
   exported/imported as JSON. You can also paste your completed-requests list
   the same way to bulk-mark quests done.

Quest and item data (`static/questlines.json`, `src/lib/data/items.json`) is
generated and **not committed to this repo**. `questlines.json` lives under
`static/` (not `src/lib/data/`) and is fetched by the client at runtime
rather than bundled into the page's JS, so it ships as its own cacheable
request — see `_headers` for the cache headers.

## Project structure

```
src/lib/quest/
  types.ts          Shared types (Quest, Questline, InventoryEntry) + questKey()
  inventory.ts       Parses a pasted inventory-page paste into structured items, merges into state
  completed.ts        Parses a pasted "Completed Requests" paste into a list of quest names
  diff.ts             Core calculation: walks questline(s) against inventory, finds the wall point(s);
                      diffQuestline (single) and diffQuestlineQueue/aggregateQueueShortfalls (queue)
  persistence.ts     localStorage read/write for completed-quest tracking, inventory, questline
                      queue, dark mode, JSON export/import
static/
  questlines.json    Generated, not committed — quests grouped into questlines, fetched by the
                      client at runtime
src/lib/data/
  items.json          Generated, not committed — all known item names (for autosuggest/validation)
src/lib/
  seo.ts              Site metadata constants + canonicalUrl() helper, used for meta tags/JSON-LD
src/routes/
  +page.svelte        The whole app UI (inventory input, questline queue picker, results,
                      shortfall summary, tutorial modal)
  about/+page.svelte   Static "about" page
  credits/+page.svelte Static credits/acknowledgements page
  layout.css           Tailwind entry + dark mode variant
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
committed to this repo — see the maintainer for details on regenerating
them. Note: "Silver" (in-game currency) does show up as an item requirement
on some quests — that's expected, not a data bug.

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
