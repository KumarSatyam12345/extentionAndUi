// Cross-browser API
const API = typeof browser !== "undefined" ? browser : chrome;

// Add header if tab opened by extension
if (window.location.search.includes("openedByExtension=true")) {
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
  document.body.appendChild(header);
}

// Listen for messages from popup or UI
window.addEventListener("message", (event) => {
  if (event.data.type === "OPEN_URL_FROM_UI") {
    API.runtime.sendMessage({
      type: "OPEN_URL",
      payload: event.data.payload
    });
  }
});

console.log("Content script loaded");
