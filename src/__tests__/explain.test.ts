import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stores: {
	sync: Record<string, unknown>;
	session: Record<string, unknown>;
	local: Record<string, unknown>;
} = {
	sync: {},
	session: {},
	local: {},
};

function createStorage(store: Record<string, unknown>) {
	return {
		get: async (keys: string[]) => {
			const result: Record<string, unknown> = {};
			for (const key of keys) {
				if (key in store) result[key] = store[key];
			}
			return result;
		},
		set: async (items: Record<string, unknown>) => {
			Object.assign(store, items);
		},
		remove: async (keys: string | string[]) => {
			const keyList = Array.isArray(keys) ? keys : [keys];
			for (const key of keyList) {
				delete store[key];
			}
		},
	};
}

Reflect.set(globalThis, "chrome", {
	storage: {
		sync: createStorage(stores.sync),
		session: createStorage(stores.session),
		local: createStorage(stores.local),
	},
});

import { explain } from "../explain";

function resetStores() {
	for (const k of Object.keys(stores.sync)) {
		delete stores.sync[k];
	}
	for (const k of Object.keys(stores.session)) {
		delete stores.session[k];
	}
	for (const k of Object.keys(stores.local)) {
		delete stores.local[k];
	}
}

function jsonResponse(content: string, category?: string) {
	return new Response(
		JSON.stringify({ text: content, explanation: content, category }),
		{
			status: 200,
			headers: { "content-type": "application/json" },
		},
	);
}

describe("explain", () => {
	let originalFetch: typeof fetch;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
		resetStores();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("fetches a JSON explanation and saves cache + history", async () => {
		globalThis.fetch = vi.fn(async () =>
			jsonResponse("AI says hello", "test-category"),
		);

		const result = await explain({
			text: "hello",
			context: "context text",
			pageUrl: "https://example.com/page",
		});

		expect(result.response).toBe("AI says hello");
		expect(result.category).toBe("test-category");
		expect(result.fromCache).toBe(false);

		const history = stores.local.explaina_history;
		expect(Array.isArray(history)).toBe(true);
		if (Array.isArray(history)) {
			expect(history).toHaveLength(1);
			expect(history[0].text).toBe("hello");
			expect(history[0].response).toBe("AI says hello");
			expect(history[0].category).toBe("test-category");
		}
	});

	it("handles the new category and explanation JSON format", async () => {
		globalThis.fetch = vi.fn(
			async () =>
				new Response(
					JSON.stringify({
						category: "idiom",
						explanation:
							"To face a difficult situation with courage and get it over with.",
					}),
					{
						status: 200,
						headers: { "content-type": "application/json" },
					},
				),
		);

		const result = await explain({
			text: "bite the bullet",
			context: "some context",
			pageUrl: "https://example.com",
		});

		expect(result.response).toBe(
			"To face a difficult situation with courage and get it over with.",
		);
		expect(result.category).toBe("idiom");
		expect(result.fromCache).toBe(false);

		const history = stores.local.explaina_history;
		expect(Array.isArray(history)).toBe(true);
		if (Array.isArray(history)) {
			expect(history).toHaveLength(1);
			expect(history[0].text).toBe("bite the bullet");
			expect(history[0].response).toBe(
				"To face a difficult situation with courage and get it over with.",
			);
			expect(history[0].category).toBe("idiom");
		}
	});

	it("returns cached response when available", async () => {
		globalThis.fetch = vi.fn(async () => jsonResponse("AI says hello"));
		await explain({
			text: "cached",
			context: "ctx",
			pageUrl: "https://example.com",
		});

		const fetchSpy = vi.fn(async () => jsonResponse("new response"));
		globalThis.fetch = fetchSpy;

		const result = await explain({
			text: "cached",
			context: "ctx",
			pageUrl: "https://example.com",
		});

		expect(result.response).toBe("AI says hello");
		expect(result.fromCache).toBe(true);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it("bypasses cache when requested", async () => {
		globalThis.fetch = vi.fn(async () => jsonResponse("first"));
		await explain({
			text: "word",
			context: "ctx",
			pageUrl: "https://example.com",
		});

		globalThis.fetch = vi.fn(async () => jsonResponse("second"));
		const result = await explain({
			text: "word",
			context: "ctx",
			pageUrl: "https://example.com",
			bypassCache: true,
		});

		expect(result.response).toBe("second");
		expect(result.fromCache).toBe(false);
	});

	it("handles a streaming response", async () => {
		const encoder = new TextEncoder();
		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(encoder.encode("streamed response"));
				controller.close();
			},
		});

		globalThis.fetch = vi.fn(
			async () =>
				new Response(stream, {
					status: 200,
					headers: { "content-type": "text/plain" },
				}),
		);

		const result = await explain({
			text: "stream",
			context: "ctx",
			pageUrl: "https://example.com",
		});

		expect(result.response).toBe("streamed response");
		expect(result.fromCache).toBe(false);
	});

	it("throws a friendly error on server failure", async () => {
		vi.useFakeTimers();
		globalThis.fetch = vi.fn(
			async () => new Response("Internal Server Error", { status: 500 }),
		);

		const promise = explain({
			text: "word",
			context: "ctx",
			pageUrl: "https://example.com",
		}).catch((err) => err);

		await vi.advanceTimersByTimeAsync(10000);

		try {
			const error = await promise;
			expect(error).toBeInstanceOf(Error);
			if (error instanceof Error) {
				expect(error.message).toBe(
					"The server encountered an error. Please try again later.",
				);
			}
		} finally {
			vi.useRealTimers();
		}
	});

	it("aborts when the signal is triggered", async () => {
		globalThis.fetch = vi.fn(async () => {
			throw new DOMException("Aborted", "AbortError");
		});

		const controller = new AbortController();
		controller.abort();

		await expect(
			explain({
				text: "word",
				context: "ctx",
				pageUrl: "https://example.com",
				signal: controller.signal,
			}),
		).rejects.toThrow();
	});

	it("throws a friendly error on 4xx client failure immediately", async () => {
		const fetchMock = vi.fn(
			async () => new Response("Bad Request", { status: 400 }),
		);
		globalThis.fetch = fetchMock;

		await expect(
			explain({
				text: "word",
				context: "ctx",
				pageUrl: "https://example.com",
			}),
		).rejects.toThrow(
			"Invalid request. Please check your input and try again.",
		);

		// Verify it was only called once (no retries)
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("passes title in the fetch request body", async () => {
		const fetchMock = vi.fn(async () => jsonResponse("AI says hello"));
		globalThis.fetch = fetchMock;

		await explain({
			text: "hello",
			context: "context text",
			pageUrl: "https://example.com/page",
			title: "Custom Title",
		});

		expect(fetchMock).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				body: JSON.stringify({
					value: "hello",
					bodyText: "context text",
					url: "https://example.com/page",
					title: "Custom Title",
				}),
			}),
		);
	});
});
