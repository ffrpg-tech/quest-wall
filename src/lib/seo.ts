// TODO: swap in the real production domain once this is deployed (see
// CONTRIBUTING.md). Used for canonical URLs, OG/Twitter tags, JSON-LD, and
// static/sitemap.xml — update all of those together if this changes.
export const SITE_URL = 'https://farm-rpg-quest-tracker.pages.dev';

export const SITE_NAME = 'Farm RPG Quest Wall Calculator';

export const DEFAULT_DESCRIPTION =
	'Paste your FarmRPG inventory, pick questlines, and instantly see the first quest ' +
	"you can't complete with your current materials.";

export function canonicalUrl(pathname: string): string {
	return new URL(pathname, SITE_URL).toString();
}
