import { describe, it, expect } from 'vitest';
import { questKey } from './types';

describe('questKey', () => {
	it('combines questline and quest name so identical quest names in different chains never collide', () => {
		expect(questKey('Chain A', 'Quest I')).not.toBe(questKey('Chain B', 'Quest I'));
	});
});
