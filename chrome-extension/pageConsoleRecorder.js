(function () {
  if (window.__EXT_CONSOLE_HOOKED__) return;
  window.__EXT_CONSOLE_HOOKED__ = true;

  const methods = ["log", "warn", "error", "info", "debug"];

  methods.forEach(method => {
    const original = console[method];

    console[method] = function (...args) {
      try {
        window.postMessage({
          source: "EXT_PAGE",
          type: "CONSOLE_LOG",
          payload: {
            level: method,
            message: args.map(a =>
              typeof a === "object" ? JSON.stringify(a) : String(a)
            ).join(" "),
            timestamp: new Date().toISOString()
          }
        }, "*");
      } catch (e) {}

      original.apply(console, args);
    };
  });
})();
