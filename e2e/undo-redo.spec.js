const { test, expect } = require("./fixtures/extension");
const {
  buildSession,
  getSession,
  renameSession,
  sendMessage
} = require("./helpers/session");

test("undo reverts a rename, redo re-applies it", async ({ extensionPage }) => {
  const session = buildSession({
    id: "e2e-undo",
    name: "original",
    windows: [{ urls: ["https://example.com/undo"] }]
  });

  // Use the "save" message (not import) so recordChange runs.
  await sendMessage(extensionPage, { message: "save", session });
  await extensionPage.waitForTimeout(300);

  await renameSession(extensionPage, session.id, "renamed");
  await extensionPage.waitForTimeout(300);
  let current = await getSession(extensionPage, session.id);
  expect(current.name).toBe("renamed");

  await sendMessage(extensionPage, { message: "undo" });
  await extensionPage.waitForTimeout(300);
  current = await getSession(extensionPage, session.id);
  expect(current.name).toBe("original");

  await sendMessage(extensionPage, { message: "redo" });
  await extensionPage.waitForTimeout(300);
  current = await getSession(extensionPage, session.id);
  expect(current.name).toBe("renamed");
});
