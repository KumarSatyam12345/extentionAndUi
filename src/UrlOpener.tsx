import React, { useState, useEffect, useRef } from "react";
import ExtensionNotInstalled from "./components/ExtensionNotInstalled";
import RecordedLogs from "./components/RecordedLogs";
import ConsoleLogs from "./components/ConsoleLogs";
import NetworkLogs from "./components/NetworkLogs";
import Tabs from "./components/Tabs";
import { maskSensitive, normalizeArray, renderValue } from "./utils/utils";
import { RecordedLog } from "./components/RecordedLogs";
import { ConsoleLog } from "./components/ConsoleLogs";
import { NetworkLog } from "./components/NetworkLogs";

export default function UrlOpener() {
  const [url, setUrl] = useState("");
  const [browserName, setBrowserName] = useState("Browser");
  const [extensionAvailable, setExtensionAvailable] = useState<boolean | null>(null);
  const repliedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const [recordedLogs, setRecordedLogs] = useState<RecordedLog[]>([]);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [networkLogs, setNetworkLogs] = useState<NetworkLog[]>([]);
  const [activeTab, setActiveTab] = useState("recorded");

  const recordedCount = recordedLogs.length;
  const consoleCount = consoleLogs.length;
  const networkCount = networkLogs.length;

  useEffect(() => {
    function handleLogs(event: MessageEvent) {
      if (!event.data?.type) return;
      if (event.data.type === "SHOW_RECORDED_LOGS_UI") setRecordedLogs(normalizeArray(event.data.payload));
      if (event.data.type === "SHOW_CONSOLE_LOGS_UI") setConsoleLogs(normalizeArray(event.data.payload));
      if (event.data.type === "SHOW_NETWORK_LOGS_UI") setNetworkLogs(normalizeArray(event.data.payload));
    }
    window.addEventListener("message", handleLogs);
    return () => window.removeEventListener("message", handleLogs);
  }, []);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (ua.includes("Edg")) setBrowserName("Edge");
    else if (ua.includes("Firefox")) setBrowserName("Firefox");
    else if (ua.includes("Chrome")) setBrowserName("Chrome");
    else setBrowserName("Unknown");
  }, []);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data === "EXTENSION_INSTALLED") {
        repliedRef.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
        setExtensionAvailable(true);
      }
    }
    window.addEventListener("message", handleMessage);
    window.postMessage("CHECK_EXTENSION", "*");
    timerRef.current = window.setTimeout(() => {
      if (!repliedRef.current) setExtensionAvailable(false);
    }, 800);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("message", handleMessage);
    };
  }, [browserName]);

  if (extensionAvailable === null) return null;
  if (extensionAvailable === false) return <ExtensionNotInstalled browserName={browserName} />;

  const sendToExtension = () => {
    if (!url.trim()) return;
    window.postMessage({ type: "OPEN_URL_FROM_UI", payload: url }, "*");
  };

  const statusColor = (status?: number | string, error?: any) => {
    if (error) return "#dc3545";
    if (typeof status === "number") {
      if (status >= 200 && status < 300) return "#28a745";
      if (status >= 300 && status < 400) return "#17a2b8";
      if (status >= 400) return "#dc3545";
    }
    return "#6c757d";
  };

  const styles = {
    container: { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#f0f2f5" },
    card: { width: "900px", maxWidth: "95vw", background: "#fff", padding: "30px", borderRadius: "15px", boxShadow: "0 8px 25px rgba(0,0,0,0.1)" },
    title: { marginBottom: "20px" },
    input: { width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "8px", border: "1px solid #ccc" },
    button: { width: "100%", padding: "12px", background: "#007bff", color: "#fff", border: "none", borderRadius: "8px" },
    tabs: { display: "flex", gap: "10px", marginTop: "20px" },
    tabButton: { padding: "8px 16px", cursor: "pointer", border: "none" },
    activeTab: { background: "#007bff", color: "#fff" },
    logsBox: { marginTop: "15px", maxHeight: "420px", overflowY: "auto" }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Open URL using {browserName} Extension</h2>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste URL here" style={styles.input} />
        <button onClick={sendToExtension} style={styles.button}>Open URL</button>

        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} recordedCount={recordedCount} consoleCount={consoleCount} networkCount={networkCount} styles={styles} />

        <div style={styles.logsBox}>
          {activeTab === "recorded" && <RecordedLogs recordedLogs={recordedLogs} />}
          {activeTab === "console" && <ConsoleLogs consoleLogs={consoleLogs} />}
          {activeTab === "network" && <NetworkLogs networkLogs={networkLogs} statusColor={statusColor} />}
        </div>
      </div>
    </div>
  );
}
