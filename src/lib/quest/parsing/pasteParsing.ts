// Shared low-level helpers for parsing copy-pasted FarmRPG page text.
// Used by both inventory.ts and bank.ts, which each parse a different page
// but share the same "case-insensitive anchor search over messy pasted
// text" shape — kept here so a fix (e.g. to comma-number parsing) doesn't
// have to be made twice.

/** Case-insensitive substring search that returns an index into `haystack`'s original casing — the game renders some UI text in a different case than others, so anchor/marker matching can't assume one exact case. */
export function indexOfCaseInsensitive(haystack: string, needle: string): number {
	return haystack.toLowerCase().indexOf(needle.toLowerCase());
}

/** All indices where `needle` occurs in `haystack`, case-insensitively, in ascending order. */
function allIndicesCaseInsensitive(haystack: string, needle: string): number[] {
	const lowerHaystack = haystack.toLowerCase();
	const lowerNeedle = needle.toLowerCase();
	if (lowerNeedle.length === 0) return [];

	const indices: number[] = [];
	let from = 0;
	for (;;) {
		const idx = lowerHaystack.indexOf(lowerNeedle, from);
		if (idx === -1) break;
		indices.push(idx);
		from = idx + 1;
	}
	return indices;
}

/**
 * Locates a primary page anchor (e.g. "BULK OPTIONS", "Completed Requests")
 * and parses from it, tolerating the anchor phrase coincidentally appearing
 * more than once — a live public chat log is always pasted alongside the
 * real page content, and a player could plausibly type text matching an
 * anchor. Rather than assume position (the real content is "last" or
 * "first"), this tries occurrences from the end of the text backward and
 * takes whichever one `attempt` can actually turn into a valid result —
 * a candidate anchor followed by nonsense (no end marker, no items, a count
 * that doesn't match the page's own stated total) is rejected and the next
 * earlier occurrence is tried instead.
 *
 * If every occurrence fails, the error from the last (rightmost) one is
 * thrown — that's the most representative message for a genuinely
 * malformed single-anchor paste, which is the overwhelmingly common case.
 */
export function parseFromAnchor<T>(
	rawText: string,
	anchor: string,
	attempt: (afterAnchor: string) => T,
	notFoundError: () => Error
): T {
	const indices = allIndicesCaseInsensitive(rawText, anchor);
	if (indices.length === 0) throw notFoundError();

	let representativeError: unknown;
	for (let i = indices.length - 1; i >= 0; i--) {
		try {
			return attempt(rawText.slice(indices[i]));
		} catch (err) {
			if (i === indices.length - 1) representativeError = err;
		}
	}
	throw representativeError;
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
