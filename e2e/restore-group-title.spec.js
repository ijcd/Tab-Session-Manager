const { test, expect } = require("./fixtures/extension");
const { buildSession, setSettings, openSession } = require("./helpers/session");
const { getAllWindowIds, waitForNewWindow, waitForGroupsInWindow } = require("./helpers/windows");

test("restoring a session preserves tab group title and color", async ({ extensionPage }) => {
  await setSettings(extensionPage, { saveTabGroupsV2: true });

  const session = buildSession({
    id: "e2e-restore-group-title",
    name: "e2e restore-group-title",
    windows: [
      {
        urls: ["https://example.com/a", "https://example.com/b", "https://example.com/c"],
        groups: [{ tabIndices: [0, 1, 2], title: "TEST_E2E", color: "blue" }]
      }
    ]
  });

  const baseline = (await getAllWindowIds(extensionPage)).sort();
  await openSession(extensionPage, session);
  const newWindowId = await waitForNewWindow(extensionPage, baseline, 3);
  const groups = await waitForGroupsInWindow(extensionPage, newWindowId);

  expect(groups).toHaveLength(1);
  expect(groups[0].title).toBe("TEST_E2E");
  expect(groups[0].color).toBe("blue");
});
