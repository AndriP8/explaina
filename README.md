# Explaina - Explain with AI

## Overview

Explaina is an AI-powered Chrome extension that explains complex terms by analyzing the context of the page you're on. Select any word or phrase, and get a concise, context-aware explanation.

## Features

- **Contextual Explanations:** AI explains selected text using the surrounding page content.
- **Two entry points:** Right-click "Explain with AI" context menu, or select text and click the extension icon.
- **Smart context extraction:** Captures nearby paragraphs (up to 2000 chars) instead of the full page.
- **Works everywhere:** Content script injected into all websites.
- **Streaming support:** Displays responses incrementally when the backend supports it.
- **Retry with backoff:** Automatically retries on transient failures.
- **Dark mode:** Adapts to your system color scheme.
- **Keyboard shortcut:** Press `Ctrl+Shift+E` (`Cmd+Shift+E` on Mac) to open the popup.
- **Customizable API:** Set a custom API URL via `chrome.storage.sync`.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/explaina.git
   cd explaina
   ```

2. Install dependencies:

   ```bash
   pnpm install
   pnpm approve-builds esbuild
   ```

3. Build the extension:

   ```bash
   pnpm run build    # compiles TypeScript src/ → dist/
   pnpm run tailwind # compiles input.css → index.css
   ```

4. Load the extension into Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `explaina` directory

## Usage

- **Select text → right-click → "Explain with AI"** — quick entry from context menu.
- **Select text → click extension icon** — popup opens with text pre-filled.
- **Press `Ctrl+Shift+E`** — opens the popup instantly.
- Edit the text in the popup textarea, then click **Explain**.

## Development

```bash
pnpm run dev    # watch mode — rebuilds on file changes
pnpm run tailwind  # rebuild CSS after theme changes
```

### Project Structure

```
explaina/
├── src/               # TypeScript source files
│   ├── background.ts  # Service worker (context menu)
│   ├── content.ts     # Content script (text selection)
│   ├── popup.ts       # Popup UI logic
│   └── types.ts       # Shared type definitions
├── dist/              # Compiled JS output (gitignored)
├── input.css          # Tailwind CSS input
├── index.css          # Compiled CSS (gitignored)
├── manifest.json      # Chrome extension manifest
├── popup.html         # Popup UI
├── tsconfig.json      # TypeScript config
└── package.json       # Dependencies & build scripts
```

## Configuring a Custom API

Set a custom endpoint via the console:

```js
chrome.storage.sync.set({ apiUrl: "https://your-server.com/api/explain" })
```

## License

ISC
