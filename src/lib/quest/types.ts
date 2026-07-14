export interface ItemQty {
	item: string;
	qty: number;
}

export interface Quest {
	name: string;
	from: string;
	startDate: string;
	endDate: string;
	requirements: ItemQty[];
	rewards: ItemQty[];
	seq: number;
	label: string;
}

export interface Questline {
	name: string;
	questCount: number;
	quests: Quest[];
}

export type QuestlinesData = Record<string, Questline>;

export interface InventoryEntry {
	item: string;
	qty: number;
	maxed: boolean;
}

/** Compound key so quest-completion state survives even if two different questlines ever share a quest name. This is a pure domain rule, not persistence logic — it lives here (not persistence.ts) so the diff engine can use it without depending on the storage module. */
export function questKey(questlineName: string, questName: string): string {
	return `${questlineName}::${questName}`;
}
