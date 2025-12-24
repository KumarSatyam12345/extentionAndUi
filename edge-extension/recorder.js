var EXT = window.EXT || (typeof browser !== "undefined" ? browser : chrome);
window.EXT = EXT;


let isRecording = false;
let logs = [];

// Highlight Configuration
const HIGHLIGHT_COLOR = "rgba(255, 255, 0, 0.3)";
const BORDER_COLOR = "yellow";
const BORDER_WIDTH = 4;

// --------------------------------------
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

// 🔥 STABLE CAPTURE (INPUT + CLICK)
function captureElementStable(target, done) {
  if (!target) return done(null);

  const rect = target.getBoundingClientRect();

  requestAnimationFrame(() => {
    setTimeout(() => {
      requestScreenshot((resp) => {
        if (!resp?.image) return done(null);
        cropElementFromScreenshot(resp.image, rect, done);
      });
    }, 40); // Edge-safe delay
  });
}

// --------------------------------------
let lastInputValue = {};

// ✅ Only real text inputs
function isValidTextInput(target) {
  if (!target || target.tagName !== "INPUT") return false;

  const allowedTypes = [
    "text",
    "email",
    "number",
    "search",
    "tel",
    "url",
    "password"
  ];

  return allowedTypes.includes(target.type);
}

function commitFinalInput(target) {
  if (!isValidTextInput(target)) return;

  const id = target.id || "unknown";
  const value =
    target.type === "password"
      ? "********"
      : target.value;


  if (lastInputValue[id] === value) return;
  lastInputValue[id] = value;

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

// --------------------------------------
function logEvent(type, data) {
  if (!isRecording) return;
  logs.push({ time: new Date().toISOString(), type, data });
}

// --------------------------------------
// CLICK — BEFORE NAVIGATION
globalThis.addEventListener(
  "mousedown",
  (e) => {
    if (e.target.closest("#___toolbar_container")) return;

    commitFinalInput(document.activeElement);

    const target = e.target;

    captureElementStable(target, (screenshot) => {
      logEvent("click", {
        text: target.innerText,
        id: target.id,
        class: target.className,
        screenshotImage: screenshot
      });
    });
  },
  true // capture phase
);

// INPUT BLUR
globalThis.addEventListener("blur", (e) => {
  commitFinalInput(e.target);
}, true);

// --------------------------------------
// Scroll (THROTTLED ONLY)
let lastScrollTime = 0;
const SCROLL_THROTTLE_MS = 200;

window.addEventListener("scroll", () => {
  const now = Date.now();
  if (now - lastScrollTime < SCROLL_THROTTLE_MS) return;

  lastScrollTime = now;
  logEvent("scroll", { position: window.scrollY });
});

// Tab navigation
globalThis.addEventListener("keydown", (e) => {
  if (e.key === "Tab") commitFinalInput(document.activeElement);
});

// --------------------------------------
// Start / Stop Recording
globalThis.addEventListener("START_RECORDING", () => {
  logs = [];
  lastInputValue = {};
  isRecording = true;
});

globalThis.addEventListener("STOP_RECORDING", () => {
  isRecording = false;
  EXT.runtime.sendMessage({
    type: "RECORDING_DATA",
    payload: logs
  });
});
