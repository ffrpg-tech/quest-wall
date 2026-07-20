/** Toggles a tap-to-expand key: same key collapses it, a different key switches to it.
 * Shared by badges whose `title` tooltip doesn't reach touch devices (CAPPED, LOCKED). */
export function toggleExpanded(current: string | null, key: string): string | null {
	return current === key ? null : key;
}
