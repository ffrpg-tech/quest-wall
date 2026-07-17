<script lang="ts">
	import { Sun, Moon, MessageSquarePlus, Upload, Save } from '@lucide/svelte';
	import { buttonClass } from '$lib/ui/buttonClass';
	import { FEEDBACK_FORM_URL } from '$lib/config';

	let {
		darkMode,
		onToggleDarkMode,
		onOpenImport,
		onOpenBackup
	}: {
		darkMode: boolean;
		onToggleDarkMode: () => void;
		onOpenImport: () => void;
		onOpenBackup: () => void;
	} = $props();
</script>

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
			rel="noopener noreferrer external"
			class="flex items-center gap-1.5 {buttonClass('default')}"
		>
			<MessageSquarePlus size={16} class="text-sky-600 dark:text-sky-400" />
			Feedback / report an issue
		</a>
		<button onclick={onOpenImport} class="flex items-center gap-1.5 {buttonClass('default')}">
			<Upload size={16} class="text-sky-600 dark:text-sky-400" />
			Import data
		</button>
		<button onclick={onOpenBackup} class="flex items-center gap-1.5 {buttonClass('default')}">
			<Save size={16} class="text-sky-600 dark:text-sky-400" />
			Progress backup
		</button>
		<button
			onclick={onToggleDarkMode}
			aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
			class={buttonClass('icon')}
		>
			{#if darkMode}
				<Sun size={16} class="text-amber-500" />
			{:else}
				<Moon size={16} class="text-indigo-500 dark:text-indigo-300" />
			{/if}
		</button>
	</div>
</header>
