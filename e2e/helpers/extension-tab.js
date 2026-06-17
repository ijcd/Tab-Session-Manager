// Cross-browser helper for interacting with an extension page.
//
// Chrome: open via context.newPage() + goto, return the Playwright Page.
//
// Firefox: Playwright cannot navigate to moz-extension URLs nor evaluate
// on a moz-extension top-level page. Instead we ask the extension to
// open the page via browser.tabs.create, then run pre-bundled DOM helpers
// inside the tab via chrome.scripting.executeScript routed through the
// __e2e_runHelper path on the BG bridge. MV3 CSP forbids new Function /
// eval, so the helper set is a fixed registry defined in bg-exec-shim.js.

const { poll } = require("./poll");

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
    waitForFunction: (fn, opts) => page.waitForFunction(fn, opts),
    waitForTimeout: ms => page.waitForTimeout(ms),
    evaluate: (...args) => page.evaluate(...args),
    $$eval: (sel, fn, ...args) => page.$$eval(sel, fn, ...args),
    helperCall: async (name, args = []) => {
      // Chrome path can run arbitrary code in the page directly.
      const evalMap = {
        rootMounted: () => {
          const r = document.querySelector("#root");
          return !!(r && r.children && r.children.length > 0);
        },
        bodyTextLength: () =>
          document.body && document.body.innerText
            ? document.body.innerText.length
            : 0,
        queryAllCount: sel => document.querySelectorAll(sel).length
      };
      return page.evaluate(({ fnSrc, a }) => {
        // eslint-disable-next-line no-new-func
        return new Function("return (" + fnSrc + ")")()(...a);
      }, { fnSrc: evalMap[name].toString(), a: args });
    },
    close: () => page.close()
  };
}

async function callHelperInFirefoxTab(extensionPage, tabId, name, args = []) {
  return extensionPage.evaluate(
    async ({ tid, helperName, helperArgs }) => {
      return await browser.__e2e_runHelper(tid, helperName, helperArgs);
    },
    { tid: tabId, helperName: name, helperArgs: args }
  );
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
    helperCall: (name, args = []) => callHelperInFirefoxTab(extensionPage, tabId, name, args),
    waitForFunction: async (_fn, opts = {}) => {
      // FF specs use named helpers, not closures — see helperCall. This
      // method exists for spec interface symmetry only and should not be
      // called on the FF shim.
      throw new Error("Use helperCall on the FF shim, not waitForFunction");
    },
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

module.exports = { openExtensionPage };
