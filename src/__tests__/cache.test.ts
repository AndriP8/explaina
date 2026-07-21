import { beforeEach, describe, expect, it } from "vitest";

// Mock chrome.storage.session
const sessionStore: Record<string, unknown> = {};
Reflect.set(globalThis, "chrome", {
	storage: {
		session: {
			get: async (keys: string[]) => {
				const result: Record<string, unknown> = {};
				for (const key of keys) {
					if (key in sessionStore) result[key] = sessionStore[key];
				}
				return result;
			},
			set: async (items: Record<string, unknown>) => {
				Object.assign(sessionStore, items);
			},
			remove: async (keys: string | string[]) => {
				const keyList = Array.isArray(keys) ? keys : [keys];
				for (const key of keyList) {
					delete sessionStore[key];
				}
			},
		},
	},
});

import { getCachedExplanation, setCachedExplanation } from "../cache";

describe("cache", () => {
	beforeEach(() => {
		for (const k of Object.keys(sessionStore)) {
			delete sessionStore[k];
		}
	});

	it("returns null for uncached text", async () => {
		const result = await getCachedExplanation("hello", "world");
		expect(result).toBeNull();
	});

	it("returns cached response for same text and context", async () => {
		await setCachedExplanation("hello", "world", "cached response");
		const result = await getCachedExplanation("hello", "world");
		expect(result).toEqual({
			response: "cached response",
			category: undefined,
		});
	});

	it("returns cached response and category for same text and context", async () => {
		await setCachedExplanation(
			"hello",
			"world",
			"cached response",
			"my category",
		);
		const result = await getCachedExplanation("hello", "world");
		expect(result).toEqual({
			response: "cached response",
			category: "my category",
		});
	});

	it("returns null for different text", async () => {
		await setCachedExplanation("hello", "world", "cached response");
		const result = await getCachedExplanation("goodbye", "world");
		expect(result).toBeNull();
	});

	it("returns null for different context", async () => {
		await setCachedExplanation("hello", "world", "cached response");
		const result = await getCachedExplanation("hello", "universe");
		expect(result).toBeNull();
	});

	it("returns null for expired cache entries", async () => {
		// Set a cache entry with an old timestamp
		const key =
			"explaina_cache_" +
			Math.abs(
				"hello|world"
					.split("")
					.reduce((h, c) => (h << 5) - h + c.charCodeAt(0), 0) | 0,
			).toString(36);
		sessionStore[key] = {
			response: "stale",
			timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
		};
		const result = await getCachedExplanation("hello", "world");
		expect(result).toBeNull();
		// Should have been removed
		expect(sessionStore[key]).toBeUndefined();
	});
});
