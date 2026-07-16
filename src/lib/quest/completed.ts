// Client-side only — parses a manual select-all + copy of the FarmRPG
// "Help Needed" / Completed screen. This has no relationship to the offline
// GraphQL fetch script under /api or to the inventory-paste parser; it only
// extracts quest names from a completed-requests dump.

export class CompletedQuestParseError extends Error {}

const ANCHOR = 'Completed Requests';
const REQUEST_FROM_PREFIX = 'Request from ';

/** Case-insensitive substring search that returns an index into `haystack`'s original casing. */
function indexOfCaseInsensitive(haystack: string, needle: string): number {
	return haystack.toLowerCase().indexOf(needle.toLowerCase());
}

/**
 * A quest title normally occupies one line, but long titles wrap onto a
 * second physical line in the copied text (e.g. "Make Life Take" / "The
 * Lemons Back!"). The "Request from ..." line is a reliable anchor right
 * after the title in every entry, so fold every line before it into the name
 * instead of assuming the title is always exactly one line.
 */
function extractQuestName(chunkLines: string[]): string {
	const nameLines: string[] = [];
	for (const line of chunkLines) {
		if (line.startsWith(REQUEST_FROM_PREFIX)) break;
		nameLines.push(line);
	}
	return nameLines.join(' ').trim();
}

/**
 * Extracts completed quest names from a raw copy-paste of the FarmRPG
 * "Help Needed" screen. The page lists in-progress requests (Special/Active
 * Requests) before the "Completed Requests (N)" heading — anchoring on that
 * heading is what keeps not-yet-completed quests from being misread as done.
 *
 * After the anchor, each completed entry is a blank-line-separated chunk of
 * several lines (name, requester, completion date, global completion stats,
 * a trailing "check" line) — only the lines before "Request from ..." (the
 * quest name) are used; everything else in the chunk is discarded.
 */
export function parseCompletedQuestNames(rawText: string): string[] {
	const anchorIdx = indexOfCaseInsensitive(rawText, ANCHOR);
	if (anchorIdx === -1) {
		throw new CompletedQuestParseError(
			'Could not find the "Completed Requests" section in the pasted content — make sure you copied the full Help Needed / Completed screen.'
		);
	}

	const afterAnchor = rawText.slice(anchorIdx);
	const anchorLineEnd = afterAnchor.indexOf('\n');
	const block = anchorLineEnd === -1 ? '' : afterAnchor.slice(anchorLineEnd + 1);

	const chunks = block
		.split(/\r?\n\s*\r?\n/)
		.map((c) => c.trim())
		.filter((c) => c.length > 0);

	const names = chunks
		.map((chunk) => extractQuestName(chunk.split(/\r?\n/)))
		.filter((name) => name.length > 0);

	if (names.length === 0) {
		throw new CompletedQuestParseError(
			'No completed quest names were found after the "Completed Requests" heading — check the paste format.'
		);
	}

	return names;
}
