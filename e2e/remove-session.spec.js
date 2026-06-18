const { test, expect } = require("./fixtures/extension");
const {
  buildSession,
  importSessions,
  getAllSessions,
  removeSession,
  sendMessage
} = require("./helpers/session");

test("remove deletes a session from IndexedDB", async ({ extensionPage }) => {
  const a = buildSession({
    id: "e2e-remove-a",
    name: "session-a",
    windows: [{ urls: ["https://example.com/a"] }]
  });
  const b = buildSession({
    id: "e2e-remove-b",
    name: "session-b",
    windows: [{ urls: ["https://example.com/b"] }]
  });

  await importSessions(extensionPage, [a, b]);
  await extensionPage.waitForTimeout(200);

  const beforeIds = (await getAllSessions(extensionPage)).map(s => s.id);
  expect(beforeIds).toContain("e2e-remove-a");
  expect(beforeIds).toContain("e2e-remove-b");

  await removeSession(extensionPage, "e2e-remove-a");
  await extensionPage.waitForTimeout(150);

  const afterIds = (await getAllSessions(extensionPage)).map(s => s.id);
  expect(afterIds).not.toContain("e2e-remove-a");
  expect(afterIds).toContain("e2e-remove-b");
});
