import { base } from '$app/paths';

interface ItemData {
	name: string;
	image: string;
}

/** Item images are hotlinked directly from FarmRPG's own CDN, never downloaded/served locally. */
const FARMRPG_ORIGIN = 'https://farmrpg.com';

/** Module-level state — see questlinesStore.svelte.ts for why this is hoisted out of the page component rather than fetched in onMount. */
let imageByName = $state<Map<string, string>>(new Map());
let itemNames = $state<Set<string>>(new Set());
let itemsHydrated = $state(false);
let itemsError = $state(false);
let loadPromise: Promise<void> | null = null;

async function fetchItems(): Promise<void> {
	try {
		const res = await fetch(`${base}/items.json`);
		if (!res.ok) throw new Error(`items.json fetch failed: ${res.status}`);
		const parsed: unknown = await res.json();
		if (!Array.isArray(parsed)) throw new Error('items.json failed shape validation');
		const items = parsed as ItemData[];
		imageByName = new Map(items.map((item) => [item.name, item.image]));
		itemNames = new Set(items.map((item) => item.name));
	} catch (err) {
		console.error(err);
		itemsError = true;
	} finally {
		itemsHydrated = true;
	}
}

/** Idempotent: safe to call from every mount, only fetches on the first call. */
export function loadItems(): Promise<void> {
	if (!loadPromise) {
		loadPromise = fetchItems();
	}
	return loadPromise;
}

export function getItemsState() {
	return {
		get itemNames() {
			return itemNames;
		},
		get itemsHydrated() {
			return itemsHydrated;
		},
		get itemsError() {
			return itemsError;
		}
	};
}

export function getItemImagePath(name: string): string | undefined {
	const image = imageByName.get(name);
	return image ? `${FARMRPG_ORIGIN}${image}` : undefined;
}
