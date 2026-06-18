// Cross-browser helper for interacting with an extension page.
//
// Chrome: open via context.newPage() + goto, return the Playwright Page.
//
// Firefox: Playwright cannot navigate to moz-extension URLs nor evaluate
// on a moz-extension top-level page. Instead we ask the extension to
// open the page via browser.tabs.create, then run pre-bundled DOM helpers
// inside the tab via chrome.scripting.executeScript routed through the
// __e2e_runHelper path on the BG bridge. MV3 CSP forbids new Function /
// eval, so the helper set is a fixed registry — see helpers/page-helpers.js.

const { poll } = require("./poll");
const { PAGE_HELPERS } = require("./page-helpers");

async function openExtensionPage({
  context,
  extensionId,
  extensionPage,
  browserType,
  relPath
}) {
  if (browserType === "firefox") {
    return await openFirefoxExtensionPage({ extensionPage, relPath });
  }
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/${relPath}`, {
    waitUntil: "load",
    timeout: 15000
  });
  return wrapChromePage(page);
}

function wrapChromePage(page) {
  return {
    isFirefoxShim: false,
    page,
    waitForTimeout: ms => page.waitForTimeout(ms),
    helperCall: (name, arg) => {
      const fn = PAGE_HELPERS[name];
      if (!fn) throw new Error(`unknown helper: ${name}`);
      // Playwright serializes fn.toString() internally and runs it in
      // the page. arg is structured-cloned through as the single
      // page-side argument (undefined if not supplied).
      return page.evaluate(fn, arg);
    },
    close: () => page.close()
  };
}

async function openFirefoxExtensionPage({ extensionPage, relPath }) {
  const tabId = await extensionPage.evaluate(async path => {
    const url = await browser.runtime.getURL(path);
    const tab = await browser.tabs.create({ url, active: false });
    return tab.id;
  }, relPath);

  await poll(15000, 200, async () => {
    const status = await extensionPage.evaluate(async tid => {
      const tabs = await browser.tabs.query({});
      const t = tabs.find(x => x.id === tid);
      return t ? t.status : null;
    }, tabId);
    return status === "complete" ? true : undefined;
  });

  return {
    isFirefoxShim: true,
    tabId,
    helperCall: (name, arg) =>
      extensionPage.evaluate(
        async ({ tid, helperName, helperArg }) => {
          return await browser.__e2e_runHelper(tid, helperName, [helperArg]);
        },
        { tid: tabId, helperName: name, helperArg: arg }
      ),
    waitForTimeout: ms => extensionPage.waitForTimeout(ms),
    close: async () => {
      await extensionPage
        .evaluate(async tid => {
          try {
            await browser.tabs.remove(tid);
          } catch {}
        }, tabId)
        .catch(() => {});
    }
  };
}

// Poll until the React root in the opened extension page has children.
async function waitForRootMounted(p, timeoutMs = 20000) {
  await poll(timeoutMs, 200, async () =>
    (await p.helperCall("rootMounted")) ? true : undefined
  );
}

module.exports = { openExtensionPage, waitForRootMounted };
