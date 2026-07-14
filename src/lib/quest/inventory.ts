import type { InventoryEntry } from './types';

/**
 * Parses a pasted inventory dump into item -> InventoryEntry.
 *
 * Accepted line shapes (tab-separated, extra whitespace tolerated):
 *   Category\tItem Name\tQty
 *   Category\tItem Name\tQty\tMAX
 *   Item Name\tQty
 *
 * Any line that doesn't resolve to a name + a numeric quantity is skipped
 * rather than throwing, so a partially malformed paste still produces a
 * usable inventory instead of an empty/crashed table.
 */
export function parseInventoryDump(text: string): Map<string, InventoryEntry> {
	const result = new Map<string, InventoryEntry>();

	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line) continue;

		const fields = line.split('\t').map((f) => f.trim());
		if (fields.length < 2) continue;

		// The quantity is whichever field is a plain integer; prefer scanning
		// from the end since category/name never look like a bare number.
		let qtyIndex = -1;
		for (let i = fields.length - 1; i >= 0; i--) {
			if (/^\d+$/.test(fields[i])) {
				qtyIndex = i;
				break;
			}
		}
		if (qtyIndex === -1) continue;

		const qty = parseInt(fields[qtyIndex], 10);
		if (!Number.isFinite(qty)) continue;

		// Name is the field immediately before the quantity (category, if any,
		// comes before that and is otherwise unused).
		const nameIndex = qtyIndex - 1;
		if (nameIndex < 0) continue;
		const name = fields[nameIndex];
		if (!name) continue;

		const maxed = fields
			.slice(qtyIndex + 1)
			.some((f) => /^(max|maxed|true|yes)$/i.test(f));

		const existing = result.get(name);
		if (existing) {
			existing.qty += qty;
			existing.maxed = existing.maxed || maxed;
		} else {
			result.set(name, { item: name, qty, maxed });
		}
	}

	return result;
}

export function inventoryToMap(entries: InventoryEntry[]): Map<string, number> {
	const map = new Map<string, number>();
	for (const e of entries) map.set(e.item, e.qty);
	return map;
}

/**
 * Merges a batch of updates into an inventory array: entries with a matching
 * `item` name are replaced, everything else is kept, and the result is
 * re-sorted alphabetically. Shared by both the "parse a paste" flow (many
 * updates at once) and the "manually add/update one item" flow (a single
 * update) so there's one merge rule instead of two hand-rolled ones.
 */
export function mergeInventory(
	current: InventoryEntry[],
	updates: Map<string, InventoryEntry>
): InventoryEntry[] {
	const merged = new Map(current.map((e) => [e.item, e]));
	for (const [name, entry] of updates) merged.set(name, entry);
	return Array.from(merged.values()).sort((a, b) => a.item.localeCompare(b.item));
}
