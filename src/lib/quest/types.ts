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

function isItemQty(v: unknown): v is ItemQty {
	if (!v || typeof v !== 'object') return false;
	const e = v as ItemQty;
	return typeof e.item === 'string' && typeof e.qty === 'number' && Number.isFinite(e.qty);
}

function isQuest(v: unknown): v is Quest {
	if (!v || typeof v !== 'object') return false;
	const q = v as Quest;
	return (
		typeof q.name === 'string' &&
		typeof q.from === 'string' &&
		typeof q.startDate === 'string' &&
		typeof q.endDate === 'string' &&
		Array.isArray(q.requirements) &&
		q.requirements.every(isItemQty) &&
		Array.isArray(q.rewards) &&
		q.rewards.every(isItemQty) &&
		typeof q.seq === 'number' &&
		typeof q.label === 'string'
	);
}

function isQuestline(v: unknown): v is Questline {
	if (!v || typeof v !== 'object') return false;
	const g = v as Questline;
	return (
		typeof g.name === 'string' &&
		typeof g.questCount === 'number' &&
		Array.isArray(g.quests) &&
		g.quests.every(isQuest)
	);
}

/** Structural check on the fetched `questlines.json` payload — the fetch is a static asset, not a typed import, so nothing else verifies the CSV-generated file actually matches `QuestlinesData` before the app trusts it. */
export function isQuestlinesData(v: unknown): v is QuestlinesData {
	if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
	return Object.values(v).every(isQuestline);
}
