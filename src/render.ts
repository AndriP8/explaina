export function renderMarkdown(text: string): string {
	// Escape HTML first
	let html = text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");

	const codeBlocks: string[] = [];

	// Extract fenced code blocks (```...```) into placeholders
	html = html.replace(
		/```(\w*)\n?([\s\S]*?)```/g,
		(_match: string, _lang: string, code: string) => {
			const index = codeBlocks.length;
			codeBlocks.push(
				`<pre class="bg-gray-100 dark:bg-gray-700 rounded p-2 my-2 overflow-x-auto text-sm"><code>${code}</code></pre>`,
			);
			return `__CODE_BLOCK_${index}__`;
		},
	);

	// Extract inline code (`...`) into placeholders
	html = html.replace(/`([^`]+)`/g, (_match: string, code: string) => {
		const index = codeBlocks.length;
		codeBlocks.push(
			`<code class="bg-gray-100 dark:bg-gray-700 rounded px-1 text-sm">${code}</code>`,
		);
		return `__CODE_BLOCK_${index}__`;
	});

	// Bold
	html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

	// Italic
	html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

	// Links
	html = html.replace(
		/\[([^\]]+)\]\(([^)]+)\)/g,
		'<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline">$1</a>',
	);

	// Double newlines = paragraph break
	html = html.replace(/\n\n/g, '</p><p class="mb-2">');

	// Single newlines = line break
	html = html.replace(/\n/g, "<br>");

	// Wrap in a paragraph tag
	html = `<p class="mb-2">${html}</p>`;

	// Restore code blocks from placeholders
	for (let i = 0; i < codeBlocks.length; i++) {
		html = html.replace(`__CODE_BLOCK_${i}__`, codeBlocks[i]);
	}

	return html;
}

export function parseSSE(chunk: string): string {
	return chunk
		.split("\n")
		.filter((line) => line.startsWith("data: "))
		.map((line) => line.slice(6))
		.join("");
}

export function cleanExplanationMarkdown(response: string): string {
	return response
		.replace(/##?\s*Examples?[\s\S]*?(?=##?\s*|$)/i, "")
		.replace(/##?\s*Related[\s\S]*?(?=##?\s*|$)/i, "")
		.trim();
}

export function extractExamples(response: string): string[] {
	const exampleMatch = response.match(/##?\s*Examples?[\s\S]*?(?=##?\s*|$)/i);
	if (!exampleMatch) return [];
	const items = exampleMatch[0].match(/^\s*[*-]\s+(.+)$/gm);
	if (!items) return [];
	return items.map((item) => item.replace(/^\s*[*-]\s+/, "").trim());
}

export function extractRelatedTerms(response: string): string[] {
	const relatedMatch = response.match(/##?\s*Related[\s\S]*?(?=##?\s*|$)/i);
	if (!relatedMatch) return [];
	const terms =
		relatedMatch[0].match(/^\s*[*-]\s+(.+)$/gm) ||
		relatedMatch[0].match(/\*\*(.+?)\*\*/g);
	if (!terms) return [];
	return terms.map((term) =>
		term
			.replace(/^\s*[*-]\s+/, "")
			.replace(/\*\*/g, "")
			.trim(),
	);
}
