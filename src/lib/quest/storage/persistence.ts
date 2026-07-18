import type { InventoryEntry } from '../types';

const STORAGE_KEY = 'farmrpg-quest-tracker:completed-v1';
const DARK_MODE_KEY = 'farmrpg-quest-tracker:dark-mode';
const INVENTORY_KEY = 'farmrpg-quest-tracker:inventory-v1';
const QUEUE_KEY = 'farmrpg-quest-tracker:queue-v1';
const INVENTORY_BASELINE_KEY = 'farmrpg-quest-tracker:inventory-baseline-completed-v1';
const CHANGELOG_SEEN_KEY = 'farmrpg-quest-tracker:changelog-seen-v1';
const EXPORT_VERSION = 2;

function hasLocalStorage(): boolean {
	return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/** Reads a JSON array, keeping every element that passes `isValidElement` and dropping only the bad ones, rather than discarding the whole saved array over one malformed entry (a corrupted write or a stray manual localStorage edit shouldn't wipe an otherwise-good history). Any failure below "valid JSON array" (missing key, bad JSON, not an array) falls back to `[]`. Shared by every localStorage-backed array read in this module. */
function loadJSONArray<T>(key: string, isValidElement: (el: unknown) => el is T): T[] {
	if (!hasLocalStorage()) return [];
	try {
		const raw = window.localStorage.getItem(key);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isValidElement);
	} catch {
		return [];
	}
}

/** Writes a value as JSON. Returns false on write failure (storage full/unavailable in
 * private browsing) so callers can warn the user that this write won't persist this
 * session, rather than the failure being silent. Returns true when there's no
 * localStorage to write to at all (SSR) — that's not a failure worth warning about. */
function saveJSON(key: string, value: unknown): boolean {
	if (!hasLocalStorage()) return true;
	try {
		window.localStorage.setItem(key, JSON.stringify(value));
		return true;
	} catch {
		return false;
	}
}

function isString(v: unknown): v is string {
	return typeof v === 'string';
}

export function loadCompleted(): Set<string> {
	return new Set(loadJSONArray(STORAGE_KEY, isString));
}

export function saveCompleted(completed: Set<string>): boolean {
	return saveJSON(STORAGE_KEY, Array.from(completed));
}

/** Snapshot of `completed` at the moment the inventory was last pasted — lets the UI
 * detect quests checked off since then (a real-world consumption the pasted inventory
 * doesn't reflect yet). Deliberately a set, not a count: a count can't distinguish
 * "checked a new quest" from "checked one, unchecked another" since both leave the
 * size unchanged, so staleness must be computed by membership, not cardinality. */
export function loadInventoryBaseline(): Set<string> {
	return new Set(loadJSONArray(INVENTORY_BASELINE_KEY, isString));
}

export function saveInventoryBaseline(completed: Set<string>): boolean {
	return saveJSON(INVENTORY_BASELINE_KEY, Array.from(completed));
}

/** Falls back to the OS/browser preference when nothing has been saved yet. */
export function loadDarkMode(): boolean {
	if (!hasLocalStorage()) return false;
	const raw = window.localStorage.getItem(DARK_MODE_KEY);
	if (raw === 'true') return true;
	if (raw === 'false') return false;
	return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function saveDarkMode(enabled: boolean): boolean {
	return saveJSON(DARK_MODE_KEY, enabled);
}

function isInventoryEntry(v: unknown): v is InventoryEntry {
	if (!v || typeof v !== 'object') return false;
	const e = v as InventoryEntry;
	return (
		typeof e.item === 'string' &&
		typeof e.qty === 'number' &&
		Number.isFinite(e.qty) &&
		e.qty >= 0 &&
		typeof e.maxed === 'boolean'
	);
}

export function loadInventory(): InventoryEntry[] {
	return loadJSONArray(INVENTORY_KEY, isInventoryEntry);
}

export function saveInventory(inventory: InventoryEntry[]): boolean {
	return saveJSON(INVENTORY_KEY, inventory);
}

export function loadQueue(): string[] {
	return loadJSONArray(QUEUE_KEY, isString);
}

export function saveQueue(queue: string[]): boolean {
	return saveJSON(QUEUE_KEY, queue);
}

/** Null means "never viewed the changelog" — every real version is a non-empty string. */
export function loadLastSeenChangelogVersion(): string | null {
	if (!hasLocalStorage()) return null;
	return window.localStorage.getItem(CHANGELOG_SEEN_KEY);
}

export function saveLastSeenChangelogVersion(version: string): void {
	if (!hasLocalStorage()) return;
	window.localStorage.setItem(CHANGELOG_SEEN_KEY, version);
}

export interface ProgressExport {
	version: number;
	exportedAt: string;
	completed: string[];
	/** Questline queue, in order — retains *what and why* the player was working toward,
	 * not just which quests are already done. Absent from v1 exports. */
	queue?: string[];
}

export interface ImportedProgress {
	completed: Set<string>;
	/** Null when the imported file predates queue export (v1) or omitted it — callers
	 * should leave the current queue untouched rather than clobbering it with an empty one. */
	queue: string[] | null;
}

export function exportProgress(completed: Set<string>, queue: string[]): string {
	const payload: ProgressExport = {
		version: EXPORT_VERSION,
		exportedAt: new Date().toISOString(),
		completed: Array.from(completed).sort(),
		queue
	};
	return JSON.stringify(payload, null, 2);
}

/** Returns null (rather than throwing) when the pasted/uploaded text isn't a recognizable export, so the caller can show an error without crashing. */
export function importProgress(text: string): ImportedProgress | null {
	try {
		const parsed = JSON.parse(text);
		if (!parsed || !Array.isArray(parsed.completed)) return null;
		return {
			completed: new Set(
				parsed.completed.filter((v: unknown): v is string => typeof v === 'string')
			),
			queue: Array.isArray(parsed.queue)
				? parsed.queue.filter((v: unknown): v is string => typeof v === 'string')
				: null
		};
	} catch {
		return null;
	}
}
