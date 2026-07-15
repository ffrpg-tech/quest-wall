export interface ChangelogSection {
	heading: string;
	items: string[];
}

export interface ChangelogEntry {
	version: string;
	date: string | null;
	sections: ChangelogSection[];
}

/**
 * Parses a Keep a Changelog-style markdown file (see CHANGELOG.md) into
 * structured entries. Only understands the subset this project's file
 * actually uses: `## [version] - date` (or `## [Unreleased]`) entry headings
 * with `### Section` subheadings and `- item` bullet lists under each.
 * Anything else (prose, links at the bottom) is ignored.
 */
export function parseChangelog(raw: string): ChangelogEntry[] {
	const entries: ChangelogEntry[] = [];
	const lines = raw.split('\n');

	let current: ChangelogEntry | null = null;
	let currentSection: ChangelogSection | null = null;

	for (const line of lines) {
		const entryMatch = /^##\s+\[([^\]]+)\](?:\s*-\s*(.+))?/.exec(line);
		if (entryMatch) {
			current = { version: entryMatch[1], date: entryMatch[2]?.trim() ?? null, sections: [] };
			entries.push(current);
			currentSection = null;
			continue;
		}

		const sectionMatch = /^###\s+(.+)/.exec(line);
		if (sectionMatch && current) {
			currentSection = { heading: sectionMatch[1].trim(), items: [] };
			current.sections.push(currentSection);
			continue;
		}

		const itemMatch = /^-\s+(.+)/.exec(line);
		if (itemMatch && currentSection) {
			currentSection.items.push(itemMatch[1].trim());
		}
	}

	return entries;
}

/** Skips "Unreleased" and any entry with no items yet, since those have nothing to show. */
export function releasedEntries(entries: ChangelogEntry[]): ChangelogEntry[] {
	return entries.filter(
		(e) => e.version.toLowerCase() !== 'unreleased' && e.sections.some((s) => s.items.length > 0)
	);
}

export function latestVersion(entries: ChangelogEntry[]): string | null {
	return releasedEntries(entries)[0]?.version ?? null;
}
