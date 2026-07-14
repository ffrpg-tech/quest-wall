import { describe, it, expect } from 'vitest';
import { exportProgress, importProgress } from './persistence';

describe('exportProgress / importProgress', () => {
	it('round-trips a completed set through JSON', () => {
		const completed = new Set(['Chain A::Quest I', 'Chain A::Quest II']);
		const json = exportProgress(completed);
		const restored = importProgress(json);
		expect(restored).toEqual(completed);
	});

	it('returns null for unparseable JSON instead of throwing', () => {
		expect(importProgress('not json')).toBeNull();
	});

	it('returns null when the JSON is valid but not a recognizable export shape', () => {
		expect(importProgress('{"foo": "bar"}')).toBeNull();
		expect(importProgress('[]')).toBeNull();
	});
});
