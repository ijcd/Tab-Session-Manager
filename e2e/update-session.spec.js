const { test, expect } = require("./fixtures/extension");
const {
  buildSession,
  importSessions,
  getSession,
  sendMessage
} = require("./helpers/session");

test("update message overwrites session fields", async ({ extensionPage }) => {
  const session = buildSession({
    id: "e2e-update",
    name: "before-update",
    windows: [{ urls: ["https://example.com/u"] }]
  });
  await importSessions(extensionPage, [session]);
  await extensionPage.waitForTimeout(150);

  const updated = { ...session, name: "after-update" };
  await sendMessage(extensionPage, { message: "update", session: updated });
  await extensionPage.waitForTimeout(150);

  const fetched = await getSession(extensionPage, session.id);
  expect(fetched.name).toBe("after-update");
});
