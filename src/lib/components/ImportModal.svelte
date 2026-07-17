<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { buttonClass } from '$lib/ui/buttonClass';
	import { FEEDBACK_FORM_URL } from '$lib/config';
	import ParseSuccessFlash from './ParseSuccessFlash.svelte';
	import { questKey, type InventoryEntry, type Questline } from '$lib/quest/types';
	import {
		parseInventoryPaste,
		InventoryParseError,
		toInventoryEntries,
		mergeInventory
	} from '$lib/quest/parsing/inventory';
	import { parseCompletedQuestNames, CompletedQuestParseError } from '$lib/quest/parsing/completed';
	import { parseBankPaste, BankParseError } from '$lib/quest/parsing/bank';
	import { saveInventoryBaseline } from '$lib/quest/storage/persistence';

	type ImportTab = 'inventory' | 'bank' | 'completed';

	let {
		open = $bindable(),
		tab = $bindable(),
		inventory = $bindable(),
		questlineOptions,
		completed,
		inventoryBaseline,
		staleKeys,
		onCompletedChanged
	}: {
		open: boolean;
		tab: ImportTab;
		inventory: InventoryEntry[];
		questlineOptions: Questline[];
		completed: SvelteSet<string>;
		inventoryBaseline: SvelteSet<string>;
		staleKeys: SvelteSet<string>;
		onCompletedChanged: () => void;
	} = $props();

	/** Unwraps a caught paste-parsing error into a user-facing message: the parser's own message if it's the expected error class, otherwise a generic fallback — the one rule shared by all three paste-parsing handlers below. */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function parseErrorMessage(err: unknown, ErrorClass: new (...args: any[]) => Error): string {
		return err instanceof ErrorClass ? err.message : 'Unexpected error parsing paste.';
	}

	let showScraperHelp = $state(false);

	// ---------- Post-parse success flash ----------
	// Shared across all three tabs: a brief confirmation overlay right after a
	// successful parse. Parsing is synchronous, so this isn't gating on real
	// async work — it's deliberate positive feedback that the paste landed,
	// which matters more now that parsing has more ways to throw (footer
	// count mismatches, etc.) than it used to.

	let successFlashMessage = $state<string | null>(null);
	let successFlashTimer: ReturnType<typeof setTimeout> | undefined;

	function flashSuccess(message: string) {
		successFlashMessage = message;
		clearTimeout(successFlashTimer);
		successFlashTimer = setTimeout(() => {
			successFlashMessage = null;
		}, 1200);
	}

	/**
	 * Fills a paste textarea directly from the clipboard, skipping the manual
	 * Ctrl+V step — parsing is still a separate, deliberate "Parse paste"
	 * click, so a stale/wrong clipboard doesn't get committed before the
	 * player has a chance to glance at what actually landed in the textarea.
	 * `navigator.clipboard.readText()` needs a secure context and a
	 * permission grant, and isn't guaranteed to work in every environment
	 * this app runs in (the Steam client's embedded webview in particular) —
	 * so this fails silently on denial/unsupported rather than surfacing an
	 * error, since manual paste into the same textarea always works as the
	 * fallback regardless of Clipboard API support.
	 */
	async function pasteFromClipboard(setText: (value: string) => void) {
		try {
			const text = await navigator.clipboard.readText();
			if (text) setText(text);
		} catch {
			// Denied, unsupported, or non-secure context — fall back to manual paste.
		}
	}

	// Collapses the how-to-help panel any time the active tab changes, whether
	// switched from inside this modal or set by a caller opening straight to a
	// given tab — a single reactive rule instead of a convention every call
	// site has to remember to apply.
	$effect(() => {
		void tab;
		showScraperHelp = false;
	});

	// ---------- Inventory tab ----------

	let pasteText = $state('');
	let parseMessage = $state('');

	function clearPasteText() {
		pasteText = '';
		parseMessage = '';
	}

	function handleParsePaste() {
		if (!pasteText.trim()) {
			parseMessage = 'Nothing to parse.';
			return;
		}

		let parsed;
		try {
			parsed = toInventoryEntries(parseInventoryPaste(pasteText));
		} catch (err) {
			parseMessage = parseErrorMessage(err, InventoryParseError);
			return;
		}

		// Paste overwrites matching item names in the current inventory.
		inventory = mergeInventory(inventory, parsed);
		parseMessage = `Parsed ${parsed.size} item${parsed.size === 1 ? '' : 's'}.`;
		flashSuccess(parseMessage);

		// This paste is a resync to ground truth: whatever's completed right
		// now is now reflected in the pasted numbers, so reset the baseline.
		inventoryBaseline.clear();
		for (const key of completed) inventoryBaseline.add(key);
		staleKeys.clear();
		saveInventoryBaseline(completed);
	}

	// ---------- Bank tab ----------

	let bankPasteText = $state('');
	let bankParseMessage = $state('');
	let includeBankBalance = $state(false);

	function clearBankPasteText() {
		bankPasteText = '';
		bankParseMessage = '';
	}

	function handleParseBankPaste() {
		if (!bankPasteText.trim()) {
			bankParseMessage = 'Nothing to parse.';
			return;
		}

		let parsed;
		try {
			parsed = parseBankPaste(bankPasteText);
		} catch (err) {
			bankParseMessage = parseErrorMessage(err, BankParseError);
			return;
		}

		const silver = parsed.walletSilver + (includeBankBalance ? parsed.bankSilver : 0);
		inventory = mergeInventory(
			inventory,
			new Map([['Silver', { item: 'Silver', qty: silver, maxed: false }]])
		);
		bankParseMessage = includeBankBalance
			? `Set Silver to ${silver.toLocaleString()} (wallet + bank).`
			: `Set Silver to ${silver.toLocaleString()} (wallet only).`;
		flashSuccess(bankParseMessage);
	}

	// ---------- Completed quests tab ----------

	/** Quest name -> every (questline, quest) pair with that exact name.
	 * The in-game "Completed Quest List" export only gives bare quest names,
	 * not which chain they belong to, so a name that happens to exist in more than
	 * one questline gets marked done everywhere it appears rather than left ambiguous. */
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
	// Quest names from the paste that didn't match anything in questlines.json —
	// surfaced as a copyable list so the player can report them via feedback
	// instead of the mismatch just silently vanishing into an unmatchedNames count.
	let unmatchedQuestNames = $state<string[]>([]);

	function clearCompletedPasteText() {
		completedPasteText = '';
		completedParseMessage = '';
		unmatchedQuestNames = [];
	}

	function handleParseCompleted() {
		if (!completedPasteText.trim()) {
			completedParseMessage = 'Nothing to parse.';
			unmatchedQuestNames = [];
			return;
		}

		let names: string[];
		try {
			names = parseCompletedQuestNames(completedPasteText);
		} catch (err) {
			completedParseMessage = parseErrorMessage(err, CompletedQuestParseError);
			unmatchedQuestNames = [];
			return;
		}

		let matchedNames = 0;
		const unmatched: string[] = [];
		for (const name of names) {
			const matches = questNameIndex.get(name);
			if (!matches) {
				unmatched.push(name);
				continue;
			}
			matchedNames++;
			for (const m of matches) {
				const key = questKey(m.questlineName, m.questName);
				completed.add(key);
				if (!inventoryBaseline.has(key)) staleKeys.add(key);
			}
		}
		onCompletedChanged();
		unmatchedQuestNames = [...new Set(unmatched)];
		completedParseMessage =
			unmatched.length > 0
				? `Marked ${matchedNames} quest name${matchedNames === 1 ? '' : 's'} done (${unmatched.length} name${unmatched.length === 1 ? '' : 's'} didn't match a known quest).`
				: `Marked ${matchedNames} quest${matchedNames === 1 ? '' : 's'} done.`;
		flashSuccess(completedParseMessage);
	}

	let copyUnmatchedMessage = $state('');

	async function copyUnmatchedQuestNames() {
		await navigator.clipboard.writeText(unmatchedQuestNames.join('\n'));
		copyUnmatchedMessage = 'Copied!';
		setTimeout(() => (copyUnmatchedMessage = ''), 2000);
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={(e) => e.target === e.currentTarget && (open = false)}
		role="presentation"
	>
		<div
			class="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800 dark:text-gray-100"
		>
			{#if successFlashMessage}
				<ParseSuccessFlash message={successFlashMessage} />
			{/if}

			<div class="mb-4 flex items-start justify-between">
				<h2 class="text-lg font-semibold">Import data</h2>
				<button onclick={() => (open = false)} class={buttonClass('icon')} aria-label="Close">
					✕
				</button>
			</div>

			<div class="mb-4 flex gap-1.5 text-sm">
				<button
					onclick={() => (tab = 'inventory')}
					class={buttonClass('pill', tab === 'inventory')}
				>
					Inventory
				</button>
				<button onclick={() => (tab = 'bank')} class={buttonClass('pill', tab === 'bank')}>
					Bank (Silver)
				</button>
				<button
					onclick={() => (tab = 'completed')}
					class={buttonClass('pill', tab === 'completed')}
				>
					Completed quests
				</button>
			</div>

			{#if tab === 'inventory'}
				<details
					bind:open={showScraperHelp}
					class="mb-3 rounded border border-gray-200 dark:border-gray-700"
				>
					<summary class="cursor-pointer p-2 text-sm font-medium"
						>How do I get my inventory?</summary
					>
					<div class="border-t border-gray-200 p-3 text-sm dark:border-gray-700">
						<ol class="list-decimal space-y-2 pl-5">
							<li>Open FarmRPG (browser, or the Steam client) and go to your Inventory screen.</li>
							<li>
								Select the whole page — <kbd class="rounded bg-gray-100 px-1 dark:bg-gray-700"
									>Ctrl+A</kbd
								>
								/
								<kbd class="rounded bg-gray-100 px-1 dark:bg-gray-700">Cmd+A</kbd> in a browser, or
								the Steam client's <strong>Edit &gt; Select All</strong> — then copy it (<kbd
									class="rounded bg-gray-100 px-1 dark:bg-gray-700">Ctrl+C</kbd
								>
								/
								<strong>Edit &gt; Copy</strong>).
							</li>
							<li>Come back here, paste the full copied text below, and click "Parse paste".</li>
						</ol>
						<p class="mt-3 text-xs text-gray-500 dark:text-gray-400">
							The parser looks for the inventory section within whatever you paste, so surrounding
							chat/menu text is fine. Items shown as <code
								class="rounded bg-gray-100 px-1 dark:bg-gray-700">MAX ON HAND</code
							>
							are flagged as maxed (<code class="rounded bg-gray-100 px-1 dark:bg-gray-700"
								>Mastered</code
							>/<code class="rounded bg-gray-100 px-1 dark:bg-gray-700">Grand Mastered</code> are a separate
							crafting indicator and don't affect this). Mobile app pastes aren't supported.
						</p>
					</div>
				</details>

				<div class="mb-1 flex justify-end">
					<button
						onclick={() => pasteFromClipboard((v) => (pasteText = v))}
						class={buttonClass('default')}
					>
						Paste from clipboard
					</button>
				</div>
				<div class="relative">
					<textarea
						bind:value={pasteText}
						rows="6"
						placeholder="Paste the full inventory page text here"
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
			{:else if tab === 'bank'}
				<details
					bind:open={showScraperHelp}
					class="mb-3 rounded border border-gray-200 dark:border-gray-700"
				>
					<summary class="cursor-pointer p-2 text-sm font-medium">How do I get my Silver?</summary>
					<div class="border-t border-gray-200 p-3 text-sm dark:border-gray-700">
						<ol class="list-decimal space-y-2 pl-5">
							<li>Open FarmRPG (browser, or the Steam client) and go to the Bank page.</li>
							<li>
								Select the whole page — <kbd class="rounded bg-gray-100 px-1 dark:bg-gray-700"
									>Ctrl+A</kbd
								>
								/
								<kbd class="rounded bg-gray-100 px-1 dark:bg-gray-700">Cmd+A</kbd> in a browser, or
								the Steam client's <strong>Edit &gt; Select All</strong> — then copy it (<kbd
									class="rounded bg-gray-100 px-1 dark:bg-gray-700">Ctrl+C</kbd
								>
								/
								<strong>Edit &gt; Copy</strong>).
							</li>
							<li>Come back here, paste the full copied text below, and click "Parse paste".</li>
						</ol>
						<p class="mt-3 text-xs text-gray-500 dark:text-gray-400">
							This reads the <strong>Bulk Options</strong> block. "Deposit All" is Silver sitting in your
							wallet (spendable right now) — that's what's used by default. "Withdraw All" is Silver already
							in the bank, not in your wallet yet; check the box below to add it in too if you'd withdraw
							it to cover a quest.
						</p>
					</div>
				</details>

				<label class="mb-2 flex items-center gap-2 text-sm">
					<input type="checkbox" bind:checked={includeBankBalance} />
					Also include bank balance (Withdraw All)
				</label>

				<div class="mb-1 flex justify-end">
					<button
						onclick={() => pasteFromClipboard((v) => (bankPasteText = v))}
						class={buttonClass('default')}
					>
						Paste from clipboard
					</button>
				</div>
				<div class="relative">
					<textarea
						bind:value={bankPasteText}
						rows="6"
						placeholder="Paste the full Bank page text here"
						class="w-full rounded border border-gray-300 p-2 pr-9 font-mono text-xs dark:border-gray-600 dark:bg-gray-800"
					></textarea>
					{#if bankPasteText}
						<button
							onclick={clearBankPasteText}
							aria-label="Clear pasted text"
							title="Clear pasted text"
							class="absolute top-2 right-3 {buttonClass('icon-danger')}"
						>
							✕
						</button>
					{/if}
				</div>
				<div class="mt-2 flex items-center gap-2">
					<button onclick={handleParseBankPaste} class={buttonClass('primary')}>Parse paste</button>
					{#if bankParseMessage}
						<span class="text-xs text-gray-500 dark:text-gray-400">{bankParseMessage}</span>
					{/if}
				</div>
			{:else if tab === 'completed'}
				<details
					bind:open={showScraperHelp}
					class="mb-3 rounded border border-gray-200 dark:border-gray-700"
				>
					<summary class="cursor-pointer p-2 text-sm font-medium"
						>How do I get my completed quest list?</summary
					>
					<div class="border-t border-gray-200 p-3 text-sm dark:border-gray-700">
						<ol class="list-decimal space-y-2 pl-5">
							<li>
								Open FarmRPG (browser, or the Steam client) and go to Help Needed &gt; Completed.
							</li>
							<li>
								Select the whole page — <kbd class="rounded bg-gray-100 px-1 dark:bg-gray-700"
									>Ctrl+A</kbd
								>
								/
								<kbd class="rounded bg-gray-100 px-1 dark:bg-gray-700">Cmd+A</kbd> in a browser, or
								the Steam client's <strong>Edit &gt; Select All</strong> — then copy it (<kbd
									class="rounded bg-gray-100 px-1 dark:bg-gray-700">Ctrl+C</kbd
								>
								/
								<strong>Edit &gt; Copy</strong>).
							</li>
							<li>Come back here, paste the full copied text below, and click "Parse paste".</li>
						</ol>
						<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
							The parser looks for the "Completed Requests" section within whatever you paste, so
							surrounding chat/menu/active-request text is fine. It only recovers quest names, not
							which questline each one belongs to — matching quest names get marked done across
							every questline that has one. If the same quest name is reused in more than one chain,
							all of them get marked, since a bare name can't distinguish which chain it actually
							came from. Mobile app pastes aren't supported.
						</p>
					</div>
				</details>

				<div class="mb-1 flex justify-end">
					<button
						onclick={() => pasteFromClipboard((v) => (completedPasteText = v))}
						class={buttonClass('default')}
					>
						Paste from clipboard
					</button>
				</div>
				<div class="relative">
					<textarea
						bind:value={completedPasteText}
						rows="6"
						placeholder="Paste the full Help Needed &gt; Completed page text here"
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
				{#if unmatchedQuestNames.length > 0}
					<div
						class="mt-3 rounded border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950"
					>
						<div class="mb-1 flex items-center justify-between">
							<span class="text-xs font-medium text-amber-800 dark:text-amber-300"
								>{unmatchedQuestNames.length} name{unmatchedQuestNames.length === 1 ? '' : 's'} didn't
								match a known quest</span
							>
							<button onclick={copyUnmatchedQuestNames} class={buttonClass('link')}>
								{copyUnmatchedMessage || 'Copy list'}
							</button>
						</div>
						<pre
							class="max-h-32 overflow-y-auto rounded bg-gray-900 p-2 text-xs text-gray-100"><code
								>{unmatchedQuestNames.join('\n')}</code
							></pre>
						<p class="mt-2 text-xs text-amber-800 dark:text-amber-300">
							These might be missing from the quest data. Copy the list above and paste it into the
							<a
								href={FEEDBACK_FORM_URL}
								target="_blank"
								rel="noopener noreferrer external"
								class="font-medium underline">feedback form</a
							> so they can get added.
						</p>
					</div>
				{/if}
			{/if}
		</div>
	</div>
{/if}
