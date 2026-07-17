import { describe, it, expect } from 'vitest';
import { BankParseError, parseBankPaste } from './bank';

// Trimmed real-world copy/paste of the Bank page (chat-log cruft above,
// nav/footer cruft below) — the "Deposit"/"Withdraw" (no "All") pair under
// SPECIFIC AMOUNTS is a deliberate trap for a naive substring match.
const REAL_PASTE = `
Tibbles
ive been tempted to throw gold at my ww for it lol
07:29:28 AM

ABOUT THE BANK
The bank allows you to deposit your Silver so that it can gain interest when you are not playing.
Currently in Bank: 824,000,000 Silver [View History]
SPECIFIC AMOUNTS
 Deposit
1,000
  GO
 Withdraw
1,000
  GO
BULK OPTIONS
 Deposit All
613,871,898 Silver
 Withdraw All
824,000,000 Silver

Made with humans - © 2026 Magic & Wires, LLC
`;

describe('parseBankPaste', () => {
	it('parses wallet (Deposit All) and bank (Withdraw All) Silver from a real paste', () => {
		expect(parseBankPaste(REAL_PASTE)).toEqual({ walletSilver: 613871898, bankSilver: 824000000 });
	});

	it('is not fooled by the SPECIFIC AMOUNTS Deposit/Withdraw pair', () => {
		const text = `BULK OPTIONS\n Deposit\n1,000\n  GO\n Deposit All\n500 Silver\n Withdraw All\n200 Silver`;
		expect(parseBankPaste(text)).toEqual({ walletSilver: 500, bankSilver: 200 });
	});

	it('throws when Bulk Options is missing', () => {
		expect(() => parseBankPaste('nothing relevant here')).toThrow(BankParseError);
	});

	it('throws when Deposit All is missing', () => {
		const text = `BULK OPTIONS\n Withdraw All\n200 Silver`;
		expect(() => parseBankPaste(text)).toThrow(BankParseError);
	});

	it('throws when Withdraw All is missing', () => {
		const text = `BULK OPTIONS\n Deposit All\n500 Silver`;
		expect(() => parseBankPaste(text)).toThrow(BankParseError);
	});

	it('parses correctly when a stale Inventory-page dump is embedded before Bulk Options', () => {
		// Real-world finding: FarmRPG's frontend keeps a navigation stack, so a
		// full-page paste of the Bank page can carry the *previous* page's
		// entire DOM (a complete Inventory dump, its own "Currently, you
		// cannot have more than..." through "Inventory Stats" block) still
		// mounted ahead of the actual Bank content. The anchor-based slice
		// must still land on the real "Bulk Options" section, not be confused
		// by the unrelated embedded block.
		const text = `Back
My Inventory
Back
Bank
Search
Currently, you cannot have more than 1,014 of any single thing. You can increase this at the Farm Supply.

Sort Options:
Item Name, Quantity (ASC), Quantity (DESC)
Meals chevron_down

Acorn Pie
A tasty pie made of acorns.
5
Inventory Stats
Your inventory contains 1 unique items.

About the bank
The bank allows you to deposit your Silver so that it can gain interest.
Currently in Bank: 824,000,000 Silver [View History]
Specific Amounts
 Deposit
1,000
  GO
 Withdraw
1,000
  GO
Bulk Options
 Deposit All
613,871,898 Silver
 Withdraw All
824,000,000 Silver`;

		expect(parseBankPaste(text)).toEqual({ walletSilver: 613871898, bankSilver: 824000000 });
	});

	it('resolves to the real anchor even when a live chat message contains anchor-like text first', () => {
		const text = `SomePlayer
did anyone check the bulk options tab yet lol
05:24:34 AM

BULK OPTIONS
 Deposit All
500 Silver
 Withdraw All
200 Silver`;

		expect(parseBankPaste(text)).toEqual({ walletSilver: 500, bankSilver: 200 });
	});

	it('falls back to an earlier valid anchor when the last occurrence is a false chat match', () => {
		// The real anchor comes first here, and a later chat message (after the
		// real block) happens to contain anchor-like text with nothing valid
		// following it. Picking the last occurrence blindly would fail to find
		// Deposit All/Withdraw All and throw, even though a good paste exists
		// earlier in the same text.
		const text = `BULK OPTIONS
 Deposit All
500 Silver
 Withdraw All
200 Silver

SomePlayer
lol just hit bulk options by accident
05:24:34 AM`;

		expect(parseBankPaste(text)).toEqual({ walletSilver: 500, bankSilver: 200 });
	});
});
