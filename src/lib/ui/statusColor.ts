/** The one emerald/amber/red semantic-color convention shared by every "how's this
 * going" indicator in the app (questline status pills, quest row status, shortfall
 * badges) — defined once so a color's meaning (good/warn/bad) stays consistent
 * everywhere instead of each component picking its own shade. `neutral` covers
 * "not started yet" / "nothing to report" states that aren't a warning or an error. */
export type SemanticStatus = 'good' | 'warn' | 'bad' | 'neutral';

const TEXT_COLOR_CLASS: Record<SemanticStatus, string> = {
	good: 'text-emerald-600 dark:text-emerald-400',
	warn: 'text-amber-600 dark:text-amber-400',
	bad: 'text-red-600 dark:text-red-400',
	neutral: 'text-gray-400 dark:text-gray-500'
};

export function statusTextColorClass(status: SemanticStatus): string {
	return TEXT_COLOR_CLASS[status];
}
