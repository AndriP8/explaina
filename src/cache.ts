import { explanationStore } from "./explanation-store";

export async function getCachedExplanation(
	text: string,
	context: string,
): Promise<{ response: string; category?: string } | null> {
	return explanationStore.getCached(text, context);
}

export async function setCachedExplanation(
	text: string,
	context: string,
	response: string,
	category?: string,
): Promise<void> {
	return explanationStore.setCached(text, context, response, category);
}
