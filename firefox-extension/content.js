chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SHOW_HEADER") {
    addHeader();
  }
});

function addHeader() {
  const header = document.createElement("div");
  header.innerText = "This tab is opened using extension";
  header.style.background = "blue";
  header.style.padding = "10px";
  header.style.textAlign = "center";
  header.style.fontSize = "18px";
  header.style.fontWeight = "bold";
  header.style.position = "fixed";
  header.style.top = "0";
  header.style.left = "0";
  header.style.right = "0";
  header.style.zIndex = "999999";

  document.body.style.marginTop = "60px";
  document.body.prepend(header);
}

// existing cross-window forwarding stays
window.addEventListener("message", (event) => {
  if (event.data.type === "FOR_CONTENT") {
    chrome.runtime.sendMessage({
      type: "OPEN_URL",
      payload: event.data.payload
    });
  }
});
