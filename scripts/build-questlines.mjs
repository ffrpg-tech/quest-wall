// Parses data/farm_rpg_quests_master.csv into src/lib/data/questlines.json,
// grouping quests into questlines by stripping a trailing sequence marker
// (roman numeral, "Part NN", "- A/B/C", or trailing digits) off the quest name.
//
// Also writes scripts/grouping-report.txt so the grouping can be spot-checked
// against the raw quest list before the app trusts it (see scope doc's
// "Open Gaps" — roman-numeral parser unverified).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'data/farm_rpg_quests_master.csv');
const OUT_PATH = path.join(ROOT, 'src/lib/data/questlines.json');
const ITEMS_OUT_PATH = path.join(ROOT, 'src/lib/data/items.json');
const REPORT_PATH = path.join(__dirname, 'grouping-report.txt');

// ---------- CSV parsing (RFC4180-ish: quoted fields, doubled quotes, embedded commas/newlines) ----------

function parseCsv(text) {
	const rows = [];
	let row = [];
	let field = '';
	let inQuotes = false;
	let i = 0;
	const n = text.length;

	while (i < n) {
		const c = text[i];

		if (inQuotes) {
			if (c === '"') {
				if (text[i + 1] === '"') {
					field += '"';
					i += 2;
					continue;
				}
				inQuotes = false;
				i++;
				continue;
			}
			field += c;
			i++;
			continue;
		}

		if (c === '"') {
			inQuotes = true;
			i++;
			continue;
		}
		if (c === ',') {
			row.push(field);
			field = '';
			i++;
			continue;
		}
		if (c === '\r') {
			i++;
			continue;
		}
		if (c === '\n') {
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
			i++;
			continue;
		}
		field += c;
		i++;
	}
	// last field/row
	if (field.length > 0 || row.length > 0) {
		row.push(field);
		rows.push(row);
	}
	return rows;
}

// ---------- Requirements / rewards ----------

function parseItemList(raw) {
	const trimmed = raw.trim();
	if (trimmed === '' || trimmed.toLowerCase() === 'none') return [];
	return trimmed
		.split(';')
		.map((s) => s.trim())
		.filter(Boolean)
		.map((entry) => {
			const m = entry.match(/^(\d+)x\s+(.+)$/i);
			if (!m) return { item: entry, qty: 1 };
			return { item: m[2].trim(), qty: parseInt(m[1], 10) };
		});
}

// ---------- Sequence-suffix stripping / roman numerals ----------

/**
 * The source CSV embeds raw HTML line breaks in some quest names (e.g.
 * "Starting To Actually Realize <br/>Magic Ain't Pretty I"). Since this app
 * renders names as plain text, not HTML, strip those tags rather than
 * displaying the literal "<br/>" — replace with a space (not empty string)
 * so words on either side of a break don't get glued together.
 */
function sanitizeQuestName(raw) {
	return raw
		.replace(/<br\s*\/?>/gi, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

const ROMAN_RE = /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

function romanToInt(s) {
	const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
	let total = 0;
	for (let i = 0; i < s.length; i++) {
		const cur = map[s[i]];
		const next = map[s[i + 1]];
		if (next && cur < next) total -= cur;
		else total += cur;
	}
	return total;
}

function isRoman(s) {
	return s.length > 0 && ROMAN_RE.test(s);
}

/** Folds a dash-letter suffix (e.g. "- A") into the numeric sort key, so "II - A" sorts before "II - B" but after plain "II". */
function combineSeq(seqNum, letterSuffix) {
	return letterSuffix ? seqNum * 100 + letterSuffix.charCodeAt(0) : seqNum;
}

function withLetterLabel(labelText, letterSuffix) {
	return letterSuffix ? `${labelText} - ${letterSuffix}` : labelText;
}

/**
 * Splits a quest name into { base, seq, label } where `base` is the
 * questline grouping key, `seq` is a numeric sort key within the questline,
 * and `label` is the human-readable suffix (for the report / debugging).
 * Falls back to { base: fullName, seq: 0, label: '' } when no recognizable
 * sequence marker is present (singleton questline).
 */
function splitQuestName(fullName) {
	let name = fullName.trim();

	// Strip trailing " - <Letter>" (e.g. "Blizzard Warning II - A")
	let letterSuffix = null;
	const dashMatch = name.match(/^(.*\S)\s*-\s*([A-Za-z])$/);
	if (dashMatch) {
		letterSuffix = dashMatch[2].toUpperCase();
		name = dashMatch[1].trim();
	}

	// Strip trailing "Part <number>" (e.g. "Corn of Interest Part 01")
	const partMatch = name.match(/^(.*\S)\s+Part\s+(\d+)$/i);
	if (partMatch) {
		return {
			base: partMatch[1].trim(),
			seq: combineSeq(parseInt(partMatch[2], 10), letterSuffix),
			label: withLetterLabel(`Part ${partMatch[2]}`, letterSuffix)
		};
	}

	// Strip trailing roman numeral (e.g. "Fine Fishing IX")
	const romanMatch = name.match(/^(.*\S)\s+([IVXLCDM]+)$/);
	if (romanMatch && isRoman(romanMatch[2])) {
		return {
			base: romanMatch[1].trim(),
			seq: combineSeq(romanToInt(romanMatch[2]), letterSuffix),
			label: withLetterLabel(romanMatch[2], letterSuffix)
		};
	}

	// Strip trailing plain digits (e.g. "Distant Superfan 36")
	const digitMatch = name.match(/^(.*\S)\s+(\d+)$/);
	if (digitMatch) {
		return {
			base: digitMatch[1].trim(),
			seq: combineSeq(parseInt(digitMatch[2], 10), letterSuffix),
			label: withLetterLabel(digitMatch[2], letterSuffix)
		};
	}

	// No numeral found; if we stripped a dash-letter, use that as the whole marker
	if (letterSuffix) {
		return { base: name, seq: letterSuffix.charCodeAt(0), label: letterSuffix };
	}

	// Singleton questline (no recognizable sequence suffix at all)
	return { base: fullName.trim(), seq: 0, label: '' };
}

// ---------- Main ----------

function main() {
	const csvText = readFileSync(CSV_PATH, 'utf-8');
	const rows = parseCsv(csvText);
	const header = rows[0].map((h) => h.trim());
	const idx = (col) => header.indexOf(col);

	const iName = idx('Quest Name');
	const iFrom = idx('From');
	const iStart = idx('Start Date');
	const iEnd = idx('End Date');
	const iReq = idx('Requirements');
	const iRew = idx('Rewards');

	const quests = [];
	for (let r = 1; r < rows.length; r++) {
		const row = rows[r];
		if (!row || row.every((c) => c.trim() === '')) continue;
		const name = sanitizeQuestName(row[iName] ?? '');
		if (!name) continue;

		quests.push({
			name,
			from: (row[iFrom] ?? '').trim(),
			startDate: (row[iStart] ?? '').trim(),
			endDate: (row[iEnd] ?? '').trim(),
			requirements: parseItemList(row[iReq] ?? ''),
			rewards: parseItemList(row[iRew] ?? '')
		});
	}

	// Group into questlines
	const groups = new Map(); // base -> { name, quests: [{...quest, seq, label}] }
	for (const q of quests) {
		const { base, seq, label } = splitQuestName(q.name);
		if (!groups.has(base)) groups.set(base, { name: base, quests: [] });
		groups.get(base).quests.push({ ...q, seq, label });
	}

	const questlines = {};
	for (const [base, group] of groups) {
		group.quests.sort((a, b) => a.seq - b.seq);
		// group.quests entries already carry {..., seq, label} from the push
		// above — no need to re-map them into the same shape.
		questlines[base] = {
			name: base,
			questCount: group.quests.length,
			quests: group.quests
		};
	}

	mkdirSync(path.dirname(OUT_PATH), { recursive: true });
	writeFileSync(OUT_PATH, JSON.stringify(questlines, null, 2), 'utf-8');

	// All item names that ever appear as a requirement or a reward — used by
	// the app to validate/autosuggest item names in the manual-add field.
	// Note: currency (e.g. "Silver") never appears here because it's never a
	// quest requirement/reward line item in the source CSV, not because it
	// was dropped by this script.
	const itemNames = new Set();
	for (const q of quests) {
		for (const r of q.requirements) itemNames.add(r.item);
		for (const r of q.rewards) itemNames.add(r.item);
	}
	const sortedItems = Array.from(itemNames).sort((a, b) => a.localeCompare(b));
	writeFileSync(ITEMS_OUT_PATH, JSON.stringify(sortedItems, null, 2), 'utf-8');

	// ---------- Report for manual spot-check ----------
	const chains = Object.values(questlines)
		.filter((g) => g.questCount > 1)
		.sort((a, b) => b.questCount - a.questCount);
	const singletons = Object.values(questlines).filter((g) => g.questCount === 1);

	let report = '';
	report += `Total quests parsed: ${quests.length}\n`;
	report += `Total questline groups: ${Object.keys(questlines).length}\n`;
	report += `Groups with 2+ quests (real chains): ${chains.length}\n`;
	report += `Singleton groups (no chain detected): ${singletons.length}\n`;
	report += `\n===== CHAINS (name -> ordered members) =====\n\n`;
	for (const g of chains) {
		report += `${g.name}  [${g.questCount}]\n`;
		for (const q of g.quests) {
			report += `    ${q.label.padEnd(10)} ${q.name}\n`;
		}
		report += '\n';
	}
	report += `\n===== SINGLETONS (first 80, for spot-checking false negatives) =====\n\n`;
	for (const g of singletons.slice(0, 80)) {
		report += `${g.name}\n`;
	}

	writeFileSync(REPORT_PATH, report, 'utf-8');

	console.log(`Parsed ${quests.length} quests into ${Object.keys(questlines).length} questlines`);
	console.log(`(${chains.length} chains, ${singletons.length} singletons)`);
	console.log(`Wrote ${path.relative(ROOT, OUT_PATH)}`);
	console.log(`Wrote ${path.relative(ROOT, ITEMS_OUT_PATH)} (${sortedItems.length} unique item names)`);
	console.log(`Wrote ${path.relative(ROOT, REPORT_PATH)} for spot-checking`);
}

main();
