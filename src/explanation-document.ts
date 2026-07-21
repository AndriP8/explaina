import {
	cleanExplanationMarkdown,
	extractExamples,
	extractRelatedTerms,
	renderMarkdown,
} from "./render";

export class ExplanationDocument {
	readonly rawText: string;
	readonly bodyMarkdown: string;
	readonly html: string;
	readonly examples: string[];
	readonly relatedTerms: string[];

	constructor(rawText: string) {
		this.rawText = rawText;
		this.bodyMarkdown = cleanExplanationMarkdown(rawText);
		this.html = renderMarkdown(this.bodyMarkdown);
		this.examples = extractExamples(rawText);
		this.relatedTerms = extractRelatedTerms(rawText);
	}

	static fromRaw(rawText: string): ExplanationDocument {
		return new ExplanationDocument(rawText);
	}
}
