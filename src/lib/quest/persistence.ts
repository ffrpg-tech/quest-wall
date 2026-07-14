const STORAGE_KEY = 'farmrpg-quest-tracker:completed-v1';
const DARK_MODE_KEY = 'farmrpg-quest-tracker:dark-mode';
const EXPORT_VERSION = 1;

function hasLocalStorage(): boolean {
	return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadCompleted(): Set<string> {
	if (!hasLocalStorage()) return new Set();
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return new Set();
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return new Set();
		return new Set(parsed.filter((v): v is string => typeof v === 'string'));
	} catch {
		return new Set();
	}
}

export function saveCompleted(completed: Set<string>): void {
	if (!hasLocalStorage()) return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(completed)));
	} catch {
		// Storage full/unavailable (private browsing, quota) — progress just won't persist this session.
	}
}

/** Falls back to the OS/browser preference when nothing has been saved yet. */
export function loadDarkMode(): boolean {
	if (!hasLocalStorage()) return false;
	const raw = window.localStorage.getItem(DARK_MODE_KEY);
	if (raw === 'true') return true;
	if (raw === 'false') return false;
	return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function saveDarkMode(enabled: boolean): void {
	if (!hasLocalStorage()) return;
	window.localStorage.setItem(DARK_MODE_KEY, String(enabled));
}

export interface ProgressExport {
	version: number;
	exportedAt: string;
	completed: string[];
}

export function exportProgress(completed: Set<string>): string {
	const payload: ProgressExport = {
		version: EXPORT_VERSION,
		exportedAt: new Date().toISOString(),
		completed: Array.from(completed).sort()
	};
	return JSON.stringify(payload, null, 2);
}

/** Returns null (rather than throwing) when the pasted/uploaded text isn't a recognizable export, so the caller can show an error without crashing. */
export function importProgress(text: string): Set<string> | null {
	try {
		const parsed = JSON.parse(text);
		if (!parsed || !Array.isArray(parsed.completed)) return null;
		return new Set(parsed.completed.filter((v: unknown): v is string => typeof v === 'string'));
	} catch {
		return null;
	}
}
