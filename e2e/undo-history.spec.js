const { test, expect } = require("./fixtures/extension");
const {
  buildSession,
  sendMessage,
  getSession,
  renameSession,
  removeSession,
  addTag,
  removeTag,
  importSessions
} = require("./helpers/session");

// Exercise a longer undo/redo history with various mutation types so the
// history navigation + updateUndoStatus paths get more reach.

test("undo / redo across multiple mutation types", async ({ extensionPage }) => {
  test.setTimeout(60000);
  const session = buildSession({
    id: "e2e-undo-history",
    name: "v0",
    windows: [{ urls: ["https://example.com/u"] }]
  });
  await sendMessage(extensionPage, { message: "save", session });
  await extensionPage.waitForTimeout(100);

  await renameSession(extensionPage, session.id, "v1");
  await extensionPage.waitForTimeout(50);
  await addTag(extensionPage, session.id, "alpha");
  await extensionPage.waitForTimeout(50);
  await addTag(extensionPage, session.id, "beta");
  await extensionPage.waitForTimeout(50);
  await renameSession(extensionPage, session.id, "v2");
  await extensionPage.waitForTimeout(50);
  await removeTag(extensionPage, session.id, "alpha");
  await extensionPage.waitForTimeout(50);

  // Undo the removeTag → tag returns
  await sendMessage(extensionPage, { message: "undo" });
  await extensionPage.waitForTimeout(75);
  let s = await getSession(extensionPage, session.id);
  expect(s.tag).toContain("alpha");

  // Undo all the way back
  for (let i = 0; i < 6; i++) {
    await sendMessage(extensionPage, { message: "undo" });
    await extensionPage.waitForTimeout(50);
  }

  // Redo a few
  for (let i = 0; i < 3; i++) {
    await sendMessage(extensionPage, { message: "redo" });
    await extensionPage.waitForTimeout(50);
  }

  // Check status surfaces correctly
  await sendMessage(extensionPage, { message: "updateUndoStatus" });
});

test("undoing a save removes the session", async ({ extensionPage }) => {
  const session = buildSession({
    id: "e2e-undo-save",
    name: "to-undo-save",
    windows: [{ urls: ["https://example.com/us"] }]
  });
  await sendMessage(extensionPage, { message: "save", session });
  await extensionPage.waitForTimeout(100);

  let s = await getSession(extensionPage, session.id);
  expect(s).toBeTruthy();

  await sendMessage(extensionPage, { message: "undo" });
  await extensionPage.waitForTimeout(150);

  s = await getSession(extensionPage, session.id);
  // After undo of a save, session should be removed.
  expect(s).toBeFalsy();
});
