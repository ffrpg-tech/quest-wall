import { describe, it, expect } from 'vitest';
import { InventoryParseError, parseInventoryPaste, toInventoryEntries } from './inventory';

const ANCHOR_LINE = 'Currently, you cannot have more than 999 of most items.';

function wrap(block: string): string {
	return `Some chat log cruft\nMore nav menu junk\n${ANCHOR_LINE}\n${block}\nInventory Stats\nFooter junk`;
}

describe('parseInventoryPaste', () => {
	it('parses multiple categories and items with descriptions', () => {
		const text = wrap(
			[
				'Meals chevron_down',
				'Acorn Pie',
				'A tasty pie made of acorns.',
				'5',
				'Items chevron_down',
				'Amethyst',
				'A shiny purple gem.',
				'Found while mining.',
				'908'
			].join('\n')
		);

		const parsed = parseInventoryPaste(text);
		expect(parsed).toEqual([
			{ itemName: 'Acorn Pie', quantity: 5, category: 'Meals', maxed: false },
			{ itemName: 'Amethyst', quantity: 908, category: 'Items', maxed: false }
		]);
	});

	it('detects stacked status flags before the quantity line', () => {
		const text = wrap(
			['Items chevron_down', 'Iron', 'A sturdy metal.', 'MAX ON HAND', '966'].join('\n')
		);

		const parsed = parseInventoryPaste(text);
		expect(parsed).toEqual([{ itemName: 'Iron', quantity: 966, category: 'Items', maxed: true }]);
	});

	it('does not treat Mastered/Grand Mastered as a storage-cap flag', () => {
		// Mastered/Grand Mastered indicate crafting mastery, a separate game
		// mechanic from being at the storage cap — only "MAX ON HAND" should
		// ever set `maxed`.
		const text = wrap(
			[
				'Tools chevron_down',
				'Hoe',
				'Grand Mastered',
				'10',
				'Tools chevron_down',
				'Axe',
				'Mastered',
				'3'
			].join('\n')
		);

		const parsed = parseInventoryPaste(text);
		expect(parsed).toEqual([
			{ itemName: 'Hoe', quantity: 10, category: 'Tools', maxed: false },
			{ itemName: 'Axe', quantity: 3, category: 'Tools', maxed: false }
		]);
	});

	it('still detects MAX ON HAND stacked alongside a Grand Mastered line', () => {
		const text = wrap(
			['Tools chevron_down', 'Board', 'Grand Mastered', 'MAX ON HAND', '1,002'].join('\n')
		);

		const parsed = parseInventoryPaste(text);
		expect(parsed).toEqual([{ itemName: 'Board', quantity: 1002, category: 'Tools', maxed: true }]);
	});

	it('leaves category undefined for an item before any category header', () => {
		const text = wrap(['Wood', '42'].join('\n'));

		const parsed = parseInventoryPaste(text);
		expect(parsed).toEqual([{ itemName: 'Wood', quantity: 42, category: undefined, maxed: false }]);
	});

	it('throws when the anchor text is missing', () => {
		expect(() => parseInventoryPaste('nothing relevant here')).toThrow(InventoryParseError);
	});

	it('throws when the end marker is missing', () => {
		const text = `${ANCHOR_LINE}\nItems chevron_down\nWood\n42`;
		expect(() => parseInventoryPaste(text)).toThrow(InventoryParseError);
	});

	it('throws on a quantity line with no preceding item name', () => {
		const text = wrap(['Items chevron_down', '42'].join('\n'));
		expect(() => parseInventoryPaste(text)).toThrow(InventoryParseError);
	});

	it('throws when no items are found between the markers', () => {
		const text = wrap('Items chevron_down');
		expect(() => parseInventoryPaste(text)).toThrow(InventoryParseError);
	});

	it('parses a real-world paste with comma-formatted quantities and an uppercase end marker', () => {
		// Trimmed excerpt of an actual FarmRPG inventory-page copy/paste: chat
		// log cruft before the anchor, "Sort Options" cruft right after it,
		// thousands-separated quantities once an item crosses 999 (previously
		// silently unmatched by a bare-digit-only regex), and the real page's
		// "INVENTORY STATS" footer, which renders in a different case than the
		// "Currently, you cannot have more than" anchor line.
		const text = `HELP
GLOBAL
Say something...
05:24:34 AM

Eng061208

who want free tomatos
05:24:33 AM

Currently, you cannot have more than 1,002 of any single thing. You can increase this at the Farm Supply.

Sort Options:
Item Name, Quantity (ASC), Quantity (DESC)
Meals chevron_down

Acorn Pie
Trackers discovered to their dismay how
much certain wildlife loved this
treat from southern T'rah
5
Items chevron_down

3-leaf Clover
A delicious snack if you have hooves for feet
MAX ON HAND
1,002

Board
The foundation of any good farm
MAX ON HAND
Grand Mastered
1,002
Fish & Bait chevron_down

Barracuda
Not a good pet
Grand Mastered
235
INVENTORY STATS
Your inventory contains 507 unique items and 155,705 items in total.

Navigation
  Home`;

		const parsed = parseInventoryPaste(text);
		expect(parsed).toEqual([
			{ itemName: 'Acorn Pie', quantity: 5, category: 'Meals', maxed: false },
			{ itemName: '3-leaf Clover', quantity: 1002, category: 'Items', maxed: true },
			{ itemName: 'Board', quantity: 1002, category: 'Items', maxed: true },
			{ itemName: 'Barracuda', quantity: 235, category: 'Fish & Bait', maxed: false }
		]);
	});
});

describe('toInventoryEntries', () => {
	it('maps parsed lines to InventoryEntry, defaulting maxed to false', () => {
		const map = toInventoryEntries([
			{ itemName: 'Wood', quantity: 42, category: 'Items' },
			{ itemName: 'Iron', quantity: 5, category: 'Items', maxed: true }
		]);

		expect(map.get('Wood')).toEqual({ item: 'Wood', qty: 42, maxed: false });
		expect(map.get('Iron')).toEqual({ item: 'Iron', qty: 5, maxed: true });
	});
});
