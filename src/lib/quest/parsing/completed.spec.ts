import { describe, it, expect } from 'vitest';
import { CompletedQuestParseError, parseCompletedQuestNames } from './completed';

describe('parseCompletedQuestNames', () => {
	it('extracts quest names from blank-line-separated completed entries', () => {
		const text = `Completed Requests (3)

A Towering Investment X
Request from Cecil -  Main Quest
Completed on 2026-07-15 05:10:55
30,203 players (2.62%) have completed
check

Thomas's Summer Shark Research II
Request from Thomas
Completed on 2026-07-14 22:03:26
6,565 players (0.57%) have completed
check

The Collector - Shinefish
Request from Cecil
Completed on 2026-07-08 07:59:40
42,708 players (3.7%) have completed
check`;

		expect(parseCompletedQuestNames(text)).toEqual([
			'A Towering Investment X',
			"Thomas's Summer Shark Research II",
			'The Collector - Shinefish'
		]);
	});

	it('ignores quest-like names that appear before the "Completed Requests" anchor (e.g. Active/Special Requests)', () => {
		const text = `Active Requests (1)

A Towering Investment XI
Request from Cecil -  Main Quest
28.59%

Completed Requests (1)

A Towering Investment X
Request from Cecil -  Main Quest
Completed on 2026-07-15 05:10:55
30,203 players (2.62%) have completed
check`;

		expect(parseCompletedQuestNames(text)).toEqual(['A Towering Investment X']);
	});

	it('rejoins a title that wraps across two physical lines, using "Request from" as the boundary', () => {
		// Real-world case: "Make Life Take The Lemons Back!" wraps across two
		// physical lines in the copied text. Every line before "Request from"
		// belongs to the name.
		const text = `Completed Requests (1)

Make Life Take
The Lemons Back!
Request from Star Meerif
Completed on 2026-06-14 01:25:16
77,708 players (6.73%) have completed
check`;

		expect(parseCompletedQuestNames(text)).toEqual(['Make Life Take The Lemons Back!']);
	});

	it('rejoins a wrapped title that itself contains a comma before "Request from"', () => {
		const text = `Completed Requests (1)

You Spin Me Right Round,
Buddy, Right Round
Request from Buddy
Completed on 2026-06-13 01:02:07
70,419 players (6.1%) have completed
check`;

		expect(parseCompletedQuestNames(text)).toEqual(['You Spin Me Right Round, Buddy, Right Round']);
	});

	it('throws when the "Completed Requests" anchor is missing', () => {
		expect(() => parseCompletedQuestNames('nothing relevant here')).toThrow(CompletedQuestParseError);
	});

	it('throws when no entries follow the anchor', () => {
		expect(() => parseCompletedQuestNames('Completed Requests (0)\n\n')).toThrow(
			CompletedQuestParseError
		);
	});
});
