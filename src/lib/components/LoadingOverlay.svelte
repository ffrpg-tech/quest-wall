<script lang="ts">
	import { fade } from 'svelte/transition';

	let { stages }: { stages: { label: string; done: boolean }[] } = $props();
</script>

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
		{#each stages as stage (stage.label)}
			<li class="flex items-center gap-2">
				{#if stage.done}
					<span class="text-emerald-400">✓</span>
				{:else}
					<span
						class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white"
					></span>
				{/if}
				<span class={stage.done ? 'text-white/70 line-through' : 'text-white'}>{stage.label}</span>
			</li>
		{/each}
	</ul>
</div>
