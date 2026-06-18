const { test, expect } = require("./fixtures/extension");
const {
  buildSession,
  importSessions,
  getAllSessions,
  getSession
} = require("./helpers/session");

test("import stores a session that getSessions can read back", async ({ extensionPage }) => {
  const session = buildSession({
    id: "e2e-import-roundtrip",
    name: "import roundtrip",
    windows: [{ urls: ["https://example.com/r1", "https://example.com/r2"] }]
  });

  await importSessions(extensionPage, [session]);

  // import calls saveSession which writes to IndexedDB asynchronously.
  await extensionPage.waitForTimeout(250);

  const fetched = await getSession(extensionPage, session.id);
  expect(fetched).toBeTruthy();
  expect(fetched.name).toBe("import roundtrip");
  expect(fetched.tabsNumber).toBe(2);
  expect(Object.keys(fetched.windows)).toHaveLength(1);

  const all = await getAllSessions(extensionPage);
  expect(all.some(s => s.id === session.id)).toBe(true);
});

test("importing a duplicate session by id is a no-op", async ({ extensionPage }) => {
  const session = buildSession({
    id: "e2e-import-dupe",
    name: "first",
    windows: [{ urls: ["https://example.com/dupe"] }]
  });

  await importSessions(extensionPage, [session]);
  await extensionPage.waitForTimeout(150);

  // Re-import the same session id with a different name. Import dedupes by
  // (id, lastEditedTime) so the older copy wins.
  const dupe = { ...session, name: "second" };
  await importSessions(extensionPage, [dupe]);
  await extensionPage.waitForTimeout(150);

  const all = await getAllSessions(extensionPage);
  const matches = all.filter(s => s.id === session.id);
  expect(matches).toHaveLength(1);
});
