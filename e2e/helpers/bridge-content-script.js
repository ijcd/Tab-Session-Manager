// Content script bridging Playwright (page main world) to the extension's
// chrome.* runtime. Used for the firefox-mv3 e2e project, where Playwright
// can neither navigate to moz-extension URLs nor reach the MV3 event page.
//
// Architecture: the CS opens a long-lived chrome.runtime.connect port with
// name "__e2e_exec__" to the background. Path calls from the page main
// world are forwarded over this port. bg-exec-shim.js (appended to the FF
// background bundle by global-setup) walks chrome.<path>, calls it with
// the args, and posts the result back on the same port. Using a port
// instead of onMessage avoids competing with TSM's onMessage listeners.
//
// Two paths bypass the port and go straight from the CS via chrome.* —
// chrome.runtime.sendMessage and chrome.runtime.connect — because calling
// those from the background to itself is a no-op (a runtime.sendMessage
// from BG only reaches OTHER contexts, not BG handlers).

(function () {
  function installMainWorldProxy() {
    const setup = `(function() {
      function makeNode(path) {
        const target = function () {};
        return new Proxy(target, {
          get(_, prop) {
            if (
              prop === "then" ||
              prop === "toJSON" ||
              prop === "constructor" ||
              typeof prop === "symbol"
            ) {
              return undefined;
            }
            return makeNode(path.concat([prop]));
          },
          apply(_, __, args) {
            return new Promise(function (resolve, reject) {
              var id = String(Math.random()).slice(2) + String(Date.now());
              function handler(e) {
                var d = e.data;
                if (!d || typeof d !== "object" || d.__e2e_chrome_reply__ !== id) return;
                window.removeEventListener("message", handler);
                if (d.error) reject(new Error(d.error));
                else resolve(d.result);
              }
              window.addEventListener("message", handler);
              window.postMessage({ __e2e_chrome_call__: id, path: path, args: args }, "*");
            });
          }
        });
      }
      window.browser = makeNode([]);
    })();`;

    const script = document.createElement("script");
    script.textContent = setup;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  function isCsDirectPath(path) {
    if (path.length < 2 || path[0] !== "runtime") return false;
    return path[1] === "sendMessage" || path[1] === "connect";
  }

  const pending = new Map();
  let port = null;
  const queue = [];

  function attachPort(p) {
    port = p;
    p.onMessage.addListener(function (msg) {
      const fn = pending.get(msg.id);
      if (!fn) return;
      pending.delete(msg.id);
      fn(msg);
    });
    p.onDisconnect.addListener(function () {
      port = null;
      setTimeout(openPort, 100);
    });
    while (queue.length) p.postMessage(queue.shift());
  }

  function openPort() {
    if (port) return;
    try {
      const p = chrome.runtime.connect({ name: "__e2e_exec__" });
      attachPort(p);
    } catch (_) {
      setTimeout(openPort, 100);
    }
  }

  // Wake the background event page first so its onConnect listener is
  // registered before we connect.
  chrome.runtime
    .sendMessage({ message: "getInitState" })
    .catch(() => {})
    .then(openPort);

  window.addEventListener("message", async event => {
    const data = event.data;
    if (!data || typeof data !== "object") return;
    const id = data.__e2e_chrome_call__;
    if (!id) return;

    // CS-direct path: runtime.sendMessage / connect must run from the CS
    // context, not the BG.
    if (isCsDirectPath(data.path)) {
      try {
        let parent = self;
        let target = chrome;
        for (const seg of data.path) {
          parent = target;
          target = target[seg];
        }
        const result = await target.apply(parent, data.args || []);
        window.postMessage({ __e2e_chrome_reply__: id, result, error: null }, "*");
      } catch (e) {
        window.postMessage(
          { __e2e_chrome_reply__: id, result: null, error: String(e && e.message ? e.message : e) },
          "*"
        );
      }
      return;
    }

    // BG-routed path: forward over the port.
    pending.set(id, reply => {
      if (reply.ok) {
        window.postMessage({ __e2e_chrome_reply__: id, result: reply.result, error: null }, "*");
      } else {
        window.postMessage(
          { __e2e_chrome_reply__: id, result: null, error: reply.error || "unknown bridge error" },
          "*"
        );
      }
    });
    const payload = { id, path: data.path, args: data.args };
    if (port) {
      try {
        port.postMessage(payload);
      } catch (_) {
        queue.push(payload);
        openPort();
      }
    } else {
      queue.push(payload);
      openPort();
    }
  });

  installMainWorldProxy();
  document.documentElement.setAttribute("data-e2e-bridge", "ready");
})();
