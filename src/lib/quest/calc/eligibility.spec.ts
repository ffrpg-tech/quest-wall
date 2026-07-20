import { describe, it, expect } from 'vitest';
import { evaluateQuestEligibility, evaluateQuestlineEligibility, isUnavailable } from './eligibility';
import type { PlayerStats, Quest, Questline } from '../types';

const baseStats: PlayerStats = {
	farming: 10,
	fishing: 10,
	crafting: 10,
	exploring: 10,
	tower: 10,
	cooking: 10,
	npcLevels: { Rosalie: 5 }
};

const noRequirementQuest: Quest = {
	name: 'No Requirements',
	startDate: '',
	endDate: '',
	requirements: [],
	seq: 0
};

describe('evaluateQuestEligibility', () => {
	it('is eligible when a quest has no requirements', () => {
		const result = evaluateQuestEligibility(noRequirementQuest, baseStats);
		expect(result.eligible).toBe(true);
		expect(result.gaps).toEqual([]);
	});

	it.each(['farming', 'fishing', 'crafting', 'exploring', 'tower', 'cooking'] as const)(
		'reports a skill gap when %s level is short',
		(skill) => {
			const quest: Quest = {
				name: 'Skill Gated',
				startDate: '',
				endDate: '',
				requirements: [],
				seq: 0,
				requiredLevels: { [skill]: 15 }
			};
			const result = evaluateQuestEligibility(quest, baseStats);
			expect(result.eligible).toBe(false);
			expect(result.gaps).toEqual([{ kind: 'skill', label: expect.any(String), required: 15, have: 10 }]);
		}
	);

	it('reports an NPC gap when friendship level is short', () => {
		const quest: Quest = {
			name: 'NPC Gated',
			startDate: '',
			endDate: '',
			requirements: [],
			seq: 0,
			requiredNpc: { npc: 'Rosalie', level: 20 }
		};
		const result = evaluateQuestEligibility(quest, baseStats);
		expect(result.eligible).toBe(false);
		expect(result.gaps).toEqual([{ kind: 'npc', label: 'Rosalie', required: 20, have: 5 }]);
	});

	it('is case/trim-insensitive when matching NPC names against stats', () => {
		const quest: Quest = {
			name: 'NPC Gated',
			startDate: '',
			endDate: '',
			requirements: [],
			seq: 0,
			requiredNpc: { npc: '  ROSALIE  ', level: 5 }
		};
		const result = evaluateQuestEligibility(quest, baseStats);
		expect(result.eligible).toBe(true);
	});

	it('treats an NPC with no recorded friendship level as level 0', () => {
		const quest: Quest = {
			name: 'Unknown NPC',
			startDate: '',
			endDate: '',
			requirements: [],
			seq: 0,
			requiredNpc: { npc: 'Borgen', level: 1 }
		};
		const result = evaluateQuestEligibility(quest, baseStats);
		expect(result.gaps).toEqual([{ kind: 'npc', label: 'Borgen', required: 1, have: 0 }]);
	});

	it('reports multiple gaps at once', () => {
		const quest: Quest = {
			name: 'Multi Gated',
			startDate: '',
			endDate: '',
			requirements: [],
			seq: 0,
			requiredLevels: { farming: 15, cooking: 20 },
			requiredNpc: { npc: 'Rosalie', level: 20 }
		};
		const result = evaluateQuestEligibility(quest, baseStats);
		expect(result.gaps).toHaveLength(3);
		expect(result.eligible).toBe(false);
	});

	describe('seasonal availability', () => {
		const now = new Date('2026-07-20T00:00:00Z');

		it('is not a gap when neither startDate nor endDate is set', () => {
			const result = evaluateQuestEligibility(noRequirementQuest, baseStats, now);
			expect(result.eligible).toBe(true);
		});

		it('is eligible when now falls inside the [startDate, endDate] window', () => {
			const quest: Quest = {
				...noRequirementQuest,
				startDate: '2026-07-01T00:00:00Z',
				endDate: '2026-07-31T00:00:00Z'
			};
			const result = evaluateQuestEligibility(quest, baseStats, now);
			expect(result.eligible).toBe(true);
		});

		it('reports a not-yet-started season gap (LOCKED, not expired) when now is before startDate', () => {
			const quest: Quest = {
				...noRequirementQuest,
				startDate: '2026-08-01T00:00:00Z',
				endDate: '2026-08-31T00:00:00Z'
			};
			const result = evaluateQuestEligibility(quest, baseStats, now);
			expect(result.eligible).toBe(false);
			expect(result.gaps).toEqual([
				{
					kind: 'season',
					label: 'Seasonal',
					detail: expect.stringContaining('Only available'),
					expired: false
				}
			]);
			expect(isUnavailable(result.gaps)).toBe(false);
		});

		it('reports an expired season gap (UNAVAILABLE) when now is after endDate', () => {
			const quest: Quest = {
				...noRequirementQuest,
				startDate: '2026-06-01T00:00:00Z',
				endDate: '2026-06-30T00:00:00Z'
			};
			const result = evaluateQuestEligibility(quest, baseStats, now);
			expect(result.eligible).toBe(false);
			expect(result.gaps[0]).toMatchObject({ kind: 'season', expired: true });
			expect(isUnavailable(result.gaps)).toBe(true);
		});

		it('is expired/unavailable for an endDate-only window that already passed', () => {
			const quest: Quest = { ...noRequirementQuest, startDate: '', endDate: '2026-06-30T00:00:00Z' };
			const result = evaluateQuestEligibility(quest, baseStats, now);
			expect(result.eligible).toBe(false);
			expect(result.gaps[0].expired).toBe(true);
			expect(isUnavailable(result.gaps)).toBe(true);
		});

		it('is locked but not expired for a startDate-only window not yet reached (no defined end)', () => {
			const quest: Quest = { ...noRequirementQuest, startDate: '2026-08-01T00:00:00Z', endDate: '' };
			const result = evaluateQuestEligibility(quest, baseStats, now);
			expect(result.eligible).toBe(false);
			expect(result.gaps[0].expired).toBe(false);
			expect(isUnavailable(result.gaps)).toBe(false);
		});
	});
});

describe('evaluateQuestlineEligibility', () => {
	const questline: Questline = {
		name: 'Test Chain',
		questCount: 2,
		quests: [
			{
				name: 'Test Chain I',
				startDate: '',
				endDate: '',
				requirements: [],
				seq: 0,
				requiredLevels: { farming: 15 }
			},
			{
				name: 'Test Chain II',
				startDate: '',
				endDate: '',
				requirements: [],
				seq: 1
			}
		]
	};

	it('marks completed quests done without evaluating gaps', () => {
		const completed = new Set(['Test Chain::Test Chain I']);
		const result = evaluateQuestlineEligibility(questline, baseStats, completed);
		expect(result.quests[0]).toEqual({
			questName: 'Test Chain I',
			seq: 0,
			done: true,
			eligible: true,
			gaps: []
		});
	});

	it('is not allEligible when any non-done quest has a gap', () => {
		const result = evaluateQuestlineEligibility(questline, baseStats);
		expect(result.quests[0].eligible).toBe(false);
		expect(result.allEligible).toBe(false);
	});

	it('cannot start now when the very next non-done quest has a gap', () => {
		const result = evaluateQuestlineEligibility(questline, baseStats);
		expect(result.canStartNow).toBe(false);
	});

	it('can start now when the next non-done quest is fine, even if a later quest has a gap', () => {
		// Same shape as `questline`, but reordered so the gapped quest is second —
		// the player can still act on quest I right now even though II is walled.
		const reordered: Questline = {
			name: 'Test Chain',
			questCount: 2,
			quests: [questline.quests[1], questline.quests[0]]
		};
		const result = evaluateQuestlineEligibility(reordered, baseStats);
		expect(result.allEligible).toBe(false);
		expect(result.canStartNow).toBe(true);
	});

	it('can start now when every quest is already done', () => {
		const completed = new Set(['Test Chain::Test Chain I', 'Test Chain::Test Chain II']);
		const result = evaluateQuestlineEligibility(questline, baseStats, completed);
		expect(result.canStartNow).toBe(true);
	});
});
