# CLAUDE.md — farm-rpg-quest-tracker

Project-specific guidance. See the global `~/.claude/CLAUDE.md` for
cross-project rules (Windows/shell discipline, commit conventions,
verification standard) — those still apply here and aren't repeated below.

## What this project is

kodyy's Farm RPG Quest Wall Calculator — a SvelteKit static app. Player pastes
their FarmRPG inventory, picks a questline, and the app reports the first
quest in that chain they can't complete with current materials. Fan project,
not affiliated with FarmRPG, will never be monetized.

## Data pipeline (read before touching quest/item data)

- `data/farm_rpg_quests_master.csv` is the source of truth. `src/lib/data/questlines.json`
  and `src/lib/data/items.json` are **generated** — never hand-edit them.
- Regenerate with `node scripts/build-questlines.mjs` after any CSV change.
  It also writes `scripts/grouping-report.txt` for spot-checking questline
  grouping against the raw CSV.
- Current baseline: 2359 quests → 529 questlines (299 real chains, 230
  singletons). Re-run the script after any change to `splitQuestName` /
  `sanitizeQuestName` and confirm these counts don't unexpectedly shift.
- Questline grouping strips a trailing sequence marker (roman numeral,
  `Part NN`, `- <Letter>`, or trailing digits) off the quest name to compute
  a grouping key + numeric sort key. If you touch this logic, verify against
  real chains in the report (e.g. "99 Bottles", "Corn of Interest", "Blizzard
  Warning") rather than assuming — false-positive roman numerals and
  dash-letter edge cases are easy to introduce silently.
- **Silver (currency) is genuinely absent from `items.json`** — it never
  appears as a quest requirement/reward line in the source CSV. This is a
  property of the data, not a parsing bug. Don't "fix" it.
- The CSV has raw `<br/>`/`<br>` HTML embedded in some quest names;
  `sanitizeQuestName` strips these to a space. If quest names ever show
  literal `<br` again, the fix belongs in that function, not in the UI layer.

## Svelte / Tailwind gotchas specific to this repo

- `src/routes/layout.css` is a **plain `.css` file imported via JS**, not a
  compiled `.svelte <style>` block. Svelte's `:global()` pseudo-selector has
  no meaning there — using it silently drops the rule (this caused the dark
  mode background bug once). Write plain selectors in that file.
- Dark mode is a `.dark` class on `<html>`, toggled via Tailwind v4's
  `@custom-variant dark (&:where(.dark, .dark *));` in `layout.css`. Persisted
  via `saveDarkMode`/`loadDarkMode` in `persistence.ts`, but only written
  *after* hydration reads the saved value first — writing before that would
  overwrite a saved preference with the default.
- Icons: use `@lucide/svelte`, **not** the deprecated `lucide-svelte` package.

## Core calculation invariants (`src/lib/quest/diff.ts`)

- `diffQuestline` walks a questline in order against a *cloned* inventory,
  decrementing per requirement and flooring at 0 (never negative), so later
  quests in the chain still get meaningful numbers even after a shortfall.
- Quests already in the `completed` Set are skipped entirely — no requirement
  check, no inventory deduction — since that consumption already happened
  before the current inventory snapshot was taken.
- `totalShortfalls` aggregates shortfall across the whole chain per item.
  When accumulating a repeat item, keep `needed`/`have`/`short` mutually
  consistent (`have = needed - short`) — a past bug let `needed`/`have`
  freeze at the first quest's values while only `short` kept summing
  correctly. There's a regression test for this in `diff.spec.ts`; keep it
  green if you touch this loop.
- `questKey(questlineName, questName)` lives in `types.ts` (not
  `persistence.ts`) — `diff.ts` is a pure calculation module and shouldn't
  import from the storage-specific persistence module.

## Persistence (`src/lib/quest/persistence.ts`)

- All reads/writes go through `hasLocalStorage()` guard — this file must stay
  SSR-safe.
- `importProgress` must only ever extract `.completed` (array of strings) from
  parsed JSON — never spread/merge the parsed object's own keys elsewhere.
  This is a deliberate prototype-pollution guard; don't loosen it for
  convenience.

## Workflow notes

- This repo currently has **zero git commits**. Skills that bootstrap via
  `git diff origin/HEAD...` or similar will fail on ref resolution — that's
  expected until the first commit exists, and is not a reason to commit
  preemptively (commit only when asked, per global CLAUDE.md).
- When asked to run `/simplify`, `/code-review`, `/security-review` in
  sequence, respect the order given even if it differs from habit — the user
  has explicitly corrected this once already (wants review before security
  scan).
