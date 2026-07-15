# Changelog

All notable changes to the Farm RPG Quest Wall Calculator are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Entries
are grouped by feature/release, not by individual commit.

This file is the source of truth for the in-app [changelog page](/changelog) —
the page parses this file directly, so an entry added here is what users see.

## [Unreleased]

## [0.1.1] - 2026-07-16

### Added

- In-app changelog page, with a header badge that flags unseen releases.
- Inventory staleness warning: flags when you've checked off quests since
  your last inventory paste, so shortfall numbers don't silently go stale.
- Shortfall summary search/filter, and a copyable list of quest names from a
  "mark completed" paste that didn't match any known quest.
- `questlines.json` is now validated against its expected shape at runtime
  before the app trusts it (it's a fetched static asset, not a typed import).
- The questline picker now shows when the underlying quest CSV was last
  updated, sourced from its git history rather than build time.
- Real acknowledgements on the About and Credits pages, replacing placeholder
  text.

### Changed

- Layout: inventory and questline panels now fill the viewport height
  instead of a fixed max height.

## [0.1.0] - 2026-07-15

### Added

- Quest tracker calculator: paste your FarmRPG inventory, pick a questline,
  and see the first quest you can't complete with current materials.
- Multi-questline queue support — queue and reorder several questlines that
  share one inventory, with a combined shortfall summary across the queue.
- SEO metadata and static marketing pages (About, Credits).
- README, CONTRIBUTING guide, and project documentation.

### Changed

- Switched deploy adapter from Vercel to Cloudflare Pages.
