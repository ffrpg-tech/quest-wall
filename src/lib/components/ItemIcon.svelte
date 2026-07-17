<script lang="ts">
	import { getItemImagePath } from '$lib/quest/storage/itemsStore.svelte';

	let { name, size = 16 }: { name: string; size?: number } = $props();

	const src = $derived(getItemImagePath(name));
</script>

{#if src}
	<img {src} alt="" width={size} height={size} class="inline-block shrink-0" loading="lazy" />
{/if}
