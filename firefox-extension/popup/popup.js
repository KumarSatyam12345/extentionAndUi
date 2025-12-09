const API = typeof browser !== "undefined" ? browser : chrome;

document.getElementById("openBtn").addEventListener("click", () => {
  const url = document.getElementById("urlInput").value.trim();
  if (url) {
    API.runtime.sendMessage({ type: "OPEN_URL", payload: url });
  }
});

console.log("Popup loaded");
