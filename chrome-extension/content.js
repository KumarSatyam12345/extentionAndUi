// ----------------------------------------------------------
// 1) SHOW TOP HEADER IF TAB WAS OPENED BY EXTENSION
// ----------------------------------------------------------
if (window.location.search.includes("openedByExtension=true")) {
  const header = document.createElement("div");
  header.innerText = "This tab is opened using extension";
  header.style.background = "blue";
  header.style.color = "white";
  header.style.padding = "10px";
  header.style.textAlign = "center";
  header.style.fontSize = "18px";
  header.style.fontWeight = "bold";
  header.style.position = "fixed";
  header.style.top = "0";
  header.style.left = "0";
  header.style.right = "0";
  header.style.zIndex = "999999";

  // Move the page content down so header does not cover it
  document.body.style.marginTop = "60px";

  document.body.appendChild(header);
}

// ----------------------------------------------------------
// 2) INJECT inject.js INTO THE WEBPAGE
// ----------------------------------------------------------
const script = document.createElement("script");
script.src = chrome.runtime.getURL("inject.js");
(document.head || document.documentElement).appendChild(script);

// ----------------------------------------------------------
// 3) LISTEN FOR MESSAGES FROM inject.js AND FORWARD TO BACKGROUND
// ----------------------------------------------------------
window.addEventListener("message", (event) => {
  if (event.data.type === "FOR_CONTENT") {
    chrome.runtime.sendMessage({
      type: "OPEN_URL",
      payload: event.data.payload
    });
  }
});
