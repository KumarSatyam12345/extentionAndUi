chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "OPEN_URL") {
    chrome.tabs.create({ url: msg.payload }, (tab) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === "complete") {
          chrome.tabs.sendMessage(tab.id, { type: "SHOW_HEADER" });
          chrome.tabs.onUpdated.removeListener(listener);
        }
      });
    });
  }
});
