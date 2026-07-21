export interface ExplainaStorage {
	selectedText?: string;
	context?: string;
	pageUrl?: string;
	pageTitle?: string;
}

export interface ExplainRequest {
	value: string;
	bodyText: string;
	url: string;
	title: string;
}

export interface ExplainResponse {
	text?: string;
	explanation?: string;
	category?: string;
}

export interface HistoryEntry {
	text: string;
	context: string;
	response: string;
	category?: string;
	timestamp: number;
	pageUrl?: string;
}

export interface CacheEntry {
	response: string;
	category?: string;
	timestamp: number;
}

export interface SelectionMessage {
	type: "selection" | "getLatestSelection";
	selectedText?: string;
	context?: string;
	pageUrl?: string;
	pageTitle?: string;
}

export interface SelectionResponse {
	selectedText: string;
	context: string;
	pageUrl: string;
	pageTitle: string;
}
