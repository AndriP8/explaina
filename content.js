document.addEventListener("mouseup", () => {
  // https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType#value
  const TEXT_NODE = 3;
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  const range = selection.getRangeAt(0);
  const containerElement = range.commonAncestorContainer;

  const element =
    containerElement.nodeType === TEXT_NODE
      ? containerElement.parentElement
      : containerElement;
  const textContainer = element.innerText;

  if (selectedText) {
    chrome.storage.local.set({ selectedText });
    chrome.storage.local.set({ context: textContainer });
  }
});
