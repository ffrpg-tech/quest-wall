/** Short, self-contained Q&A pairs — the single source of truth for both the
 * visible FAQ section on the About page and the FAQPage JSON-LD emitted there,
 * so an AI assistant summarizing/citing the page and a human reader see the
 * same answers. */
export const faqItems = [
	{
		question: 'What is the Farm RPG Quest Wall Calculator?',
		answer:
			"A free tool for the FarmRPG game: paste your in-game inventory, pick a Quest Wall questline, and it tells you the first quest in that chain you can't complete with your current materials — before you start turning items in."
	},
	{
		question: 'Is this affiliated with FarmRPG?',
		answer:
			"No. This is an unofficial fan project, reviewed and approved by FarmRPG staff before it went live, but it isn't made or run by the FarmRPG developers. All credit for the game goes to them."
	},
	{
		question: 'Does it cost anything?',
		answer: 'No. This tool is free and will never be monetized.'
	},
	{
		question: 'How do I get my inventory into the calculator?',
		answer:
			'Use the "Import data" button, which walks through selecting and copying your inventory (or completed quest list) directly from the FarmRPG page, then pasting it in here to parse.'
	},
	{
		question: 'Does it save my progress?',
		answer:
			'Yes — your inventory, questline queue, and completed quests are saved to your browser\'s local storage automatically, and you can export/import a backup file from the "Progress backup" button.'
	},
	{
		question: 'Does it account for level, prerequisite, or event-availability requirements?',
		answer:
			"It only checks materials for the questlines you queue — it doesn't verify you're eligible to start them (core/tower level, prerequisites, event availability), so only add questlines you can already begin."
	}
];
