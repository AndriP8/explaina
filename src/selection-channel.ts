import type { SelectionMessage, SelectionResponse } from "./types";

export class SelectionChannel {
	/**
	 * Extracts block-level DOM context around selected text.
	 */
	static getBlockContext(selectedText: string, maxContextChars = 2000): string {
		if (typeof window === "undefined") return "";
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return "";

		const range = selection.getRangeAt(0);
		if (!range) return "";

		const container = range.commonAncestorContainer;
		const parent = container.parentElement;
		let element: Element | null =
			container instanceof Element ? container : parent;
		if (!element) return "";

		const root = element.getRootNode();
		if (root instanceof ShadowRoot) {
			element = root.host;
		}

		const block =
			element.closest(
				"p, div, section, article, li, td, th, blockquote, pre, h1, h2, h3, h4, h5, h6",
			) ?? element;
		let context =
			(block instanceof HTMLElement
				? block.innerText
				: block.textContent
			)?.trim() ?? "";

		if (context.length > maxContextChars) {
			const selIndex = context.indexOf(selectedText);
			const half = Math.floor(maxContextChars / 2);
			const start = Math.max(0, selIndex - half);
			const end = Math.min(context.length, start + maxContextChars);
			context =
				(start > 0 ? "..." : "") +
				context.slice(start, end) +
				(end < context.length ? "..." : "");
		}

		return context;
	}

	/**
	 * Broadcasts current selection details to runtime listeners (silent fail if popup closed).
	 */
	static broadcastSelection(selectedText: string, context: string): void {
		if (typeof chrome === "undefined" || !chrome.runtime) return;

		chrome.runtime
			.sendMessage({
				type: "selection",
				selectedText,
				context,
				pageUrl: location.href,
				pageTitle: document.title,
			} satisfies SelectionMessage)
			.catch(() => {});
	}

	/**
	 * Requests selection from current active tab or falls back to extension storage.
	 */
	static async getActiveSelection(): Promise<{
		selectedText: string;
		context: string;
		pageUrl: string;
		pageTitle: string;
		autoExplain: boolean;
	}> {
		let selectedText = "";
		let context = "";
		let pageUrl = "";
		let pageTitle = "";
		let autoExplain = false;

		try {
			const [tab] = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});
			if (tab) {
				pageUrl = tab.url || "";
				pageTitle = tab.title || "";
			}
			if (tab?.id) {
				const response: SelectionResponse | undefined =
					await chrome.tabs.sendMessage(tab.id, {
						type: "getLatestSelection",
					} satisfies SelectionMessage);

				if (response?.selectedText) {
					selectedText = response.selectedText;
					context = response.context || "";
					pageUrl = response.pageUrl || pageUrl;
					pageTitle = response.pageTitle || pageTitle;
				}
			}
		} catch (err) {
			console.warn(
				"Content script communication failed, falling back to storage:",
				err,
			);
		}

		try {
			const stored = await chrome.storage.local.get([
				"selectedText",
				"context",
				"pageUrl",
				"pageTitle",
				"autoExplain",
			]);
			autoExplain = !!stored.autoExplain;
			if (!selectedText && stored.selectedText) {
				selectedText = stored.selectedText;
				context = stored.context || stored.pageUrl || "";
				pageUrl = stored.pageUrl || pageUrl;
				pageTitle = stored.pageTitle || pageTitle;
			}
		} catch (err) {
			console.error("Storage read failed:", err);
		}

		return {
			selectedText,
			context,
			pageUrl,
			pageTitle,
			autoExplain,
		};
	}
}
