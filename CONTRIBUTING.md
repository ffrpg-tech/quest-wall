# Contributing

Thanks for wanting to help improve the Farm RPG Quest Wall Calculator! There
are two ways to contribute, depending on how comfortable you are with git.

## Reporting a problem (no git required)

If you spotted wrong quest data, a missing quest/questline, or just have
general feedback, use the **Feedback / report an issue** button in the app
header. It opens a short form — pick "Incorrect quest data" or "Missing
quest/questline" and describe what's wrong. No account or git knowledge
needed.

## Reporting bad quest or item data

`static/questlines.json` and `src/lib/data/items.json` are **generated and
not committed to this repo** — quest/item data isn't something contributors
edit directly via pull request. If you spot wrong data, missing quests, or
a questline that's grouped/ordered incorrectly, please use the in-app
**Feedback / report an issue** button described above rather than opening a
PR that touches those files.

### Behavior worth knowing about (not bugs)

- Silver (in-game currency) shows up as a requirement on some quests — this
  is expected and correct, not leftover test data.
- A quest that isn't part of any named chain shows up as its own
  single-quest "questline" — that's intentional, not a grouping bug.
