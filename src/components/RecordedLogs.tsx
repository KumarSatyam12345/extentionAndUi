import React from "react";
import { maskSensitive, renderValue } from "../utils/utils";

export interface RecordedLog {
  type: string;
  time: string;
  data: any;
}

interface Props {
  recordedLogs: RecordedLog[];
}

export default function RecordedLogs({ recordedLogs }: Props) {
  if (!recordedLogs.length) return <div style={{ textAlign: "center", color: "#666", padding: "20px" }}>No recorded steps yet</div>;

  return (
    <>
      {recordedLogs.map((log, i) => (
        <div key={i} style={{ background: "#fff", padding: "12px", marginBottom: "12px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <strong>{renderValue(log.type)}</strong>
          <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>{renderValue(log.time)}</div>
          <pre style={{ background: "#f4f4f4", padding: "8px", fontSize: "12px", borderRadius: "6px" }}>
            {JSON.stringify(maskSensitive({ ...log.data, screenshotImage: undefined }), null, 2)}
          </pre>
          {log.data?.screenshotImage && (
            <img src={log.data.screenshotImage} alt="step" style={{ maxWidth: "100%", marginTop: "8px", borderRadius: "6px", border: "1px solid #ccc" }} />
          )}
        </div>
      ))}
    </>
  );
}
