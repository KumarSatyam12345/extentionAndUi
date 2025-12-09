// 1) Detect extension installation
window.addEventListener("message", (event) => {
  if (event.data === "CHECK_EXTENSION") {
    window.postMessage("EXTENSION_INSTALLED", "*");
    return;
  }

  // UI wants to open URL
  if (event.data && event.data.type === "OPEN_URL_FROM_UI") {
    chrome.runtime.sendMessage({
      type: "OPEN_URL",
      payload: event.data.payload
    });
  }
});

// 2) Background tells this tab to inject header
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SHOW_HEADER") {
    injectHeader();
  }
});

// 3) Header injection
function injectHeader() {
  if (document.getElementById("ext-header")) return;

  const header = document.createElement("div");
  header.id = "ext-header";
  header.innerText = "This tab was opened using the extension";
  header.style.position = "fixed";
  header.style.top = "0";
  header.style.left = "0";
  header.style.right = "0";
  header.style.padding = "10px";
  header.style.background = "blue";
  header.style.color = "white";
  header.style.textAlign = "center";
  header.style.fontSize = "18px";
  header.style.zIndex = "999999";

  document.body.style.marginTop = "60px";
  document.body.prepend(header);
}
