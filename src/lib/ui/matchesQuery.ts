/** Case-insensitive substring match on a trimmed query — the one search predicate shared across the inventory, questline, and shortfall-summary filters. */
export function matchesQuery(text: string, query: string): boolean {
	const trimmed = query.trim();
	return trimmed === '' || text.toLowerCase().includes(trimmed.toLowerCase());
}
