import { describe, expect, it } from "vitest";
import {
	cleanExplanationMarkdown,
	extractExamples,
	extractRelatedTerms,
	parseSSE,
	renderMarkdown,
} from "../render";

describe("renderMarkdown", () => {
	it("renders plain text", () => {
		const result = renderMarkdown("Hello world");
		expect(result).toContain("Hello world");
		expect(result).toContain("<p");
	});

	it("renders bold text", () => {
		const result = renderMarkdown("This is **bold** text");
		expect(result).toContain("<strong>bold</strong>");
	});

	it("renders italic text", () => {
		const result = renderMarkdown("This is *italic* text");
		expect(result).toContain("<em>italic</em>");
	});

	it("renders inline code", () => {
		const result = renderMarkdown("Use `code` inline");
		expect(result).toContain("<code");
	});

	it("renders fenced code blocks", () => {
		const result = renderMarkdown("```\nconst x = 1;\n```");
		expect(result).toContain("<pre");
		expect(result).toContain("<code");
		expect(result).toContain("const x = 1;");
	});

	it("renders links", () => {
		const result = renderMarkdown("[click here](https://example.com)");
		expect(result).toContain('href="https://example.com"');
		expect(result).toContain(">click here<");
	});

	it("escapes HTML", () => {
		const result = renderMarkdown("<script>alert('xss')</script>");
		expect(result).not.toContain("<script>");
		expect(result).toContain("&lt;script&gt;");
	});

	it("handles empty input", () => {
		const result = renderMarkdown("");
		expect(result).toContain("<p");
	});

	it("handles code block with language", () => {
		const result = renderMarkdown("```typescript\nconst x: number = 1;\n```");
		expect(result).toContain("const x: number = 1;");
	});

	it("does not corrupt code blocks containing blank lines (double newlines)", () => {
		const result = renderMarkdown(
			"```javascript\nconst a = 1;\n\nconst b = 2;\n```",
		);
		// Should contain the raw code blocks and not introduce </p><p> tags inside the code block
		expect(result).not.toContain("const a = 1;</p>");
		expect(result).toContain("const a = 1;\n\nconst b = 2;\n");
	});

	it("does not double-escape characters like < or & in code blocks", () => {
		const result = renderMarkdown("```javascript\nif (a < b && b > c) {}\n```");
		// Single-escaping is expected: < should render as &lt; and & should render as &amp;
		// But it should NOT render as &amp;lt; or &amp;amp;&amp;amp;
		expect(result).toContain("if (a &lt; b &amp;&amp; b &gt; c) {}");
		expect(result).not.toContain("&amp;lt;");
		expect(result).not.toContain("&amp;amp;");
	});
});

describe("parseSSE", () => {
	it("parses SSE data lines", () => {
		const result = parseSSE("data: Hello\n\ndata: World\n\n");
		expect(result).toBe("HelloWorld");
	});

	it("ignores non-data lines", () => {
		const result = parseSSE("event: message\ndata: Hello\n\n");
		expect(result).toBe("Hello");
	});

	it("handles empty string", () => {
		const result = parseSSE("");
		expect(result).toBe("");
	});

	it("handles SSE with no data lines", () => {
		const result = parseSSE("event: done\n\n");
		expect(result).toBe("");
	});
});

describe("cleanExplanationMarkdown", () => {
	it("removes Examples and Related sections and trims results", () => {
		const input = `This is explanation.
## Examples
- Ex 1
- Ex 2
## Related
- Term 1
`;
		const result = cleanExplanationMarkdown(input);
		expect(result).toBe("This is explanation.");
	});

	it("leaves explanation unchanged if sections are not present", () => {
		const input = "Plain explanation text.";
		expect(cleanExplanationMarkdown(input)).toBe(input);
	});
});

describe("extractExamples", () => {
	it("extracts markdown list items from Examples section", () => {
		const input = `Explanation.
### Examples
* Example One
* Example Two
## Related
- Tag 1
`;
		const result = extractExamples(input);
		expect(result).toEqual(["Example One", "Example Two"]);
	});

	it("returns empty array if no Examples section exists", () => {
		const input = "Explanation text.";
		expect(extractExamples(input)).toEqual([]);
	});
});

describe("extractRelatedTerms", () => {
	it("extracts list items or bold terms from Related section", () => {
		const input = `Explanation.
## Related
- Related Tag 1
- Related Tag 2
`;
		const result = extractRelatedTerms(input);
		expect(result).toEqual(["Related Tag 1", "Related Tag 2"]);
	});

	it("extracts bold terms from Related section", () => {
		const input = `Explanation.
## Related
Some text containing **Bold Term 1** and **Bold Term 2**
`;
		const result = extractRelatedTerms(input);
		expect(result).toEqual(["Bold Term 1", "Bold Term 2"]);
	});

	it("returns empty array if no Related section exists", () => {
		const input = "Explanation text.";
		expect(extractRelatedTerms(input)).toEqual([]);
	});
});
