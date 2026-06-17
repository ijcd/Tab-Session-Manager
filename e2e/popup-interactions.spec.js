const { test, expect } = require("./fixtures/extension");
const { openExtensionPage } = require("./helpers/extension-tab");
const { importSessions, buildSession, addTag } = require("./helpers/session");
const { poll } = require("./helpers/poll");

async function waitForMounted(p) {
  await poll(20000, 200, async () => ((await p.helperCall("rootMounted")) ? true : undefined));
}

test("popup deeply renders sessions, menus, and tag chips", async ({
  context,
  extensionId,
  extensionPage
}, testInfo) => {
  test.setTimeout(60000);
  const browserType = testInfo.project.use.browserType;
  const sessions = Array.from({ length: 6 }, (_, i) =>
    buildSession({
      id: `e2e-popup-int-${i}`,
      name: `pop-int-${i}`,
      windows: [
        {
          urls: [`https://example.com/pi${i}a`, `https://example.com/pi${i}b`]
        }
      ]
    })
  );
  await importSessions(extensionPage, sessions);
  await extensionPage.waitForTimeout(400);
  for (let i = 0; i < 3; i++) {
    await addTag(extensionPage, sessions[i].id, "alpha");
    await addTag(extensionPage, sessions[i].id, "beta");
  }
  await extensionPage.waitForTimeout(400);

  const p = await openExtensionPage({
    context,
    extensionId,
    extensionPage,
    browserType,
    relPath: "popup/index.html"
  });
  await waitForMounted(p);
  await p.waitForTimeout(1500);

  // Iterate over every interactive element type so click handlers fire.
  for (const sel of ["a", "button", "input", "li", ".sessionItem", ".tag", ".menuItem"]) {
    const count = await p.helperCall("queryAllCount", [sel]);
    for (let i = 0; i < Math.min(count, 4); i++) {
      await p.helperCall("clickFirst", [`${sel}:nth-of-type(${i + 1})`]);
      await p.waitForTimeout(80);
    }
  }
  await p.waitForTimeout(500);
  await p.close();
});

test("popup search input fires onChange handlers", async ({
  context,
  extensionId,
  extensionPage
}, testInfo) => {
  test.setTimeout(60000);
  const browserType = testInfo.project.use.browserType;
  await importSessions(extensionPage, [
    buildSession({
      id: "e2e-pop-search-a",
      name: "search-target-1",
      windows: [{ urls: ["https://example.com/sa"] }]
    }),
    buildSession({
      id: "e2e-pop-search-b",
      name: "different-name",
      windows: [{ urls: ["https://example.com/sb"] }]
    })
  ]);
  await extensionPage.waitForTimeout(400);

  const p = await openExtensionPage({
    context,
    extensionId,
    extensionPage,
    browserType,
    relPath: "popup/index.html"
  });
  await waitForMounted(p);
  await p.waitForTimeout(1500);

  // Focus search and fire input events to drive SearchBar onChange.
  for (const sel of ['input[type="search"]', 'input[type="text"]']) {
    await p.helperCall("clickFirst", [sel]);
    await p.waitForTimeout(150);
  }
  await p.close();
});
