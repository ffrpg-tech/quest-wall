const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Svelte action for modal dialogs: moves focus into the node on mount, keeps
 * Tab/Shift+Tab cycling within it, calls `onClose` on Escape, and restores
 * focus to whatever was focused before the modal opened when the node is
 * destroyed (i.e. when the modal closes).
 */
export function trapFocus(node: HTMLElement, onClose: () => void) {
	const previouslyFocused = document.activeElement as HTMLElement | null;

	function focusables(): HTMLElement[] {
		return Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
	}

	(focusables()[0] ?? node).focus();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			onClose();
			return;
		}

		if (e.key !== 'Tab') return;

		const items = focusables();
		if (items.length === 0) {
			e.preventDefault();
			return;
		}

		const first = items[0];
		const last = items[items.length - 1];

		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}

	node.addEventListener('keydown', handleKeydown);

	return {
		destroy() {
			node.removeEventListener('keydown', handleKeydown);
			previouslyFocused?.focus();
		}
	};
}
