// Appended to the FF background bundle by global-setup. Accepts long-lived
// chrome.runtime.onConnect ports from the content-script bridge with name
// "__e2e_exec__" and executes chrome.* paths against the background's full
// API surface. Port-based communication does not compete with TSM's
// onMessage listeners for the single sendMessage response slot.
//
// Special path "__e2e_runHelper" runs a named pre-bundled helper inside a
// tab via chrome.scripting.executeScript. MV3 CSP forbids new Function /
// eval in extension contexts, so we don't reconstruct dynamic source; the
// FF harness uses this registry to query DOM state in moz-extension pages
// that Playwright cannot evaluate against directly.

(function () {
  const api =
    typeof browser !== "undefined" && browser.runtime
      ? browser
      : typeof chrome !== "undefined" && chrome.runtime
      ? chrome
      : null;
  if (!api || !api.runtime.onConnect) return;

  const HELPERS = {
    rootMounted: function () {
      const root = document.querySelector("#root");
      return !!(root && root.children && root.children.length > 0);
    },
    bodyTextLength: function () {
      return (document.body && document.body.innerText ? document.body.innerText.length : 0);
    },
    queryAllCount: function (selector) {
      return document.querySelectorAll(selector).length;
    }
  };

  api.runtime.onConnect.addListener(function (port) {
    if (port.name !== "__e2e_exec__") return;
    port.onMessage.addListener(async function (request) {
      const id = request && request.id;
      try {
        const path = (request && request.path) || [];
        const args = (request && request.args) || [];

        if (path.length === 1 && path[0] === "__e2e_runHelper") {
          const tabId = args[0];
          const helperName = args[1];
          const helperArgs = args[2] || [];
          const fn = HELPERS[helperName];
          if (!fn) {
            port.postMessage({
              id,
              ok: false,
              error: "unknown helper: " + helperName + ". registered: " + Object.keys(HELPERS).join(",")
            });
            return;
          }
          const res = await api.scripting.executeScript({
            target: { tabId },
            func: fn,
            args: helperArgs
          });
          port.postMessage({ id, ok: true, result: res && res[0] ? res[0].result : undefined });
          return;
        }

        let parent = self;
        let target = api;
        for (const segment of path) {
          parent = target;
          target = target[segment];
          if (target === undefined) {
            port.postMessage({
              id,
              ok: false,
              error: "browser." + path.join(".") + " is undefined at '" + segment + "'"
            });
            return;
          }
        }
        if (typeof target !== "function") {
          port.postMessage({
            id,
            ok: false,
            error: "browser." + path.join(".") + " is not a function"
          });
          return;
        }
        const result = await target.apply(parent, args);
        port.postMessage({ id, ok: true, result });
      } catch (e) {
        port.postMessage({
          id,
          ok: false,
          error: String(e && e.message ? e.message : e)
        });
      }
    });
  });
})();
