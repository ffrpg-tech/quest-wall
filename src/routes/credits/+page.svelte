<script lang="ts">
	import { resolve } from '$app/paths';
	import { canonicalUrl, SITE_NAME } from '$lib/seo';

	const title = `Credits — ${SITE_NAME}`;
	const description =
		'Credits for the Farm RPG Quest Wall Calculator: the FarmRPG developers and Discord community, and the spreadsheet maintainers whose work made this tool possible.';
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonicalUrl('/credits')} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonicalUrl('/credits')} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6 p-6 dark:text-gray-100">
	<a href={resolve('/')} class="text-sm text-emerald-600 hover:underline dark:text-emerald-400"
		>&larr; Back to the calculator</a
	>

	<header>
		<h1 class="text-2xl font-bold">Credits</h1>
	</header>

	<section class="space-y-5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
		<div>
			<h2 class="font-semibold text-gray-900 dark:text-gray-100">FarmRPG and its community</h2>
			<p class="mt-1">
				All credit for the game itself goes to the <strong>FarmRPG developers</strong> —
				<a
					href="https://farmrpg.com"
					target="_blank"
					rel="noopener noreferrer"
					class="font-medium text-emerald-600 hover:underline dark:text-emerald-400">farmrpg.com</a
				>. This is an unofficial fan project and isn't affiliated with them.
			</p>
			<p class="mt-1">
				<strong>Special thanks</strong> to the folks on the FarmRPG Discord who shared quest data.
			</p>
			<p class="mt-1 text-xs text-gray-500 italic dark:text-gray-400">
				[Placeholder — specific names to be added here. If that's you, reach out on Discord so I can
				credit you properly.]
			</p>
		</div>

		<div>
			<h2 class="font-semibold text-gray-900 dark:text-gray-100">Sheet maintainers</h2>
			<p class="mt-1">
				This project wouldn't exist without the community members who <em
					>maintained the original Quest Wall spreadsheets</em
				>. Working through their filtering math and understanding how each questline's requirements
				were structured is what made it possible to centralize all of it into one calculator.
			</p>
			<p class="mt-1 text-xs text-gray-500 italic dark:text-gray-400">
				[Placeholder — specific names to be added here. If that's you, reach out on Discord so I can
				credit you properly.]
			</p>
		</div>

		<div>
			<h2 class="font-semibold text-gray-900 dark:text-gray-100">Staff approval</h2>
			<p class="mt-1">
				Thank you to the <strong>FarmRPG staff</strong> who reviewed and approved this site before it
				went live.
			</p>
		</div>

		<p class="pt-2 text-xs text-gray-500 dark:text-gray-400">
			Curious about the motivation behind this project? Read
			<a
				href={resolve('/about')}
				class="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
				>why I created this</a
			>.
		</p>
	</section>
</div>
