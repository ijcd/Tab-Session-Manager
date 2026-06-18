const { test, expect } = require("./fixtures/extension");
const {
  buildSession,
  importSessions,
  getSearchInfo
} = require("./helpers/session");

test("getsearchInfo returns a search entry per imported session", async ({ extensionPage }) => {
  const sessions = [
    buildSession({
      id: "e2e-search-a",
      name: "alpha session",
      windows: [{ urls: ["https://alpha.example.com/one", "https://alpha.example.com/two"] }]
    }),
    buildSession({
      id: "e2e-search-b",
      name: "beta session",
      windows: [{ urls: ["https://beta.example.com/page"] }]
    })
  ];

  await importSessions(extensionPage, sessions);
  await extensionPage.waitForTimeout(250);

  const info = await getSearchInfo(extensionPage);
  expect(Array.isArray(info)).toBe(true);
  const ids = info.map(s => s.id);
  expect(ids).toContain("e2e-search-a");
  expect(ids).toContain("e2e-search-b");
});
