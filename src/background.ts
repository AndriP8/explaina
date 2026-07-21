import type { SelectionMessage } from "./types";

// Allow content scripts to access session storage (needed for explanation cache)
if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.session) {
	chrome.storage.session
		.setAccessLevel({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" })
		.catch((err) => {
			console.error("Failed to set session storage access level:", err);
		});
}

chrome.runtime.onInstalled.addListener(() => {
	chrome.contextMenus.create({
		id: "explaina",
		title: "Explain with AI",
		contexts: ["selection"],
	});
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
	if (info.menuItemId === "explaina") {
		// Keep storage write for reliability (content script may not be on the page)
		chrome.storage.local.set({
			selectedText: info.selectionText,
			pageUrl: info.pageUrl,
			pageTitle: tab?.title ?? "",
			autoExplain: true,
		});

		// Also notify any open popup via message, catching errors if popup is closed
		chrome.runtime
			.sendMessage({
				type: "selection",
				selectedText: info.selectionText,
				pageUrl: info.pageUrl,
				pageTitle: tab?.title ?? "",
			} satisfies SelectionMessage)
			.catch(() => {});
	}
});
