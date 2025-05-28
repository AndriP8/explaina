document.addEventListener("DOMContentLoaded", async () => {
  const input = document.getElementById("input");
  const context = document.getElementById("context");
  const output = document.getElementById("output");
  const form = document.getElementById("form");
  const explainButton = document.getElementById("explain-button");

  chrome.storage.local.get("selectedText", (data) => {
    if (data.selectedText) {
      input.value = data.selectedText;
    }
  });
  chrome.storage.local.get("context", (data) => {
    if (data.context) {
      context.textContent = data.context;
    }
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        func: () => {
          return {
            url: window.location.href,
            title: document.title,
            bodyText: document.body.innerText.slice(0, 500),
          };
        },
      },
      async (injectionResults) => {
        const contextResult = injectionResults[0].result;

        const explainText = document.getElementById("explain-text");
        const loadingSpinner = document.getElementById("loading-spinner");
        const errorMessage = document.getElementById("error-message");

        explainButton.disabled = true;
        explainText.classList.add("hidden");
        loadingSpinner.classList.remove("hidden");
        errorMessage.classList.add("hidden");
        output.textContent = "";
        output.classList.remove("hidden");

        const explanation = await fetch(
          "https://explaina-server-production.up.railway.app/api/explain",
          {
            method: "POST",
            body: JSON.stringify({
              value: input.value,
              bodyText: context.textContent || contextResult.bodyText,
              url: contextResult.url,
              title: contextResult.title,
            }),
          },
        )
          .then((res) => res.json())
          .catch((error) => {
            errorMessage.textContent = error.message;
            errorMessage.classList.remove("hidden");
          })
          .finally(() => {
            loadingSpinner.classList.add("hidden");
            explainText.classList.remove("hidden");
            explainButton.disabled = false;
          });
        output.textContent =
          explanation.choices?.[0]?.message?.content || "No response";
      },
    );
  };

  chrome.storage.local.remove("selectedText");
  chrome.storage.local.remove("context");
});
