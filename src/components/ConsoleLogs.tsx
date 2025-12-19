import React from "react";
import { renderValue } from "../utils/utils";

export interface ConsoleLog {
  level: string;
  message?: string;
  payload?: any;
}

interface Props {
  consoleLogs: ConsoleLog[];
}

export default function ConsoleLogs({ consoleLogs }: Props) {
  if (!consoleLogs.length) return <div style={{ textAlign: "center", color: "#666", padding: "20px" }}>No console logs yet</div>;

  return (
    <>
      {consoleLogs.map((log, i) => (
        <div key={i} style={{ background: "#fff", padding: "12px", marginBottom: "12px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <strong>{renderValue(log.level)}</strong>
          <pre style={{ background: "#f4f4f4", padding: "8px", fontSize: "12px", borderRadius: "6px" }}>
            {renderValue(log.message ?? log.payload ?? log)}
          </pre>
        </div>
      ))}
    </>
  );
}
