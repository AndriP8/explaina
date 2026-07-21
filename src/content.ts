import {
	closePopover,
	getOrCreateHost,
	getSelectionRect,
	hideIcon,
	isInsideHost,
	isPopoverOpen,
	openPopover,
	type PopoverController,
	showIcon,
} from "./content-ui";
import { explain } from "./explain";
import { SelectionChannel } from "./selection-channel";
import type { SelectionMessage, SelectionResponse } from "./types";

const ICON_DEBOUNCE_MS = 150;

let maxContextChars = 2000;

// Load initial setting
if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
	chrome.storage.sync.get(["maxContextChars"]).then((res) => {
		if (res.maxContextChars) {
			maxContextChars = Number(res.maxContextChars);
		}
	});

	// Keep it up to date when the user changes settings
	chrome.storage.onChanged.addListener((changes, area) => {
		if (area === "sync" && changes.maxContextChars) {
			maxContextChars = Number(changes.maxContextChars.newValue);
		}
	});
}

const host = getOrCreateHost();
let activePopover: PopoverController | null = null;
let iconTimer: ReturnType<typeof setTimeout> | null = null;

function getBlockContext(selectedText: string): string {
	return SelectionChannel.getBlockContext(selectedText, maxContextChars);
}

function updateIcon(): void {
	if (iconTimer) clearTimeout(iconTimer);

	iconTimer = setTimeout(() => {
		const selection = window.getSelection();
		const selectedText = selection?.toString().trim() ?? "";

		if (!selectedText) {
			hideIcon(host);
			return;
		}

		// Ignore selections inside the Explaina UI
		if (isInsideHost(selection?.anchorNode ?? null)) {
			hideIcon(host);
			return;
		}

		const rects = getSelectionRect();
		if (!rects) {
			hideIcon(host);
			return;
		}

		if (isPopoverOpen(host)) {
			hideIcon(host);
			return;
		}

		const context = getBlockContext(selectedText);
		SelectionChannel.broadcastSelection(selectedText, context);

		showIcon(host, rects.icon, () => {
			handleIconClick(rects.popover);
		});
	}, ICON_DEBOUNCE_MS);
}

async function handleIconClick(rect: DOMRect): Promise<void> {
	const selection = window.getSelection();
	const selectedText = selection?.toString().trim() ?? "";
	if (!selectedText) return;

	hideIcon(host);
	const context = getBlockContext(selectedText);
	const pageUrl = location.href;
	const pageTitle = document.title;

	activePopover = openPopover(host, selectedText, rect);
	activePopover.setLoading();
	const currentPopover = activePopover;

	try {
		const { response, fromCache } = await explain({
			text: selectedText,
			context,
			pageUrl,
			title: pageTitle,
		});
		if (activePopover === currentPopover) {
			currentPopover.setResult(response, fromCache);
		}
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			return;
		}
		if (activePopover === currentPopover) {
			currentPopover.setError(
				error instanceof Error ? error.message : "An error occurred.",
			);
		}
	}
}

// Listen for selection changes to show/hide the trigger icon
// mouseup is included for drag-and-release selections
document.addEventListener("selectionchange", updateIcon);
document.addEventListener("mouseup", updateIcon);

// Hide UI when clicking outside the Explaina layer
// Use mousedown and composedPath so clicks inside the shadow host are ignored
// even though the event is retargeted at the document level.
document.addEventListener("mousedown", (e) => {
	const path = e.composedPath();
	if (!path.includes(host)) {
		hideIcon(host);
		closePopover(host);
		activePopover = null;
	}
});

// Close UI on Escape
document.addEventListener("keydown", (e) => {
	if (e.key === "Escape") {
		hideIcon(host);
		closePopover(host);
		activePopover = null;
	}
});

chrome.runtime.onMessage.addListener(
	(message: SelectionMessage, _sender, sendResponse) => {
		if (message.type === "getLatestSelection") {
			const selection = window.getSelection();
			const selectedText = selection?.toString().trim() ?? "";
			if (!selectedText) {
				sendResponse({
					selectedText: "",
					context: "",
					pageUrl: "",
					pageTitle: "",
				} satisfies SelectionResponse);
				return;
			}
			const context = getBlockContext(selectedText);
			sendResponse({
				selectedText,
				context,
				pageUrl: location.href,
				pageTitle: document.title,
			} satisfies SelectionResponse);
		}
	},
);
