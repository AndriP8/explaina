import { explanationStore } from "./explanation-store";
import type { HistoryEntry } from "./types";

export async function getHistory(): Promise<HistoryEntry[]> {
	return explanationStore.getHistory();
}

export async function addToHistory(entry: HistoryEntry): Promise<void> {
	return explanationStore.recordHistory(entry);
}

export async function clearHistory(): Promise<void> {
	return explanationStore.clearHistory();
}
