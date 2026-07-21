import { clearHistory, getHistory } from "./history";

const STORAGE_MAX_CONTEXT_KEY = "maxContextChars";

document.addEventListener("DOMContentLoaded", async () => {
	const maxContextInput =
		document.querySelector<HTMLInputElement>("#max-context");
	const maxContextValue = document.getElementById("max-context-value");
	const clearHistoryBtn = document.getElementById("clear-history");
	const historyStatus = document.getElementById("history-status");
	const saveStatus = document.getElementById("save-status");
	const openPopupBtn = document.getElementById("open-popup");

	if (!maxContextInput || !clearHistoryBtn) return;

	// Open popup action
	openPopupBtn?.addEventListener("click", () => {
		chrome.action.openPopup().catch((err) => {
			console.error("Failed to open popup:", err);
		});
	});

	// Load saved settings
	const { maxContextChars } = await chrome.storage.sync.get([
		STORAGE_MAX_CONTEXT_KEY,
	]);
	maxContextInput.value = String(maxContextChars || 2000);
	if (maxContextValue)
		maxContextValue.textContent = String(maxContextChars || 2000);

	// Max context slider
	maxContextInput.addEventListener("input", async () => {
		const val = maxContextInput.value;
		if (maxContextValue) maxContextValue.textContent = val;
		await chrome.storage.sync.set({ [STORAGE_MAX_CONTEXT_KEY]: Number(val) });
	});

	// Clear history
	clearHistoryBtn.addEventListener("click", async () => {
		const history = await getHistory();
		if (history.length === 0) {
			if (historyStatus)
				historyStatus.textContent = "History is already empty.";
			return;
		}
		await clearHistory();
		if (historyStatus)
			historyStatus.textContent = `Cleared ${history.length} entries.`;
		showSaved(saveStatus, "History cleared");
	});
});

function showSaved(el: HTMLElement | null, message = "Saved"): void {
	if (!el) return;
	el.textContent = message;
	el.classList.remove("hidden");
	setTimeout(() => el.classList.add("hidden"), 2000);
}
