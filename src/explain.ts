import { explanationStore } from "./explanation-store";
import { parseSSE } from "./render";
import type { ExplainResponse } from "./types";

declare const process: { env: { API_URL?: string } };

const errorMessages: Record<number, string> = {
	400: "Invalid request. Please check your input and try again.",
	401: "Authentication failed. The API key may be invalid.",
	403: "Access denied.",
	429: "Too many requests. Please wait a moment and try again.",
	500: "The server encountered an error. Please try again later.",
	502: "The server is temporarily unavailable. Please try again.",
	503: "The server is busy. Please wait a moment and try again.",
};

async function fetchWithRetry(
	url: string,
	options: RequestInit,
	maxRetries = 3,
): Promise<Response> {
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			const res = await fetch(url, options);
			if (!res.ok) {
				if (res.status < 500) {
					// Client-side errors (4xx) should fail immediately without retries
					throw new Error(`HTTP error: ${res.status}`);
				}
				throw new Error(`Server error: ${res.status}`);
			}
			return res;
		} catch (err) {
			if (err instanceof Error && err.message.startsWith("HTTP error:"))
				throw err;
			if (err instanceof Error && err.name === "AbortError") throw err;
			if (attempt === maxRetries - 1) throw err;
			await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
		}
	}
	throw new Error("Request failed after retries");
}

export interface ExplainOptions {
	text: string;
	context: string;
	pageUrl: string;
	title?: string;
	bypassCache?: boolean;
	signal?: AbortSignal;
}

export interface ExplainResult {
	response: string;
	category?: string;
	fromCache: boolean;
}

export async function explain({
	text,
	context,
	pageUrl,
	title = "",
	bypassCache = false,
	signal,
}: ExplainOptions): Promise<ExplainResult> {
	if (!text) {
		throw new Error("No text to explain");
	}

	const API_URL = process.env.API_URL;
	if (!API_URL) {
		throw new Error("API_URL environment variable is not defined");
	}

	if (!bypassCache) {
		const cached = await explanationStore.getCached(text, context);
		if (cached) {
			return {
				response: cached.response,
				category: cached.category,
				fromCache: true,
			};
		}
	}

	try {
		const res = await fetchWithRetry(
			API_URL,
			{
				method: "POST",
				signal,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					value: text,
					bodyText: context,
					url: pageUrl,
					title,
				}),
			},
			3,
		);

		let responseText = "";
		let responseCategory = "";

		const contentType = res.headers.get("content-type") ?? "";
		if (
			contentType.includes("text/event-stream") ||
			contentType.includes("text/plain")
		) {
			const reader = res.body?.getReader();
			const decoder = new TextDecoder();
			if (reader) {
				let buffer = "";
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						if (buffer && contentType.includes("text/event-stream")) {
							responseText += parseSSE(`${buffer}\n`);
						} else if (buffer) {
							responseText += buffer;
						}
						break;
					}
					const chunk = decoder.decode(value, { stream: true });
					if (contentType.includes("text/event-stream")) {
						buffer += chunk;
						const lines = buffer.split("\n");
						buffer = lines.pop() ?? "";
						responseText += parseSSE(`${lines.join("\n")}\n`);
					} else {
						responseText += chunk;
					}
				}
			}
		} else {
			const data: ExplainResponse = await res.json();
			responseText = data.explanation || data.text || "No response";
			responseCategory = data.category || "";
		}

		if (responseText) {
			await explanationStore.saveExplanation({
				text,
				context,
				response: responseText,
				category: responseCategory,
				pageUrl,
			});
		}

		return {
			response: responseText,
			category: responseCategory,
			fromCache: false,
		};
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			throw error;
		}

		let message = "An error occurred. Please try again.";
		const match =
			error instanceof Error
				? error.message.match(/(?:Server|HTTP) error:\s*(\d+)/)
				: null;
		if (match) {
			const status = parseInt(match[1], 10);
			message =
				errorMessages[status] ||
				`Request failed (${status}). Please try again.`;
		} else if (error instanceof Error) {
			message = error.message;
		}

		throw new Error(message);
	}
}
