const { test, expect } = require("./fixtures/extension");
const { buildSession, setSettings, openSession } = require("./helpers/session");
const { getAllWindowIds, waitForNewWindow, waitForGroupsInWindow } = require("./helpers/windows");

test("restoring a window with multiple groups preserves both groups' titles and colors", async ({ extensionPage }) => {
  await setSettings(extensionPage, { saveTabGroupsV2: true });

  const session = buildSession({
    id: "e2e-restore-multi-group",
    name: "multi-group window",
    windows: [
      {
        urls: [
          "https://example.com/work-a",
          "https://example.com/work-b",
          "https://example.com/personal-a",
          "https://example.com/personal-b"
        ],
        groups: [
          { tabIndices: [0, 1], title: "WORK_E2E", color: "blue" },
          { tabIndices: [2, 3], title: "PERSONAL_E2E", color: "green" }
        ]
      }
    ]
  });

  const baseline = (await getAllWindowIds(extensionPage)).sort();
  await openSession(extensionPage, session);
  const newWindowId = await waitForNewWindow(extensionPage, baseline, 4);
  const groups = await waitForGroupsInWindow(extensionPage, newWindowId, 2);

  expect(groups).toHaveLength(2);
  const byTitle = Object.fromEntries(groups.map(g => [g.title, g]));
  expect(byTitle.WORK_E2E.color).toBe("blue");
  expect(byTitle.PERSONAL_E2E.color).toBe("green");
});
