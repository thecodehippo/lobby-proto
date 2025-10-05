// src/lobby/TargetingContext.jsx
import React, { createContext, useContext, useState } from "react";

const TargetingContext = createContext(null);

export function TargetingProvider({ children }) {
  const [targetingContext, setTargetingContext] = useState({
    device: detectDevice(),
    country: "UK",
    segment: null,
    isInternal: false,
    playerId: null,
  });

  const updateTargeting = (updates) => {
    setTargetingContext(prev => ({ ...prev, ...updates }));
  };

  return (
    <TargetingContext.Provider value={{ ...targetingContext, updateTargeting }}>
      {children}
    </TargetingContext.Provider>
  );
}

export function useTargeting() {
  return useContext(TargetingContext);
}

function detectDevice() {
  if (typeof window !== "undefined") {
    return window.innerWidth < 768 ? "mobile" : "desktop";
  }
  return "desktop";
}