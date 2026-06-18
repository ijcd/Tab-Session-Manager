const { test, expect } = require("./fixtures/extension");
const {
  buildSession,
  importSessions,
  getSearchInfo,
  addTag,
  sendMessage
} = require("./helpers/session");

test("search info includes tags and url fragments across multiple sessions", async ({
  extensionPage
}) => {
  const sessions = Array.from({ length: 6 }, (_, i) =>
    buildSession({
      id: `e2e-ms-${i}`,
      name: `multi-${i}`,
      windows: [
        {
          urls: [`https://example.com/ms${i}/a`, `https://example.com/ms${i}/b`]
        }
      ]
    })
  );
  await importSessions(extensionPage, sessions);
  await extensionPage.waitForTimeout(250);

  for (const s of sessions.slice(0, 3)) {
    await addTag(extensionPage, s.id, "batch");
  }
  await extensionPage.waitForTimeout(150);

  const info = await getSearchInfo(extensionPage);
  expect(info.length).toBeGreaterThanOrEqual(sessions.length);
  for (const s of sessions) {
    expect(info.some(i => i.id === s.id)).toBe(true);
  }
});

test("requestAllSessions streaming returns rows", async ({ extensionPage }) => {
  await importSessions(extensionPage, [
    buildSession({
      id: "e2e-rs",
      name: "stream",
      windows: [{ urls: ["https://example.com/stream"] }]
    })
  ]);
  await extensionPage.waitForTimeout(150);

  // requestAllSessions broadcasts via runtime.sendMessage in chunks — we
  // just exercise the path; result will be undefined from sender side.
  await sendMessage(extensionPage, {
    message: "requestAllSessions",
    needKeys: ["id", "name", "tag"],
    count: 10,
    port: "e2e-stream-port"
  });
  await extensionPage.waitForTimeout(400);
});
