let isRecording = false;
let logs = [];

// ---------- THROTTLE FUNCTION ----------
function throttle(fn, delay) {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
}

function logEvent(type, data) {
  if (!isRecording) return;
  logs.push({ time: new Date().toISOString(), type, data });
}

window.addEventListener("click", (e) => {
  logEvent("click", {
    text: e.target.innerText,
    id: e.target.id,
    class: e.target.className
  });
});

window.addEventListener("input", (e) => {
  logEvent("input", {
    id: e.target.id,
    value: e.target.value
  });
});

// ---------- THROTTLED SCROLL LISTENER ----------
const throttledScroll = throttle(() => {
  logEvent("scroll", {
    position: window.scrollY
  });
}, 200); // 200ms throttle

window.addEventListener("scroll", throttledScroll);

// ----------------------------------------------

window.addEventListener("START_RECORDING", () => {
  logs = [];
  isRecording = true;
});

window.addEventListener("STOP_RECORDING", () => {
  isRecording = false;

  chrome.runtime.sendMessage({
    type: "RECORDING_DATA",
    payload: logs
  });
});
