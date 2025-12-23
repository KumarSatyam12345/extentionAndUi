// ================== PAGE CONTEXT ONLY ==================
(function () {
  if (window.__EXT_PAGE_CONSOLE__) return;
  window.__EXT_PAGE_CONSOLE__ = true;

  /* ================== CONSOLE ================== */
  ["log", "warn", "error", "info", "debug"].forEach(level => {
    const original = console[level];

    console[level] = function (...args) {
      try {
        window.postMessage({
          source: "EXT_PAGE",
          type: "CONSOLE_LOG",
          payload: {
            level,
            message: args.map(a => {
              try {
                return typeof a === "object"
                  ? JSON.stringify(a)
                  : String(a);
              } catch {
                return "[Unserializable]";
              }
            }).join(" "),
            timestamp: new Date().toISOString()
          }
        }, "*");
      } catch {}

      original.apply(console, args);
    };
  });

  /* ================== JS ERRORS ================== */
  window.addEventListener("error", (event) => {
    let message = event.message || "Resource load error";

    if (!event.message && event.target?.src) {
      message = `Failed to load resource: ${event.target.src}`;
    }

    window.postMessage({
      source: "EXT_PAGE",
      type: "CONSOLE_LOG",
      payload: {
        level: "error",
        message,
        sourceFile: event.filename || event.target?.src || "",
        line: event.lineno || null,
        column: event.colno || null,
        timestamp: new Date().toISOString()
      }
    }, "*");
  }, true);

  /* ================== PROMISE ERRORS ================== */
  window.addEventListener("unhandledrejection", (event) => {
    window.postMessage({
      source: "EXT_PAGE",
      type: "CONSOLE_LOG",
      payload: {
        level: "error",
        message:
          event.reason?.message ||
          String(event.reason) ||
          "Unhandled promise rejection",
        timestamp: new Date().toISOString()
      }
    }, "*");
  });

})();
