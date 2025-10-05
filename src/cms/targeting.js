// src/cms/targeting.js

export const AVAILABLE_COUNTRIES = [
  "UK",
  "Ireland", 
  "Austria",
  "Canada",
  "Ontario",
  "France"
];

export const AVAILABLE_DEVICES = [
  "mobile",
  "desktop"
];

export function evaluateTargeting(targeting, context) {
  if (!targeting) return true;
  
  // Device check
  if (targeting.devices?.length && context.device) {
    if (!targeting.devices.includes(context.device)) return false;
  }
  
  // Country check
  if (targeting.countries?.length && context.country) {
    if (!targeting.countries.includes(context.country)) return false;
  }
  
  // Segment check
  if (targeting.segment && context.segment !== targeting.segment) {
    return false;
  }
  
  // Internal only check
  if (targeting.internal_only && !context.isInternal) {
    return false;
  }
  
  // Player ID check
  if (targeting.player_ids?.length && context.playerId) {
    if (!targeting.player_ids.includes(context.playerId)) return false;
  }
  
  return true;
}