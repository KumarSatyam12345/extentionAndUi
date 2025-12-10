window.addEventListener("message", (event) => {
  if (event.data === "CHECK_EXTENSION") {
    chrome.runtime.sendMessage({ type: "CHECK_EXTENSION" }, (res) => {
      if (res?.installed) {
        window.postMessage("EXTENSION_INSTALLED", "*");
      }
    });
  }

  if (event.data.type === "OPEN_URL_FROM_UI") {
    chrome.runtime.sendMessage({
      type: "OPEN_URL",
      payload: event.data.payload
    });
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SHOW_HEADER") {
    addHeader();
  }

  if (msg.type === "INJECT_RECORDER_BUTTON") {
    injectRecorderButton();
  }

  if (msg.type === "RECORDING_DATA_FROM_EXTENSION") {
    window.postMessage(
      { type: "SHOW_RECORDED_LOGS_UI", payload: msg.payload },
      "*"
    );
  }
});

// Existing header function unchanged
function addHeader() {
  // Remove previous header if already exists
  const oldHeader = document.getElementById("ext-header-banner");
  if (oldHeader) oldHeader.remove();

  // Create header container
  const header = document.createElement("div");
  header.id = "ext-header-banner";
  header.innerText = "This tab is opened using extension";

  header.style.background = "blue";
  header.style.padding = "10px 50px 10px 10px";
  header.style.textAlign = "center";
  header.style.fontSize = "18px";
  header.style.fontWeight = "bold";
  header.style.position = "fixed";
  header.style.top = "0";
  header.style.left = "0";
  header.style.right = "0";
  header.style.zIndex = "999999";
  header.style.color = "white";

  // Add cancel button
  const cancelBtn = document.createElement("span");
  cancelBtn.innerText = "✖";
  cancelBtn.style.position = "absolute";
  cancelBtn.style.right = "15px";
  cancelBtn.style.top = "50%";
  cancelBtn.style.transform = "translateY(-50%)";
  cancelBtn.style.cursor = "pointer";
  cancelBtn.style.fontSize = "18px";
  cancelBtn.style.fontWeight = "bold";
  cancelBtn.style.color = "white";

  // Cancel button click → remove header instantly
  cancelBtn.onclick = () => {
    header.remove();
    document.body.style.marginTop = "0";
  };

  header.appendChild(cancelBtn);
  document.body.style.marginTop = "60px";
  document.body.prepend(header);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (document.getElementById("ext-header-banner")) {
      header.remove();
      document.body.style.marginTop = "0";
    }
  }, 3000);
}


// NEW: inject record/stop button
function injectRecorderButton() {
  if (document.getElementById("___recorder_btn")) return;

  const btn = document.createElement("button");
  btn.id = "___recorder_btn";
  btn.innerText = "Start Recording";
  btn.style.position = "fixed";
  btn.style.bottom = "20px";
  btn.style.right = "20px";
  btn.style.padding = "12px 20px";
  btn.style.background = "red";
  btn.style.color = "white";
  btn.style.border = "none";
  btn.style.borderRadius = "8px";
  btn.style.zIndex = "99999999999";
  btn.style.cursor = "pointer";

  document.body.appendChild(btn);

  btn.onclick = () => {
    if (btn.innerText === "Start Recording") {
      window.dispatchEvent(new CustomEvent("START_RECORDING"));
      btn.innerText = "Stop Recording";
      btn.style.background = "green";
    } else {
      window.dispatchEvent(new CustomEvent("STOP_RECORDING"));
      btn.innerText = "Start Recording";
      btn.style.background = "red";
    }
  };
}
