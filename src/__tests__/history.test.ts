import { beforeEach, describe, expect, it } from "vitest";

const localStore: Record<string, unknown> = {};

Reflect.set(globalThis, "chrome", {
	storage: {
		local: {
			get: async (keys: string[]) => {
				const result: Record<string, unknown> = {};
				for (const key of keys) {
					if (key in localStore) result[key] = localStore[key];
				}
				return result;
			},
			set: async (items: Record<string, unknown>) => {
				Object.assign(localStore, items);
			},
			remove: async (keys: string | string[]) => {
				const keyList = Array.isArray(keys) ? keys : [keys];
				for (const key of keyList) {
					delete localStore[key];
				}
			},
		},
	},
});

import { addToHistory, clearHistory, getHistory } from "../history";
import type { HistoryEntry } from "../types";

describe("history", () => {
	beforeEach(() => {
		for (const key of Object.keys(localStore)) {
			delete localStore[key];
		}
	});

	it("returns an empty array when no history exists", async () => {
		const history = await getHistory();
		expect(history).toEqual([]);
	});

	it("adds entries to history and retrieves them in reverse chronological order", async () => {
		const entry1: HistoryEntry = {
			text: "first",
			context: "ctx1",
			response: "resp1",
			timestamp: 1000,
		};
		const entry2: HistoryEntry = {
			text: "second",
			context: "ctx2",
			response: "resp2",
			timestamp: 2000,
		};

		await addToHistory(entry1);
		await addToHistory(entry2);

		const history = await getHistory();
		expect(history).toHaveLength(2);
		expect(history[0]).toEqual(entry2); // unshift keeps latest first
		expect(history[1]).toEqual(entry1);
	});

	it("limits history to 50 entries (LRU eviction)", async () => {
		for (let i = 1; i <= 60; i++) {
			await addToHistory({
				text: `word-${i}`,
				context: "ctx",
				response: "resp",
				timestamp: i,
			});
		}

		const history = await getHistory();
		expect(history).toHaveLength(50);
		// The first one in history (index 0) should be the latest added (word-60)
		expect(history[0].text).toBe("word-60");
		// The last one in history (index 49) should be word-11 (evicted 1 to 10)
		expect(history[49].text).toBe("word-11");
	});

	it("clears the history from storage", async () => {
		await addToHistory({
			text: "clear-me",
			context: "ctx",
			response: "resp",
			timestamp: 1234,
		});

		let history = await getHistory();
		expect(history).toHaveLength(1);

		await clearHistory();
		history = await getHistory();
		expect(history).toEqual([]);
	});
});
