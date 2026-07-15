# Contributing

Thanks for wanting to help improve the Farm RPG Quest Wall Calculator! There
are two ways to contribute, depending on how comfortable you are with git.

## Reporting a problem (no git required)

If you spotted wrong quest data, a missing quest/questline, or just have
general feedback, use the **Feedback / report an issue** button in the app
header. It opens a short form — pick "Incorrect quest data" or "Missing
quest/questline" and describe what's wrong. No account or git knowledge
needed.

## Submitting a fix via pull request

`data/farm_rpg_quests_master.csv` is the source of truth for all quest data.
`static/questlines.json` and `src/lib/data/items.json` are
**generated** from it — never hand-edit those files directly.

1. Edit `data/farm_rpg_quests_master.csv` with your correction/addition.
2. Regenerate the derived data:
   ```
   node scripts/build-questlines.mjs
   ```
3. Check `scripts/grouping-report.txt` for the questline(s) you touched —
   confirm the chain groups the way you'd expect (correct order, no quests
   split into a separate singleton by mistake).
4. Confirm the questline/quest counts printed by the script haven't shifted
   in a way you didn't intend. As of this writing the baseline is ~2359
   quests → ~529 questlines; a big unexpected jump usually means a grouping
   regression, not new data.
5. Open a PR with your CSV change and the regenerated JSON files together.

### Known edge cases to watch for

- Questline grouping strips a trailing sequence marker (roman numeral,
  `Part NN`, `- <Letter>`, trailing digits) to compute the grouping key —
  verify against real chains like "99 Bottles", "Corn of Interest", or
  "Blizzard Warning" rather than assuming a change is safe.
- The CSV sometimes has raw `<br/>`/`<br>` HTML embedded in quest names;
  this gets stripped to a space automatically. If you see literal `<br`
  text in the app, that's a parsing bug worth reporting, not something to
  fix by hand in the CSV.
- Silver (in-game currency) is genuinely absent from the item list — it
  never appears as a quest requirement/reward in the source data. This is
  expected, not a bug to "fix."

There's no automated CI validation for data PRs yet — review is manual
(the steps above). If PR volume ever grows enough to justify it, that's a
possible future addition, not something to build preemptively.
