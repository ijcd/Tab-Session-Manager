// Shared constants for the harness.

const BRIDGE_PORT = 38291;
const BRIDGE_URL = `http://127.0.0.1:${BRIDGE_PORT}/`;

// Settle delays after writes that fan out through async listeners
// (storage.onChanged → handleSettingsChange, browser.runtime.sendMessage
// fire-and-forget, IndexedDB put, etc.). Names denote intent, not a
// wall-clock budget — actual values are picked to be long enough for the
// average headless run.
const SETTLE = {
  SHORT: 200,
  MEDIUM: 500,
  LONG: 1500,
  EXTRA: 3000
};

module.exports = { BRIDGE_PORT, BRIDGE_URL, SETTLE };
