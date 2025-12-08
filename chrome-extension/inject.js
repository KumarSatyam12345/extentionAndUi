// Webpage context: cannot access chrome.runtime

window.addEventListener("message", (event) => {
  if (event.data.type === "OPEN_URL_FROM_UI") {
    window.postMessage(
      { type: "FOR_CONTENT", payload: event.data.payload },
      "*"
    );
  }
});


console.log("Inject script loaded");
