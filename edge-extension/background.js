// ================== NETWORK LOG STORAGE ==================
let networkLogs = [];
let extensionOpenedTabId = null;

// Temporary maps to correlate request lifecycle
const requestStartTime = {};
const requestRequestHeaders = {};
const requestRequestBody = {};

// ================== REQUEST START ==================
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId !== extensionOpenedTabId) return;

    requestStartTime[details.requestId] = Date.now();

    if (details.requestBody) {
      try {
        requestRequestBody[details.requestId] =
          details.requestBody.raw
            ? new TextDecoder().decode(details.requestBody.raw[0].bytes)
            : details.requestBody;
      } catch {
        requestRequestBody[details.requestId] = "[Unable to read request body]";
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

// ================== REQUEST HEADERS ==================
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (details.tabId !== extensionOpenedTabId) return;

    const headers = {};
    details.requestHeaders?.forEach(h => {
      headers[h.name] = h.value;
    });

    requestRequestHeaders[details.requestId] = headers;
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders"]
);

// ================== RESPONSE SUCCESS ==================
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.tabId !== extensionOpenedTabId) return;

    const endTime = Date.now();
    const startTime = requestStartTime[details.requestId] || endTime;

    const responseHeaders = {};
    details.responseHeaders?.forEach(h => {
      responseHeaders[h.name] = h.value;
    });

    networkLogs.push({
      id: details.requestId,
      url: details.url,
      method: details.method,

      // Request
      requestHeaders: requestRequestHeaders[details.requestId] || {},
      requestBody: requestRequestBody[details.requestId] || null,

      // Response
      status: details.statusCode,
      statusText: details.statusCode >= 400 ? "Error" : "OK",
      responseHeaders,

      // Timing
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration: `${endTime - startTime} ms`,

      // Type
      type: details.type,

      // Error (none here)
      error: null
    });

    cleanup(details.requestId);
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// ================== RESPONSE FAILURE ==================
chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    if (details.tabId !== extensionOpenedTabId) return;

    const endTime = Date.now();
    const startTime = requestStartTime[details.requestId] || endTime;

    networkLogs.push({
      id: details.requestId,
      url: details.url,
      method: details.method,

      // Request
      requestHeaders: requestRequestHeaders[details.requestId] || {},
      requestBody: requestRequestBody[details.requestId] || null,

      // Response
      status: "FAILED",
      statusText: details.error,

      // Timing
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration: `${endTime - startTime} ms`,

      type: details.type,

      error: {
        code: details.error,
        message: details.error
      }
    });

    cleanup(details.requestId);
  },
  { urls: ["<all_urls>"] }
);

// ================== CLEANUP ==================
function cleanup(requestId) {
  delete requestStartTime[requestId];
  delete requestRequestHeaders[requestId];
  delete requestRequestBody[requestId];
}

// ================== EXISTING MESSAGE HANDLING (UNCHANGED) ==================
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === "CHECK_EXTENSION") {
    sendResponse({ installed: true });
  }

  if (msg.type === "OPEN_URL") {
    networkLogs = [];

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
