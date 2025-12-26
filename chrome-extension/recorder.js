var EXT = window.EXT || (typeof browser !== "undefined" ? browser : chrome);
window.EXT = EXT;

/* ================= GLOBAL RECORDER STATE ================= */
if (!window.__RECORDER_STATE__) {
  window.__RECORDER_STATE__ = {
    isRecording: false,
    logs: [],
    lastInputValue: {}
  };
}

const state = window.__RECORDER_STATE__;

/* ================= HIGHLIGHT CONFIG ================= */
const HIGHLIGHT_COLOR = "rgba(255, 255, 0, 0.3)";
const BORDER_COLOR = "yellow";
const BORDER_WIDTH = 4;

/* ================= SCREENSHOT ================= */
function requestScreenshot(callback) {
  EXT.runtime.sendMessage({ type: "CAPTURE_FULL" }, callback);
}

function cropElementFromScreenshot(fullImgSrc, rect, callback) {
  const img = new Image();
  img.src = fullImgSrc;

  img.onload = () => {
    const dpr = window.devicePixelRatio || 1;

    const canvas = document.createElement("canvas");
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");

    ctx.drawImage(
      img,
      rect.left * dpr,
      rect.top * dpr,
      rect.width * dpr,
      rect.height * dpr,
      0,
      0,
      rect.width * dpr,
      rect.height * dpr
    );

    ctx.fillStyle = HIGHLIGHT_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = BORDER_WIDTH;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    callback(canvas.toDataURL("image/png"));
  };
}

/* ================= STABLE CAPTURE ================= */
function captureElementStable(target, done) {
  if (!target) return done(null);

  const rect = target.getBoundingClientRect();

  requestAnimationFrame(() => {
    setTimeout(() => {
      requestScreenshot((resp) => {
        if (!resp?.image) return done(null);
        cropElementFromScreenshot(resp.image, rect, done);
      });
    }, 40);
  });
}

/* ================= INPUT HANDLING ================= */
function isValidTextInput(target) {
  if (!target || target.tagName !== "INPUT") return false;

  return [
    "text",
    "email",
    "number",
    "search",
    "tel",
    "url",
    "password"
  ].includes(target.type);
}

function commitFinalInput(target) {
  if (!isValidTextInput(target)) return;

  const id = target.id || "unknown";
  const value = target.type === "password" ? "********" : target.value;

  if (state.lastInputValue[id] === value) return;
  state.lastInputValue[id] = value;

  captureElementStable(target, (screenshot) => {
    logEvent("input", {
      id,
      value,
      inputType: target.type,
      masked: target.type === "password",
      screenshotImage: screenshot
    });
  });
}

/* ================= LOG EVENT ================= */
function logEvent(type, data) {
  if (!state.isRecording) return;

  state.logs.push({
    time: new Date().toISOString(),
    type,
    data
  });
}

/* ================= EVENT LISTENERS ================= */
if (!window.__RECORDER_LISTENERS__) {
  window.__RECORDER_LISTENERS__ = true;

  // CLICK
  globalThis.addEventListener(
    "mousedown",
    (e) => {
      if (e.target.closest("#___toolbar_container")) return;

      commitFinalInput(document.activeElement);

      captureElementStable(e.target, (screenshot) => {
        logEvent("click", {
          text: e.target.innerText,
          id: e.target.id,
          class: e.target.className,
          screenshotImage: screenshot
        });
      });
    },
    true
  );

  // INPUT BLUR
  globalThis.addEventListener("blur", (e) => {
    commitFinalInput(e.target);
  }, true);

  // SCROLL
  let lastScrollTime = 0;
  window.addEventListener("scroll", () => {
    const now = Date.now();
    if (now - lastScrollTime < 200) return;
    lastScrollTime = now;

    logEvent("scroll", { position: window.scrollY });
  });

  // TAB KEY
  globalThis.addEventListener("keydown", (e) => {
    if (e.key === "Tab") commitFinalInput(document.activeElement);
  });
}

/* ================= START / STOP ================= */
globalThis.addEventListener("START_RECORDING", (e) => {
  const restore = e.detail?.restore === true;

  if (!restore) {
    state.logs.length = 0;
    state.lastInputValue = {};
  }

  state.isRecording = true;
});

globalThis.addEventListener("STOP_RECORDING", () => {
  state.isRecording = false;

  EXT.runtime.sendMessage({
    type: "RECORDING_DATA",
    payload: state.logs
  });
});
