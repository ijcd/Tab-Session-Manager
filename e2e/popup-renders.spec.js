const { test, expect } = require("./fixtures/extension");
const { importSessions, buildSession } = require("./helpers/session");

test("popup page renders the React app", async ({
  context,
  extensionId,
  extensionPage
}) => {
  // Seed a session so the popup has something to show.
  await importSessions(extensionPage, [
    buildSession({
      id: "e2e-popup-seed",
      name: "popup-seed",
      windows: [{ urls: ["https://example.com/p"] }]
    })
  ]);
  await extensionPage.waitForTimeout(300);

  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup/index.html`);
  await page.waitForFunction(
    () => document.querySelector("#root") && document.querySelector("#root").children.length > 0,
    { timeout: 15000 }
  );
  const bodyText = await page.evaluate(() => document.body.innerText.length);
  expect(bodyText).toBeGreaterThan(0);
  await page.close();
});
