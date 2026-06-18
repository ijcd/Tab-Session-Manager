const { test, expect } = require("./fixtures/extension");
const { setSettings, sendMessage } = require("./helpers/session");

// Exercise keyboardShortcuts.js + getShortcut.js paths through the
// settings write surface, then confirm the SW survived (i.e. nothing in
// the shortcut-handling code path threw asynchronously).

test("writing shortcut settings does not crash the SW", async ({ extensionPage }) => {
  test.setTimeout(45000);
  await setSettings(extensionPage, {
    shortcut_saveAllWindow: "Ctrl+Shift+S",
    shortcut_saveCurrentWindow: "Ctrl+Shift+W"
  });
  const init = await sendMessage(extensionPage, { message: "getInitState" });
  expect(typeof init).toBe("boolean");
});
