import { questKey, type Questline } from './types';

export interface ItemShortfall {
	item: string;
	needed: number;
	have: number;
	short: number;
}

export interface QuestDiffResult {
	questName: string;
	seq: number;
	label: string;
	shortfalls: ItemShortfall[];
	ok: boolean;
	/** True when the player has already marked this quest done — its requirements are neither checked against nor deducted from the simulated inventory, since that consumption already happened before this inventory snapshot was taken. */
	done: boolean;
}

export interface QuestlineDiffResult {
	questlineName: string;
	quests: QuestDiffResult[];
	/** Index into `quests` of the first quest the player can't complete with current inventory, or null if the whole chain is clear. */
	wallPointIndex: number | null;
	/** Aggregate shortfall across the whole chain, item -> total still missing (assuming quests are attempted in order regardless of earlier shortfalls). */
	totalShortfalls: ItemShortfall[];
}

/**
 * Walks a questline's quests in order, decrementing a cloned copy of the
 * player's inventory as each quest's requirements are consumed. Reports,
 * per quest, whether the player currently has enough on hand, and the first
 * quest (the "wall point") where they don't.
 */
export function diffQuestline(
	questline: Questline,
	startingInventory: Map<string, number>,
	completed: Set<string> = new Set()
): QuestlineDiffResult {
	const inv = new Map(startingInventory);
	const quests: QuestDiffResult[] = [];
	let wallPointIndex: number | null = null;
	const totalShortfallMap = new Map<string, ItemShortfall>();

	for (let i = 0; i < questline.quests.length; i++) {
		const q = questline.quests[i];

		if (completed.has(questKey(questline.name, q.name))) {
			quests.push({ questName: q.name, seq: q.seq, label: q.label, shortfalls: [], ok: true, done: true });
			continue;
		}

		const shortfalls: ItemShortfall[] = [];
		let ok = true;

		for (const req of q.requirements) {
			const have = inv.get(req.item) ?? 0;
			if (have < req.qty) {
				ok = false;
				const short = req.qty - have;
				shortfalls.push({ item: req.item, needed: req.qty, have, short });

				// needed/have/short stay internally consistent (have = needed - short)
				// across accumulation, instead of only .short updating while
				// needed/have freeze at whichever quest hit this item first.
				const existing = totalShortfallMap.get(req.item);
				if (existing) {
					existing.needed += req.qty;
					existing.short += short;
					existing.have = existing.needed - existing.short;
				} else {
					totalShortfallMap.set(req.item, { item: req.item, needed: req.qty, have, short });
				}
			}

			// Decrement regardless of shortfall so later quests in the chain
			// still show accurate running numbers (floor at 0, never negative).
			inv.set(req.item, Math.max(0, have - req.qty));
		}

		quests.push({ questName: q.name, seq: q.seq, label: q.label, shortfalls, ok, done: false });
		if (!ok && wallPointIndex === null) wallPointIndex = i;
	}

	return {
		questlineName: questline.name,
		quests,
		wallPointIndex,
		totalShortfalls: Array.from(totalShortfallMap.values()).sort((a, b) => b.short - a.short)
	};
}
