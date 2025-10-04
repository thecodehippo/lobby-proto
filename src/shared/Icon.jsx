import React from "react";
import * as Icons from "lucide-react";

// Convert "gamepad2", "gamepad-2", "gamepad 2" → "Gamepad2"
function pascalize(name = "") {
  return name
    .trim()
    .replace(/[-_\s]+/g, " ")
    .split(" ")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

export default function Icon({
  name,
  size = 16,
  strokeWidth = 2,
  style,
  ...rest
}) {
  if (!name) return null;
  const key = pascalize(name);
  const Cmp = Icons[key];
  if (!Cmp) {
    // graceful fallback if key not found
    return (
      <span
        title={`Unknown icon: ${name}`}
        style={{ display: "inline-block", width: size, height: size, ...style }}
        aria-hidden="true"
      >
        ▢
      </span>
    );
  }
  return <Cmp size={size} strokeWidth={strokeWidth} style={style} {...rest} />;
}
