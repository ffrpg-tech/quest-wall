import type { InventoryEntry } from '../types';
import { indexOfCaseInsensitive, parseCommaNumber, toTrimmedLines } from './pasteParsing';

// Client-side only — parses a manual select-all + copy of the player's raw
// FarmRPG inventory PAGE text (browser or Steam client's Edit > Select All >
// Copy). This has no relationship to the offline GraphQL fetch script under
// /api: that script produces the quest/questline data this app ships with,
// this parser turns a player's own pasted text into their current inventory.
// Keep them decoupled — this file must never import from or reference /api.

export interface ParsedInventoryLine {
	itemName: string;
	quantity: number;
	category?: string;
	maxed?: boolean;
}

export class InventoryParseError extends Error {}

const ANCHOR = 'Currently, you cannot have more than';
const END_MARKER = 'Inventory Stats';
const CATEGORY_SUFFIX = ' chevron_down';
// Only "MAX ON HAND" signals the storage-cap condition this app cares about.
// "Mastered"/"Grand Mastered" are a separate crafting-mastery indicator with
// no bearing on whether the item is at cap — they're just discarded like any
// other description line, not folded into `maxed`.
const STATUS_FLAGS = ['MAX ON HAND'];

/**
 * Parses raw copy-pasted inventory page text into structured item lines.
 *
 * Mobile app pastes are explicitly out of scope — best-effort platform
 * detection isn't attempted; malformed/truncated input (including a mobile
 * paste that doesn't match the expected page structure) fails loudly via
 * `InventoryParseError` rather than silently producing a partial/empty
 * result, since a silent guess here would be worse than an obvious error.
 */
export function parseInventoryPaste(rawText: string): ParsedInventoryLine[] {
	const anchorIdx = indexOfCaseInsensitive(rawText, ANCHOR);
	if (anchorIdx === -1) {
		throw new InventoryParseError(
			'Could not find the inventory marker text in the pasted content — make sure you copied the full inventory page.'
		);
	}

	// Discard everything up to and including the anchor's own line.
	const afterAnchor = rawText.slice(anchorIdx);
	const anchorLineEnd = afterAnchor.indexOf('\n');
	const afterAnchorLine = anchorLineEnd === -1 ? '' : afterAnchor.slice(anchorLineEnd + 1);

	const endIdx = indexOfCaseInsensitive(afterAnchorLine, END_MARKER);
	if (endIdx === -1) {
		throw new InventoryParseError(
			'Could not find the end of the inventory block ("Inventory Stats") — the paste may be truncated.'
		);
	}
	const block = afterAnchorLine.slice(0, endIdx);

	const lines = toTrimmedLines(block);

	const results: ParsedInventoryLine[] = [];
	let currentCategory: string | undefined;
	let chunkLines: string[] = [];

	for (const line of lines) {
		if (line.endsWith(CATEGORY_SUFFIX)) {
			currentCategory = line.slice(0, -CATEGORY_SUFFIX.length).trim();
			chunkLines = [];
			continue;
		}

		// Quantities are rendered with thousands separators once they cross
		// 999 (e.g. "1,002"), so the anchor check has to tolerate commas —
		// matching only bare digits silently missed every high-quantity item.
		if (/^\d{1,3}(,\d{3})*$/.test(line)) {
			if (chunkLines.length === 0) {
				throw new InventoryParseError(
					`Found a quantity line ("${line}") with no preceding item name — the paste may be truncated or malformed.`
				);
			}
			const itemName = chunkLines[0];
			const maxed = chunkLines.some((l) => STATUS_FLAGS.includes(l));
			results.push({
				itemName,
				quantity: parseCommaNumber(line),
				category: currentCategory,
				maxed
			});
			chunkLines = [];
			continue;
		}

		// Description lines and status-flag lines both accumulate here; only
		// chunkLines[0] (the name) and the STATUS_FLAGS membership check above
		// are ever read back out — everything else is discarded on purpose.
		chunkLines.push(line);
	}

	if (results.length === 0) {
		throw new InventoryParseError(
			'No inventory items were found between the markers — check the paste format.'
		);
	}

	return results;
}

/** Bridges parser output into the existing `InventoryEntry`/`mergeInventory` flow. */
export function toInventoryEntries(parsed: ParsedInventoryLine[]): Map<string, InventoryEntry> {
	const result = new Map<string, InventoryEntry>();
	for (const line of parsed) {
		result.set(line.itemName, {
			item: line.itemName,
			qty: line.quantity,
			maxed: line.maxed ?? false
		});
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
