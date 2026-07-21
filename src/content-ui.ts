import { ExplanationDocument } from "./explanation-document";

const HOST_ID = "explaina-host";
const ICON_ID = "explaina-icon";
const POPOVER_ID = "explaina-popover";
const POPOVER_WIDTH = 320;
const GAP = 10;

const styles = /* css */ `
  :host {
    all: initial;
  }

  #${HOST_ID} {
    pointer-events: none;
  }

  .explaina-icon {
    position: fixed;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    background: #06b6d4;
    color: #ffffff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    padding: 0;
    pointer-events: auto;
    z-index: 2147483647;
    transition: transform 0.1s ease, background 0.15s ease;
  }

  .explaina-icon:hover {
    background: #0891b2;
    transform: scale(1.05);
  }

  .explaina-icon svg {
    width: 18px;
    height: 18px;
  }

  .explaina-popover {
    position: fixed;
    width: ${POPOVER_WIDTH}px;
    max-height: 340px;
    background: #111111;
    border: 1px solid #262626;
    border-radius: 12px;
    color: #f3f4f6;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
    pointer-events: auto;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .explaina-popover-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    padding: 12px 14px;
    border-bottom: 1px solid #262626;
  }

  .explaina-popover-title {
    font-weight: 600;
    font-size: 14px;
    color: #f3f4f6;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .explaina-popover-close {
    background: transparent;
    border: none;
    color: #9ca3af;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .explaina-popover-close:hover {
    color: #f3f4f6;
  }

  .explaina-popover-close svg {
    width: 16px;
    height: 16px;
  }

  .explaina-popover-body {
    padding: 14px;
    overflow-y: auto;
  }

  .explaina-popover-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 24px 14px;
    color: #9ca3af;
  }

  .explaina-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid #262626;
    border-top-color: #06b6d4;
    border-radius: 50%;
    animation: explaina-spin 0.8s linear infinite;
  }

  @keyframes explaina-spin {
    to { transform: rotate(360deg); }
  }

  .explaina-popover-error {
    padding: 12px 14px;
    color: #f87171;
    font-size: 13px;
  }

  .explaina-popover-content p {
    margin: 0 0 10px;
  }

  .explaina-popover-content p:last-child {
    margin-bottom: 0;
  }

  .explaina-popover-content pre {
    background: #1a1a1a;
    padding: 10px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 10px 0;
  }

  .explaina-popover-content code {
    background: #1a1a1a;
    padding: 2px 5px;
    border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
  }

  .explaina-popover-content a {
    color: #06b6d4;
    text-decoration: underline;
  }

  .explaina-cached {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 10px;
    font-size: 11px;
    color: #facc15;
  }

  .explaina-cached svg {
    width: 12px;
    height: 12px;
  }
`;

export interface PopoverController {
	setLoading: () => void;
	setResult: (response: string, fromCache: boolean) => void;
	setError: (message: string) => void;
	close: () => void;
}

export function getOrCreateHost(): HTMLElement {
	let host = document.getElementById(HOST_ID);
	if (host) return host;

	host = document.createElement("div");
	host.id = HOST_ID;
	host.style.position = "fixed";
	host.style.top = "0";
	host.style.left = "0";
	host.style.width = "0";
	host.style.height = "0";
	host.style.zIndex = "2147483646";
	host.style.pointerEvents = "none";
	document.body.appendChild(host);

	const shadow = host.attachShadow({ mode: "open" });
	const style = document.createElement("style");
	style.textContent = styles;
	shadow.appendChild(style);

	return host;
}

export function getShadowRoot(host: HTMLElement): ShadowRoot {
	if (!host.shadowRoot) {
		throw new Error("Explaina host shadow root is not initialized");
	}
	return host.shadowRoot;
}

export function isInsideHost(node: Node | null): boolean {
	const host = document.getElementById(HOST_ID);
	if (!host || !node) return false;
	return node.getRootNode() === host.shadowRoot;
}

export function getSelectionRect(): {
	icon: DOMRect;
	popover: DOMRect;
} | null {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return null;

	const range = selection.getRangeAt(0);
	if (range.collapsed) return null;

	const clientRects = range.getClientRects();
	const lastRect = clientRects.length
		? clientRects[clientRects.length - 1]
		: range.getBoundingClientRect();

	const iconRect = lastRect;

	return {
		icon: iconRect,
		popover: range.getBoundingClientRect(),
	};
}

export function showIcon(
	host: HTMLElement,
	rect: DOMRect,
	onClick: () => void,
): void {
	hideIcon(host);

	const shadow = getShadowRoot(host);
	const button = document.createElement("button");
	button.id = ICON_ID;
	button.className = "explaina-icon";
	button.title = "Explain with AI";
	button.innerHTML = `
    <svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
      <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
    </svg>
  `;

	button.addEventListener("click", (e) => {
		e.stopPropagation();
		onClick();
	});

	positionIcon(button, rect);
	shadow.appendChild(button);
}

export function hideIcon(host: HTMLElement): void {
	const shadow = getShadowRoot(host);
	const existing = shadow.getElementById(ICON_ID);
	if (existing) existing.remove();
}

export function openPopover(
	host: HTMLElement,
	text: string,
	rect: DOMRect,
): PopoverController {
	closePopover(host);

	const shadow = getShadowRoot(host);
	const popover = document.createElement("div");
	popover.id = POPOVER_ID;
	popover.className = "explaina-popover";
	popover.innerHTML = `
    <div class="explaina-popover-header">
      <div class="explaina-popover-title" title="${escapeHtml(text)}">${escapeHtml(text)}</div>
      <button class="explaina-popover-close" aria-label="Close">
        <svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
          <path d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
    <div class="explaina-popover-body">
      <div class="explaina-popover-loading">
        <div class="explaina-spinner"></div>
        <span>Explaining...</span>
      </div>
    </div>
  `;

	const closeBtn = popover.querySelector<HTMLButtonElement>(
		".explaina-popover-close",
	);
	closeBtn?.addEventListener("click", (e) => {
		e.stopPropagation();
		closePopover(host);
	});

	positionElement(popover, rect, POPOVER_WIDTH, 120);
	shadow.appendChild(popover);

	const body = popover.querySelector<HTMLDivElement>(".explaina-popover-body");

	return {
		setLoading: () => {
			if (body) {
				body.innerHTML = `
        <div class="explaina-popover-loading">
          <div class="explaina-spinner"></div>
          <span>Explaining...</span>
        </div>
      `;
			}
		},
		setResult: (response: string, fromCache: boolean) => {
			if (!body) return;
			const cachedHtml = fromCache
				? `
          <div class="explaina-cached">
            <svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            <span>Cached response</span>
          </div>
        `
				: "";

			const doc = ExplanationDocument.fromRaw(response);

			body.innerHTML = `
        <div class="explaina-popover-content">${doc.html}</div>
        ${cachedHtml}
      `;
		},
		setError: (message: string) => {
			if (body) {
				body.innerHTML = `<div class="explaina-popover-error">${escapeHtml(message)}</div>`;
			}
		},
		close: () => closePopover(host),
	};
}

export function closePopover(host: HTMLElement): void {
	const shadow = getShadowRoot(host);
	const existing = shadow.getElementById(POPOVER_ID);
	if (existing) existing.remove();
}

export function isPopoverOpen(host: HTMLElement): boolean {
	return !!getShadowRoot(host).getElementById(POPOVER_ID);
}

function positionIcon(el: HTMLElement, rect: DOMRect): void {
	const viewportWidth = window.innerWidth;
	const gap = GAP;
	const size = 32;

	let top = rect.top + (rect.height - size) / 2;
	let left = rect.right + gap;

	if (left + size > viewportWidth - gap) {
		left = Math.max(gap, rect.left - size - gap);
	}

	if (top < gap) top = gap;
	if (top + size > window.innerHeight - gap) {
		top = window.innerHeight - size - gap;
	}

	el.style.top = `${top}px`;
	el.style.left = `${left}px`;
}

function positionElement(
	el: HTMLElement,
	rect: DOMRect,
	width: number,
	estimatedHeight: number,
): void {
	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;
	const gap = GAP;

	// Default: place below selection, right-aligned with the end of the selection
	let top = rect.bottom + gap;
	let left = rect.right - width;

	// If not enough room below, place above
	if (top + estimatedHeight > viewportHeight - gap) {
		top = Math.max(gap, rect.top - estimatedHeight - gap);
	}

	// Keep horizontally within viewport
	if (left < gap) {
		left = gap;
	} else if (left + width > viewportWidth - gap) {
		left = viewportWidth - width - gap;
	}

	el.style.top = `${top}px`;
	el.style.left = `${left}px`;
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}
