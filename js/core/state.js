// state.js
// Holds global shared state exactly as your original code did

export let PRESETS = [];
export let chart = null;

// providerCount must be mutable, so we wrap it in an object
export const providerCountRef = { value: 0 };