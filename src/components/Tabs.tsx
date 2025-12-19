import React from "react";

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  recordedCount: number;
  consoleCount: number;
  networkCount: number;
  styles: any;
}

export default function Tabs({ activeTab, setActiveTab, recordedCount, consoleCount, networkCount, styles }: Props) {
  return (
    <div style={styles.tabs}>
      <button onClick={() => setActiveTab("recorded")} style={{ ...styles.tabButton, ...(activeTab === "recorded" ? styles.activeTab : {}) }}>
        RECORDED LOGS ({recordedCount})
      </button>
      <button onClick={() => setActiveTab("console")} style={{ ...styles.tabButton, ...(activeTab === "console" ? styles.activeTab : {}) }}>
        CONSOLE LOGS ({consoleCount})
      </button>
      <button onClick={() => setActiveTab("network")} style={{ ...styles.tabButton, ...(activeTab === "network" ? styles.activeTab : {}) }}>
        NETWORK LOGS ({networkCount})
      </button>
    </div>
  );
}
