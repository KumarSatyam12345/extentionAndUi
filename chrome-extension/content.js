var EXT = window.EXT || (typeof browser !== "undefined" ? browser : chrome);
window.EXT = EXT;

let LAST_RECORDED_STEPS = [];
let LAST_RECORDED_URL = null;
function initExtensionUI() {
  addHeader();
  injectToolbarContainer();
  injectPageConsoleRecorder();

  EXT.runtime.sendMessage({ type: "REQUEST_LOGS" }, (res) => {
    if (!res) return;

    if (Array.isArray(res.recordedSteps)) {
      LAST_RECORDED_STEPS = res.recordedSteps;

      window.postMessage({
        type: "SHOW_RECORDED_LOGS_UI",
        payload: res.recordedSteps
      }, "*");
    }

    if (Array.isArray(res.consoleLogs)) {
      window.postMessage({
        type: "SHOW_CONSOLE_LOGS_UI",
        payload: res.consoleLogs
      }, "*");
    }

    if (Array.isArray(res.networkLogs)) {
      window.postMessage({
        type: "SHOW_NETWORK_LOGS_UI",
        payload: res.networkLogs
      }, "*");
    }

    if (res.isRecording) {
      window.dispatchEvent(new CustomEvent("START_RECORDING", {
        detail: { restore: true }
      }));
    }
  });
}

/* ================= PAGE → EXTENSION ================= */
window.addEventListener("message", event => {
  if (event.source !== window) return;

  // Check extension
  if (event.data === "CHECK_EXTENSION") {
    EXT.runtime.sendMessage({ type: "CHECK_EXTENSION" }, res => {
      if (res?.installed) {
        window.postMessage("EXTENSION_INSTALLED", "*");
      }
    });
  }

  // Open URL
  if (event.data?.type === "OPEN_URL_FROM_UI") {
    LAST_RECORDED_URL = event.data.payload;
    LAST_RECORDED_STEPS = []
    EXT.runtime.sendMessage({
      type: "OPEN_URL",
      payload: event.data.payload
    });
  }
  if (event.data?.type === "UI_REPLAY_CLICKED") {
    window.dispatchEvent(new CustomEvent("REPLAY_CLICKED"));
  }

  // Console logs from page script
  if (
    event.data?.source === "EXT_PAGE" &&
    event.data.type === "CONSOLE_LOG"
  ) {
    EXT.runtime.sendMessage({
      type: "CONSOLE_LOG_FROM_PAGE",
      payload: event.data.payload
    });
  }
});

/* ================= EXTENSION → PAGE ================= */
EXT.runtime.onMessage.addListener((msg) => {
  if (!msg?.type) return;

  switch (msg.type) {

    case "INIT_EXTENSION_UI":
      initExtensionUI();
      break;

    case "SHOW_HEADER":
      addHeader();
      break;

    case "INJECT_RECORDER_BUTTON":
      injectToolbarContainer();
      break;

    case "RESTORE_UI_STATE":
      if (msg.payload?.isRecording) {
        window.dispatchEvent(
          new CustomEvent("START_RECORDING", {
            detail: { restore: true }
          })
        );
      }
      break;

    case "INJECT_PAGE_CONSOLE_RECORDER":
      injectPageConsoleRecorder();
      break;

    // ✅ REQUIRED: console logs from background
    case "CONSOLE_LOGS_FROM_EXTENSION":
      window.postMessage(
        {
          type: "SHOW_CONSOLE_LOGS_UI",
          payload: msg.payload
        },
        "*"
      );
      break;

    // ✅ REQUIRED: network logs from background
    case "NETWORK_LOGS_FROM_EXTENSION":
      window.postMessage(
        {
          type: "SHOW_NETWORK_LOGS_UI",
          payload: msg.payload
        },
        "*"
      );
      break;

    // ✅ OPTIONAL but recommended (recorded steps)
    case "RECORDING_DATA_FROM_EXTENSION":
      LAST_RECORDED_STEPS = msg.payload;

      // ✅ Only set URL if it is NOT already set by UI
      if (!LAST_RECORDED_URL) {
        LAST_RECORDED_URL = location.href;
      }

      console.log("Replay URL resolved as:", LAST_RECORDED_URL);

      window.postMessage(
        {
          type: "SHOW_RECORDED_LOGS_UI",
          payload: msg.payload
        },
        "*"
      );
      break;

    case "FORCE_STOP_RECORDING":
      window.dispatchEvent(new CustomEvent("STOP_RECORDING", {
        detail: { forced: true }
      }));
      break;

    case "FORCE_START_RECORDING":
      window.dispatchEvent(new CustomEvent("START_RECORDING", {
        detail: { forced: true }
      }));
      break;


  }
});


// ================== HEADER ==================
function addHeader() {
  const oldHeader = document.getElementById("ext-header-banner");
  if (oldHeader) oldHeader.remove();

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

  cancelBtn.onclick = () => {
    header.remove();
    document.body.style.marginTop = "0";
  };

  header.appendChild(cancelBtn);
  document.body.style.marginTop = "60px";
  document.body.prepend(header);

  setTimeout(() => {
    if (document.getElementById("ext-header-banner")) {
      header.remove();
      document.body.style.marginTop = "0";
    }
  }, 3000);
}

// ================== TOOLBAR ==================
function injectToolbarContainer() {
  if (document.getElementById("___toolbar_container")) return;

  const container = document.createElement("div");
  container.id = "___toolbar_container";

  container.style.position = "fixed";
  container.style.top = "90px";
  container.style.right = "40px";
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.gap = "10px";
  container.style.padding = "6px 10px";
  container.style.borderRadius = "10px";
  container.style.background = "rgba(255,255,255,0.70)";
  container.style.backdropFilter = "blur(10px)";
  container.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
  container.style.cursor = "grab";
  container.style.zIndex = "99999999999";

  document.body.appendChild(container);

  // Drag handle
  const dragHandle = document.createElement("div");
  dragHandle.innerHTML = `
    <svg width="16" height="22" viewBox="0 0 24 24" fill="#555">
      <circle cx="7" cy="5" r="2"/>
      <circle cx="7" cy="12" r="2"/>
      <circle cx="7" cy="19" r="2"/>
      <circle cx="14" cy="5" r="2"/>
      <circle cx="14" cy="12" r="2"/>
      <circle cx="14" cy="19" r="2"/>
    </svg>`;
  dragHandle.style.pointerEvents = "none";
  container.appendChild(dragHandle);
  const recorderWrapper = document.createElement("div");
  recorderWrapper.style.position = "relative";
  recorderWrapper.style.display = "flex";
  recorderWrapper.style.justifyContent = "center";

  const recorderBtn = document.createElement("div");
  recorderBtn.style.width = "42px";
  recorderBtn.style.height = "42px";
  recorderBtn.style.borderRadius = "50%";
  recorderBtn.style.background = "#e9e9ec";
  recorderBtn.style.display = "flex";
  recorderBtn.style.justifyContent = "center";
  recorderBtn.style.alignItems = "center";
  recorderBtn.style.cursor = "pointer";
  recorderBtn.style.boxShadow = "0 3px 6px rgba(0,0,0,0.15)";
  recorderBtn.style.transition = "transform 0.15s ease";
  recorderBtn.dataset.rec = "true";


  const recInner = document.createElement("div");
  recInner.style.width = "20px";
  recInner.style.height = "20px";
  recInner.style.borderRadius = "5px";
  recInner.style.background = "#ff1a28";
  recorderBtn.appendChild(recInner);

  // LABEL
  const recLabel = document.createElement("div");
  recLabel.innerText = "Record";
  recLabel.style.position = "absolute";
  recLabel.style.top = "48px";
  recLabel.style.fontSize = "11px";
  recLabel.style.fontWeight = "600";
  recLabel.style.color = "#333";
  recLabel.style.opacity = "0";
  recLabel.style.transition = "opacity 0.2s ease";

  recorderWrapper.appendChild(recorderBtn);
  recorderWrapper.appendChild(recLabel);
  container.appendChild(recorderWrapper);

  recorderBtn.onmouseenter = () => {
    recorderBtn.style.transform = "scale(1.08)";
    recLabel.style.opacity = "1";
  };
  recorderBtn.onmouseleave = () => {
    recorderBtn.style.transform = "scale(1)";
    recLabel.style.opacity = "0";
  };

  recorderBtn.onclick = toggleRecording;

  function toggleRecording() {
    if (recorderBtn.dataset.state === "recording") {
      recorderBtn.dataset.state = "stopped";
      recInner.style.background = "#ff1a28";
      recInner.style.borderRadius = "5px";
      recLabel.innerText = "Record";

      EXT.runtime.sendMessage({ type: "STOP_RECORDING" });
      window.dispatchEvent(new CustomEvent("STOP_RECORDING"));
    } else {
      recorderBtn.dataset.state = "recording";
      recInner.style.background = "#34c759";
      recInner.style.borderRadius = "4px";
      recLabel.innerText = "Recording...";

      EXT.runtime.sendMessage({ type: "START_RECORDING" });
      window.dispatchEvent(new CustomEvent("START_RECORDING"));
    }
  }
  const replayWrapper = document.createElement("div");
  replayWrapper.style.position = "relative";
  replayWrapper.style.display = "flex";
  replayWrapper.style.justifyContent = "center";

  const replayBtn = document.createElement("div");
  replayBtn.style.width = "42px";
  replayBtn.style.height = "42px";
  replayBtn.style.borderRadius = "50%";
  replayBtn.style.background = "rgba(255, 159, 10, 0.85)";
  replayBtn.style.display = "flex";
  replayBtn.style.justifyContent = "center";
  replayBtn.style.alignItems = "center";
  replayBtn.style.cursor = "pointer";
  replayBtn.style.boxShadow =
    "0 3px 8px rgba(0,0,0,0.25), inset 0 0 6px rgba(255,255,255,0.3)";
  replayBtn.style.transition = "transform 0.15s ease";

  replayBtn.innerHTML = `
      <svg width="20" height="20" fill="white" viewBox="0 0 24 24" style="pointer-events:none;">
        <path d="M12 5V2L5 8l7 6V9a5 5 0 1 1-5 5H5c0 4 3 7 7 7s7-3 7-7-3-7-7-7z"/>
      </svg>
  `;

  // LABEL
  const replayLabel = document.createElement("div");
  replayLabel.innerText = "Replay";
  replayLabel.style.position = "absolute";
  replayLabel.style.top = "48px";
  replayLabel.style.fontSize = "11px";
  replayLabel.style.fontWeight = "600";
  replayLabel.style.color = "#333";
  replayLabel.style.opacity = "0";
  replayLabel.style.transition = "opacity 0.2s ease";

  replayWrapper.appendChild(replayBtn);
  replayWrapper.appendChild(replayLabel);
  container.appendChild(replayWrapper);

  replayBtn.onmouseenter = () => {
    replayBtn.style.transform = "scale(1.08)";
    replayLabel.style.opacity = "1";
  };
  replayBtn.onmouseleave = () => {
    replayBtn.style.transform = "scale(1)";
    replayLabel.style.opacity = "0";
  };

  replayBtn.onclick = () => {
    window.dispatchEvent(new CustomEvent("REPLAY_CLICKED"));
  };

  // ====================================================
  // DRAG LOGIC
  // ====================================================
  let isDown = false;
  let offsetX = 0;
  let offsetY = 0;

  container.addEventListener("mousedown", (e) => {
    isDown = true;
    container.style.cursor = "grabbing";
    offsetX = e.clientX - container.offsetLeft;
    offsetY = e.clientY - container.offsetTop;
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDown) return;

    let x = e.clientX - offsetX;
    let y = e.clientY - offsetY;

    x = Math.max(0, Math.min(x, window.innerWidth - container.offsetWidth));
    y = Math.max(0, Math.min(y, window.innerHeight - container.offsetHeight));

    container.style.left = `${x}px`;
    container.style.top = `${y}px`;
    container.style.right = "auto";
  });

  document.addEventListener("mouseup", () => {
    isDown = false;
    container.style.cursor = "grab";
  });
}

function injectPageConsoleRecorder() {
  if (document.getElementById("ext-page-console-recorder")) return;

  const script = document.createElement("script");
  script.id = "ext-page-console-recorder";
  script.src = chrome.runtime.getURL("pageConsoleRecorder.js");
  script.onload = () => script.remove();

  (document.head || document.documentElement).appendChild(script);
}

window.addEventListener("REPLAY_CLICKED", () => {
  if (!Array.isArray(LAST_RECORDED_STEPS) || !LAST_RECORDED_STEPS.length) {
    console.warn("No recorded steps to replay");
    showReplayWarning("No recorded steps to replay");
    return;
  }

  EXT.runtime.sendMessage({
    type: "REPLAY_IN_NEW_TAB",
    payload: {
      steps: LAST_RECORDED_STEPS,
      url: LAST_RECORDED_URL
    }
  });
});

function showReplayWarning(message) {
  // Remove existing toast if any
  const oldToast = document.getElementById("ext-replay-toast");
  if (oldToast) oldToast.remove();

  const toast = document.createElement("div");
  toast.id = "ext-replay-toast";
  toast.innerText = message;

  toast.style.position = "fixed";
  toast.style.top = "30px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";

  toast.style.background = "#ff3b30"; // red warning
  toast.style.color = "#fff";
  toast.style.padding = "12px 18px";
  toast.style.borderRadius = "8px";
  toast.style.fontSize = "14px";
  toast.style.fontWeight = "600";
  toast.style.boxShadow = "0 6px 18px rgba(0,0,0,0.25)";
  toast.style.zIndex = "999999999";
  toast.style.opacity = "0";
  toast.style.transition = "opacity 0.25s ease, transform 0.25s ease";

  document.body.appendChild(toast);

  // fade + slide in
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";
  });

  // auto remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(-10px)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

window.addEventListener("START_RECORDING", () => {
  const btn = document.querySelector("#___toolbar_container div[data-rec]");
  if (btn) btn.dataset.state = "recording";
});

window.addEventListener("STOP_RECORDING", () => {
  const btn = document.querySelector("#___toolbar_container div[data-rec]");
  if (btn) btn.dataset.state = "stopped";
});

