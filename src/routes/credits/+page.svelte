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
				FarmRPG and all related names, marks, and materials are trademarks of
				<strong>Magic and Wires, LLC</strong> —
				<a
					href="https://farmrpg.com"
					target="_blank"
					rel="noopener noreferrer"
					class="font-medium text-emerald-600 hover:underline dark:text-emerald-400">farmrpg.com</a
				>. This is an unofficial, non-commercial fan project and is not affiliated with,
				endorsed by, or sponsored by Magic and Wires, LLC.
			</p>
			<p class="mt-1">
				<strong>Special thanks</strong> to the folks on the FarmRPG Discord who helped make this possible,
				tested the calculator, and gave feedback:
			</p>
			<ol class="mt-1 list-decimal space-y-1 pl-5">
				<li><span class="font-medium text-emerald-600 dark:text-emerald-400">Erisere</span> — shared their stored quest data via CSV to initialize the data and helped test the calculator.</li>
				<li><span class="font-medium text-emerald-600 dark:text-emerald-400">Natsulus</span> — offered early insights on client-side inventory collection that helped shape the direction of the inventory parser.</li>
			</ol>
		</div>

		<div>
			<h2 class="font-semibold text-gray-900 dark:text-gray-100">Sheet creators & maintainers</h2>
			<p class="mt-1">
				This project wouldn't exist without the community members who <em
					>created and maintained existing Quest Wall spreadsheets</em
				>. Working through their filtering math and understanding how each questline's requirements
				were structured is what made it possible to centralize all of it into one calculator.
			</p>
			<p class="mt-1">
				<strong>Special thanks</strong> to the following sheets I've used to plan, design and build the calculator:
			</p>
			<ol class="mt-1 list-decimal space-y-1 pl-5">
				<li>
					<a
						href="https://docs.google.com/spreadsheets/d/1PzawdSXTFVhy6Ro6j-m3wTPSJG0m3-AP4K6heH5T8Gk"
						target="_blank"
						rel="noopener noreferrer"
						class="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
						>A Towering Investment Checklist & Strategy</a>
					by <span class="font-medium text-emerald-600 dark:text-emerald-400">Badymaru</span>
					— where I originated my idea.
				</li>
				<li>
					<a
						href="https://docs.google.com/spreadsheets/d/1RMPxMBkcK7rqapG7I8nPjF7Kop1i0oV26kV75QZ2VAw"
						target="_blank"
						rel="noopener noreferrer"
						class="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
						>Compare Completed Quests</a>
					by <span class="font-medium text-red-600 dark:text-red-400">Unknown</span>
					— whose approach to identifying completed quests informed the early direction of this project's data handling.
				</li>
			</ol>
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
				<strong>Note:</strong> If you know the sheet creator or maintainer or are the owner,
				please reach out to the feedback/bug report button in the calculator and I will include you here.
			</p>
		</div>

		<div>
			<h2 class="font-semibold text-gray-900 dark:text-gray-100">Staff approval</h2>
			<p class="mt-1">
				Thank you to FarmRPG Staff <strong class="font-medium text-emerald-600 dark:text-emerald-400">coderanger</strong>, who provided technical access and guidance this calculator's data pipeline is built on, and reviewed and approved the site before it went live.
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
