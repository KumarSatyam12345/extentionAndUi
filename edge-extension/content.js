// ===========================
// Listen from React UI
// ===========================
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

// ===========================
// Listen from Service Worker
// ===========================
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SHOW_HEADER") {
    addHeader();
  }

  if (msg.type === "INJECT_RECORDER_BUTTON") {
    injectRecorderButton();
    injectReplayButton();
  }

  if (msg.type === "RECORDING_DATA_FROM_EXTENSION") {
    window.postMessage(
      { type: "SHOW_RECORDED_LOGS_UI", payload: msg.payload },
      "*"
    );
  }
});

// ===========================
// HEADER BANNER (UNCHANGED)
// ===========================
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

// ======================================
// DRAGGABLE RECORDING BUTTON (ICON)
// ======================================
function injectRecorderButton() {
  if (document.getElementById("___recorder_btn")) return;

  const btn = document.createElement("div");
  btn.id = "___recorder_btn";

  btn.style.position = "fixed";
  btn.style.top = "80px";  // BELOW HEADER (60px + 20px padding)
  btn.style.right = "20px";
  btn.style.width = "60px";
  btn.style.height = "60px";
  btn.style.borderRadius = "50%";
  btn.style.background = "red";
  btn.style.display = "flex";
  btn.style.justifyContent = "center";
  btn.style.alignItems = "center";
  btn.style.cursor = "grab";
  btn.style.zIndex = "999999999999";
  btn.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";

  btn.innerHTML = `<img src="https://cdn-icons-png.flaticon.com/512/727/727245.png"
                    width="30" height="30" style="pointer-events:none;" />`;

  document.body.appendChild(btn);

  let isDown = false;
  let startX = 0, startY = 0;
  let offsetX = 0, offsetY = 0;
  let hasMoved = false;

  const MIN_X = 0;
  const MIN_Y = 60;   // PREVENT GOING BEHIND HEADER

  // DRAG START
  btn.addEventListener("mousedown", (e) => {
    isDown = true;
    hasMoved = false;
    btn.style.cursor = "grabbing";

    startX = e.clientX;
    startY = e.clientY;

    offsetX = e.clientX - btn.getBoundingClientRect().left;
    offsetY = e.clientY - btn.getBoundingClientRect().top;
  });

  // DRAG MOVE
  document.addEventListener("mousemove", (e) => {
    if (!isDown) return;

    const dx = Math.abs(e.clientX - startX);
    const dy = Math.abs(e.clientY - startY);

    if (dx > 5 || dy > 5) hasMoved = true;

    if (hasMoved) {
      let newLeft = e.clientX - offsetX;
      let newTop = e.clientY - offsetY;

      // BOUNDARY LIMITS
      const maxX = window.innerWidth - btn.offsetWidth;
      const maxY = window.innerHeight - btn.offsetHeight;

      if (newLeft < MIN_X) newLeft = MIN_X;
      if (newTop < MIN_Y) newTop = MIN_Y; // prevent overlap with header
      if (newLeft > maxX) newLeft = maxX;
      if (newTop > maxY) newTop = maxY;

      btn.style.left = newLeft + "px";
      btn.style.top = newTop + "px";
      btn.style.right = "auto";
      btn.style.bottom = "auto";
    }
  });

  // DRAG END
  document.addEventListener("mouseup", () => {
    if (!isDown) return;
    isDown = false;
    btn.style.cursor = "grab";

    if (!hasMoved) toggleRecording(btn);
  });

  // Toggle Start/Stop Recording
  function toggleRecording(btn) {
    if (btn.dataset.state !== "recording") {
      btn.dataset.state = "recording";
      window.dispatchEvent(new CustomEvent("START_RECORDING"));

      btn.style.background = "green";
      btn.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="white" style="pointer-events:none;">
          <rect x="7" y="7" width="10" height="10" rx="2"/>
        </svg>
      `;

    } else {
      btn.dataset.state = "stopped";
      window.dispatchEvent(new CustomEvent("STOP_RECORDING"));

      btn.style.background = "red";
      btn.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="white" style="pointer-events:none;">
          <circle cx="12" cy="12" r="8"/>
        </svg>
      `;

    }
  }
}

// ======================================
// DRAGGABLE REPLAY BUTTON (DUMMY)
// ======================================
function injectReplayButton() {
  if (document.getElementById("___replay_btn")) return;

  const btn = document.createElement("div");
  btn.id = "___replay_btn";

  btn.style.position = "fixed";
  btn.style.top = "80px";
  btn.style.right = "100px";   // placed left of recorder button
  btn.style.width = "60px";
  btn.style.height = "60px";
  btn.style.borderRadius = "50%";
  btn.style.background = "orange";
  btn.style.display = "flex";
  btn.style.justifyContent = "center";
  btn.style.alignItems = "center";
  btn.style.cursor = "grab";
  btn.style.zIndex = "999999999999";
  btn.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";

  btn.innerHTML = `
    <svg width="32" height="32" viewBox="0 0 24 24" fill="white" style="pointer-events:none;">
      <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6a6 6 0 1 1-12 0H4a8 8 0 1 0 16 0c0-4.42-3.58-8-8-8z"/>
    </svg>
  `;

  document.body.appendChild(btn);

  let isDown = false;
  let startX = 0, startY = 0;
  let offsetX = 0, offsetY = 0;
  let hasMoved = false;

  const MIN_X = 0;
  const MIN_Y = 60;

  // DRAG START
  btn.addEventListener("mousedown", (e) => {
    isDown = true;
    hasMoved = false;
    btn.style.cursor = "grabbing";

    startX = e.clientX;
    startY = e.clientY;

    offsetX = e.clientX - btn.getBoundingClientRect().left;
    offsetY = e.clientY - btn.getBoundingClientRect().top;
  });

  // DRAG MOVE
  document.addEventListener("mousemove", (e) => {
    if (!isDown) return;

    const dx = Math.abs(e.clientX - startX);
    const dy = Math.abs(e.clientY - startY);
    if (dx > 5 || dy > 5) hasMoved = true;

    if (hasMoved) {
      let newLeft = e.clientX - offsetX;
      let newTop = e.clientY - offsetY;

      // BOUNDARIES
      const maxX = window.innerWidth - btn.offsetWidth;
      const maxY = window.innerHeight - btn.offsetHeight;

      if (newLeft < MIN_X) newLeft = MIN_X;
      if (newTop < MIN_Y) newTop = MIN_Y;
      if (newLeft > maxX) newLeft = maxX;
      if (newTop > maxY) newTop = maxY;

      btn.style.left = newLeft + "px";
      btn.style.top = newTop + "px";
      btn.style.right = "auto";
      btn.style.bottom = "auto";
    }
  });

  // DRAG END
  document.addEventListener("mouseup", () => {
    if (!isDown) return;
    isDown = false;
    btn.style.cursor = "grab";

    if (!hasMoved) {
      console.log("Replay Clicked!");
      window.dispatchEvent(new CustomEvent("REPLAY_CLICKED"));
    }
  });
}

