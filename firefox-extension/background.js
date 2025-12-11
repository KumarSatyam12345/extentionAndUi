chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "CHECK_EXTENSION") {
    sendResponse({ installed: true });
  }

  if (msg.type === "OPEN_URL") {
    chrome.tabs.create({ url: msg.payload }, (tab) => {
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
      });
    });
  }

  // ================================
  // 🔥 FIREFOX FIX FOR SCREENSHOT
  // ================================
  if (msg.type === "CAPTURE_FULL") {
    chrome.tabs.captureVisibleTab({ format: "png" }, (image) => {

      // Firefox sometimes returns pure base64 without MIME
      if (image && !image.startsWith("data:image/png;base64,")) {
        image = "data:image/png;base64," + image;
      }

      sendResponse({ image });
    });
    return true;
  }

  if (msg.type === "CAPTURE_SCREENSHOT") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {

      // Firefox FIX
      if (dataUrl && !dataUrl.startsWith("data:image/png;base64,")) {
        dataUrl = "data:image/png;base64," + dataUrl;
      }

      sendResponse({ screenshot: dataUrl });
    });
    return true;
  }
});
