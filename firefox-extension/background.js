// Cross-browser support
const API = typeof browser !== "undefined" ? browser : chrome;

API.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "OPEN_URL") {
    const finalURL = msg.payload.includes("?")
      ? msg.payload + "&openedByExtension=true"
      : msg.payload + "?openedByExtension=true";

    API.tabs.create({ url: finalURL });
  }
});
