const { test, expect } = require("./fixtures/extension");
const { setSettings } = require("./helpers/session");

// Exercise keyboardShortcuts.js + getShortcut.js paths.

test("setting shortcut prefs cycles through getShortcut paths", async ({ extensionPage }) => {
  test.setTimeout(45000);
  // These keys aren't real settings but the SettingsPage list includes
  // shortcut placeholders that fire through getShortcut. We at least
  // exercise storage write + onChange listener for these keys.
  await setSettings(extensionPage, {
    shortcut_saveAllWindow: "Ctrl+Shift+S",
    shortcut_saveCurrentWindow: "Ctrl+Shift+W"
  });
});
