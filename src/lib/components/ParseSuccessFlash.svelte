<script lang="ts">
	import { fade } from 'svelte/transition';

	// Brief, non-interactive confirmation shown right after a successful
	// paste parse. Parsing itself is synchronous — there's no real loading
	// gap to show a spinner for — so this exists purely as positive visual
	// feedback that the action landed, mirroring LoadingOverlay's spinner ->
	// checkmark language without pretending there was something to wait on.
	let { message }: { message: string } = $props();
</script>

<div
	class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-black/50 backdrop-blur-sm"
	role="status"
	aria-live="polite"
	transition:fade={{ duration: 150 }}
>
	<div
		class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-2xl text-white"
	>
		✓
	</div>
	<p class="px-6 text-center text-sm text-white">{message}</p>
</div>
