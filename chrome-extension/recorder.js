var EXT = window.EXT || (typeof browser !== "undefined" ? browser : chrome);
window.EXT = EXT;


let isRecording = false;
let logs = [];

// Highlight Configuration
const HIGHLIGHT_COLOR = "rgba(255, 255, 0, 0.3)";
const BORDER_COLOR = "yellow";
const BORDER_WIDTH = 4;

function getXPath(element) {
  if (element.id) return `//*[@id="${element.id}"]`;

  const parts = [];
  while (element && element.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling = element.previousSibling;
    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE &&
          sibling.nodeName === element.nodeName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }
    parts.unshift(`${element.nodeName.toLowerCase()}[${index}]`);
    element = element.parentNode;
  }
  return "/" + parts.join("/");
}

function getSelector(el) {
  if (el.id) return `#${el.id}`;
  if (el.name) return `[name="${el.name}"]`;
  if (el.classList.length)
    return "." + [...el.classList].join(".");
  return el.tagName.toLowerCase();
}

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
  const realValue = target.value; // store real value for replay
  const maskedValue =
    target.type === "password" ? "********" : realValue;

  if (lastInputValue[id] === realValue) return;
  lastInputValue[id] = realValue;

  captureElementStable(target, (screenshot) => {
    logEvent("input", {
      selector: getSelector(target),
      xpath: getXPath(target),
      value: realValue,          // store actual value
      maskedValue,               // optional, for UI only
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

function observeAutoFilledInputs() {
  const inputs = document.querySelectorAll("input");

  inputs.forEach((input) => {
    if (input._observed) return; // skip if already observed
    input._observed = true;

    // Observe value changes (mutation observer for autofill)
    const observer = new MutationObserver(() => commitFinalInput(input));
    observer.observe(input, { attributes: true, attributeFilter: ["value"] });

    // Listen to input events too
    input.addEventListener("input", () => commitFinalInput(input));

    // Polling fallback (some browsers autofill without events)
    const pollInterval = setInterval(() => {
      const id = input.id || input.name || "unknown";
      if (input.value && lastInputValue[id] !== input.value) {
        commitFinalInput(input);
      }
    }, 300);

    // Stop polling if input removed from DOM
    const removalObserver = new MutationObserver(() => {
      if (!document.body.contains(input)) {
        clearInterval(pollInterval);
        removalObserver.disconnect();
      }
    });
    removalObserver.observe(document.body, { childList: true, subtree: true });
  });
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
        selector: getSelector(target),
        xpath: getXPath(target),
        text: target.innerText,
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
globalThis.addEventListener("START_RECORDING", (e) => {
  const isRestore = e.detail?.restore === true;

  if (!isRestore) {
    logs = [];
    lastInputValue = {};
  }

  isRecording = true;
  observeAutoFilledInputs();
});

globalThis.addEventListener("STOP_RECORDING", () => {
  isRecording = false;
  EXT.runtime.sendMessage({
    type: "RECORDING_DATA",
    payload: logs
  });
});
