import { beforeEach, describe, expect, it } from "vitest";
import { ExplanationStore, type StorageAdapter } from "../explanation-store";

function createInMemoryAdapter(): StorageAdapter {
	const sessionStore: Record<string, unknown> = {};
	const localStore: Record<string, unknown> = {};

	return {
		sessionGet: async (keys) => {
			const res: Record<string, unknown> = {};
			for (const k of keys) {
				if (k in sessionStore) res[k] = sessionStore[k];
			}
			return res;
		},
		sessionSet: async (items) => {
			Object.assign(sessionStore, items);
		},
		sessionRemove: async (keys) => {
			const list = Array.isArray(keys) ? keys : [keys];
			for (const k of list) delete sessionStore[k];
		},
		localGet: async (keys) => {
			const res: Record<string, unknown> = {};
			for (const k of keys) {
				if (k in localStore) res[k] = localStore[k];
			}
			return res;
		},
		localSet: async (items) => {
			Object.assign(localStore, items);
		},
		localRemove: async (keys) => {
			const list = Array.isArray(keys) ? keys : [keys];
			for (const k of list) delete localStore[k];
		},
	};
}

describe("ExplanationStore", () => {
	let store: ExplanationStore;

	beforeEach(() => {
		store = new ExplanationStore(createInMemoryAdapter());
	});

	it("returns null for uncached queries", async () => {
		const result = await store.getCached("hello", "context");
		expect(result).toBeNull();
	});

	it("caches and retrieves explanations", async () => {
		await store.setCached("hello", "context", "Hello explanation", "greeting");
		const result = await store.getCached("hello", "context");

		expect(result).toEqual({
			response: "Hello explanation",
			category: "greeting",
		});
	});

	it("saves explanation to both cache and history simultaneously", async () => {
		await store.saveExplanation({
			text: "algorithm",
			context: "computer science",
			response: "A step by step set of instructions.",
			category: "tech",
			pageUrl: "https://example.com",
		});

		const cached = await store.getCached("algorithm", "computer science");
		expect(cached?.response).toBe("A step by step set of instructions.");

		const history = await store.getHistory();
		expect(history).toHaveLength(1);
		expect(history[0].text).toBe("algorithm");
		expect(history[0].category).toBe("tech");
	});

	it("enforces LRU limit on history", async () => {
		for (let i = 0; i < 60; i++) {
			await store.recordHistory({
				text: `item-${i}`,
				context: "ctx",
				response: `resp-${i}`,
				timestamp: Date.now() + i,
			});
		}

		const history = await store.getHistory();
		expect(history).toHaveLength(50);
		expect(history[0].text).toBe("item-59");
	});

	it("clears history cleanly", async () => {
		await store.recordHistory({
			text: "test",
			context: "",
			response: "resp",
			timestamp: Date.now(),
		});
		await store.clearHistory();
		const history = await store.getHistory();
		expect(history).toEqual([]);
	});
});
