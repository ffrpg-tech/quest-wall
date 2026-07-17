// Shared low-level helpers for parsing copy-pasted FarmRPG page text.
// Used by both inventory.ts and bank.ts, which each parse a different page
// but share the same "case-insensitive anchor search over messy pasted
// text" shape — kept here so a fix (e.g. to comma-number parsing) doesn't
// have to be made twice.

/** Case-insensitive substring search that returns an index into `haystack`'s original casing — the game renders some UI text in a different case than others, so anchor/marker matching can't assume one exact case. */
export function indexOfCaseInsensitive(haystack: string, needle: string): number {
	return haystack.toLowerCase().indexOf(needle.toLowerCase());
}

/** Parses a thousands-separated integer string (e.g. "1,002") the way the game renders large numbers. Returns NaN if `text` isn't a valid comma-grouped integer. */
export function parseCommaNumber(text: string): number {
	return parseInt(text.replace(/,/g, ''), 10);
}

/** Splits pasted text into trimmed, non-empty lines. */
export function toTrimmedLines(text: string): string[] {
	return text
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter((l) => l.length > 0);
}
