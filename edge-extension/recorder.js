const EXT = typeof browser !== "undefined" ? browser : chrome;

let isRecording = false;
let logs = [];

const HIGHLIGHT_COLOR = "rgba(255, 255, 0, 0.3)";
const BORDER_COLOR = "yellow";
const BORDER_WIDTH = 4;

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

function captureElement(target, done) {
  if (!target) return done(null);

  const rect = target.getBoundingClientRect();

  requestScreenshot((resp) => {
    if (!resp?.image) return done(null);
    cropElementFromScreenshot(resp.image, rect, done);
  });
}

let lastInputValue = {};

function commitFinalInput(target) {
  if (!target || target.tagName !== "INPUT") return;
  if (target.type === "password") return;

  const id = target.id || "unknown";
  const value = target.value;

  if (lastInputValue[id] === value) return;
  lastInputValue[id] = value;

  captureElement(target, (screenshot) => {
    logEvent("input", {
      id,
      value,
      screenshotImage: screenshot
    });
  });
}

function logEvent(type, data) {
  if (!isRecording) return;
  logs.push({ time: new Date().toISOString(), type, data });
}

globalThis.addEventListener(
  "mousedown",
  (e) => {
    if (e.target.closest("#___toolbar_container")) return;

    commitFinalInput(document.activeElement);

    const target = e.target;

    captureElement(target, (screenshot) => {
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

globalThis.addEventListener("blur", (e) => commitFinalInput(e.target), true);

let lastScrollTime = 0;
const SCROLL_THROTTLE_MS = 200;

window.addEventListener("scroll", () => {
  const now = Date.now();
  if (now - lastScrollTime < SCROLL_THROTTLE_MS) return;

  lastScrollTime = now;
  logEvent("scroll", { position: window.scrollY });
});

globalThis.addEventListener("keydown", (e) => {
  if (e.key === "Tab") commitFinalInput(document.activeElement);
});

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
