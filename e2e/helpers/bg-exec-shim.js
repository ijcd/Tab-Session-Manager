// Appended to the FF background bundle by global-setup, AFTER the
// PAGE_HELPERS registry (helpers/page-helpers.js) is concatenated in.
//
// Accepts long-lived chrome.runtime.onConnect ports from the content-
// script bridge with name "__e2e_exec__" and executes chrome.* paths
// against the background's full API surface. Port-based communication
// does not compete with TSM's onMessage listeners for the single
// sendMessage response slot.
//
// Special path "__e2e_runHelper" runs a named PAGE_HELPERS function
// inside a tab via chrome.scripting.executeScript.

(function () {
  var api =
    typeof browser !== "undefined" && browser.runtime
      ? browser
      : typeof chrome !== "undefined" && chrome.runtime
      ? chrome
      : null;
  if (!api || !api.runtime.onConnect) return;

  // PAGE_HELPERS is defined by the helpers/page-helpers.js source
  // global-setup concatenates ahead of this file.
  var helpers = typeof PAGE_HELPERS !== "undefined" ? PAGE_HELPERS : {};

  api.runtime.onConnect.addListener(function (port) {
    if (port.name !== "__e2e_exec__") return;
    port.onMessage.addListener(async function (request) {
      var id = request && request.id;
      try {
        var path = (request && request.path) || [];
        var args = (request && request.args) || [];

        if (path.length === 1 && path[0] === "__e2e_runHelper") {
          var tabId = args[0];
          var helperName = args[1];
          var helperArgs = args[2] || [];
          var fn = helpers[helperName];
          if (!fn) {
            port.postMessage({
              id,
              ok: false,
              error:
                "unknown helper: " + helperName + ". registered: " +
                Object.keys(helpers).join(",")
            });
            return;
          }
          var res = await api.scripting.executeScript({
            target: { tabId },
            func: fn,
            args: helperArgs
          });
          port.postMessage({
            id,
            ok: true,
            result: res && res[0] ? res[0].result : undefined
          });
          return;
        }

        var parent = self;
        var target = api;
        for (var i = 0; i < path.length; i++) {
          var segment = path[i];
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
        var result = await target.apply(parent, args);
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
