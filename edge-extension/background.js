chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "OPEN_URL") {
    chrome.tabs.create({ url: msg.payload }, (tab) => {

      // Wait for the tab to finish loading before sending message
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === "complete") {

          chrome.tabs.sendMessage(tab.id, { type: "SHOW_HEADER" });

          // Remove the listener so it does not run for every update
          chrome.tabs.onUpdated.removeListener(listener);
        }
      });

    });
  }
});
