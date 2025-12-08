// Inject inject.js into webpage
const script = document.createElement("script");
script.src = chrome.runtime.getURL("inject.js");
(document.head || document.documentElement).appendChild(script);

// Listen for messages from inject.js
window.addEventListener("message", (event) => {
  if (event.data.type === "FOR_CONTENT") {
    chrome.runtime.sendMessage({
      type: "OPEN_URL",
      payload: event.data.payload
    });
  }
});
