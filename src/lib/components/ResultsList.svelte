<script lang="ts">
	import { ChevronRight } from '@lucide/svelte';
	import type { QuestlineDiffResult } from '$lib/quest/calc/diff';
	import ItemIcon from './ItemIcon.svelte';

	let {
		diffResults,
		onToggleCompleted
	}: {
		diffResults: QuestlineDiffResult[];
		onToggleCompleted: (questlineName: string, questName: string) => void;
	} = $props();
</script>

{#if diffResults.length > 0}
	<section class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
		<h2 class="mb-2 font-semibold">Results</h2>
		<ul class="divide-y divide-gray-100 dark:divide-gray-700">
			{#each diffResults as diffResult, i (diffResult.questlineName)}
				<li data-testid="result-row">
					<details class="group">
						<summary class="flex cursor-pointer list-none items-center justify-between gap-2 py-2">
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
									Runs dry at {diffResult.quests[diffResult.wallPointIndex].questName}
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
													onchange={() => onToggleCompleted(diffResult.questlineName, q.questName)}
													class="cursor-pointer"
												/>
											</td>
											<td class="p-2 text-xs text-gray-400">{q.seq}</td>
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
																<span
																	class="inline-flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300"
																>
																	<ItemIcon name={s.item} />
																	{s.item}</span
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
																{#if s.capped}
																	<span
																		title="This requirement exceeds your known storage cap for this item — no amount of farming clears this until the cap is raised or spent down elsewhere."
																		class="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-950 dark:text-red-300"
																		>CAPPED</span
																	>
																{/if}
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
