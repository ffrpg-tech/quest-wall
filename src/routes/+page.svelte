<script lang="ts">
	import { onMount } from 'svelte';
	import { Sun, Moon } from '@lucide/svelte';
	import questlinesRaw from '$lib/data/questlines.json';
	import itemsRaw from '$lib/data/items.json';
	import { questKey, type InventoryEntry, type QuestlinesData } from '$lib/quest/types';
	import { parseInventoryDump, inventoryToMap, mergeInventory } from '$lib/quest/inventory';
	import { diffQuestline, type QuestlineDiffResult } from '$lib/quest/diff';
	import {
		loadCompleted,
		saveCompleted,
		exportProgress,
		importProgress,
		loadDarkMode,
		saveDarkMode
	} from '$lib/quest/persistence';

	const questlines = questlinesRaw as QuestlinesData;
	const itemNames = itemsRaw as string[];
	const itemNamesLower = new Set(itemNames.map((n) => n.toLowerCase()));

	const questlineOptions = Object.values(questlines)
		.slice()
		.sort((a, b) => a.name.localeCompare(b.name));

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

	// ---------- Inventory ----------

	let pasteText = $state('');
	let inventory = $state<InventoryEntry[]>([]);
	let newItemName = $state('');
	let newItemQty = $state<number | null>(null);
	let parseMessage = $state('');

	const inventoryMap = $derived(inventoryToMap(inventory));

	const newItemNameTrimmed = $derived(newItemName.trim());
	const newItemNameKnown = $derived(
		newItemNameTrimmed === '' || itemNamesLower.has(newItemNameTrimmed.toLowerCase())
	);

	function handleParsePaste() {
		if (!pasteText.trim()) {
			parseMessage = 'Nothing to parse.';
			return;
		}
		const parsed = parseInventoryDump(pasteText);
		if (parsed.size === 0) {
			parseMessage = "Couldn't find any \"Name<TAB>Qty\" rows in that paste — check the format.";
			return;
		}

		// Paste overwrites matching item names in the current inventory.
		inventory = mergeInventory(inventory, parsed);
		parseMessage = `Parsed ${parsed.size} item${parsed.size === 1 ? '' : 's'}.`;
	}

	function handleAddItem() {
		const name = newItemNameTrimmed;
		if (!name || !newItemNameKnown || newItemQty === null || !Number.isFinite(newItemQty)) return;
		// Preserve the existing MAX flag (if any) — manual edits only ever change the quantity.
		const existingMaxed = inventory.find((e) => e.item === name)?.maxed ?? false;
		inventory = mergeInventory(
			inventory,
			new Map([[name, { item: name, qty: newItemQty, maxed: existingMaxed }]])
		);
		newItemName = '';
		newItemQty = null;
	}

	function removeItem(name: string) {
		inventory = inventory.filter((e) => e.item !== name);
	}

	/** Clears only the paste textarea — leaves the already-parsed inventory table alone. */
	function clearPasteText() {
		pasteText = '';
		parseMessage = '';
	}

	/** Clears the parsed inventory table — leaves whatever's still in the paste textarea alone. */
	function clearInventoryTable() {
		inventory = [];
	}

	// ---------- Questline picker ----------

	let questlineQuery = $state('');
	let selectedQuestlineName = $state('');

	function clearQuestlineSelection() {
		questlineQuery = '';
		selectedQuestlineName = '';
	}

	const filteredQuestlines = $derived(
		questlineQuery.trim() === ''
			? questlineOptions
			: questlineOptions.filter((g) =>
					g.name.toLowerCase().includes(questlineQuery.trim().toLowerCase())
				)
	);

	const selectedQuestline = $derived(
		questlineOptions.find((g) => g.name === selectedQuestlineName) ?? null
	);

	function selectQuestline(name: string) {
		selectedQuestlineName = name;
		questlineQuery = name;
	}

	// ---------- Completion tracking (localStorage-backed) ----------

	let completed = $state<Set<string>>(new Set());
	let hydrated = $state(false);

	/** How many quests are marked done within each questline, keyed by questline name. Kept as its own state (updated incrementally by toggleCompleted) rather than a $derived recompute, since re-walking all ~2400 quests across every questline on every single checkbox click would be wasted work — only one questline's count actually changes per toggle. */
	let completedCountByQuestline = $state<Map<string, number>>(new Map());

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

	onMount(() => {
		completed = loadCompleted();
		completedCountByQuestline = computeCompletedCounts(completed);
		hydrated = true;
	});

	$effect(() => {
		if (hydrated) saveCompleted(completed);
	});

	function toggleCompleted(questlineName: string, questName: string) {
		const key = questKey(questlineName, questName);
		const next = new Set(completed);
		const adding = !next.has(key);
		if (adding) next.add(key);
		else next.delete(key);
		completed = next;

		const nextCounts = new Map(completedCountByQuestline);
		nextCounts.set(questlineName, (nextCounts.get(questlineName) ?? 0) + (adding ? 1 : -1));
		completedCountByQuestline = nextCounts;
	}

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
			confirm(`Replace your current progress (${completed.size} quests marked done) with the imported file (${imported.size} quests)?`)
		) {
			completed = imported;
			completedCountByQuestline = computeCompletedCounts(imported);
			importMessage = `Imported ${imported.size} completed quests.`;
		}
		(e.target as HTMLInputElement).value = '';
	}

	// ---------- Diff ----------

	const diffResult = $derived<QuestlineDiffResult | null>(
		selectedQuestline ? diffQuestline(selectedQuestline, inventoryMap, completed) : null
	);

	// ---------- Tutorial modal ----------

	let showTutorial = $state(false);
	let copyScriptMessage = $state('');

	async function copyScript() {
		await navigator.clipboard.writeText(INVENTORY_SCRAPER_SCRIPT);
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
</script>

<svelte:head>
	<title>Farm RPG Quest Wall Calculator</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-8 p-6 dark:text-gray-100">
	<header class="flex flex-wrap items-start justify-between gap-4">
		<div class="space-y-1">
			<h1 class="text-2xl font-bold">Farm RPG Quest Wall Calculator</h1>
			<p class="text-sm text-gray-500 dark:text-gray-400">
				Paste your inventory, pick a questline, and see exactly which quest you'll run dry on.
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<button onclick={handleExport} class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600"
				>Export progress</button
			>
			<button onclick={handleImportClick} class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600"
				>Import progress</button
			>
			<button
				onclick={() => (darkMode = !darkMode)}
				aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
				class="rounded border border-gray-300 p-1.5 dark:border-gray-600"
			>
				{#if darkMode}
					<Sun size={16} />
				{:else}
					<Moon size={16} />
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

	{#if importMessage}
		<p class="text-xs text-gray-500 dark:text-gray-400">{importMessage}</p>
	{/if}

	<section class="grid gap-6 md:grid-cols-2">
		<!-- Inventory input -->
		<div class="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
			<div class="flex items-center justify-between">
				<h2 class="font-semibold">1. Inventory</h2>
				<button
					onclick={() => (showTutorial = true)}
					class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600"
					>How do I get my inventory?</button
				>
			</div>

			<div class="relative">
				<textarea
					bind:value={pasteText}
					rows="6"
					placeholder="Paste tab-separated dump here: Category&#9;Item Name&#9;Qty"
					class="w-full rounded border border-gray-300 p-2 pr-8 font-mono text-xs dark:border-gray-600 dark:bg-gray-800"
				></textarea>
				{#if pasteText}
					<button
						onclick={clearPasteText}
						aria-label="Clear pasted text"
						title="Clear pasted text"
						class="absolute top-2 right-2 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
					>
						✕
					</button>
				{/if}
			</div>
			<div class="flex items-center gap-2">
				<button
					onclick={handleParsePaste}
					class="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
				>
					Parse paste
				</button>
				{#if parseMessage}
					<span class="text-xs text-gray-500 dark:text-gray-400">{parseMessage}</span>
				{/if}
			</div>

			<div class="border-t border-gray-100 pt-3 dark:border-gray-700">
				<div class="flex items-end gap-2">
					<div class="flex-1">
						<label for="new-item-name" class="block text-xs text-gray-500 dark:text-gray-400"
							>Item name</label
						>
						<input
							id="new-item-name"
							list="item-name-options"
							bind:value={newItemName}
							class="w-full rounded border p-1.5 text-sm dark:bg-gray-800"
							class:border-gray-300={newItemNameKnown}
							class:dark:border-gray-600={newItemNameKnown}
							class:border-red-400={!newItemNameKnown}
							onkeydown={(e) => e.key === 'Enter' && handleAddItem()}
						/>
					</div>
					<div class="w-24">
						<label for="new-item-qty" class="block text-xs text-gray-500 dark:text-gray-400"
							>Qty</label
						>
						<input
							id="new-item-qty"
							type="number"
							bind:value={newItemQty}
							class="w-full rounded border border-gray-300 p-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
							onkeydown={(e) => e.key === 'Enter' && handleAddItem()}
						/>
					</div>
					<button
						onclick={handleAddItem}
						disabled={!newItemNameKnown}
						class="rounded bg-gray-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-700 dark:hover:bg-gray-600"
					>
						Add / update
					</button>
				</div>
				<datalist id="item-name-options">
					{#each itemNames as name (name)}
						<option value={name}></option>
					{/each}
				</datalist>
				{#if !newItemNameKnown}
					<p class="mt-1 text-xs text-red-500">
						Unknown item — doesn't match any quest requirement/reward name. Check spelling.
					</p>
				{/if}
			</div>

			<div class="flex items-center justify-between">
				<h3 class="text-xs font-medium text-gray-500 dark:text-gray-400">
					Current inventory ({inventory.length})
				</h3>
				{#if inventory.length > 0}
					<button onclick={clearInventoryTable} class="text-xs text-red-500 hover:underline">
						Clear inventory
					</button>
				{/if}
			</div>
			<div class="max-h-80 overflow-y-auto rounded border border-gray-100 dark:border-gray-700">
				<table class="w-full text-sm">
					<thead
						class="sticky top-0 bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400"
					>
						<tr>
							<th class="p-2">Item</th>
							<th class="p-2">Qty</th>
							<th class="p-2"></th>
						</tr>
					</thead>
					<tbody>
						{#each inventory as entry (entry.item)}
							<tr class="border-t border-gray-100 dark:border-gray-700">
								<td class="p-2">{entry.item}{entry.maxed ? ' (MAX)' : ''}</td>
								<td class="p-2 tabular-nums">{entry.qty}</td>
								<td class="p-2 text-right">
									<button
										onclick={() => removeItem(entry.item)}
										class="text-xs text-red-500 hover:underline">remove</button
									>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="3" class="p-4 text-center text-xs text-gray-400"
									>No items yet — paste a dump or add one manually.</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Questline picker -->
		<div class="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
			<h2 class="font-semibold">2. Questline</h2>
			<div class="relative">
				<input
					bind:value={questlineQuery}
					placeholder="Search questline name…"
					class="w-full rounded border border-gray-300 p-2 pr-8 text-sm dark:border-gray-600 dark:bg-gray-800"
				/>
				{#if questlineQuery}
					<button
						onclick={clearQuestlineSelection}
						aria-label="Clear questline search"
						title="Clear questline search"
						class="absolute top-1/2 right-2 -translate-y-1/2 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
					>
						✕
					</button>
				{/if}
			</div>

			<div class="max-h-80 overflow-y-auto rounded border border-gray-100 dark:border-gray-700">
				<ul>
					{#each filteredQuestlines as g (g.name)}
						{@const doneCount = completedCountByQuestline.get(g.name) ?? 0}
						<li>
							<button
								onclick={() => selectQuestline(g.name)}
								class="flex w-full items-center justify-between border-t border-gray-100 p-2 text-left text-sm first:border-t-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
								class:bg-emerald-50={g.name === selectedQuestlineName}
								class:dark:bg-emerald-900={g.name === selectedQuestlineName}
							>
								<span>{g.name}</span>
								<span class="text-xs text-gray-400"
									>{doneCount > 0 ? `${doneCount}/${g.questCount}` : g.questCount}</span
								>
							</button>
						</li>
					{:else}
						<li class="p-4 text-center text-xs text-gray-400">No questlines match that search.</li>
					{/each}
				</ul>
			</div>

			{#if selectedQuestline}
				<p class="text-xs text-gray-500 dark:text-gray-400">
					{completedCountByQuestline.get(selectedQuestline.name) ?? 0} of {selectedQuestline.questCount}
					quest{selectedQuestline.questCount === 1 ? '' : 's'} done in this chain.
				</p>
			{/if}
		</div>
	</section>

	{#if diffResult}
		<section class="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
			<h2 class="font-semibold">Results — {diffResult.questlineName}</h2>

			{#if diffResult.wallPointIndex === null}
				<p class="rounded bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
					You have enough on hand to clear the rest of the chain with current inventory.
				</p>
			{:else}
				<p class="rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
					You'll run dry at quest <strong
						>{diffResult.quests[diffResult.wallPointIndex].label ||
							diffResult.quests[diffResult.wallPointIndex].questName}</strong
					> — "{diffResult.quests[diffResult.wallPointIndex].questName}".
				</p>
			{/if}

			{#if diffResult.totalShortfalls.length > 0}
				<div>
					<h3 class="mb-1 text-sm font-medium">Total shortfall across the remaining chain</h3>
					<ul class="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
						{#each diffResult.totalShortfalls as s (s.item)}
							<li class="flex justify-between border-b border-gray-100 py-0.5 dark:border-gray-700">
								<span>{s.item}</span>
								<span class="tabular-nums text-red-600 dark:text-red-400">−{s.short}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<div class="max-h-[32rem] overflow-y-auto rounded border border-gray-100 dark:border-gray-700">
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
						{#each diffResult.quests as q, i (q.questName + i)}
							<tr
								class="border-t border-gray-100 dark:border-gray-700"
								class:bg-red-50={i === diffResult.wallPointIndex}
								class:dark:bg-red-950={i === diffResult.wallPointIndex}
								class:opacity-50={q.done}
							>
								<td class="p-2">
									<input
										type="checkbox"
										checked={q.done}
										onchange={() => toggleCompleted(diffResult.questlineName, q.questName)}
									/>
								</td>
								<td class="p-2 text-xs text-gray-400">{q.label || '—'}</td>
								<td class="p-2" class:line-through={q.done}>{q.questName}</td>
								<td class="p-2">
									{#if q.done}
										<span class="text-gray-400">done</span>
									{:else if q.ok}
										<span class="text-emerald-600">OK</span>
									{:else if i === diffResult.wallPointIndex}
										<span class="font-semibold text-red-600">WALL POINT</span>
									{:else}
										<span class="text-amber-600">short</span>
									{/if}
								</td>
								<td class="p-2">
									{#if q.shortfalls.length > 0}
										<ul class="space-y-0.5 text-xs">
											{#each q.shortfalls as s (s.item)}
												<li>{s.item}: need {s.needed}, have {s.have} (short {s.short})</li>
											{/each}
										</ul>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}

	<footer
		class="mt-12 border-t border-gray-200 pt-6 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400"
	>
		<p>Made by <strong>kodyy</strong> (in game).</p>
		<p class="mt-1">
			This is a fan project and will never be monetized. All credit for FarmRPG itself goes to its
			developers — <a
				href="https://farmrpg.com"
				target="_blank"
				rel="noopener noreferrer"
				class="text-emerald-600 hover:underline dark:text-emerald-400">farmrpg.com</a
			>.
		</p>
	</footer>
</div>

{#if showTutorial}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={(e) => e.target === e.currentTarget && (showTutorial = false)}
		role="presentation"
	>
		<div
			class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800 dark:text-gray-100"
		>
			<div class="mb-4 flex items-start justify-between">
				<h2 class="text-lg font-semibold">Getting your inventory dump</h2>
				<button
					onclick={() => (showTutorial = false)}
					class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
					aria-label="Close">✕</button
				>
			</div>

			<ol class="list-decimal space-y-3 pl-5 text-sm">
				<li>Open FarmRPG in your browser, log in, and go to your Inventory screen.</li>
				<li>Open your browser's developer console (F12, then the "Console" tab).</li>
				<li>
					Paste the script below and press Enter. It adds a <strong>"Copy Inventory to Clipboard"</strong
					> button to the page — click it.
				</li>
				<li>
					Come back to this page, paste the clipboard contents into the "Inventory" box, and click
					"Parse paste".
				</li>
			</ol>

			<div class="mt-4">
				<div class="mb-1 flex items-center justify-between">
					<span class="text-xs font-medium text-gray-500 dark:text-gray-400">Console script</span>
					<button
						onclick={copyScript}
						class="text-xs text-emerald-600 hover:underline dark:text-emerald-400"
					>
						{copyScriptMessage || 'Copy script'}
					</button>
				</div>
				<pre class="overflow-x-auto rounded bg-gray-900 p-3 text-xs text-gray-100"><code
						>{INVENTORY_SCRAPER_SCRIPT}</code
					></pre>
			</div>

			<p class="mt-4 text-xs text-gray-500 dark:text-gray-400">
				The 4th column is empty, or <code class="rounded bg-gray-100 px-1 dark:bg-gray-700">MAX</code
				> when that row's quantity is shown in red in-game — meaning that item is sitting at its storage
				cap. If MAX rows don't all show the same quantity, that's real information: it means the cap is
				per-category, not global.
			</p>
		</div>
	</div>
{/if}
