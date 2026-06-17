const http = require("http");

// Tiny HTTP server serving a minimal HTML page that the FF content-script
// bridge injects into. Started by global-setup, kept alive for the whole
// Playwright run, and torn down by the returned stop fn.

const HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>e2e-bridge</title></head>
<body><div id="root">e2e bridge target</div></body></html>`;

function startBridgeServer(port = 38291) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(HTML);
    });
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => {
      resolve({
        port,
        url: `http://127.0.0.1:${port}/`,
        matches: `http://127.0.0.1:${port}/*`,
        stop: () => new Promise(r => server.close(r))
      });
    });
  });
}

module.exports = { startBridgeServer };
