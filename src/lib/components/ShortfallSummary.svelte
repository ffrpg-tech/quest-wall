<script lang="ts">
	import { ChevronRight, Search } from '@lucide/svelte';
	import { matchesQuery } from '$lib/ui/matchesQuery';
	import type { QuestlineDiffResult, QueueItemShortfall } from '$lib/quest/calc/diff';
	import ItemIcon from './ItemIcon.svelte';

	let {
		diffResults,
		shortfallSummary
	}: {
		diffResults: QuestlineDiffResult[];
		shortfallSummary: QueueItemShortfall[];
	} = $props();

	let shortfallSearch = $state('');

	const filteredShortfallSummary = $derived(
		shortfallSummary.filter((s) => matchesQuery(s.item, shortfallSearch))
	);
</script>

{#if shortfallSummary.length > 0}
	<section class="rounded-lg border border-gray-200 dark:border-gray-700">
		<details class="group">
			<summary
				class="flex cursor-pointer list-none items-center gap-1 p-4 font-semibold text-gray-900 dark:text-gray-100"
			>
				<ChevronRight size={16} class="shrink-0 transition-transform group-open:rotate-90" />
				{#if diffResults.length > 1}
					Shortfall summary — combined across {diffResults.length} questlines
				{:else}
					Shortfall summary — {diffResults[0].questlineName}
				{/if}
			</summary>
			<div class="space-y-2 border-t border-gray-200 p-4 dark:border-gray-700">
				{#if diffResults.length > 1}
					<p class="text-xs text-gray-500 dark:text-gray-400">
						Since queued questlines share one inventory, an item's total below can come from more
						than one questline.
					</p>
				{/if}
				<div class="relative">
					<Search
						size={14}
						class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
					/>
					<input
						type="text"
						bind:value={shortfallSearch}
						placeholder="Search items…"
						class="w-full rounded border border-gray-300 bg-white py-1.5 pl-8 pr-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
					/>
				</div>
				{#if filteredShortfallSummary.length === 0}
					<p class="text-sm text-gray-500 dark:text-gray-400">
						No items match "{shortfallSearch}".
					</p>
				{:else}
					<ul class="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
						{#each filteredShortfallSummary as s (s.item)}
							<li class="border-b border-gray-100 py-1 dark:border-gray-700">
								<div class="flex items-center gap-1.5 font-medium text-gray-900 dark:text-gray-100">
									<ItemIcon name={s.item} />
									{s.item}
									{#if s.capped}
										<span
											title="A single requirement for this item exceeds your known storage cap — no amount of farming clears this until the cap is raised or spent down elsewhere."
											class="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-950 dark:text-red-300"
											>CAPPED</span
										>
									{/if}
								</div>
								<div
									class="mt-1 flex justify-between border-l border-gray-200 pl-2 text-xs font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
								>
									<span>Total</span>
									<span class="tabular-nums text-red-600 dark:text-red-400">−{s.short}</span>
								</div>
								<ul
									class="mt-1 space-y-1 border-l border-gray-200 pl-2 text-xs dark:border-gray-700"
								>
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
														<span>{bq.questName}</span>
														<span class="tabular-nums">−{bq.short}</span>
													</li>
												{/each}
											</ul>
										</li>
									{/each}
								</ul>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</details>
	</section>
{/if}
