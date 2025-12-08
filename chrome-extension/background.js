chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "OPEN_URL") {
    chrome.tabs.create({
      url: msg.payload,
      active: true
    });
  }
});
