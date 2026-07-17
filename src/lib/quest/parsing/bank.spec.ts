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
});
