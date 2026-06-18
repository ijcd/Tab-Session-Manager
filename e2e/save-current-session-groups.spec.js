const { test, expect } = require("./fixtures/extension");
const {
  saveCurrentSession,
  setSettings,
  getAllSessions, waitForSessionByName } = require("./helpers/session");

test("saveCurrentSession captures all tabGroups in the live window", async ({
  extensionPage
}) => {
  await setSettings(extensionPage, { saveTabGroupsV2: true });

  // Create 4 tabs in the current window, then form two groups: tabs 0-1 in
  // group A, tabs 2-3 in group B.
  const groupIds = await extensionPage.evaluate(async () => {
    const opened = [];
    for (const url of [
      "https://example.com/sg-a1",
      "https://example.com/sg-a2",
      "https://example.com/sg-b1",
      "https://example.com/sg-b2"
    ]) {
      const tab = await browser.tabs.create({ url, active: false });
      opened.push(tab.id);
    }
    const gA = await browser.tabs.group({ tabIds: [opened[0], opened[1]] });
    const gB = await browser.tabs.group({ tabIds: [opened[2], opened[3]] });
    await browser.tabGroups.update(gA, { title: "GROUP_A", color: "blue" });
    await browser.tabGroups.update(gB, { title: "GROUP_B", color: "green" });
    return [gA, gB];
  });

  await extensionPage.waitForTimeout(800);
  await saveCurrentSession(extensionPage, "captured-with-groups");

  const saved = await waitForSessionByName(extensionPage, "captured-with-groups");

  expect(saved).toBeTruthy();
  expect(Array.isArray(saved.tabGroups)).toBe(true);
  expect(saved.tabGroups).toHaveLength(2);
  const titles = saved.tabGroups.map(g => g.title).sort();
  expect(titles).toEqual(["GROUP_A", "GROUP_B"]);
});
