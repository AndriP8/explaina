// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	getOrCreateHost,
	getSelectionRect,
	hideIcon,
	isInsideHost,
	openPopover,
	showIcon,
} from "../content-ui";

describe("content-ui", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
		Object.defineProperty(window, "innerWidth", {
			value: 1024,
			writable: true,
		});
		Object.defineProperty(window, "innerHeight", {
			value: 768,
			writable: true,
		});
	});

	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("creates a shadow host element", () => {
		const host = getOrCreateHost();
		expect(host.id).toBe("explaina-host");
		expect(host.shadowRoot).not.toBeNull();
	});

	it("shows and hides an icon in the shadow root", () => {
		const host = getOrCreateHost();
		const rect = new DOMRect(100, 100, 50, 16);
		let clicked = false;

		showIcon(host, rect, () => {
			clicked = true;
		});

		const icon = host.shadowRoot?.getElementById("explaina-icon");
		expect(icon).not.toBeNull();
		icon?.click();
		expect(clicked).toBe(true);

		hideIcon(host);
		expect(host.shadowRoot?.getElementById("explaina-icon")).toBeNull();
	});

	it("opens and closes a popover in the shadow root", () => {
		const host = getOrCreateHost();
		const rect = new DOMRect(100, 100, 50, 16);
		const controller = openPopover(host, "selected word", rect);

		const popover = host.shadowRoot?.getElementById("explaina-popover");
		expect(popover).not.toBeNull();
		expect(popover?.textContent).toContain("selected word");
		expect(popover?.textContent).toContain("Explaining...");

		controller.setResult("This is the **explanation**.", false);
		expect(popover?.textContent).toContain("explanation");

		controller.setError("Something went wrong");
		expect(popover?.textContent).toContain("Something went wrong");

		controller.close();
		expect(host.shadowRoot?.getElementById("explaina-popover")).toBeNull();
	});

	it("recognizes nodes inside the explaina host", () => {
		const host = getOrCreateHost();
		const node = document.createElement("div");
		host.shadowRoot?.appendChild(node);
		expect(isInsideHost(node)).toBe(true);
		expect(isInsideHost(document.body)).toBe(false);
	});

	it("computes selection rectangles from the current selection", () => {
		const p = document.createElement("p");
		p.textContent = "Hello world";
		document.body.appendChild(p);

		const range = document.createRange();
		const firstChild = p.firstChild;
		expect(firstChild).not.toBeNull();
		if (!firstChild) return;
		range.setStart(firstChild, 0);
		range.setEnd(firstChild, 5);

		const selection = window.getSelection();
		expect(selection).not.toBeNull();
		if (!selection) return;
		selection.removeAllRanges();
		selection.addRange(range);

		Object.defineProperty(range, "getClientRects", {
			value: () => [new DOMRect(100, 100, 40, 16)],
		});
		Object.defineProperty(range, "getBoundingClientRect", {
			value: () => new DOMRect(100, 100, 40, 16),
		});

		const result = getSelectionRect();
		expect(result).not.toBeNull();
		expect(result?.popover).toBeInstanceOf(DOMRect);
		expect(result?.icon).toBeInstanceOf(DOMRect);
	});

	it("returns null for a collapsed selection", () => {
		const selection = window.getSelection();
		expect(selection).not.toBeNull();
		if (!selection) return;
		selection.removeAllRanges();
		expect(getSelectionRect()).toBeNull();
	});
});
