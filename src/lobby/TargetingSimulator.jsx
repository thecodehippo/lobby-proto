// src/lobby/TargetingSimulator.jsx
import React from "react";
import { useTargeting } from "./TargetingContext.jsx";
import { AVAILABLE_COUNTRIES, AVAILABLE_DEVICES } from "../cms/targeting.js";

export default function TargetingSimulator() {
  const { device, country, segment, isInternal, playerId, updateTargeting } = useTargeting();

  return (
    <div style={styles.panel}>
      <div style={styles.title}>Targeting Simulator</div>
      <div style={styles.controls}>
        <div style={styles.control}>
          <label style={styles.label}>Device:</label>
          <select
            value={device}
            onChange={(e) => updateTargeting({ device: e.target.value })}
            style={styles.select}
          >
            {AVAILABLE_DEVICES.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div style={styles.control}>
          <label style={styles.label}>Country:</label>
          <select
            value={country}
            onChange={(e) => updateTargeting({ country: e.target.value })}
            style={styles.select}
          >
            {AVAILABLE_COUNTRIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div style={styles.control}>
          <label style={styles.label}>Segment:</label>
          <input
            type="text"
            value={segment || ""}
            onChange={(e) => updateTargeting({ segment: e.target.value || null })}
            placeholder="campaign_123"
            style={styles.input}
          />
        </div>

        <div style={styles.control}>
          <label style={styles.checkbox}>
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => updateTargeting({ isInternal: e.target.checked })}
            />
            Internal User
          </label>
        </div>

        <div style={styles.control}>
          <label style={styles.label}>Player ID:</label>
          <input
            type="text"
            value={playerId || ""}
            onChange={(e) => updateTargeting({ playerId: e.target.value || null })}
            placeholder="player_123"
            style={styles.input}
          />
        </div>
      </div>
    </div>
  );
}

const styles = {
  panel: {
    background: "#f3f4f6",
    borderBottom: "2px solid #e5e7eb",
    padding: "8px 16px",
  },
  title: {
    fontSize: 12,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 8,
  },
  controls: {
    display: "flex",
    gap: 16,
    alignItems: "center",
    flexWrap: "wrap",
  },
  control: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: 500,
  },
  select: {
    padding: "4px 6px",
    border: "1px solid #d1d5db",
    borderRadius: 4,
    background: "#fff",
    fontSize: 12,
  },
  input: {
    padding: "4px 6px",
    border: "1px solid #d1d5db",
    borderRadius: 4,
    background: "#fff",
    fontSize: 12,
    width: 100,
  },
  checkbox: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    color: "#6b7280",
    cursor: "pointer",
  },
};