import React from "react";

interface Props {
  browserName: string;
}

const downloadLinks: Record<string, string> = {
  Chrome: "http://localhost:8080/api/zip/download/chrome-extension.zip",
  Edge: "http://localhost:8080/api/zip/download/edge-extension.zip",
  Firefox: "http://localhost:8080/api/zip/download/firefox-extension.zip"
};

export default function ExtensionNotInstalled({ browserName }: Props) {
  return (
    <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#f0f2f5" }}>
      <div style={{ width: "420px", textAlign: "center", background: "#fff", padding: "30px", borderRadius: "15px", boxShadow: "0 8px 25px rgba(0,0,0,0.1)" }}>
        <h2 style={{ marginBottom: "20px" }}>Extension Not Installed</h2>
        <p style={{ marginBottom: "20px" }}>To use this feature, please install the browser extension.</p>
        <button
          style={{ width: "100%", padding: "12px", background: "#007bff", color: "#fff", border: "none", borderRadius: "8px" }}
          onClick={() => {
            const url = downloadLinks[browserName];
            if (!url) return alert("Unsupported browser");
            window.location.href = url;
          }}
        >
          Download Extension
        </button>
      </div>
    </div>
  );
}
