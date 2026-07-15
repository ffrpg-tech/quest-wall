<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { base, resolve } from '$app/paths';
	import { SvelteSet, SvelteMap } from 'svelte/reactivity';
	import {
		Sun,
		Moon,
		MessageSquarePlus,
		ChevronRight,
		Trash2,
		X,
		Upload,
		Save,
		GripVertical
	} from '@lucide/svelte';
	import { canonicalUrl, DEFAULT_DESCRIPTION, SITE_NAME } from '$lib/seo';
	import {
		questKey,
		type InventoryEntry,
		type QuestlinesData,
		type Questline
	} from '$lib/quest/types';
	import { parseInventoryDump, inventoryToMap, mergeInventory } from '$lib/quest/inventory';
	import {
		aggregateQueueShortfalls,
		diffQuestlineQueue,
		type QuestlineDiffResult
	} from '$lib/quest/diff';
	import {
		loadCompleted,
		saveCompleted,
		exportProgress,
		importProgress,
		loadDarkMode,
		saveDarkMode,
		loadInventory,
		saveInventory,
		loadQueue,
		saveQueue
	} from '$lib/quest/persistence';

	// TODO: swap in the real Google Form URL once it exists (see
	// CONTRIBUTING.md / phase-2.5 spec for the fields it should collect).
	const FEEDBACK_FORM_URL = 'https://forms.gle/PLACEHOLDER';

	// TODO: swap in the real repo URL once the source is public.
	const SOURCE_URL = 'https://github.com/PLACEHOLDER/farm-rpg-quest-tracker';

	const LAUNCH_YEAR = 2026;
	const currentYear = new Date().getFullYear();
	const copyrightYears =
		currentYear > LAUNCH_YEAR ? `${LAUNCH_YEAR}-${currentYear}` : `${LAUNCH_YEAR}`;

	// Answer-engine / GEO framing: short, self-contained Q&A pairs emitted as
	// FAQPage JSON-LD (not rendered in the visible UI) so an AI assistant
	// summarizing or citing this page has a direct, quotable answer instead of
	// having to infer one from the calculator UI.
	const faqItems = [
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
				'Use the "Import data" button, which walks through copying your inventory (or completed quest list) out of FarmRPG with a small console script, then pasting it in here to parse.'
		},
		{
			question: 'Does it save my progress?',
			answer:
				'Yes — your inventory, questline queue, and completed quests are saved to your browser\'s local storage automatically, and you can export/import a backup file from the "Progress backup" button.'
		}
	];

	const webApplicationJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: SITE_NAME,
		url: canonicalUrl('/'),
		description: DEFAULT_DESCRIPTION,
		applicationCategory: 'GameApplication',
		operatingSystem: 'Any',
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
		author: { '@type': 'Person', name: 'kodyy' }
	};

	const faqJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faqItems.map((f) => ({
			'@type': 'Question',
			name: f.question,
			acceptedAnswer: { '@type': 'Answer', text: f.answer }
		}))
	};

	/**
	 * One place for the interactive-element treatment (cursor, hover
	 * highlight, pressed/active state) so every button/pill/icon in the app
	 * behaves consistently instead of each spot hand-rolling its own subset
	 * of hover/active classes. `active` marks a toggle-style control (status
	 * pills) as currently selected, not the CSS :active pseudo-class.
	 */
	function buttonClass(
		variant: 'default' | 'primary' | 'dark' | 'pill' | 'icon' | 'icon-danger' | 'link' = 'default',
		active = false
	): string {
		const base = 'cursor-pointer transition-colors disabled:cursor-not-allowed';
		switch (variant) {
			case 'primary':
				return `${base} rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40`;
			case 'dark':
				return `${base} rounded bg-gray-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900 active:bg-gray-950 disabled:opacity-40 dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-500`;
			case 'pill':
				return active
					? `${base} rounded-full border border-emerald-600 bg-emerald-600 px-2.5 py-1 text-white hover:bg-emerald-700 active:bg-emerald-800`
					: `${base} rounded-full border border-gray-300 px-2.5 py-1 text-gray-600 hover:bg-gray-100 active:bg-gray-200 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700`;
			case 'icon':
				return `${base} rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 active:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 dark:active:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent`;
			case 'icon-danger':
				// Destructive/clearing actions (remove item, clear inventory, clear a search or paste field) get a consistent red tint instead of the neutral icon color, so their intent reads at a glance.
				return `${base} rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 active:bg-red-100 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300 dark:active:bg-red-900 disabled:opacity-30 disabled:hover:bg-transparent`;
			case 'link':
				return `${base} text-xs text-emerald-600 hover:text-emerald-700 hover:underline active:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300`;
			default:
				return `${base} rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 active:bg-gray-200 dark:border-gray-600 dark:hover:bg-gray-800 dark:active:bg-gray-700`;
		}
	}

	// Fetched as a static asset (rather than imported) so it ships as its own
	// cacheable request instead of being bundled into this page's JS chunk —
	// see _headers (project root) for the cache headers and scripts/build-questlines.mjs
	// for where it's generated.
	let questlines = $state<QuestlinesData>({});
	let questlinesHydrated = $state(false);

	onMount(async () => {
		const res = await fetch(`${base}/questlines.json`);
		questlines = (await res.json()) as QuestlinesData;
		questlinesHydrated = true;
	});

	const questlineOptions = $derived(
		Object.values(questlines)
			.slice()
			.sort((a, b) => a.name.localeCompare(b.name))
	);

	const questlineByName = $derived(new Map(questlineOptions.map((g) => [g.name, g])));

	/** Case-insensitive substring match on a trimmed query — the one search predicate shared by the inventory and questline filters below. */
	function matchesQuery(text: string, query: string): boolean {
		const trimmed = query.trim();
		return trimmed === '' || text.toLowerCase().includes(trimmed.toLowerCase());
	}

	// A plain (non-raw) template literal: backticks are escaped as \` so they
	// render as literal backticks, and \t / \r\n are double-escaped so they
	// render as the two literal characters "\t" / "\r\n" (this script's own
	// string escapes) rather than being turned into real tab/newline bytes.
	const INVENTORY_SCRAPER_SCRIPT = `$(".page-on-center .page-content").prepend(\`<a href="#" class="button btnpurple" id="copyinventory">Copy Inventory to Clipboard</a>\`)
document.getElementById("copyinventory").addEventListener("click", async () => {
    let text = "";
    let currentCategory = "";
    $(".list-block-search li").each((i, el) => {
        let $el = $(el);
        if ($el.hasClass("list-group-title")) {
            currentCategory = $el.clone().children().remove().end().text().trim();
        } else {
            let name = $el.find(".item-title strong").first().text().trim();
            let $qty = $el.find(".item-after").first();
            let qty = $qty.text().trim();
            let isMax = $qty.attr("style") && $qty.attr("style").includes("color:red") ? "MAX" : "";
            if (name) text += currentCategory + "\\t" + name + "\\t" + qty + "\\t" + isMax + "\\r\\n";
        }
    });
    text = text.trim();
    await navigator.clipboard.writeText(text);
    myApp.alert("Copied to Clipboard", "");
});`;

	// Same scraper pattern, but for the "Completed Quest List" screen — grabs
	// just the quest names (that screen has no item/qty columns to capture).
	const COMPLETED_QUESTS_SCRAPER_SCRIPT = `$(".page-on-center .page-content").prepend(\`<a href="#" class="button btnpurple" id="copytoclipboard">Copy List to Clipboard</a>\`)
document.getElementById("copytoclipboard").addEventListener("click", async () => {
    let text = "";
    $("ul").last().children().each((i, quest) => {
        text += $(quest).find(".item-title strong").text().trim() + "\\r\\n";
    });
    text = text.trim();
    await navigator.clipboard.writeText(text);
    myApp.alert("Copied to Clipboard", "");
});`;

	// ---------- Inventory ----------

	let inventory = $state<InventoryEntry[]>([]);
	let inventoryHydrated = $state(false);
	let inventoryQuery = $state('');

	onMount(() => {
		inventory = loadInventory();
		inventoryHydrated = true;
	});

	$effect(() => {
		if (inventoryHydrated) saveInventory(inventory);
	});

	const inventoryMap = $derived(inventoryToMap(inventory));

	const filteredInventory = $derived(inventory.filter((e) => matchesQuery(e.item, inventoryQuery)));

	/** Directly editing a row's Qty field is the only way to update an existing item's quantity — there's no separate "manual entry" form duplicating the table. Clamps rather than rejecting invalid input (negative, empty, non-numeric) — silently no-op'ing left the input showing whatever the user typed while state stayed unchanged underneath it, since the field's displayed value only resyncs when the bound state actually changes. */
	function updateItemQty(name: string, qty: number) {
		const clamped = Number.isFinite(qty) ? Math.max(0, qty) : 0;
		inventory = inventory.map((e) => (e.item === name ? { ...e, qty: clamped } : e));
	}

	function removeItem(name: string) {
		inventory = inventory.filter((e) => e.item !== name);
	}

	function clearInventoryTable() {
		inventory = [];
	}

	// ---------- Questline picker ----------

	let questlineQuery = $state('');
	let selectedQuestlineNames = $state<string[]>([]);
	let queueHydrated = $state(false);
	type QuestlineStatusFilter = 'all' | 'not-started' | 'ongoing' | 'done';
	let questlineStatusFilter = $state<QuestlineStatusFilter>('all');

	$effect(() => {
		// Waits on questlinesHydrated since questlineByName is empty until the
		// fetch in the questlines onMount above resolves.
		if (questlinesHydrated && !queueHydrated) {
			// Drop any saved name that no longer matches a real questline (e.g. the
			// underlying quest data changed since the queue was saved).
			selectedQuestlineNames = loadQueue().filter((name) => questlineByName.has(name));
			queueHydrated = true;
		}
	});

	$effect(() => {
		if (queueHydrated) saveQueue(selectedQuestlineNames);
	});

	function clearQuestlineSearch() {
		questlineQuery = '';
	}

	function questlineStatus(g: Questline, doneCount: number): 'not-started' | 'ongoing' | 'done' {
		if (doneCount === 0) return 'not-started';
		if (doneCount >= g.questCount) return 'done';
		return 'ongoing';
	}

	const selectedQuestlines = $derived(
		selectedQuestlineNames
			.map((name) => questlineByName.get(name))
			.filter((g): g is Questline => g !== undefined)
	);

	/** Clicking a picker row toggles it in/out of the queue — appends to the end when adding (order is meaningful for the shared-inventory simulation), removes when it's already queued. Mirrors the highlighted/pressed-toggle-button pattern instead of requiring a trip down to the queue list's ✕ to undo a click. */
	function toggleQueue(name: string) {
		selectedQuestlineNames = selectedQuestlineNames.includes(name)
			? selectedQuestlineNames.filter((n) => n !== name)
			: [...selectedQuestlineNames, name];
	}

	function removeFromQueue(name: string) {
		selectedQuestlineNames = selectedQuestlineNames.filter((n) => n !== name);
	}

	// ---------- Queue drag-to-reorder ----------

	let dragFromIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);

	function handleQueueDrop(toIndex: number) {
		if (dragFromIndex === null || dragFromIndex === toIndex) {
			dragFromIndex = null;
			dragOverIndex = null;
			return;
		}
		const next = selectedQuestlineNames.slice();
		const [moved] = next.splice(dragFromIndex, 1);
		next.splice(toIndex, 0, moved);
		selectedQuestlineNames = next;
		dragFromIndex = null;
		dragOverIndex = null;
	}

	// ---------- Completion tracking (localStorage-backed) ----------

	// SvelteSet/SvelteMap (not $state(Set)/$state(Map)) so toggling one quest
	// mutates in place instead of cloning the whole set/map on every click —
	// completed can hold up to ~2400 entries and completedCountByQuestline one
	// entry per questline (529), and both used to get fully copied per toggle.
	let completed = new SvelteSet<string>();
	let hydrated = $state(false);

	/** How many quests are marked done within each questline, keyed by questline name. Kept as its own state (updated incrementally by toggleCompleted) rather than a $derived recompute, since re-walking all ~2400 quests across every questline on every single checkbox click would be wasted work — only one questline's count actually changes per toggle. */
	let completedCountByQuestline = new SvelteMap<string, number>();

	function applyCompletedCounts(counts: Map<string, number>) {
		for (const [name, count] of counts) completedCountByQuestline.set(name, count);
	}

	const filteredQuestlines = $derived(
		questlineOptions.filter((g) => {
			const matchesStatus =
				questlineStatusFilter === 'all' ||
				questlineStatus(g, completedCountByQuestline.get(g.name) ?? 0) === questlineStatusFilter;
			return matchesQuery(g.name, questlineQuery) && matchesStatus;
		})
	);

	function computeCompletedCounts(completedSet: Set<string>): Map<string, number> {
		const counts = new Map<string, number>();
		for (const g of questlineOptions) {
			let count = 0;
			for (const q of g.quests) {
				if (completedSet.has(questKey(g.name, q.name))) count++;
			}
			counts.set(g.name, count);
		}
		return counts;
	}

	$effect(() => {
		// Waits on questlinesHydrated since computeCompletedCounts walks
		// questlineOptions, which is empty until the questlines fetch resolves.
		if (questlinesHydrated && !hydrated) {
			for (const key of loadCompleted()) completed.add(key);
			applyCompletedCounts(computeCompletedCounts(completed));
			hydrated = true;
		}
	});

	$effect(() => {
		if (hydrated) saveCompleted(completed);
	});

	function toggleCompleted(questlineName: string, questName: string) {
		const key = questKey(questlineName, questName);
		const adding = !completed.has(key);
		if (adding) completed.add(key);
		else completed.delete(key);

		completedCountByQuestline.set(
			questlineName,
			(completedCountByQuestline.get(questlineName) ?? 0) + (adding ? 1 : -1)
		);
	}

	/** Quest name -> every (questline, quest) pair with that exact name. The in-game "Completed Quest List" export only gives bare quest names, not which chain they belong to, so a name that happens to exist in more than one questline gets marked done everywhere it appears rather than left ambiguous. */
	const questNameIndex = $derived.by(() => {
		const index = new Map<string, { questlineName: string; questName: string }[]>();
		for (const g of questlineOptions) {
			for (const q of g.quests) {
				const matches = index.get(q.name) ?? [];
				matches.push({ questlineName: g.name, questName: q.name });
				index.set(q.name, matches);
			}
		}
		return index;
	});

	let completedPasteText = $state('');
	let completedParseMessage = $state('');

	function handleParseCompleted() {
		const names = completedPasteText
			.split(/\r?\n/)
			.map((l) => l.trim())
			.filter((l) => l.length > 0);
		if (names.length === 0) {
			completedParseMessage = 'Nothing to parse.';
			return;
		}

		let matchedNames = 0;
		let unmatchedNames = 0;
		for (const name of names) {
			const matches = questNameIndex.get(name);
			if (!matches) {
				unmatchedNames++;
				continue;
			}
			matchedNames++;
			for (const m of matches) completed.add(questKey(m.questlineName, m.questName));
		}
		applyCompletedCounts(computeCompletedCounts(completed));
		completedParseMessage =
			unmatchedNames > 0
				? `Marked ${matchedNames} quest name${matchedNames === 1 ? '' : 's'} done (${unmatchedNames} name${unmatchedNames === 1 ? '' : 's'} didn't match a known quest).`
				: `Marked ${matchedNames} quest${matchedNames === 1 ? '' : 's'} done.`;
	}

	// ---------- Progress backup modal (JSON export/import of completed quests) ----------

	let progressModalOpen = $state(false);

	function handleExport() {
		const json = exportProgress(completed);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'farmrpg-quest-progress.json';
		a.click();
		URL.revokeObjectURL(url);
	}

	let importInputEl: HTMLInputElement | undefined = $state();
	let importMessage = $state('');

	function handleImportClick() {
		importInputEl?.click();
	}

	async function handleImportFile(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const text = await file.text();
		const imported = importProgress(text);
		if (!imported) {
			importMessage = "That file doesn't look like a progress export.";
			return;
		}
		if (
			completed.size === 0 ||
			confirm(
				`Replace your current progress (${completed.size} quests marked done) with the imported file (${imported.size} quests)?`
			)
		) {
			completed.clear();
			for (const key of imported) completed.add(key);
			applyCompletedCounts(computeCompletedCounts(completed));
			importMessage = `Imported ${imported.size} completed quests.`;
		}
		(e.target as HTMLInputElement).value = '';
	}

	// ---------- Diff ----------

	const diffResults = $derived<QuestlineDiffResult[]>(
		diffQuestlineQueue(selectedQuestlines, inventoryMap, completed)
	);

	// The single item-level shortfall view, regardless of queue length — this
	// replaces each panel having its own "Total shortfall" block, which was
	// just a redundant subset of this same data once more than one questline
	// was queued.
	const shortfallSummary = $derived(
		diffResults.length > 0 ? aggregateQueueShortfalls(diffResults) : []
	);

	// ---------- Import modal (paste-based: inventory dump + completed quests) ----------

	type ImportTab = 'inventory' | 'completed';
	let importModalOpen = $state(false);
	let importTab = $state<ImportTab>('inventory');
	let showScraperHelp = $state(false);
	let copyScriptMessage = $state('');

	let pasteText = $state('');
	let parseMessage = $state('');

	/** The one place that owns "switching tabs collapses the how-to-help panel" — used both to open the modal on a given tab and to switch tabs once it's already open, so the invariant can't drift out of sync between call sites. */
	function switchImportTab(tab: ImportTab) {
		importTab = tab;
		showScraperHelp = false;
	}

	function openImportModal(tab: ImportTab) {
		switchImportTab(tab);
		importModalOpen = true;
	}

	function clearPasteText() {
		pasteText = '';
		parseMessage = '';
	}

	function clearCompletedPasteText() {
		completedPasteText = '';
		completedParseMessage = '';
	}

	function handleParsePaste() {
		if (!pasteText.trim()) {
			parseMessage = 'Nothing to parse.';
			return;
		}
		const parsed = parseInventoryDump(pasteText);
		if (parsed.size === 0) {
			parseMessage = 'Couldn\'t find any "Name<TAB>Qty" rows in that paste — check the format.';
			return;
		}

		// Paste overwrites matching item names in the current inventory.
		inventory = mergeInventory(inventory, parsed);
		parseMessage = `Parsed ${parsed.size} item${parsed.size === 1 ? '' : 's'}.`;
	}

	async function copyScript(script: string) {
		await navigator.clipboard.writeText(script);
		copyScriptMessage = 'Copied!';
		setTimeout(() => (copyScriptMessage = ''), 2000);
	}

	// ---------- Dark mode ----------

	let darkMode = $state(false);
	let darkModeHydrated = $state(false);

	onMount(() => {
		darkMode = loadDarkMode();
		darkModeHydrated = true;
	});

	$effect(() => {
		document.documentElement.classList.toggle('dark', darkMode);
		if (darkModeHydrated) saveDarkMode(darkMode);
	});

	// ---------- Startup loading screen ----------

	/** Each localStorage read runs in its own onMount and is synchronous, but
	 * naming them individually here still lets the overlay show which piece
	 * is outstanding rather than a single opaque spinner. */
	const loadingStages = $derived([
		{ label: 'Preferences', done: darkModeHydrated },
		{ label: 'Inventory', done: inventoryHydrated },
		{ label: 'Completed quests', done: hydrated },
		{ label: 'Questline queue', done: queueHydrated }
	]);
	const appReady = $derived(loadingStages.every((s) => s.done));
</script>

<svelte:head>
	<title>{SITE_NAME}</title>
	<meta name="description" content={DEFAULT_DESCRIPTION} />
	<link rel="canonical" href={canonicalUrl('/')} />

	<meta property="og:type" content="website" />
	<meta property="og:title" content={SITE_NAME} />
	<meta property="og:description" content={DEFAULT_DESCRIPTION} />
	<meta property="og:url" content={canonicalUrl('/')} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={SITE_NAME} />
	<meta name="twitter:description" content={DEFAULT_DESCRIPTION} />

	<!-- eslint-disable svelte/no-at-html-tags -- JSON-LD script tags: content is
	     JSON.stringify of static, developer-authored objects above, not user
	     input, so there's no injection surface. {@html} is the only way to
	     emit a literal <script> tag from svelte:head. -->
	{@html `<script type="application/ld+json">${JSON.stringify(webApplicationJsonLd)}</` + 'script>'}
	{@html `<script type="application/ld+json">${JSON.stringify(faqJsonLd)}</` + 'script>'}
	<!-- eslint-enable svelte/no-at-html-tags -->
</svelte:head>

{#if !appReady}
	<div
		class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/50 backdrop-blur-sm"
		transition:fade={{ duration: 150 }}
	>
		<div
			class="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white"
			role="status"
			aria-label="Loading"
		></div>
		<ul class="space-y-1 text-sm text-white">
			{#each loadingStages as stage (stage.label)}
				<li class="flex items-center gap-2">
					{#if stage.done}
						<span class="text-emerald-400">✓</span>
					{:else}
						<span
							class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white"
						></span>
					{/if}
					<span class={stage.done ? 'text-white/70 line-through' : 'text-white'}>{stage.label}</span
					>
				</li>
			{/each}
		</ul>
	</div>
{/if}

<div class="mx-auto max-w-6xl space-y-8 p-6 dark:text-gray-100">
	<header class="flex flex-wrap items-start justify-between gap-4">
		<div class="space-y-1">
			<h1 class="text-2xl font-bold">Farm RPG Quest Wall Calculator</h1>
			<p class="text-sm text-gray-500 dark:text-gray-400">
				Paste your inventory, pick a questline, and see exactly which quest you'll run dry on.
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<a
				href={FEEDBACK_FORM_URL}
				target="_blank"
				rel="noopener noreferrer"
				class="flex items-center gap-1.5 {buttonClass('default')}"
			>
				<MessageSquarePlus size={16} class="text-sky-600 dark:text-sky-400" />
				Feedback / report an issue
			</a>
			<button
				onclick={() => openImportModal('inventory')}
				class="flex items-center gap-1.5 {buttonClass('default')}"
			>
				<Upload size={16} class="text-sky-600 dark:text-sky-400" />
				Import data
			</button>
			<button
				onclick={() => (progressModalOpen = true)}
				class="flex items-center gap-1.5 {buttonClass('default')}"
			>
				<Save size={16} class="text-sky-600 dark:text-sky-400" />
				Progress backup
			</button>
			<button
				onclick={() => (darkMode = !darkMode)}
				aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
				class={buttonClass('icon')}
			>
				{#if darkMode}
					<Sun size={16} class="text-amber-500" />
				{:else}
					<Moon size={16} class="text-indigo-500 dark:text-indigo-300" />
				{/if}
			</button>
			<input
				bind:this={importInputEl}
				type="file"
				accept="application/json"
				class="hidden"
				onchange={handleImportFile}
			/>
		</div>
	</header>

	<section class="grid gap-6 md:grid-cols-2">
		<!-- Inventory input -->
		<div class="flex flex-col space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
			<div class="flex items-center justify-between">
				<h2 class="font-semibold">1. Inventory ({inventory.length})</h2>
				<div class="flex items-center gap-1">
					<button
						onclick={() => openImportModal('inventory')}
						title="Import inventory"
						aria-label="Import inventory"
						class={buttonClass('icon')}
					>
						<Upload size={16} class="text-sky-600 dark:text-sky-400" />
					</button>
					{#if inventory.length > 0}
						<button
							onclick={clearInventoryTable}
							title="Clear inventory"
							aria-label="Clear inventory"
							class={buttonClass('icon-danger')}
						>
							<Trash2 size={16} />
						</button>
					{/if}
				</div>
			</div>

			{#if inventory.length > 0}
				<div class="relative">
					<input
						bind:value={inventoryQuery}
						placeholder="Search current inventory…"
						class="w-full rounded border border-gray-300 p-1.5 pr-9 text-sm transition-colors hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500"
					/>
					{#if inventoryQuery}
						<button
							onclick={() => (inventoryQuery = '')}
							aria-label="Clear inventory search"
							title="Clear inventory search"
							class="absolute top-1/2 right-3 -translate-y-1/2 {buttonClass('icon-danger')}"
						>
							✕
						</button>
					{/if}
				</div>
			{/if}
			<div
				class="relative min-h-0 max-h-[60vh] flex-1 overflow-auto rounded border border-gray-100 dark:border-gray-700"
			>
				<table class="w-full table-fixed text-sm">
					<thead
						class="sticky top-0 bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400"
					>
						<tr>
							<th class="p-2">Item</th>
							<th class="w-24 p-2">Qty</th>
							<th class="w-10 p-2"></th>
						</tr>
					</thead>
					<tbody>
						{#each filteredInventory as entry (entry.item)}
							<tr class="border-t border-gray-100 dark:border-gray-700">
								<td class="p-2">{entry.item}{entry.maxed ? ' (MAX)' : ''}</td>
								<td class="p-2">
									<input
										type="number"
										value={entry.qty}
										min="0"
										onchange={(e) => updateItemQty(entry.item, Number(e.currentTarget.value))}
										class="w-20 rounded border border-gray-300 p-1 text-sm tabular-nums transition-colors hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500"
									/>
								</td>
								<td class="p-2 text-right">
									<button
										onclick={() => removeItem(entry.item)}
										aria-label="Remove {entry.item}"
										title="Remove"
										class={buttonClass('icon-danger')}
									>
										<X size={14} />
									</button>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="3" class="p-4 text-center text-xs text-gray-400">
									{inventory.length === 0
										? 'No items yet — import a dump to get started.'
										: 'No items match that search.'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Questline picker -->
		<div class="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
			<div class="flex items-center justify-between">
				<h2 class="font-semibold">2. Questline</h2>
				<button
					onclick={() => openImportModal('completed')}
					title="Import completed quests"
					aria-label="Import completed quests"
					class={buttonClass('icon')}
				>
					<Upload size={16} class="text-sky-600 dark:text-sky-400" />
				</button>
			</div>
			<div class="relative">
				<input
					bind:value={questlineQuery}
					placeholder="Search questline name…"
					class="w-full rounded border border-gray-300 p-2 pr-8 text-sm transition-colors hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500"
				/>
				{#if questlineQuery}
					<button
						onclick={clearQuestlineSearch}
						aria-label="Clear questline search"
						title="Clear questline search"
						class="absolute top-1/2 right-2 -translate-y-1/2 {buttonClass('icon-danger')}"
					>
						✕
					</button>
				{/if}
			</div>

			<div class="flex flex-wrap gap-1.5 text-xs">
				{#each [['all', 'All'], ['not-started', 'Not started'], ['ongoing', 'Ongoing'], ['done', 'Done']] as [value, label] (value)}
					<button
						onclick={() => (questlineStatusFilter = value as typeof questlineStatusFilter)}
						class={buttonClass('pill', questlineStatusFilter === value)}
					>
						{label}
					</button>
				{/each}
			</div>

			<div class="max-h-80 overflow-y-auto rounded border border-gray-100 dark:border-gray-700">
				<ul data-testid="questline-list">
					{#each filteredQuestlines as g (g.name)}
						{@const doneCount = completedCountByQuestline.get(g.name) ?? 0}
						{@const queued = selectedQuestlineNames.includes(g.name)}
						<li>
							<button
								onclick={() => toggleQueue(g.name)}
								aria-pressed={queued}
								title={queued ? 'Click to remove from queue' : 'Click to add to queue'}
								class="flex w-full cursor-pointer items-center justify-between border-t border-gray-100 p-2 text-left text-sm transition-colors first:border-t-0 hover:bg-gray-50 active:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 dark:active:bg-gray-700"
								class:bg-emerald-50={queued}
								class:dark:bg-emerald-900={queued}
								class:hover:bg-emerald-100={queued}
								class:dark:hover:bg-emerald-800={queued}
							>
								<span>{g.name}</span>
								<span class="text-xs text-gray-400"
									>{doneCount > 0 ? `${doneCount}/${g.questCount}` : g.questCount}</span
								>
							</button>
						</li>
					{:else}
						<li class="p-4 text-center text-xs text-gray-400">
							{questlinesHydrated
								? 'No questlines match that search/filter.'
								: 'Loading questlines…'}
						</li>
					{/each}
				</ul>
			</div>

			{#if selectedQuestlines.length > 0}
				<div class="space-y-2">
					<h3 class="text-xs font-medium text-gray-500 dark:text-gray-400">
						Queue ({selectedQuestlines.length}) — order matters, shared inventory
					</h3>
					<ul class="max-h-64 space-y-1 overflow-y-auto pr-1">
						{#each selectedQuestlines as g, i (g.name)}
							<li
								data-testid="queue-row"
								draggable="true"
								ondragstart={(e) => {
									dragFromIndex = i;
									// Firefox aborts the drag entirely if dataTransfer.setData isn't
									// called during dragstart — Chromium doesn't enforce this, which is
									// why this was easy to miss testing only against Chromium.
									e.dataTransfer?.setData('text/plain', String(i));
								}}
								ondragover={(e) => {
									e.preventDefault();
									dragOverIndex = i;
								}}
								ondragleave={() => {
									if (dragOverIndex === i) dragOverIndex = null;
								}}
								ondrop={() => handleQueueDrop(i)}
								ondragend={() => {
									dragFromIndex = null;
									dragOverIndex = null;
								}}
								class="flex items-center justify-between gap-2 rounded border border-gray-100 p-2 text-sm transition-colors dark:border-gray-700"
								class:opacity-40={dragFromIndex === i}
								class:border-emerald-400={dragOverIndex === i && dragFromIndex !== i}
								class:dark:border-emerald-500={dragOverIndex === i && dragFromIndex !== i}
							>
								<span class="flex min-w-0 items-center gap-1.5">
									<GripVertical
										size={14}
										class="shrink-0 cursor-grab text-gray-400 active:cursor-grabbing"
									/>
									<span class="truncate">{i + 1}. {g.name}</span>
								</span>
								<button
									onclick={() => removeFromQueue(g.name)}
									aria-label="Remove from queue"
									title="Remove from queue"
									class={buttonClass('icon-danger')}
								>
									✕
								</button>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	</section>

	{#if shortfallSummary.length > 0}
		<section class="space-y-2 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
			<h2 class="font-semibold">
				{#if diffResults.length > 1}
					Shortfall summary — combined across {diffResults.length} questlines
				{:else}
					Shortfall summary — {diffResults[0].questlineName}
				{/if}
			</h2>
			{#if diffResults.length > 1}
				<p class="text-xs text-gray-500 dark:text-gray-400">
					Since queued questlines share one inventory, an item's total below can come from more than
					one questline — expand a row to see which questline (and which quest in it) it's from.
				</p>
			{/if}
			<ul class="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
				{#each shortfallSummary as s (s.item)}
					<li class="border-b border-gray-100 py-1 dark:border-gray-700">
						<details class="group">
							<summary
								class="flex cursor-pointer list-none items-center gap-1 font-medium text-gray-900 dark:text-gray-100"
							>
								<ChevronRight
									size={14}
									class="shrink-0 transition-transform group-open:rotate-90"
								/>
								{s.item}
							</summary>
							<div class="mt-1 border-l border-gray-200 pl-4 dark:border-gray-700">
								<div
									class="flex justify-between text-xs font-medium text-gray-700 dark:text-gray-300"
								>
									<span>Total</span>
									<span class="tabular-nums text-red-600 dark:text-red-400">−{s.short}</span>
								</div>
								<ul class="mt-1 space-y-1 text-xs">
									{#each s.byQuestline as ql (ql.questlineName)}
										<li>
											{#if s.byQuestline.length > 1}
												<div class="flex justify-between text-gray-700 dark:text-gray-300">
													<span class="font-medium">{ql.questlineName} subtotal</span>
													<span class="tabular-nums text-amber-600 dark:text-amber-400"
														>−{ql.short}</span
													>
												</div>
											{/if}
											<ul class="space-y-0.5" class:pl-4={s.byQuestline.length > 1}>
												{#each ql.byQuest as bq (bq.seq)}
													<li class="flex justify-between text-gray-500 dark:text-gray-400">
														<span>{bq.label || bq.questName} — {bq.questName}</span>
														<span class="tabular-nums">−{bq.short}</span>
													</li>
												{/each}
											</ul>
										</li>
									{/each}
								</ul>
							</div>
						</details>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if diffResults.length > 0}
		<section class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
			<h2 class="mb-2 font-semibold">Results</h2>
			<ul class="divide-y divide-gray-100 dark:divide-gray-700">
				{#each diffResults as diffResult, i (diffResult.questlineName)}
					<li data-testid="result-row">
						<details class="group">
							<summary
								class="flex cursor-pointer list-none items-center justify-between gap-2 py-2"
							>
								<span class="flex min-w-0 items-center gap-2">
									<ChevronRight
										size={14}
										class="shrink-0 text-gray-400 transition-transform group-open:rotate-90"
									/>
									<span class="truncate font-medium">{diffResult.questlineName}</span>
									{#if diffResults.length > 1}
										<span class="shrink-0 text-xs text-gray-400">(queue position {i + 1})</span>
									{/if}
								</span>
								{#if diffResult.wallPointIndex === null}
									<span
										class="shrink-0 rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
									>
										Clear — enough to finish the chain
									</span>
								{:else}
									<span
										class="shrink-0 rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300"
									>
										Runs dry at {diffResult.quests[diffResult.wallPointIndex].label ||
											diffResult.quests[diffResult.wallPointIndex].questName}
									</span>
								{/if}
							</summary>

							<div
								class="max-h-[32rem] overflow-y-auto rounded border border-gray-100 dark:border-gray-700"
							>
								<table class="w-full text-sm">
									<thead
										class="sticky top-0 bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400"
									>
										<tr>
											<th class="p-2">Done</th>
											<th class="p-2">#</th>
											<th class="p-2">Quest</th>
											<th class="p-2">Status</th>
											<th class="p-2">Shortfall</th>
										</tr>
									</thead>
									<tbody>
										{#each diffResult.quests as q, qi (q.questName + qi)}
											<tr
												class="border-t border-gray-100 dark:border-gray-700"
												class:bg-red-50={qi === diffResult.wallPointIndex}
												class:dark:bg-red-950={qi === diffResult.wallPointIndex}
												class:opacity-50={q.done}
											>
												<td class="p-2">
													<input
														type="checkbox"
														checked={q.done}
														onchange={() => toggleCompleted(diffResult.questlineName, q.questName)}
														class="cursor-pointer"
													/>
												</td>
												<td class="p-2 text-xs text-gray-400">{q.label || '—'}</td>
												<td class="p-2" class:line-through={q.done}>{q.questName}</td>
												<td class="p-2">
													{#if q.done}
														<span class="text-gray-400">done</span>
													{:else if q.ok}
														<span class="text-emerald-600">OK</span>
													{:else if qi === diffResult.wallPointIndex}
														<span class="font-semibold text-red-600">WALL POINT</span>
													{:else}
														<span class="text-amber-600">short</span>
													{/if}
												</td>
												<td class="p-2">
													{#if q.shortfalls.length > 0}
														<ul class="space-y-0.5 text-xs">
															{#each q.shortfalls as s (s.item)}
																<li>
																	<span class="font-medium text-gray-700 dark:text-gray-300"
																		>{s.item}</span
																	>: need
																	<span class="tabular-nums text-gray-500 dark:text-gray-400"
																		>{s.needed}</span
																	>, have
																	<span class="tabular-nums text-sky-600 dark:text-sky-400"
																		>{s.have}</span
																	>
																	(short
																	<span
																		class="tabular-nums font-semibold text-red-600 dark:text-red-400"
																		>{s.short}</span
																	>)
																</li>
															{/each}
														</ul>
													{/if}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</details>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<footer
		class="mt-12 border-t border-gray-200 pt-6 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400"
	>
		<p>Made by <strong>kodyy</strong> (in game).</p>
		<p class="mt-1">
			This is a <strong>fan project</strong> and will <em>never</em> be monetized. All credit for
			FarmRPG itself goes to its developers —
			<a
				href="https://farmrpg.com"
				target="_blank"
				rel="noopener noreferrer"
				class="text-emerald-600 hover:underline dark:text-emerald-400">farmrpg.com</a
			>.
		</p>
		<p class="mt-1">
			Built with <strong>AI assistance</strong> — the code and layout were AI-generated, but the
			quest math and data have been
			<span class="font-semibold text-emerald-600 dark:text-emerald-400"
				>thoroughly tested and validated by a human</span
			>, not just shipped as-is.
		</p>
		<p class="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
			<a href={resolve('/about')} class="text-emerald-600 hover:underline dark:text-emerald-400"
				>Why did I create this?</a
			>
			<span class="text-gray-300 dark:text-gray-600">&middot;</span>
			<a href={resolve('/credits')} class="text-emerald-600 hover:underline dark:text-emerald-400"
				>Credits</a
			>
			<span class="text-gray-300 dark:text-gray-600">&middot;</span>
			<a
				href={SOURCE_URL}
				target="_blank"
				rel="noopener noreferrer"
				class="text-emerald-600 hover:underline dark:text-emerald-400">Source code</a
			>
		</p>
		<p class="mt-2">&copy; {copyrightYears} kodyy</p>
	</footer>
</div>

{#if progressModalOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={(e) => e.target === e.currentTarget && (progressModalOpen = false)}
		role="presentation"
	>
		<div
			class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800 dark:text-gray-100"
		>
			<div class="mb-4 flex items-start justify-between">
				<h2 class="text-lg font-semibold">Progress backup</h2>
				<button
					onclick={() => (progressModalOpen = false)}
					class={buttonClass('icon')}
					aria-label="Close"
				>
					✕
				</button>
			</div>

			<p class="mb-4 text-sm text-gray-600 dark:text-gray-300">
				This backs up which quests you've marked done as a JSON file — not your inventory or
				questline queue. Export before clearing browser data, or import a file to restore progress
				on another device.
			</p>

			<div class="flex gap-2">
				<button
					onclick={handleExport}
					class="flex flex-1 items-center justify-center gap-1.5 {buttonClass('default')}"
				>
					<Save size={16} class="text-sky-600 dark:text-sky-400" />
					Export
				</button>
				<button
					onclick={handleImportClick}
					class="flex flex-1 items-center justify-center gap-1.5 {buttonClass('default')}"
				>
					<Upload size={16} class="text-sky-600 dark:text-sky-400" />
					Import
				</button>
			</div>
			{#if importMessage}
				<p class="mt-3 text-xs text-gray-500 dark:text-gray-400">{importMessage}</p>
			{/if}
		</div>
	</div>
{/if}

{#if importModalOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={(e) => e.target === e.currentTarget && (importModalOpen = false)}
		role="presentation"
	>
		<div
			class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800 dark:text-gray-100"
		>
			<div class="mb-4 flex items-start justify-between">
				<h2 class="text-lg font-semibold">Import data</h2>
				<button
					onclick={() => (importModalOpen = false)}
					class={buttonClass('icon')}
					aria-label="Close"
				>
					✕
				</button>
			</div>

			<div class="mb-4 flex gap-1.5 text-sm">
				<button
					onclick={() => switchImportTab('inventory')}
					class={buttonClass('pill', importTab === 'inventory')}
				>
					Inventory
				</button>
				<button
					onclick={() => switchImportTab('completed')}
					class={buttonClass('pill', importTab === 'completed')}
				>
					Completed quests
				</button>
			</div>

			{#if importTab === 'inventory'}
				<details
					bind:open={showScraperHelp}
					class="mb-3 rounded border border-gray-200 dark:border-gray-700"
				>
					<summary class="cursor-pointer p-2 text-sm font-medium"
						>How do I get my inventory?</summary
					>
					<div class="border-t border-gray-200 p-3 text-sm dark:border-gray-700">
						<ol class="list-decimal space-y-2 pl-5">
							<li>Open FarmRPG in your browser, log in, and go to your Inventory screen.</li>
							<li>Open your browser's developer console (F12, then the "Console" tab).</li>
							<li>
								Paste the script below and press Enter. It adds a
								<strong>"Copy Inventory to Clipboard"</strong> button to the page — click it.
							</li>
							<li>Come back here, paste the clipboard contents below, and click "Parse paste".</li>
						</ol>
						<div class="mt-3">
							<div class="mb-1 flex items-center justify-between">
								<span class="text-xs font-medium text-gray-500 dark:text-gray-400"
									>Console script</span
								>
								<button
									onclick={() => copyScript(INVENTORY_SCRAPER_SCRIPT)}
									class={buttonClass('link')}
								>
									{copyScriptMessage || 'Copy script'}
								</button>
							</div>
							<pre class="overflow-x-auto rounded bg-gray-900 p-3 text-xs text-gray-100"><code
									>{INVENTORY_SCRAPER_SCRIPT}</code
								></pre>
						</div>
						<p class="mt-3 text-xs text-gray-500 dark:text-gray-400">
							The 4th column is empty, or <code class="rounded bg-gray-100 px-1 dark:bg-gray-700"
								>MAX</code
							> when that row's quantity is shown in red in-game — meaning that item is sitting at its
							storage cap. If MAX rows don't all show the same quantity, that's real information: it means
							the cap is per-category, not global.
						</p>
					</div>
				</details>

				<div class="relative">
					<textarea
						bind:value={pasteText}
						rows="6"
						placeholder="Paste tab-separated dump here: Category&#9;Item Name&#9;Qty"
						class="w-full rounded border border-gray-300 p-2 pr-9 font-mono text-xs dark:border-gray-600 dark:bg-gray-800"
					></textarea>
					{#if pasteText}
						<button
							onclick={clearPasteText}
							aria-label="Clear pasted text"
							title="Clear pasted text"
							class="absolute top-2 right-3 {buttonClass('icon-danger')}"
						>
							✕
						</button>
					{/if}
				</div>
				<div class="mt-2 flex items-center gap-2">
					<button onclick={handleParsePaste} class={buttonClass('primary')}>Parse paste</button>
					{#if parseMessage}
						<span class="text-xs text-gray-500 dark:text-gray-400">{parseMessage}</span>
					{/if}
				</div>
			{:else}
				<details
					bind:open={showScraperHelp}
					class="mb-3 rounded border border-gray-200 dark:border-gray-700"
				>
					<summary class="cursor-pointer p-2 text-sm font-medium"
						>How do I get my completed quest list?</summary
					>
					<div class="border-t border-gray-200 p-3 text-sm dark:border-gray-700">
						<ol class="list-decimal space-y-2 pl-5">
							<li>Open your Completed Quest List on FarmRPG.</li>
							<li>
								Open the browser console (Ctrl+Shift+K on Firefox, Ctrl+Shift+J on most others).
							</li>
							<li>
								Paste the script below and press Enter. It adds a
								<strong>"Copy List to Clipboard"</strong> button to the page — click it.
							</li>
							<li>Come back here, paste the clipboard contents below, and click "Parse paste".</li>
						</ol>
						<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
							This only returns quest names, not which questline each one belongs to — matching
							quest names get marked done across every questline that has one. If the same quest
							name is reused in more than one chain, all of them get marked, since a bare name can't
							distinguish which chain it actually came from.
						</p>
						<div class="mt-3">
							<div class="mb-1 flex items-center justify-between">
								<span class="text-xs font-medium text-gray-500 dark:text-gray-400"
									>Console script</span
								>
								<button
									onclick={() => copyScript(COMPLETED_QUESTS_SCRAPER_SCRIPT)}
									class={buttonClass('link')}
								>
									{copyScriptMessage || 'Copy script'}
								</button>
							</div>
							<pre class="overflow-x-auto rounded bg-gray-900 p-3 text-xs text-gray-100"><code
									>{COMPLETED_QUESTS_SCRAPER_SCRIPT}</code
								></pre>
						</div>
					</div>
				</details>

				<div class="relative">
					<textarea
						bind:value={completedPasteText}
						rows="6"
						placeholder="Paste one quest name per line…"
						class="w-full rounded border border-gray-300 p-2 pr-9 font-mono text-xs dark:border-gray-600 dark:bg-gray-800"
					></textarea>
					{#if completedPasteText}
						<button
							onclick={clearCompletedPasteText}
							aria-label="Clear pasted text"
							title="Clear pasted text"
							class="absolute top-2 right-3 {buttonClass('icon-danger')}"
						>
							✕
						</button>
					{/if}
				</div>
				<div class="mt-2 flex items-center gap-2">
					<button onclick={handleParseCompleted} class={buttonClass('primary')}>Parse paste</button>
					{#if completedParseMessage}
						<span class="text-xs text-gray-500 dark:text-gray-400">{completedParseMessage}</span>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}
