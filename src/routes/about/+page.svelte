<script lang="ts">
	import { resolve } from '$app/paths';
	import { canonicalUrl, SITE_NAME } from '$lib/seo';

	const title = `Why I made this — ${SITE_NAME}`;
	const description =
		'Why the Farm RPG Quest Wall Calculator exists: the maintenance burden of shared spreadsheets, and the gap it fills for planning Quest Wall chains.';
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonicalUrl('/about')} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonicalUrl('/about')} />
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
		<h1 class="text-2xl font-bold">Why did I create this?</h1>
	</header>

	<section class="space-y-4 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
		<p>
			Farm RPG has no shortage of quest data — <a
				href="https://buddy.farm"
				target="_blank"
				rel="noopener noreferrer"
				class="font-medium text-emerald-600 hover:underline dark:text-emerald-400">buddy.farm</a
			>
			already covers every questline and item. What it doesn't have is a checklist. So people make their
			own: <strong>Quest Wall</strong> sheets, one questline at a time, by whoever cared enough to track
			it. That's why coverage is spotty — only the popular chains get one, and everything else you're
			figuring out by trial and error.
		</p>
		<p>
			The sheets that do exist just give you a
			<span class="font-semibold text-red-600 dark:text-red-400">static total</span>: "needs 1,200
			bacon." It doesn't tell you you've already spent 500 of it by quest 4, and nothing decrements
			as you play, so you end up <strong>recalculating by hand</strong> after every turn-in — and a flat
			total can't tell you where you'll wall anyway.
		</p>
		<p>
			Quest 8 might be the one that actually stops you — a total for the whole chain won't show
			that. You need to walk it <em>quest by quest</em>.
		</p>
		<p>
			This was how my experience went through when I was working on my ATI quest. Eventually, I figured this might be the same case later after ATI.
			That's when I planned on creating a tool that can help me and the community to plan out the questlines and see where we will wall. 
			I also wanted to make it easy for anyone to use, so I made it a web app that can be accessed from anywhere: from your desktop or mobile.
		</p>
		<p>
			The premise is: paste your inventory and your finished questlines, then pick your next questlines — it walks the chain and shows you exactly where you
			run dry. 
		</p>
		<p>It's a fan project, made for the community. See the
			<a
				href={resolve('/credits')}
				class="font-medium text-emerald-600 hover:underline dark:text-emerald-400">credits page</a
			> for who made that possible.
		</p>
		<p>This project is built with <strong>AI assistance</strong>. Testing and debugging were <span class="font-medium text-emerald-600 dark:text-emerald-400">validated by humans</span>.</p>
	</section>
</div>
