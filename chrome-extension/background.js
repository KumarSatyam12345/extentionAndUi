chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "OPEN_URL") {
    const finalURL = msg.payload.includes("?")
      ? msg.payload + "&openedByExtension=true"
      : msg.payload + "?openedByExtension=true";

    chrome.tabs.create({ url: finalURL });
  }
});
