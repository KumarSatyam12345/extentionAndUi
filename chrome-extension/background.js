const EXT = typeof browser !== "undefined" ? browser : chrome;

// ================== GLOBAL STORAGE ==================
let networkLogs = [];
let consoleLogs = [];
let isRecording = false;

// 🔹 NEW: support multiple tabs
const extensionOpenedTabs = new Set();
const headerInjectedTabs = new Set();

// ================== NETWORK HELPERS ==================
const requestStartTime = {};
const requestRequestHeaders = {};
const requestRequestBody = {};

// ================== REQUEST START ==================
EXT.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (!extensionOpenedTabs.has(details.tabId)) return;

    requestStartTime[details.requestId] = Date.now();

    if (details.requestBody) {
      try {
        requestRequestBody[details.requestId] =
          details.requestBody.raw
            ? new TextDecoder().decode(details.requestBody.raw[0].bytes)
            : details.requestBody;
      } catch {
        requestRequestBody[details.requestId] =
          "[Unable to read request body]";
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

// ================== REQUEST HEADERS ==================
EXT.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (!extensionOpenedTabs.has(details.tabId)) return;

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
EXT.webRequest.onCompleted.addListener(
  (details) => {
    if (!extensionOpenedTabs.has(details.tabId)) return;

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
EXT.webRequest.onErrorOccurred.addListener(
  (details) => {
    if (!extensionOpenedTabs.has(details.tabId)) return;

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

// ================== TAB UPDATE (NEW FEATURE) ==================
EXT.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === "complete" && extensionOpenedTabs.has(tabId)) {
      EXT.tabs.sendMessage(tabId, {
        type: "RESTORE_UI_STATE",
        payload: { isRecording }
      });

      EXT.tabs.sendMessage(tabId, { type: "INJECT_PAGE_CONSOLE_RECORDER" });
      EXT.tabs.sendMessage(tabId, { type: "INJECT_RECORDER_BUTTON" });
       if (!headerInjectedTabs.has(tabId)) {
           EXT.tabs.sendMessage(tabId, { type: "SHOW_HEADER" });
           headerInjectedTabs.add(tabId);
         }
    }
});

// ================== TAB CLOSE CLEANUP ==================
EXT.tabs.onRemoved.addListener(tabId => {
  extensionOpenedTabs.delete(tabId);
  headerInjectedTabs.delete(tabId);
});

// ================== MESSAGE HANDLER ==================
EXT.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // ---------- CHECK EXTENSION ----------
  if (msg.type === "CHECK_EXTENSION") {
    sendResponse({ installed: true });
    return true;
  }

  // ---------- OPEN URL ----------
  if (msg.type === "OPEN_URL") {
    console.log("[BG] OPEN_URL");

    networkLogs = [];
    consoleLogs = [];

    EXT.tabs.create({ url: msg.payload }, (tab) => {
      if (!tab?.id) return;

      extensionOpenedTabs.add(tab.id);
      console.log("[BG] Extension opened tab:", tab.id);
    });

    return;
  }

  // ---------- CONSOLE LOG FROM PAGE ----------
  if (msg.type === "CONSOLE_LOG_FROM_PAGE") {
    consoleLogs.push(msg.payload);

    EXT.tabs.query({}, tabs => {
      tabs.forEach(tab => {
        EXT.tabs.sendMessage(tab.id, {
          type: "CONSOLE_LOGS_FROM_EXTENSION",
          payload: [msg.payload]
        });
      });
    });

    return;
  }

  // ---------- RECORDING DATA ----------
  if (msg.type === "RECORDING_DATA") {
    EXT.tabs.query({}, tabs => {
      tabs.forEach(tab => {
        EXT.tabs.sendMessage(tab.id, {
          type: "RECORDING_DATA_FROM_EXTENSION",
          payload: msg.payload
        });

        EXT.tabs.sendMessage(tab.id, {
          type: "CONSOLE_LOGS_FROM_EXTENSION",
          payload: consoleLogs
        });

        EXT.tabs.sendMessage(tab.id, {
          type: "NETWORK_LOGS_FROM_EXTENSION",
          payload: networkLogs
        });
      });
    });

    return;
  }

  // ---------- SCREENSHOT ----------
  if (msg.type === "CAPTURE_FULL") {
    EXT.tabs.captureVisibleTab({ format: "png" }, (image) => {
      sendResponse({ image });
    });
    return true;
  }
  if (msg.type === "START_RECORDING") {
     isRecording = true;
  }

   if (msg.type === "STOP_RECORDING") {
     isRecording = false;
   }
});
