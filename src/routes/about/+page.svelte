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
			own: <strong>Quest Wall</strong> sheets, one questline at a time. However, it is mainly focused
			on main quests, and not the rest of the questlines. So the other quests are left without getting its own sheet.
		</p>
		<p>
			Additionally, because the sheets only cover one questline at a time, it is hard to see the bigger picture.
			While it is true that we must focus on one at a time, it is also true that we need to plan ahead. Say you
			have two sheets tackling different questlines — you end up syncing the same inventory into both by hand,
			and still have to manually check whether you have enough items to clear the next quest on either one.
		</p>
		<p>
			That's exactly what happened to me while working on my ATI quest, and I could tell it wouldn't stop being a problem once ATI was done.
			So I decided to build a tool that could plan out questlines and show where I — and anyone else — would wall.
			I wanted it to be usable by anyone too, so it's a web app, accessible from desktop or mobile.
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
