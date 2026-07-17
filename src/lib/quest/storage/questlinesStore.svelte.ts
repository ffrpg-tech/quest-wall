import { base } from '$app/paths';
import { isQuestlinesData, type QuestlinesData } from '../types';

/**
 * Module-level (not component-level) state: `+page.svelte`'s onMount used to
 * own this fetch, which re-ran — and re-fetched both static/questlines.json
 * and static/questlines-meta.json — every time a client-side navigation
 * remounted the page (e.g. Credits -> back to "/"). Hoisting the state and
 * the fetch guard here means the data loads once per tab and every
 * remount just re-reads the already-resolved state.
 */
let questlines = $state<QuestlinesData>({});
let questlinesHydrated = $state(false);
let questlinesError = $state(false);
let dataLastUpdated = $state<string | null>(null);
let loadPromise: Promise<void> | null = null;

async function fetchQuestlines(): Promise<void> {
	try {
		const res = await fetch(`${base}/questlines.json`);
		if (!res.ok) throw new Error(`questlines.json fetch failed: ${res.status}`);
		const parsed: unknown = await res.json();
		// Guards against a malformed/short fetch-script run shipping bad data
		// straight to players.
		if (!isQuestlinesData(parsed)) throw new Error('questlines.json failed shape validation');
		questlines = parsed;
	} catch (err) {
		console.error(err);
		questlinesError = true;
	} finally {
		questlinesHydrated = true;
	}
}

async function fetchQuestlinesMeta(): Promise<void> {
	try {
		const res = await fetch(`${base}/questlines-meta.json`);
		if (!res.ok) return;
		const parsed: unknown = await res.json();
		if (
			parsed &&
			typeof parsed === 'object' &&
			'dataLastUpdated' in parsed &&
			typeof parsed.dataLastUpdated === 'string'
		) {
			dataLastUpdated = parsed.dataLastUpdated;
		}
	} catch (err) {
		console.error(err);
	}
}

/** Idempotent: safe to call from every mount, only fetches on the first call. */
export function loadQuestlines(): Promise<void> {
	if (!loadPromise) {
		loadPromise = Promise.all([fetchQuestlines(), fetchQuestlinesMeta()]).then(() => undefined);
	}
	return loadPromise;
}

export function getQuestlinesState() {
	return {
		get questlines() {
			return questlines;
		},
		get questlinesHydrated() {
			return questlinesHydrated;
		},
		get questlinesError() {
			return questlinesError;
		},
		get dataLastUpdated() {
			return dataLastUpdated;
		}
	};
}
