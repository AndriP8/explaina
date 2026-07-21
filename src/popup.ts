import { explain } from "./explain";
import { ExplanationDocument } from "./explanation-document";
import { getHistory } from "./history";
import { SelectionChannel } from "./selection-channel";
import type { SelectionMessage } from "./types";

document.addEventListener("DOMContentLoaded", async () => {
	// Input and controls
	const input = document.querySelector<HTMLInputElement>("#input");
	const clearBtn = document.getElementById("clear-btn");

	// Buttons
	const explainButton =
		document.querySelector<HTMLButtonElement>("#explain-button");
	const explainText = document.getElementById("explain-text");
	const loadingSpinner = document.getElementById("loading-spinner");
	const copyBtn = document.getElementById("copy-btn");
	const refreshBtn = document.getElementById("refresh-btn");

	// Output sections
	const resultSection = document.getElementById("result-section");
	const emptyState = document.getElementById("empty-state");
	const output = document.getElementById("output");
	const resultTitle = document.getElementById("result-title");
	const resultCategory = document.getElementById("result-category");
	const cachedIndicator = document.getElementById("cached-indicator");
	const errorMessage = document.getElementById("error-message");
	const errorText = errorMessage?.querySelector("p") ?? null;

	// Sections
	const examplesSection = document.getElementById("examples-section");
	const examplesList = document.getElementById("examples-list");
	const relatedSection = document.getElementById("related-section");
	const relatedTags = document.getElementById("related-tags");

	// History references
	const historyBtn = document.getElementById("history-btn");
	const historySection = document.getElementById("history-section");
	const historyList = document.getElementById("history-list");
	const closeHistoryBtn = document.getElementById("close-history-btn");

	if (!input || !explainButton || !explainText || !loadingSpinner || !output) {
		return;
	}

	const inputEl = input;
	const explainButtonEl = explainButton;
	const explainTextEl = explainText;
	const loadingSpinnerEl = loadingSpinner;
	const outputEl = output;

	let activeAbortController: AbortController | null = null;
	window.addEventListener("unload", () => {
		if (activeAbortController) activeAbortController.abort();
	});

	// Try to get selection from content script via message passing
	let selectedText = "";
	let bodyContext = "";
	let pageUrl = "";
	let pageTitle = "";
	let currentResponse = "";
	let autoExplain = false;

	const activeSel = await SelectionChannel.getActiveSelection();
	selectedText = activeSel.selectedText;
	bodyContext = activeSel.context;
	pageUrl = activeSel.pageUrl;
	pageTitle = activeSel.pageTitle;
	autoExplain = activeSel.autoExplain;

	if (selectedText) {
		inputEl.value = selectedText;
		updateClearButton();

		if (autoExplain) {
			await chrome.storage.local.remove(["autoExplain"]);
			fetchExplanation(selectedText);
		}
	}

	// Listen for live selection updates from content script / background
	chrome.runtime.onMessage.addListener((message: SelectionMessage, _sender) => {
		if (message.type === "selection" && message.selectedText) {
			inputEl.value = message.selectedText;
			updateClearButton();
			if (message.context) bodyContext = message.context;
			if (message.pageUrl) pageUrl = message.pageUrl;
			if (message.pageTitle) pageTitle = message.pageTitle;
		}
	});

	// Update clear button visibility
	function updateClearButton() {
		if (clearBtn) {
			clearBtn.classList.toggle("hidden", !inputEl.value);
		}
	}

	// Clear button handler
	clearBtn?.addEventListener("click", () => {
		inputEl.value = "";
		inputEl.focus();
		updateClearButton();
	});

	// Input change handler
	inputEl.addEventListener("input", updateClearButton);

	// Copy button handler
	copyBtn?.addEventListener("click", async () => {
		if (currentResponse) {
			try {
				await navigator.clipboard.writeText(currentResponse);
				const originalTitle = copyBtn.title;
				copyBtn.title = "Copied!";
				setTimeout(() => {
					copyBtn.title = originalTitle;
				}, 1500);
			} catch (err) {
				console.error("Failed to copy:", err);
			}
		}
	});

	// Refresh button handler - re-fetch with cache bypass
	refreshBtn?.addEventListener("click", () => {
		const text = inputEl.value.trim();
		if (text) {
			fetchExplanation(text, true);
		}
	});

	// Main fetch function
	async function fetchExplanation(text: string, bypassCache = false) {
		if (!text) return;

		if (activeAbortController) {
			activeAbortController.abort();
		}
		activeAbortController = new AbortController();
		const currentController = activeAbortController;

		explainButtonEl.disabled = true;
		explainTextEl.classList.add("hidden");
		loadingSpinnerEl.classList.remove("hidden");
		errorMessage?.classList.add("hidden");
		cachedIndicator?.classList.add("hidden");

		// Reset state
		resultSection?.classList.add("hidden");
		emptyState?.classList.add("hidden");
		historySection?.classList.add("hidden");

		try {
			const { response, category, fromCache } = await explain({
				text,
				context: bodyContext,
				pageUrl,
				title: pageTitle,
				bypassCache,
				signal: currentController.signal,
			});
			if (activeAbortController === currentController) {
				displayResult(text, response, fromCache, category);
			}
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") return;
			if (activeAbortController !== currentController) return;

			const message =
				error instanceof Error
					? error.message
					: "An error occurred. Please try again.";

			if (errorText) errorText.textContent = message;
			errorMessage?.classList.remove("hidden");
		} finally {
			if (activeAbortController === currentController) {
				loadingSpinnerEl.classList.add("hidden");
				explainTextEl.classList.remove("hidden");
				explainButtonEl.disabled = false;
				activeAbortController = null;
			}
		}
	}

	// Display result in UI
	function displayResult(
		text: string,
		response: string,
		fromCache: boolean,
		category?: string,
	) {
		currentResponse = response;

		// Hide empty state and history panel, show result
		emptyState?.classList.add("hidden");
		historySection?.classList.add("hidden");
		resultSection?.classList.remove("hidden");

		// Set title
		if (resultTitle) resultTitle.textContent = text;

		// Set category
		if (resultCategory) {
			if (category) {
				resultCategory.textContent = category;
				resultCategory.classList.remove("hidden");
			} else {
				resultCategory.textContent = "";
				resultCategory.classList.add("hidden");
			}
		}

		const doc = ExplanationDocument.fromRaw(response);

		// Render markdown content
		outputEl.innerHTML = doc.html;

		// Show cached indicator
		if (fromCache && cachedIndicator) {
			cachedIndicator.classList.remove("hidden");
		}

		// Parse and display examples if present in response
		renderExamples(doc.examples);

		// Parse and display related terms if present
		renderRelated(doc.relatedTerms);
	}

	function renderExamples(examples: string[]) {
		if (examplesSection && examplesList) {
			if (examples.length > 0) {
				examplesSection.classList.remove("hidden");
				examplesList.innerHTML = examples
					.map((text) => {
						return `
              <div class="flex items-start gap-2 text-sm text-gray-400">
                <svg class="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
                <span>${text}</span>
              </div>
            `;
					})
					.join("");
			} else {
				examplesSection.classList.add("hidden");
			}
		}
	}

	function renderRelated(terms: string[]) {
		if (relatedSection && relatedTags) {
			if (terms.length > 0) {
				relatedSection.classList.remove("hidden");
				relatedTags.innerHTML = terms
					.map((cleanTerm) => {
						return `<button class="px-3 py-1.5 text-xs bg-[#1a1a1a] border border-gray-700 rounded-full text-gray-300 hover:border-[#06b6d4] hover:text-[#06b6d4] transition-colors related-tag">${cleanTerm}</button>`;
					})
					.join("");

				// Add click handlers to related tags
				relatedTags.querySelectorAll(".related-tag").forEach((tag) => {
					tag.addEventListener("click", () => {
						inputEl.value = tag.textContent || "";
						updateClearButton();
						fetchExplanation(inputEl.value);
					});
				});
			} else {
				relatedSection.classList.add("hidden");
			}
		}
	}

	// Explain button click handler
	explainButtonEl.addEventListener("click", () => {
		const text = inputEl.value.trim();
		fetchExplanation(text);
	});

	// Enter key handler for input
	inputEl.addEventListener("keydown", (e) => {
		if (e.key === "Enter") {
			const text = inputEl.value.trim();
			if (text) {
				fetchExplanation(text);
			}
		}
	});

	// Toggle History Panel
	historyBtn?.addEventListener("click", async () => {
		if (!historySection || !historyList) return;

		if (historySection.classList.contains("hidden")) {
			// Hide other views
			resultSection?.classList.add("hidden");
			emptyState?.classList.add("hidden");
			errorMessage?.classList.add("hidden");

			// Show history panel
			historySection.classList.remove("hidden");

			// Load and render history items
			const history = await getHistory();
			if (history.length === 0) {
				historyList.innerHTML = `<p class="text-sm text-gray-500 text-center py-8">No history yet.</p>`;
			} else {
				historyList.innerHTML = history
					.map((item, index) => {
						return `
							<div class="p-3 bg-[#1a1a1a] border border-gray-800 hover:border-gray-700 rounded-lg cursor-pointer history-item transition-all" data-index="${index}">
								<div class="flex items-center justify-between gap-2 mb-1">
									<span class="font-medium text-sm text-gray-200 truncate">${item.text}</span>
									<span class="text-[10px] text-gray-500 flex-shrink-0">${new Date(item.timestamp).toLocaleDateString()}</span>
								</div>
								<p class="text-xs text-gray-400 line-clamp-2">${item.response.replace(/<[^>]+>/g, "").slice(0, 100)}</p>
							</div>
						`;
					})
					.join("");

				// Add click handlers to history list items
				historyList.querySelectorAll(".history-item").forEach((itemEl) => {
					itemEl.addEventListener("click", () => {
						const index = Number(itemEl.getAttribute("data-index"));
						const item = history[index];
						if (item) {
							inputEl.value = item.text;
							updateClearButton();

							// Hide history panel, show results
							historySection.classList.add("hidden");
							displayResult(item.text, item.response, false, item.category);
						}
					});
				});
			}
		} else {
			historySection.classList.add("hidden");
			if (currentResponse) {
				resultSection?.classList.remove("hidden");
			} else {
				emptyState?.classList.remove("hidden");
			}
		}
	});

	closeHistoryBtn?.addEventListener("click", () => {
		if (historySection) {
			historySection.classList.add("hidden");
			if (currentResponse) {
				resultSection?.classList.remove("hidden");
			} else {
				emptyState?.classList.remove("hidden");
			}
		}
	});
});
