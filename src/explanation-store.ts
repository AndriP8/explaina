import type { CacheEntry, HistoryEntry } from "./types";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CACHE_KEY_PREFIX = "explaina_cache_";
const HISTORY_KEY = "explaina_history";
const MAX_HISTORY_ENTRIES = 50;

function hashKey(text: string, context: string): string {
	let hash = 0;
	const key = `${text}|${context}`;
	for (let i = 0; i < key.length; i++) {
		const char = key.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash |= 0;
	}
	return Math.abs(hash).toString(36);
}

function isCacheEntry(val: unknown): val is CacheEntry {
	return (
		typeof val === "object" &&
		val !== null &&
		"response" in val &&
		"timestamp" in val &&
		typeof (val as Record<string, unknown>).response === "string" &&
		typeof (val as Record<string, unknown>).timestamp === "number"
	);
}

export interface StorageAdapter {
	sessionGet: (keys: string[]) => Promise<Record<string, unknown>>;
	sessionSet: (items: Record<string, unknown>) => Promise<void>;
	sessionRemove: (keys: string | string[]) => Promise<void>;
	localGet: (keys: string[]) => Promise<Record<string, unknown>>;
	localSet: (items: Record<string, unknown>) => Promise<void>;
	localRemove: (keys: string | string[]) => Promise<void>;
}

const defaultChromeAdapter: StorageAdapter = {
	sessionGet: (keys) => chrome.storage.session.get(keys),
	sessionSet: (items) => chrome.storage.session.set(items),
	sessionRemove: (keys) => chrome.storage.session.remove(keys),
	localGet: (keys) => chrome.storage.local.get(keys),
	localSet: (items) => chrome.storage.local.set(items),
	localRemove: (keys) => chrome.storage.local.remove(keys),
};

export class ExplanationStore {
	constructor(private adapter: StorageAdapter = defaultChromeAdapter) {}

	async getCached(
		text: string,
		context: string,
	): Promise<{ response: string; category?: string } | null> {
		const key = CACHE_KEY_PREFIX + hashKey(text, context);
		const result = await this.adapter.sessionGet([key]);
		const val = result[key];

		if (isCacheEntry(val)) {
			if (Date.now() - val.timestamp > CACHE_TTL_MS) {
				await this.adapter.sessionRemove(key);
				return null;
			}
			return { response: val.response, category: val.category };
		}
		return null;
	}

	async setCached(
		text: string,
		context: string,
		response: string,
		category?: string,
	): Promise<void> {
		const key = CACHE_KEY_PREFIX + hashKey(text, context);
		await this.adapter.sessionSet({
			[key]: {
				response,
				category,
				timestamp: Date.now(),
			} satisfies CacheEntry,
		});
	}

	async getHistory(): Promise<HistoryEntry[]> {
		const result = await this.adapter.localGet([HISTORY_KEY]);
		const val = result[HISTORY_KEY];
		if (Array.isArray(val)) {
			return val.filter(
				(item): item is HistoryEntry =>
					typeof item === "object" &&
					item !== null &&
					typeof item.text === "string" &&
					typeof item.response === "string",
			);
		}
		return [];
	}

	async recordHistory(entry: HistoryEntry): Promise<void> {
		const history = await this.getHistory();
		history.unshift(entry);

		if (history.length > MAX_HISTORY_ENTRIES) {
			history.length = MAX_HISTORY_ENTRIES;
		}

		await this.adapter.localSet({ [HISTORY_KEY]: history });
	}

	async clearHistory(): Promise<void> {
		await this.adapter.localRemove(HISTORY_KEY);
	}

	/**
	 * Convenience method: Stores response into session cache AND records history entry together.
	 */
	async saveExplanation(params: {
		text: string;
		context: string;
		response: string;
		category?: string;
		pageUrl?: string;
	}): Promise<void> {
		const { text, context, response, category, pageUrl } = params;
		await Promise.all([
			this.setCached(text, context, response, category),
			this.recordHistory({
				text,
				context,
				response,
				category,
				timestamp: Date.now(),
				pageUrl,
			}),
		]);
	}
}

export const explanationStore = new ExplanationStore();
