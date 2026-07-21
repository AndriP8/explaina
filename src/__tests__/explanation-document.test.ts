import { describe, expect, it } from "vitest";
import { ExplanationDocument } from "../explanation-document";

describe("ExplanationDocument", () => {
	it("parses raw response into structured document object", () => {
		const rawResponse = `
This is the main explanation markdown with **bold** text.

## Examples
- Example 1: Usage in code
- Example 2: Usage in sentence

## Related
- **Term 1**
- **Term 2**
    `.trim();

		const doc = ExplanationDocument.fromRaw(rawResponse);

		expect(doc.bodyMarkdown).toBe(
			"This is the main explanation markdown with **bold** text.",
		);
		expect(doc.html).toContain("<strong>bold</strong>");
		expect(doc.examples).toEqual([
			"Example 1: Usage in code",
			"Example 2: Usage in sentence",
		]);
		expect(doc.relatedTerms).toEqual(["Term 1", "Term 2"]);
	});
});
