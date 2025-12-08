import React, { useState } from "react";

export default function UrlOpener() {
  const [url, setUrl] = useState("");

  const sendToExtension = () => {
    if (!url.trim()) return;

    window.postMessage(
      {
        type: "OPEN_URL_FROM_UI",
        payload: url
      },
      "*"
    );
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Open URL using Chrome Extension</h2>

      <input
        type="text"
        value={url}
        placeholder="Paste URL"
        onChange={(e) => setUrl(e.target.value)}
        style={{ padding: "10px", width: "300px" }}
      />

      <button
        onClick={sendToExtension}
        style={{ padding: "10px 15px", marginLeft: "10px" }}
      >
        Open
      </button>
    </div>
  );
}
