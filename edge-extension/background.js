// ================== GLOBAL STORAGE ==================
let networkLogs = [];
let consoleLogs = [];
let extensionOpenedTabId = null;

// ================== NETWORK HELPERS ==================
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
      requestHeaders: requestRequestHeaders[details.requestId] || {},
      requestBody: requestRequestBody[details.requestId] || null,
      status: details.statusCode,
      statusText: details.statusCode >= 400 ? "Error" : "OK",
      responseHeaders,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration: `${endTime - startTime} ms`,
      type: details.type,
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
      requestHeaders: requestRequestHeaders[details.requestId] || {},
      requestBody: requestRequestBody[details.requestId] || null,
      status: "FAILED",
      statusText: details.error,
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

// ================== MESSAGE HANDLER ==================
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // ---------- CHECK EXTENSION ----------
  if (msg.type === "CHECK_EXTENSION") {
    sendResponse({ installed: true });
    return;
  }

  // ---------- OPEN URL ----------
  if (msg.type === "OPEN_URL") {
    console.log("[BG] OPEN_URL");

    networkLogs = [];
    consoleLogs = [];

    chrome.tabs.create({ url: msg.payload }, (tab) => {
      extensionOpenedTabId = tab.id;

      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === "complete") {

          console.log("[BG] Injecting pageConsoleRecorder");

          chrome.tabs.sendMessage(tab.id, {
            type: "INJECT_PAGE_CONSOLE_RECORDER"
          });


          chrome.tabs.sendMessage(tab.id, { type: "SHOW_HEADER" });
          chrome.tabs.sendMessage(tab.id, { type: "INJECT_RECORDER_BUTTON" });

          chrome.tabs.onUpdated.removeListener(listener);
        }
      });
    });

    return;
  }

  // ---------- CONSOLE LOG FROM PAGE ----------
  if (msg.type === "CONSOLE_LOG_FROM_PAGE") {
    consoleLogs.push(msg.payload);

    console.log("[BG] Console log received:", msg.payload);

    // Optional: live update UI
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: "CONSOLE_LOGS_FROM_EXTENSION",
          payload: [msg.payload]
        });
      });
    });

    return;
  }

  // ---------- RECORDING DATA (IMPORTANT FIX) ----------
  if (msg.type === "RECORDING_DATA") {
    console.log("[BG] RECORDING_DATA");
    console.log("[BG] consoleLogs:", consoleLogs.length);
    console.log("[BG] networkLogs:", networkLogs.length);

    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {

        // Recorded steps
        chrome.tabs.sendMessage(tab.id, {
          type: "RECORDING_DATA_FROM_EXTENSION",
          payload: msg.payload
        });

        // Console logs (FULL)
        chrome.tabs.sendMessage(tab.id, {
          type: "CONSOLE_LOGS_FROM_EXTENSION",
          payload: consoleLogs
        });

        // Network logs (FULL)
        chrome.tabs.sendMessage(tab.id, {
          type: "NETWORK_LOGS_FROM_EXTENSION",
          payload: networkLogs
        });
      });
    });

    return;
  }

  // ---------- SCREENSHOT ----------
  if (msg.type === "CAPTURE_FULL") {
    chrome.tabs.captureVisibleTab({ format: "png" }, (image) => {
      sendResponse({ image });
    });
    return true;
  }
});
