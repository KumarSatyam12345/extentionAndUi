import React from "react";
import { maskSensitive, renderValue } from "../utils/utils";

export interface NetworkLog {
  id: string;
  url: string;
  method: string;
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  responseHeaders?: Record<string, string>;
  status?: number | string;
  statusText?: string;
  duration?: string;
  time?: string;
  type?: string;
  error?: any;
}

interface Props {
  networkLogs: NetworkLog[];
  statusColor: (status?: number | string, error?: any) => string;
}

export default function NetworkLogs({ networkLogs, statusColor }: Props) {
  if (!networkLogs.length) return <div style={{ textAlign: "center", color: "#666", padding: "20px" }}>No network calls captured yet</div>;

  return (
    <>
      {networkLogs.map((log, i) => (
        <div key={i} style={{
          background: "#fff",
          padding: "12px",
          marginBottom: "12px",
          borderRadius: "8px",
          borderLeft: `5px solid ${statusColor(log.status, log.error)}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{renderValue(log.method)}</strong>
            <span style={{ color: statusColor(log.status, log.error) }}>
              {renderValue(log.status || "FAILED")} {renderValue(log.statusText)}
            </span>
          </div>
          <div style={{ fontSize: "12px", marginTop: "6px", wordBreak: "break-all" }}>{renderValue(log.url)}</div>
          <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>
            <span>Time: {renderValue(log.time)}</span>
            {log.duration && <span> | Duration: {renderValue(log.duration)} ms</span>}
          </div>
          {log.error && <div style={{ marginTop: "6px", color: "#dc3545", fontWeight: "600" }}>❌ Error: {renderValue(log.error)}</div>}

          <details style={{ marginTop: "8px" }}>
            <summary style={{ cursor: "pointer", fontWeight: "600" }}>Request Headers</summary>
            <pre style={{ background: "#f4f4f4", padding: "8px", fontSize: "12px", borderRadius: "6px" }}>
              {JSON.stringify(maskSensitive(log.requestHeaders), null, 2)}
            </pre>
          </details>
          <details style={{ marginTop: "8px" }}>
            <summary style={{ cursor: "pointer", fontWeight: "600" }}>Response Headers</summary>
            <pre style={{ background: "#f4f4f4", padding: "8px", fontSize: "12px", borderRadius: "6px" }}>
              {JSON.stringify(maskSensitive(log.responseHeaders), null, 2)}
            </pre>
          </details>
        </div>
      ))}
    </>
  );
}
