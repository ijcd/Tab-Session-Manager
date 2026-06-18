const { test, expect } = require("./fixtures/extension");
const {
  buildSession,
  importSessions,
  getSession,
  addTag,
  removeTag,
  renameSession
} = require("./helpers/session");

test("addTag / removeTag / rename update an existing session", async ({ extensionPage }) => {
  const session = buildSession({
    id: "e2e-tag-crud",
    name: "initial name",
    windows: [{ urls: ["https://example.com/tag"] }]
  });

  await importSessions(extensionPage, [session]);
  await extensionPage.waitForTimeout(150);

  await addTag(extensionPage, session.id, "alpha");
  await addTag(extensionPage, session.id, "beta");
  await extensionPage.waitForTimeout(100);

  let fetched = await getSession(extensionPage, session.id);
  expect(fetched.tag.sort()).toEqual(["alpha", "beta"]);

  await removeTag(extensionPage, session.id, "alpha");
  await extensionPage.waitForTimeout(100);
  fetched = await getSession(extensionPage, session.id);
  expect(fetched.tag).toEqual(["beta"]);

  await renameSession(extensionPage, session.id, "renamed");
  await extensionPage.waitForTimeout(100);
  fetched = await getSession(extensionPage, session.id);
  expect(fetched.name).toBe("renamed");
});
