var EXT = window.EXT || (typeof browser !== "undefined" ? browser : chrome);
window.EXT = EXT;

EXT.storage.local.get("AUTO_REPLAY_DATA", (res) => {
  const steps = res.AUTO_REPLAY_DATA;
  if (!Array.isArray(steps) || !steps.length) return;

//  EXT.storage.local.remove("AUTO_REPLAY_DATA");

  let index = 0;

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
    if (index >= steps.length) return;

    const step = steps[index++];

    try {
      if (step.type === "click") {
        findElement(step)?.click();
      }

      if (step.type === "input") {
          const el = findElement(step);
          if (el) {
              el.focus();
              el.value = step.data.value; // now uses real password
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

    setTimeout(runStep, 800); // Step delay
  }

  setTimeout(runStep, 1200); // Initial page load delay
});
