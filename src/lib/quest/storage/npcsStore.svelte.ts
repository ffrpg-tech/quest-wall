import { base } from '$app/paths';
import { isNpcArray, type Npc } from '../types';

/** NPC images are hotlinked directly from FarmRPG's own CDN, never downloaded/served locally. */
const FARMRPG_ORIGIN = 'https://farmrpg.com';

/** Module-level state — see questlinesStore.svelte.ts for why this is hoisted out of the page component rather than fetched in onMount. */
let imageByName = $state<Map<string, string>>(new Map());
// Unlike imageByName, this keeps unavailable NPCs too — a player can still have a
// historical friendship level with one on their profile page even though its image
// is no longer shown anywhere in the picker/results UI.
let allNames = $state<string[]>([]);
let npcsHydrated = $state(false);
let npcsError = $state(false);
let loadPromise: Promise<void> | null = null;

async function fetchNpcs(): Promise<void> {
	try {
		const res = await fetch(`${base}/npc.json`);
		if (!res.ok) throw new Error(`npc.json fetch failed: ${res.status}`);
		const parsed: unknown = await res.json();
		if (!isNpcArray(parsed)) throw new Error('npc.json failed shape validation');
		// isAvailable:false NPCs are excluded entirely rather than flagged — there's no known
		// date they'll return, unlike a seasonal quest, so "permanently gone" is the safe default
		// (see the Npc type doc in types.ts).
		imageByName = new Map(
			(parsed as Npc[]).filter((npc) => npc.isAvailable).map((npc) => [npc.name, npc.image])
		);
		allNames = (parsed as Npc[]).map((npc) => npc.name);
	} catch (err) {
		console.error(err);
		npcsError = true;
	} finally {
		npcsHydrated = true;
	}
}

/** Idempotent: safe to call from every mount, only fetches on the first call. */
export function loadNpcs(): Promise<void> {
	if (!loadPromise) {
		loadPromise = fetchNpcs();
	}
	return loadPromise;
}

/** Clears the cached fetch and re-runs it — for a "retry" action after a failed fetch,
 * so the user isn't forced into a full page reload to recover from a transient network
 * blip. Mirrors questlinesStore/itemsStore's retry convention. */
export function retryNpcs(): Promise<void> {
	npcsError = false;
	loadPromise = null;
	return loadNpcs();
}

export function getNpcsState() {
	return {
		get npcsHydrated() {
			return npcsHydrated;
		},
		get npcsError() {
			return npcsError;
		}
	};
}

/** The live, fetched NPC roster's canonical names — used to search a pasted profile
 * page for friendship levels (see stats.ts) instead of a hand-maintained duplicate list.
 * Empty until `loadNpcs()` resolves; callers should fall back to their own default. */
export function getNpcNames(): string[] {
	return allNames;
}

/** `undefined` covers both an unknown name and a permanently-unavailable NPC — callers
 * (e.g. PlayerStatsPanel) should just render nothing, same as ItemIcon does for an
 * unrecognized item name. */
export function getNpcImagePath(name: string): string | undefined {
	const image = imageByName.get(name);
	return image ? `${FARMRPG_ORIGIN}${image}` : undefined;
}
