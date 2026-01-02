var EXT = window.EXT || (typeof browser !== "undefined" ? browser : chrome);
window.EXT = EXT;

function createReplayHUD(total) {
  const hud = document.createElement("div");
  hud.id = "ext-replay-hud";

  hud.style.position = "fixed";
  hud.style.top = "16px";
  hud.style.left = "50%";
  hud.style.transform = "translateX(-50%)";
  hud.style.display = "flex";
  hud.style.alignItems = "center";
  hud.style.gap = "10px";

  hud.style.background =
    "linear-gradient(135deg, rgba(0,0,0,0.88), rgba(30,30,30,0.88))";
  hud.style.color = "#ffffff";
  hud.style.padding = "10px 20px";
  hud.style.borderRadius = "12px";

  hud.style.fontSize = "14px";
  hud.style.fontWeight = "600";
  hud.style.fontFamily =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, Arial";

  hud.style.zIndex = "9999999999";
  hud.style.boxShadow =
    "0 10px 30px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)";
  hud.style.backdropFilter = "blur(8px)";
  hud.style.userSelect = "none";

  // 🔁 Icon
  const icon = document.createElement("span");
  icon.innerHTML = "⟳";
  icon.style.fontSize = "16px";
  icon.style.opacity = "0.9";

  // 📝 Text
  const text = document.createElement("span");
  text.id = "ext-replay-hud-text";
  text.innerText = `Replaying steps : 0 / ${total}`;

  hud.appendChild(icon);
  hud.appendChild(text);

  document.body.appendChild(hud);
  return hud;
}

let activeHighlightOverlay = null;

function highlightElement(el) {
  if (!el) return;

  try {
    // Remove any previous overlay
    if (activeHighlightOverlay) {
      activeHighlightOverlay.remove();
      activeHighlightOverlay = null;
    }

    el.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center"
    });

    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const overlay = document.createElement("div");
    overlay.className = "ext-highlight-overlay";

    overlay.style.position = "fixed";
    overlay.style.left = rect.left + "px";
    overlay.style.top = rect.top + "px";
    overlay.style.width = rect.width + "px";
    overlay.style.height = rect.height + "px";
    overlay.style.border = "3px solid #ff9f0a";
    overlay.style.borderRadius = "6px";
    overlay.style.boxShadow = "0 0 12px rgba(255,159,10,0.9)";
    overlay.style.zIndex = "9999999998";
    overlay.style.pointerEvents = "none";
    overlay.style.transition = "opacity 0.2s ease";

    document.body.appendChild(overlay);
    activeHighlightOverlay = overlay;

    // Safety cleanup (non-navigation cases)
    setTimeout(() => {
      if (activeHighlightOverlay === overlay) {
        overlay.style.opacity = "0";
        setTimeout(() => overlay.remove(), 200);
        activeHighlightOverlay = null;
      }
    }, 1200);
  } catch (e) {
    console.warn("Highlight failed", e);
  }
}


EXT.storage.local.get("AUTO_REPLAY_DATA", (res) => {
  const steps = res.AUTO_REPLAY_DATA;
  if (!Array.isArray(steps) || !steps.length) return;

  let index = 0;

  EXT.storage.local.get("AUTO_REPLAY_INDEX", res => {
    index = res.AUTO_REPLAY_INDEX || 0;
  });

  const hud = createReplayHUD(steps.length);

  function findElement(step) {
    return (
      document.querySelector(step.data.selector) ||
      document.evaluate(
        step.data.xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue
    );
  }

  function runStep() {
    if (index >= steps.length) {
      hud.innerText = "Replay completed ✅";
      setTimeout(() => hud.remove(), 2000);
      return;
    }

    const stepNumber = index + 1;
    const text = hud.querySelector("#ext-replay-hud-text");
    if (text) {
      text.innerText = `Replaying steps : ${stepNumber} / ${steps.length}`;
    }

    const step = steps[index++];
    EXT.storage.local.set({ AUTO_REPLAY_INDEX: index });
    let el;

    try {
      if (step.type === "click") {
        el = findElement(step);
        highlightElement(el);

        setTimeout(() => {
          // 🔥 Remove highlight BEFORE click
          if (activeHighlightOverlay) {
            activeHighlightOverlay.remove();
            activeHighlightOverlay = null;
          }
          el?.click();
        }, 300); // short visible delay
      }

      if (step.type === "input") {
        el = findElement(step);
        if (el) {
          highlightElement(el);
          el.focus();
          el.value = step.data.value;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }

      if (step.type === "scroll") {
        window.scrollTo({ top: step.data.position || 0 });
      }
    } catch (e) {
      console.warn("Replay failed:", step);
    }

    setTimeout(runStep, 1200);
  }

  // Initial delay for page readiness
  setTimeout(runStep, 1400);
});

