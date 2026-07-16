import { describe, it, expect } from 'vitest';
import { indexOfCaseInsensitive, parseCommaNumber, toTrimmedLines } from './pasteParsing';

describe('indexOfCaseInsensitive', () => {
	it('finds a needle regardless of case and returns the original-casing index', () => {
		expect(indexOfCaseInsensitive('Some INVENTORY Stats here', 'inventory stats')).toBe(5);
	});

	it('returns -1 when not found', () => {
		expect(indexOfCaseInsensitive('nothing relevant', 'missing')).toBe(-1);
	});
});

describe('parseCommaNumber', () => {
	it('strips thousands separators', () => {
		expect(parseCommaNumber('1,002')).toBe(1002);
		expect(parseCommaNumber('613,871,898')).toBe(613871898);
	});

	it('parses a plain number with no separators', () => {
		expect(parseCommaNumber('42')).toBe(42);
	});
});

describe('toTrimmedLines', () => {
	it('trims lines and drops empty ones', () => {
		expect(toTrimmedLines('  a  \n\nb\r\n  \nc')).toEqual(['a', 'b', 'c']);
	});
});
