import React, { useState, useEffect, useRef } from "react";

export default function UrlOpener() {
  const [url, setUrl] = useState("");
  const [browserName, setBrowserName] = useState("Browser");
  const [extensionAvailable, setExtensionAvailable] = useState(null);
  const repliedRef = useRef(false);
  const timerRef = useRef(null);
  const [recordedLogs, setRecordedLogs] = useState([]);

  useEffect(() => {
    function handleLogs(event) {
      if (event.data?.type === "SHOW_RECORDED_LOGS_UI") {
        setRecordedLogs(event.data.payload);
      }
    }
    window.addEventListener("message", handleLogs);
    return () => window.removeEventListener("message", handleLogs);
  }, []);

  useEffect(() => {
    const ua = navigator.userAgent;

    if (ua.includes("Edg")) setBrowserName("Edge");
    else if (ua.includes("Firefox")) setBrowserName("Firefox");
    else if (ua.includes("Chrome") && !ua.includes("OPR")) setBrowserName("Chrome");
    else setBrowserName("Unknown");
  }, []);

  useEffect(() => {
    const dummyLinks = {
      Chrome: "https://dummy-download.com/chrome",
      Edge: "https://dummy-download.com/edge",
      Firefox: "https://dummy-download.com/firefox",
      Unknown: "https://dummy-download.com/other",
    };

    function handleMessage(event) {
      if (event.data === "EXTENSION_INSTALLED") {
        repliedRef.current = true;
        clearTimeout(timerRef.current);
        setExtensionAvailable(true);
      }
    }

    window.addEventListener("message", handleMessage);

    setTimeout(() => {
      window.postMessage("CHECK_EXTENSION", "*");
    }, 100);
    timerRef.current = setTimeout(() => {
      if (!repliedRef.current) {
        setExtensionAvailable(false);
      }
    }, 800);

    return () => {
      clearTimeout(timerRef.current);
      window.removeEventListener("message", handleMessage);
    };
  }, [browserName]);

  if (extensionAvailable === null) return null;

  const dummyLinks = {
    Chrome: "https://dummy-download.com/chrome",
    Edge: "https://dummy-download.com/edge",
    Firefox: "https://dummy-download.com/firefox",
    Unknown: "https://dummy-download.com/other",
  };

  if (!extensionAvailable) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.title}>Extension Not Installed</h2>
          <p style={{ marginBottom: "20px", fontSize: "16px" }}>
            To use this feature, please install the extension.
          </p>

          <button
            onClick={() => (window.location.href = dummyLinks[browserName])}
            style={styles.button}
          >
            Download Extension
          </button>
        </div>
      </div>
    );
  }

  const sendToExtension = () => {
    if (!url.trim()) return;

    window.postMessage(
      {
        type: "OPEN_URL_FROM_UI",
        payload: url,
      },
      "*"
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Open URL using {browserName} Extension</h2>

        <input
          type="text"
          value={url}
          placeholder="Paste URL here..."
          onChange={(e) => setUrl(e.target.value)}
          style={styles.input}
        />

        <button onClick={sendToExtension} style={styles.button}>
          Open URL
        </button>

        {recordedLogs.length > 0 && (
          <div style={{ marginTop: "30px", textAlign: "left" }}>
            <h3>Recorded Steps:</h3>
            <pre
              style={{
                background: "#f4f4f4",
                padding: "10px",
                borderRadius: "10px",
                maxHeight: "300px",
                overflowY: "auto",
              }}
            >
              {JSON.stringify(recordedLogs, null, 2)}
            </pre>
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f0f2f5",
  },
  card: {
    background: "white",
    padding: "40px",
    width: "420px",
    borderRadius: "15px",
    boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
    textAlign: "center",
  },
  title: {
    marginBottom: "25px",
    fontSize: "22px",
    color: "#333",
    fontWeight: "600",
  },
  input: {
    width: "100%",
    padding: "12px 15px",
    borderRadius: "10px",
    border: "1px solid #ccc",
    fontSize: "15px",
    outline: "none",
    marginBottom: "20px",
  },
  button: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    background: "#007bff",
    color: "white",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
  },
};
