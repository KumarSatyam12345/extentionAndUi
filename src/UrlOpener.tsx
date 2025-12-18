import React, { useState, useEffect, useRef } from "react";

const SENSITIVE_KEYS = [
  "password",
  "pass",
  "pwd",
  "pin",
  "otp",
  "secret",
  "token",
  "authorization",
  "auth"
];

/* ================= MASK FUNCTION ================= */
function maskSensitive(data) {
  if (!data || typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map(maskSensitive);
  }

  const masked = {};
  for (const key in data) {
    if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
      masked[key] = "******";
    } else if (typeof data[key] === "object") {
      masked[key] = maskSensitive(data[key]);
    } else {
      masked[key] = data[key];
    }
  }
  return masked;
}

/* ================= SAFE HELPERS ================= */
const normalizeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") return [data];
  return [];
};

const renderValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    return JSON.stringify(maskSensitive(value), null, 2);
  }
  return String(value);
};

export default function UrlOpener() {
  const [url, setUrl] = useState("");
  const [browserName, setBrowserName] = useState("Browser");
  const [extensionAvailable, setExtensionAvailable] = useState(null);
  const repliedRef = useRef(false);
  const timerRef = useRef(null);

  const [recordedLogs, setRecordedLogs] = useState([]);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [networkLogs, setNetworkLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("recorded");

  /* ================= COUNTS ================= */
  const recordedCount = recordedLogs.length;
  const consoleCount = consoleLogs.length;
  const networkCount = networkLogs.length;

  /* ================= LISTEN EXTENSION EVENTS ================= */
  useEffect(() => {
    function handleLogs(event) {
      if (!event.data?.type) return;

      if (event.data.type === "SHOW_RECORDED_LOGS_UI") {
        setRecordedLogs(normalizeArray(event.data.payload));
      }

      if (event.data.type === "SHOW_CONSOLE_LOGS_UI") {
        setConsoleLogs(normalizeArray(event.data.payload));
      }

      if (event.data.type === "SHOW_NETWORK_LOGS_UI") {
        setNetworkLogs(normalizeArray(event.data.payload));
      }
    }

    window.addEventListener("message", handleLogs);
    return () => window.removeEventListener("message", handleLogs);
  }, []);

  /* ================= DETECT BROWSER ================= */
  useEffect(() => {
    const ua = navigator.userAgent;
    if (ua.includes("Edg")) setBrowserName("Edge");
    else if (ua.includes("Firefox")) setBrowserName("Firefox");
    else if (ua.includes("Chrome")) setBrowserName("Chrome");
    else setBrowserName("Unknown");
  }, []);

  /* ================= CHECK EXTENSION ================= */
  useEffect(() => {
    function handleMessage(event) {
      if (event.data === "EXTENSION_INSTALLED") {
        repliedRef.current = true;
        clearTimeout(timerRef.current);
        setExtensionAvailable(true);
      }
    }

    window.addEventListener("message", handleMessage);
    window.postMessage("CHECK_EXTENSION", "*");

    timerRef.current = setTimeout(() => {
      if (!repliedRef.current) setExtensionAvailable(false);
    }, 800);

    return () => {
      clearTimeout(timerRef.current);
      window.removeEventListener("message", handleMessage);
    };
  }, [browserName]);

  if (extensionAvailable === null) return null;

  const sendToExtension = () => {
    if (!url.trim()) return;
    window.postMessage({ type: "OPEN_URL_FROM_UI", payload: url }, "*");
  };

  /* ================= HELPERS ================= */
  const statusColor = (status, error) => {
    if (error) return "#dc3545";
    if (status >= 200 && status < 300) return "#28a745";
    if (status >= 300 && status < 400) return "#17a2b8";
    if (status >= 400) return "#dc3545";
    return "#6c757d";
  };

  const Section = ({ title, data }) => {
    if (!data || Object.keys(data).length === 0) return null;
    return (
      <details style={{ marginTop: "8px" }}>
        <summary style={{ cursor: "pointer", fontWeight: "600" }}>
          {title}
        </summary>
        <pre style={styles.pre}>
          {JSON.stringify(maskSensitive(data), null, 2)}
        </pre>
      </details>
    );
  };

  const Empty = ({ text }) => (
    <div style={{ textAlign: "center", color: "#666", padding: "20px" }}>
      {text}
    </div>
  );

  /* ================= NETWORK LOG UI ================= */
  const NetworkLogs = () =>
    networkLogs.length === 0 ? (
      <Empty text="No network calls captured yet" />
    ) : (
      networkLogs.map((log, i) => (
        <div
          key={i}
          style={{
            ...styles.logCard,
            borderLeft: `5px solid ${statusColor(log.status, log.error)}`
          }}
        >
          <div style={styles.row}>
            <strong>{renderValue(log.method)}</strong>
            <span style={{ color: statusColor(log.status, log.error) }}>
              {renderValue(log.status || "FAILED")}{" "}
              {renderValue(log.statusText)}
            </span>
          </div>

          <div style={styles.url}>{renderValue(log.url)}</div>

          <div style={styles.meta}>
            <span>Time: {renderValue(log.time)}</span>
            {log.duration && (
              <span> | Duration: {renderValue(log.duration)} ms</span>
            )}
          </div>

          {log.error && (
            <div style={styles.error}>
              ❌ Error: {renderValue(log.error)}
            </div>
          )}

          <Section title="Request Headers" data={log.requestHeaders} />
          <Section title="Response Headers" data={log.responseHeaders} />
        </div>
      ))
    );

  /* ================= UI ================= */
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Open URL using {browserName} Extension</h2>

        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste URL here"
          style={styles.input}
        />

        <button onClick={sendToExtension} style={styles.button}>
          Open URL
        </button>

        {/* ===== TABS ===== */}
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab("recorded")}
            style={{
              ...styles.tabButton,
              ...(activeTab === "recorded" ? styles.activeTab : {})
            }}
          >
            RECORDED LOGS ({recordedCount})
          </button>

          <button
            onClick={() => setActiveTab("console")}
            style={{
              ...styles.tabButton,
              ...(activeTab === "console" ? styles.activeTab : {})
            }}
          >
            CONSOLE LOGS ({consoleCount})
          </button>

          <button
            onClick={() => setActiveTab("network")}
            style={{
              ...styles.tabButton,
              ...(activeTab === "network" ? styles.activeTab : {})
            }}
          >
            NETWORK LOGS ({networkCount})
          </button>
        </div>

        {/* ===== LOGS ===== */}
        <div style={styles.logsBox}>
          {activeTab === "recorded" &&
            (recordedLogs.length === 0 ? (
              <Empty text="No recorded steps yet" />
            ) : (
              recordedLogs.map((log, i) => (
                <div key={i} style={styles.logCard}>
                  <strong>{renderValue(log.type)}</strong>
                  <div style={styles.meta}>{renderValue(log.time)}</div>

                  <pre style={styles.pre}>
                    {JSON.stringify(
                      maskSensitive(
                        (() => {
                          const clean = { ...log.data };
                          delete clean.screenshotImage;
                          return clean;
                        })()
                      ),
                      null,
                      2
                    )}
                  </pre>

                  {log.data?.screenshotImage && (
                    <img
                      src={log.data.screenshotImage}
                      alt="step"
                      style={{
                        maxWidth: "100%",
                        marginTop: "8px",
                        borderRadius: "6px",
                        border: "1px solid #ccc"
                      }}
                    />
                  )}
                </div>
              ))
            ))}

          {activeTab === "console" &&
            (consoleLogs.length === 0 ? (
              <Empty text="No console logs yet" />
            ) : (
              consoleLogs.map((log, i) => (
                <div key={i} style={styles.logCard}>
                  <strong>{renderValue(log.level)}</strong>
                  <pre style={styles.pre}>
                    {renderValue(log.message ?? log.payload ?? log)}
                  </pre>
                </div>
              ))
            ))}

          {activeTab === "network" && <NetworkLogs />}
        </div>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f0f2f5"
  },
  card: {
    width: "900px",
    maxWidth: "95vw",
    background: "#fff",
    padding: "30px",
    borderRadius: "15px",
    boxShadow: "0 8px 25px rgba(0,0,0,0.1)"
  },
  title: { marginBottom: "20px" },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc"
  },
  button: {
    width: "100%",
    padding: "12px",
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "8px"
  },
  tabs: { display: "flex", gap: "10px", marginTop: "20px" },
  tabButton: { padding: "8px 16px", cursor: "pointer", border: "none" },
  activeTab: { background: "#007bff", color: "#fff" },
  logsBox: {
    marginTop: "15px",
    maxHeight: "420px",
    overflowY: "auto"
  },
  logCard: {
    background: "#fff",
    padding: "12px",
    marginBottom: "12px",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
  },
  row: { display: "flex", justifyContent: "space-between" },
  url: { fontSize: "12px", marginTop: "6px", wordBreak: "break-all" },
  meta: { fontSize: "11px", color: "#666", marginTop: "4px" },
  error: { marginTop: "6px", color: "#dc3545", fontWeight: "600" },
  pre: {
    background: "#f4f4f4",
    padding: "8px",
    fontSize: "12px",
    borderRadius: "6px"
  }
};
