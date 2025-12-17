window.addEventListener("message", (event) => {
  if (event.data === "CHECK_EXTENSION") {
    try {
      browser.runtime.sendMessage({ type: "CHECK_EXTENSION" }).then((res) => {
        if (res?.installed) {
          window.postMessage("EXTENSION_INSTALLED", "*");
        }
      }).catch((err) => {});
    } catch (err) {}
  }

  if (event.data?.type === "OPEN_URL_FROM_UI") {
    try {
      browser.runtime.sendMessage({
        type: "OPEN_URL",
        payload: event.data.payload
      }).catch((err) => {});
    } catch (err) {}
  }
});
browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SHOW_HEADER") {
    addHeader();
  }

  if (msg.type === "INJECT_RECORDER_BUTTON") {
    injectToolbarContainer();
  }

  if (msg.type === "RECORDING_DATA_FROM_EXTENSION") {
    window.postMessage(
      { type: "SHOW_RECORDED_LOGS_UI", payload: msg.payload },
      "*"
    );
  }
});

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

  // ⋮⋮ DRAG HANDLE
  const dragHandle = document.createElement("div");
  dragHandle.innerHTML = `
      <svg width="16" height="22" viewBox="0 0 24 24" fill="#555">
        <circle cx="7" cy="5" r="2"/>
        <circle cx="7" cy="12" r="2"/>
        <circle cx="7" cy="19" r="2"/>
        <circle cx="14" cy="5" r="2"/>
        <circle cx="14" cy="12" r="2"/>
        <circle cx="14" cy="19" r="2"/>
      </svg>
  `;
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
    if (recorderBtn.dataset.state !== "recording") {
      recorderBtn.dataset.state = "recording";
      recInner.style.background = "#34c759";
      recInner.style.borderRadius = "4px";
      recLabel.innerText = "Recording...";
      window.dispatchEvent(new CustomEvent("START_RECORDING"));
    } else {
      recorderBtn.dataset.state = "stopped";
      recInner.style.background = "#ff1a28";
      recInner.style.borderRadius = "5px";
      recLabel.innerText = "Record";
      window.dispatchEvent(new CustomEvent("STOP_RECORDING"));
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
