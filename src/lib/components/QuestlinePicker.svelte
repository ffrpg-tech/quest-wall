<script lang="ts">
	import { Upload, GripVertical } from '@lucide/svelte';
	import { buttonClass } from '$lib/ui/buttonClass';
	import { matchesQuery } from '$lib/ui/matchesQuery';
	import type { Questline } from '$lib/quest/types';

	let {
		questlineOptions,
		questlineByName,
		completedCountByQuestline,
		selectedQuestlineNames = $bindable(),
		questlinesHydrated,
		questlinesError,
		onOpenImportCompleted
	}: {
		questlineOptions: Questline[];
		questlineByName: Map<string, Questline>;
		completedCountByQuestline: Map<string, number>;
		selectedQuestlineNames: string[];
		questlinesHydrated: boolean;
		questlinesError: boolean;
		onOpenImportCompleted: () => void;
	} = $props();

	let questlineQuery = $state('');
	type QuestlineStatusFilter = 'all' | 'not-started' | 'ongoing' | 'done';
	let questlineStatusFilter = $state<QuestlineStatusFilter>('all');

	function clearQuestlineSearch() {
		questlineQuery = '';
	}

	function questlineStatus(g: Questline, doneCount: number): 'not-started' | 'ongoing' | 'done' {
		if (doneCount === 0) return 'not-started';
		if (doneCount >= g.questCount) return 'done';
		return 'ongoing';
	}

	const filteredQuestlines = $derived(
		questlineOptions.filter((g) => {
			const matchesStatus =
				questlineStatusFilter === 'all' ||
				questlineStatus(g, completedCountByQuestline.get(g.name) ?? 0) === questlineStatusFilter;
			return matchesQuery(g.name, questlineQuery) && matchesStatus;
		})
	);

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
</script>

<div
	class="flex min-h-0 flex-col space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
>
	<div class="flex items-center justify-between">
		<h2 class="font-semibold">2. Questline</h2>
		<button
			onclick={onOpenImportCompleted}
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

	<div class="flex min-h-0 flex-1 flex-col gap-3">
		<div class="min-h-0 flex-1 overflow-y-auto rounded border border-gray-100 dark:border-gray-700">
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
							<span
								class="text-xs"
								class:text-red-600={doneCount === 0}
								class:dark:text-red-400={doneCount === 0}
								class:text-amber-600={doneCount > 0 && doneCount < g.questCount}
								class:dark:text-amber-400={doneCount > 0 && doneCount < g.questCount}
								class:text-emerald-600={doneCount >= g.questCount}
								class:dark:text-emerald-400={doneCount >= g.questCount}
								>{doneCount}/{g.questCount}</span
							>
						</button>
					</li>
				{:else}
					<li class="p-4 text-center text-xs text-gray-400">
						{questlinesError
							? 'Quest data failed to load — try refreshing.'
							: questlinesHydrated
								? 'No questlines match that search/filter.'
								: 'Loading questlines…'}
					</li>
				{/each}
			</ul>
		</div>

		{#if selectedQuestlines.length > 0}
			<div class="flex min-h-0 flex-1 flex-col space-y-2">
				<h3 class="text-xs font-medium text-gray-500 dark:text-gray-400">
					Queue ({selectedQuestlines.length}) — order matters, shared inventory
				</h3>
				<ul class="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
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
</div>
