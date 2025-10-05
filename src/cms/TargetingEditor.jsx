// src/cms/TargetingEditor.jsx
import React from "react";
import { AVAILABLE_COUNTRIES, AVAILABLE_DEVICES } from "./targeting.js";

export default function TargetingEditor({ targeting, onChange, disabled = false }) {
  const updateTargeting = (patch) => {
    onChange({ ...targeting, ...patch });
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.section}>Targeting</div>
      
      {/* Device targeting */}
      <div style={styles.field}>
        <label style={styles.label}>Device</label>
        <div style={styles.checkboxGroup}>
          {AVAILABLE_DEVICES.map((device) => (
            <label key={device} style={styles.checkbox}>
              <input
                type="checkbox"
                checked={targeting.devices?.includes(device) || false}
                onChange={(e) => {
                  const devices = targeting.devices || [];
                  const updated = e.target.checked
                    ? [...devices, device]
                    : devices.filter(d => d !== device);
                  updateTargeting({ devices: updated });
                }}
                disabled={disabled}
              />
              <span style={styles.checkboxLabel}>{device}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Country targeting */}
      <div style={styles.field}>
        <label style={styles.label}>Countries</label>
        <div style={styles.checkboxGroup}>
          {AVAILABLE_COUNTRIES.map((country) => (
            <label key={country} style={styles.checkbox}>
              <input
                type="checkbox"
                checked={targeting.countries?.includes(country) || false}
                onChange={(e) => {
                  const countries = targeting.countries || [];
                  const updated = e.target.checked
                    ? [...countries, country]
                    : countries.filter(c => c !== country);
                  updateTargeting({ countries: updated });
                }}
                disabled={disabled}
              />
              <span style={styles.checkboxLabel}>{country}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Segment targeting */}
      <div style={styles.field}>
        <label style={styles.label}>Segment ID</label>
        <input
          type="text"
          value={targeting.segment || ""}
          onChange={(e) => updateTargeting({ segment: e.target.value || null })}
          placeholder="e.g. campaign_123"
          style={styles.input}
          disabled={disabled}
        />
        <div style={styles.help}>Campaign or segment identifier from external system</div>
      </div>

      {/* Internal only flag */}
      <div style={styles.field}>
        <label style={styles.checkbox}>
          <input
            type="checkbox"
            checked={targeting.internal_only || false}
            onChange={(e) => updateTargeting({ internal_only: e.target.checked })}
            disabled={disabled}
          />
          <span style={styles.checkboxLabel}>Internal only</span>
        </label>
        <div style={styles.help}>Only visible to internal users</div>
      </div>

      {/* Player IDs */}
      <div style={styles.field}>
        <label style={styles.label}>Specific Player IDs</label>
        <textarea
          value={(targeting.player_ids || []).join("\n")}
          onChange={(e) => {
            const ids = e.target.value
              .split("\n")
              .map(id => id.trim())
              .filter(id => id.length > 0);
            updateTargeting({ player_ids: ids });
          }}
          placeholder="player_123&#10;player_456&#10;player_789"
          style={styles.textarea}
          rows={4}
          disabled={disabled}
        />
        <div style={styles.help}>One player ID per line. Leave empty for no player-specific targeting.</div>
      </div>
    </div>
  );
}

const styles = {
  wrap: { marginTop: 16 },
  section: {
    marginBottom: 12,
    fontSize: 12,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  field: { marginBottom: 16 },
  label: { 
    display: "block",
    fontSize: 12, 
    color: "#374151", 
    fontWeight: 600,
    marginBottom: 6,
  },
  input: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    background: "white",
    width: "100%",
  },
  textarea: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    background: "white",
    width: "100%",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 12,
  },
  checkboxGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
  },
  checkbox: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 14,
    color: "#111827",
    cursor: "pointer",
  },
  checkboxLabel: {
    fontSize: 14,
  },
  help: { 
    fontSize: 12, 
    color: "#6b7280",
    marginTop: 4,
  },
};