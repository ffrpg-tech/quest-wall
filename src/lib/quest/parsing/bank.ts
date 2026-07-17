import { parseCommaNumber, parseFromAnchor, toTrimmedLines } from './pasteParsing';

// Client-side only — parses a manual select-all + copy of the player's raw
// FarmRPG Bank page text, mirroring inventory.ts's approach for the
// Inventory page. Decoupled from inventory.ts on purpose: this only ever
// produces a Silver figure, it doesn't know about items.

export interface ParsedBank {
	/** "Deposit All" figure — Silver currently in the player's wallet, not yet in the bank. This is what's actually spendable on quest requirements right now. */
	walletSilver: number;
	/** "Withdraw All" figure — Silver currently sitting in the bank, earning interest. Not spendable until withdrawn. */
	bankSilver: number;
}

export class BankParseError extends Error {}

const ANCHOR = 'BULK OPTIONS';
const DEPOSIT_LABEL = 'Deposit All';
const WITHDRAW_LABEL = 'Withdraw All';

/** Finds `label` as an exact (trimmed) line match and returns the Silver amount parsed from the next non-empty line, e.g. "613,871,898 Silver". Exact line matching matters here — the page also has a "Deposit"/"Withdraw" (no "All") pair earlier for one-off amounts, and a naive substring match would pick those up instead. */
function extractAmount(lines: string[], label: string): number | null {
	const labelIdx = lines.findIndex((l) => l.toLowerCase() === label.toLowerCase());
	if (labelIdx === -1) return null;

	const amountLine = lines[labelIdx + 1];
	if (!amountLine) return null;

	const match = /^([\d,]+)\s*Silver$/i.exec(amountLine);
	if (!match) return null;

	return parseCommaNumber(match[1]);
}

/**
 * Parses raw copy-pasted Bank page text into wallet/bank Silver figures. Only
 * pulls from the "Bulk Options" block (Deposit All / Withdraw All) — the
 * "Currently in Bank" line above it is redundant with Withdraw All and isn't
 * used as a fallback, since surrounding chat-log/menu text pasted alongside
 * it can't be trusted not to contain a false-positive match.
 */
export function parseBankPaste(rawText: string): ParsedBank {
	return parseFromAnchor(
		rawText,
		ANCHOR,
		parseBankBlock,
		() =>
			new BankParseError(
				'Could not find "Bulk Options" in the pasted content — make sure you copied the full Bank page.'
			)
	);
}

/**
 * Parses a single candidate occurrence of the anchor. Thrown errors here are
 * also the signal `parseFromAnchor` uses to reject a false anchor match
 * (e.g. a live chat message that happened to contain "Bulk Options") and
 * fall back to an earlier occurrence in the pasted text.
 */
function parseBankBlock(afterAnchor: string): ParsedBank {
	const lines = toTrimmedLines(afterAnchor);

	const walletSilver = extractAmount(lines, DEPOSIT_LABEL);
	if (walletSilver === null) {
		throw new BankParseError(
			'Could not find a "Deposit All" amount — the paste may be truncated or malformed.'
		);
	}

	const bankSilver = extractAmount(lines, WITHDRAW_LABEL);
	if (bankSilver === null) {
		throw new BankParseError(
			'Could not find a "Withdraw All" amount — the paste may be truncated or malformed.'
		);
	}

	return { walletSilver, bankSilver };
}
