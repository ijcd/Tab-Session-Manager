// Pure DOM helpers invoked inside extension pages.
//
// Chrome path: page.evaluate serializes the chosen helper.
// Firefox path: chrome.scripting.executeScript serializes the chosen
//   helper to source and runs it in the target tab — MV3 CSP forbids
//   new Function() / eval() inside the BG, so this registry is the only
//   way to inject DOM logic from outside.
//
// Functions must not capture outside variables — they run in a different
// world from where they were defined. Pass everything through args.
//
// Dual-mode loadable:
//   - Node `require("./page-helpers")` → { PAGE_HELPERS }
//   - Appended verbatim to the FF background bundle by global-setup,
//     where PAGE_HELPERS becomes a global the bg-exec-shim closure reads.

// All helpers take exactly one argument (or none). Multi-input helpers
// take a single object. This lets both transport layers (Chrome's
// page.evaluate, FF's chrome.scripting.executeScript) pass-through args
// uniformly without unpacking gymnastics.
const PAGE_HELPERS = {
  rootMounted: function () {
    var root = document.querySelector("#root");
    return !!(root && root.children && root.children.length > 0);
  },
  bodyTextLength: function () {
    return document.body && document.body.innerText
      ? document.body.innerText.length
      : 0;
  },
  queryAllCount: function (selector) {
    return document.querySelectorAll(selector).length;
  },
  clickFirst: function (selector) {
    var el = document.querySelector(selector);
    if (!el) return false;
    el.click();
    return true;
  },
  clickFirstByText: function (arg) {
    var els = document.querySelectorAll(arg.selector);
    for (var i = 0; i < els.length; i++) {
      if ((els[i].innerText || "").indexOf(arg.text) >= 0) {
        els[i].click();
        return true;
      }
    }
    return false;
  },
  setHash: function (hash) {
    window.location.hash = hash;
    return window.location.hash;
  },
  getHash: function () {
    return window.location.hash;
  },
  selectorTextContains: function (arg) {
    var el = document.querySelector(arg.selector);
    if (!el) return false;
    return (el.innerText || "").indexOf(arg.needle) >= 0;
  }
};

if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
  module.exports = { PAGE_HELPERS };
}
