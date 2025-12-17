// ================== NETWORK LOG STORAGE ==================
let networkLogs = [];
let extensionOpenedTabId = null;

// Capture network calls
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.tabId === extensionOpenedTabId) {
      networkLogs.push({
        url: details.url,
        method: details.method,
        status: details.statusCode,
        time: new Date().toISOString()
      });
    }
  },
  { urls: ["<all_urls>"] }
);

// ================== EXISTING CODE ==================
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "CHECK_EXTENSION") {
    sendResponse({ installed: true });
  }

  if (msg.type === "OPEN_URL") {
    networkLogs = []; // reset logs
    chrome.tabs.create({ url: msg.payload }, (tab) => {
      extensionOpenedTabId = tab.id;

      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === "complete") {
          chrome.tabs.sendMessage(tab.id, { type: "SHOW_HEADER" });
          chrome.tabs.sendMessage(tab.id, { type: "INJECT_RECORDER_BUTTON" });

          chrome.tabs.onUpdated.removeListener(listener);
        }
      });
    });
  }

  if (msg.type === "RECORDING_DATA") {
    chrome.tabs.query({}, function (tabs) {
      tabs.forEach((t) => {
        chrome.tabs.sendMessage(t.id, {
          type: "RECORDING_DATA_FROM_EXTENSION",
          payload: msg.payload
        });

        chrome.tabs.sendMessage(t.id, {
          type: "NETWORK_LOGS_FROM_EXTENSION",
          payload: networkLogs
        });
      });
    });
  }

  if (msg.type === "CAPTURE_FULL") {
    chrome.tabs.captureVisibleTab({ format: "png" }, (image) => {
      sendResponse({ image });
    });
    return true;
  }
});
