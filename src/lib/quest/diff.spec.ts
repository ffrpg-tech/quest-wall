import { describe, it, expect } from 'vitest';
import { aggregateQueueShortfalls, diffQuestline, diffQuestlineQueue } from './diff';
import { parseInventoryDump } from './inventory';
import { questKey, type Questline } from './types';

const questline: Questline = {
	name: 'Test Chain',
	questCount: 3,
	quests: [
		{
			name: 'Test Chain I',
			from: 'NPC',
			startDate: '',
			endDate: '',
			requirements: [{ item: 'Wood', qty: 5 }],
			rewards: [],
			seq: 1,
			label: 'I'
		},
		{
			name: 'Test Chain II',
			from: 'NPC',
			startDate: '',
			endDate: '',
			requirements: [{ item: 'Wood', qty: 10 }],
			rewards: [],
			seq: 2,
			label: 'II'
		},
		{
			name: 'Test Chain III',
			from: 'NPC',
			startDate: '',
			endDate: '',
			requirements: [{ item: 'Wood', qty: 1 }],
			rewards: [],
			seq: 3,
			label: 'III'
		}
	]
};

describe('diffQuestline', () => {
	it('finds no wall point when inventory covers the whole chain', () => {
		const result = diffQuestline(questline, new Map([['Wood', 20]]));
		expect(result.wallPointIndex).toBeNull();
		expect(result.quests.every((q) => q.ok)).toBe(true);
	});

	it('identifies the exact quest where inventory runs dry', () => {
		// 5 for quest I leaves 7, quest II needs 10 -> shortfall of 3 at index 1
		const result = diffQuestline(questline, new Map([['Wood', 12]]));
		expect(result.wallPointIndex).toBe(1);
		expect(result.quests[0].ok).toBe(true);
		expect(result.quests[1].ok).toBe(false);
		expect(result.quests[1].shortfalls).toEqual([{ item: 'Wood', needed: 10, have: 7, short: 3 }]);
	});

	it('keeps needed/have/short internally consistent in totalShortfalls when the same item is short across multiple quests', () => {
		// Wood=12: quest I (need 5) leaves 7; quest II (need 10, have 7) is short
		// 3, inv floors at 0; quest III (need 1, have 0) is short 1. Aggregate
		// across both shortfalls should be needed=11, short=4, have=needed-short=7
		// — not the first-hit quest's stale {needed:10, have:7} with only short
		// correctly summed.
		const result = diffQuestline(questline, new Map([['Wood', 12]]));
		expect(result.totalShortfalls).toEqual([
			{
				item: 'Wood',
				needed: 11,
				have: 7,
				short: 4,
				byQuest: [
					{ questName: 'Test Chain II', seq: 2, label: 'II', short: 3 },
					{ questName: 'Test Chain III', seq: 3, label: 'III', short: 1 }
				]
			}
		]);
	});

	it('treats a missing item as zero on hand rather than throwing', () => {
		const result = diffQuestline(questline, new Map());
		expect(result.wallPointIndex).toBe(0);
		expect(result.quests[0].shortfalls[0]).toEqual({
			item: 'Wood',
			needed: 5,
			have: 0,
			short: 5
		});
	});

	it('skips requirement checks and inventory deduction for quests already marked complete', () => {
		// Only 6 Wood on hand — quest I alone would eat 5 of it, but it's marked
		// done, so quest II's shortfall should be computed against the full 6.
		const completed = new Set([questKey('Test Chain', 'Test Chain I')]);
		const result = diffQuestline(questline, new Map([['Wood', 6]]), completed);

		expect(result.quests[0].done).toBe(true);
		expect(result.quests[0].ok).toBe(true);
		expect(result.quests[0].shortfalls).toEqual([]);

		expect(result.quests[1].done).toBe(false);
		expect(result.quests[1].ok).toBe(false);
		expect(result.quests[1].shortfalls).toEqual([{ item: 'Wood', needed: 10, have: 6, short: 4 }]);
		expect(result.wallPointIndex).toBe(1);
	});

	it('credits an earlier quest reward toward a later quest requirement', () => {
		const rewardChain: Questline = {
			name: 'Reward Chain',
			questCount: 2,
			quests: [
				{
					name: 'Reward Chain I',
					from: 'NPC',
					startDate: '',
					endDate: '',
					requirements: [],
					rewards: [{ item: 'Iron', qty: 5 }],
					seq: 1,
					label: 'I'
				},
				{
					name: 'Reward Chain II',
					from: 'NPC',
					startDate: '',
					endDate: '',
					requirements: [{ item: 'Iron', qty: 5 }],
					rewards: [],
					seq: 2,
					label: 'II'
				}
			]
		};

		const result = diffQuestline(rewardChain, new Map());
		expect(result.quests[1].ok).toBe(true);
		expect(result.quests[1].shortfalls).toEqual([]);
		expect(result.wallPointIndex).toBeNull();
	});

	it('does not double-credit rewards for a quest already marked complete', () => {
		const rewardChain: Questline = {
			name: 'Reward Chain',
			questCount: 2,
			quests: [
				{
					name: 'Reward Chain I',
					from: 'NPC',
					startDate: '',
					endDate: '',
					requirements: [],
					rewards: [{ item: 'Iron', qty: 5 }],
					seq: 1,
					label: 'I'
				},
				{
					name: 'Reward Chain II',
					from: 'NPC',
					startDate: '',
					endDate: '',
					requirements: [{ item: 'Iron', qty: 5 }],
					rewards: [],
					seq: 2,
					label: 'II'
				}
			]
		};

		const completedSet = new Set([questKey('Reward Chain', 'Reward Chain I')]);
		const result = diffQuestline(rewardChain, new Map(), completedSet);
		expect(result.quests[1].ok).toBe(false);
		expect(result.quests[1].shortfalls).toEqual([{ item: 'Iron', needed: 5, have: 0, short: 5 }]);
	});
});

describe('diffQuestlineQueue', () => {
	const scarceItemQuestline = (name: string): Questline => ({
		name,
		questCount: 1,
		quests: [
			{
				name: `${name} I`,
				from: 'NPC',
				startDate: '',
				endDate: '',
				requirements: [{ item: 'Iron', qty: 10 }],
				rewards: [],
				seq: 1,
				label: 'I'
			}
		]
	});

	it('gives the first questline in the queue priority on a shared scarce item', () => {
		const a = scarceItemQuestline('Chain A');
		const b = scarceItemQuestline('Chain B');
		const [resultA, resultB] = diffQuestlineQueue([a, b], new Map([['Iron', 10]]));

		expect(resultA.quests[0].ok).toBe(true);
		expect(resultB.quests[0].ok).toBe(false);
		expect(resultB.quests[0].shortfalls).toEqual([
			{ item: 'Iron', needed: 10, have: 0, short: 10 }
		]);
	});

	it('moves the shortfall to the other questline when the queue order is reversed', () => {
		const a = scarceItemQuestline('Chain A');
		const b = scarceItemQuestline('Chain B');
		const [resultB, resultA] = diffQuestlineQueue([b, a], new Map([['Iron', 10]]));

		expect(resultB.quests[0].ok).toBe(true);
		expect(resultA.quests[0].ok).toBe(false);
	});
});

describe('aggregateQueueShortfalls', () => {
	it('rolls up per-questline shortfalls into one queue-wide breakdown per item, by questline and quest', () => {
		const a: Questline = {
			name: 'Chain A',
			questCount: 1,
			quests: [
				{
					name: 'Chain A I',
					from: 'NPC',
					startDate: '',
					endDate: '',
					requirements: [{ item: 'Iron', qty: 10 }],
					rewards: [],
					seq: 1,
					label: 'I'
				}
			]
		};
		const b: Questline = {
			name: 'Chain B',
			questCount: 1,
			quests: [
				{
					name: 'Chain B I',
					from: 'NPC',
					startDate: '',
					endDate: '',
					requirements: [{ item: 'Iron', qty: 6 }],
					rewards: [],
					seq: 1,
					label: 'I'
				}
			]
		};

		const results = diffQuestlineQueue([a, b], new Map());
		const aggregated = aggregateQueueShortfalls(results);

		expect(aggregated).toEqual([
			{
				item: 'Iron',
				needed: 16,
				have: 0,
				short: 16,
				byQuestline: [
					{
						questlineName: 'Chain A',
						short: 10,
						byQuest: [{ questName: 'Chain A I', seq: 1, label: 'I', short: 10 }]
					},
					{
						questlineName: 'Chain B',
						short: 6,
						byQuest: [{ questName: 'Chain B I', seq: 1, label: 'I', short: 6 }]
					}
				]
			}
		]);
	});
});

describe('parseInventoryDump', () => {
	it('parses category/name/qty tab-separated rows', () => {
		const parsed = parseInventoryDump('Meals\tAcorn Pie\t5\nItems\tAmethyst\t908');
		expect(parsed.get('Acorn Pie')).toEqual({ item: 'Acorn Pie', qty: 5, maxed: false });
		expect(parsed.get('Amethyst')).toEqual({ item: 'Amethyst', qty: 908, maxed: false });
	});

	it('parses a bare name/qty row', () => {
		const parsed = parseInventoryDump('Wood\t42');
		expect(parsed.get('Wood')).toEqual({ item: 'Wood', qty: 42, maxed: false });
	});

	it('skips malformed lines instead of throwing', () => {
		const parsed = parseInventoryDump('not a valid row\n\nMeals\tAcorn Pie\t5');
		expect(parsed.size).toBe(1);
		expect(parsed.get('Acorn Pie')?.qty).toBe(5);
	});

	it('detects a trailing MAX flag', () => {
		const parsed = parseInventoryDump('Items\tIron\t966\tMAX');
		expect(parsed.get('Iron')?.maxed).toBe(true);
	});
});
