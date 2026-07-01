/**
 * server.js — Serveur local de développement (équivalent Vercel dev)
 * Sert index.html + route /api/* vers les handlers api/*.js
 * Usage : node server.js [port]
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const qs = require("querystring");

const PORT = Number(process.argv[2]) || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString();
      if (!raw.trim()) { resolve({}); return; }
      try { resolve(JSON.parse(raw)); }
      catch { resolve({}); }
    });
    req.on("error", reject);
  });
}

function mockRes(res) {
  let statusCode = 200;
  const headers = {};
  return {
    status(code) { statusCode = code; return this; },
    setHeader(k, v) { headers[k] = v; return this; },
    json(payload) {
      const body = JSON.stringify(payload, null, 2);
      res.writeHead(statusCode, { "Content-Type": "application/json", ...headers });
      res.end(body);
    },
    send(body) {
      res.writeHead(statusCode, { "Content-Type": "text/plain", ...headers });
      res.end(String(body));
    }
  };
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname.replace(/\/$/, "") || "/";

  // ── API routes ────────────────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    const handlerName = pathname.slice(5); // e.g. "trip" or "border"
    const handlerPath = path.join(__dirname, "api", handlerName + ".js");

    if (!fs.existsSync(handlerPath)) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: `Handler not found: ${pathname}` }));
      return;
    }

    // Purge require cache for hot-reload (handler + all local lib deps)
    const purgeLocal = (id) => {
      const cached = require.cache[id];
      if (!cached) return;
      delete require.cache[id];
      cached.children
        .filter(c => c.id.startsWith(__dirname))
        .forEach(c => purgeLocal(c.id));
    };
    purgeLocal(require.resolve(handlerPath));
    const handler = require(handlerPath);

    const body = await readBody(req);
    const mockReq = {
      method: req.method,
      url: req.url,
      query: parsed.query,
      headers: req.headers,
      body
    };

    try {
      handler(mockReq, mockRes(res));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  // ── Static files ──────────────────────────────────────────────
  let filePath;
  if (pathname === "/") {
    filePath = path.join(__dirname, "index.html");
  } else {
    filePath = path.join(__dirname, pathname);
  }

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        // SPA fallback → index.html
        fs.readFile(path.join(__dirname, "index.html"), (e2, d2) => {
          if (e2) { res.writeHead(404); res.end("Not found"); return; }
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(d2);
        });
      } else {
        res.writeHead(500);
        res.end("Server error: " + err.message);
      }
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("─────────────────────────────────────────");
  console.log(`  🏍️  Road Trip Moto — serveur local`);
  console.log(`  ➜  http://localhost:${PORT}`);
  console.log(`  API : http://localhost:${PORT}/api/trip`);
  console.log(`  API : http://localhost:${PORT}/api/border`);
  console.log("─────────────────────────────────────────");
  console.log("  Ctrl+C pour arrêter");
});
