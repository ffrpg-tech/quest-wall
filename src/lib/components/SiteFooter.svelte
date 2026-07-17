<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { SOURCE_URL } from '$lib/config';
	import { getQuestlinesState } from '$lib/quest/storage/questlinesStore.svelte';
	import { loadLastSeenChangelogVersion } from '$lib/quest/storage/persistence';
	import { parseChangelog, latestVersion } from '$lib/changelog';
	import changelogRaw from '../../../CHANGELOG.md?raw';

	const LAUNCH_YEAR = 2026;
	const currentYear = new Date().getFullYear();
	const copyrightYears =
		currentYear > LAUNCH_YEAR ? `${LAUNCH_YEAR}-${currentYear}` : `${LAUNCH_YEAR}`;

	const questlinesState = getQuestlinesState();
	const dataLastUpdated = $derived(questlinesState.dataLastUpdated);
	const dataLastUpdatedLabel = $derived(
		dataLastUpdated
			? new Date(dataLastUpdated).toLocaleDateString(undefined, {
					year: 'numeric',
					month: 'short',
					day: 'numeric'
				})
			: null
	);

	const latestChangelogVersion = latestVersion(parseChangelog(changelogRaw));
	let hasUnseenChangelog = $state(false);

	onMount(() => {
		hasUnseenChangelog =
			latestChangelogVersion !== null && loadLastSeenChangelogVersion() !== latestChangelogVersion;
	});
</script>

<footer
	class="mt-12 border-t border-gray-200 pt-6 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400"
>
	<p class="mt-1">
		This is a <strong>fan project</strong> and will <em class="text-red-600 dark:text-red-400">never</em> be monetized.
	</p>
	<p class="mt-1">
		FarmRPG and all related names, marks, and materials are trademarks of
		<strong>Magic and Wires, LLC</strong> —
		<a
			href="https://farmrpg.com"
			target="_blank"
			rel="noopener noreferrer"
			class="text-emerald-600 hover:underline dark:text-emerald-400">farmrpg.com</a
		>. 
	</p>
	<p class="mt-1">
		This is an <em class="text-red-600 dark:text-red-400">unofficial</em> fan project and is not affiliated with, endorsed by, or
		sponsored by Magic and Wires, LLC.
	</p>
	<p class="mt-1">
		This project is built with <strong>AI assistance</strong> — but
		<span class="font-semibold text-emerald-600 dark:text-emerald-400"
			>thoroughly tested and validated by humans</span
		>.
	</p>
	<p class="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
		<a href={resolve('/about')} class="text-emerald-600 hover:underline dark:text-emerald-400"
			>Why did I create this?</a
		>
		<span class="text-gray-300 dark:text-gray-600">&middot;</span>
		<a href={resolve('/credits')} class="text-emerald-600 hover:underline dark:text-emerald-400"
			>Credits</a
		>
		{#if dataLastUpdatedLabel}
			<span class="text-gray-300 dark:text-gray-600">&middot;</span>
			<span class="text-gray-500 dark:text-gray-400">Quest data updated {dataLastUpdatedLabel}</span
			>
		{/if}
		<span class="text-gray-300 dark:text-gray-600">&middot;</span>
		<a
			href={resolve('/changelog')}
			class="inline-flex items-center gap-1 text-emerald-600 hover:underline dark:text-emerald-400"
		>
			Changelog
			{#if hasUnseenChangelog}
				<span
					class="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
					aria-label="New changelog entry"
				></span>
			{/if}
		</a>
		<span class="text-gray-300 dark:text-gray-600">&middot;</span>
		<a
			href={SOURCE_URL}
			target="_blank"
			rel="noopener noreferrer external"
			class="text-emerald-600 hover:underline dark:text-emerald-400">Source code</a
		>
	</p>
	<p class="mt-2">
		&copy; {copyrightYears} <span class="text-gray-300 dark:text-gray-600">&middot;</span>
		Created by kodyy (in-game name in FarmRPG)
	</p>
</footer>
