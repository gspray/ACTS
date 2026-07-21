const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = fs.existsSync(path.join(__dirname, "site"))
  ? path.join(__dirname, "site")
  : __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }

    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const relPath = safePath.replace(/^[/\\]+/, "");
  const filePath = path.join(ROOT, relPath);

  function sendNotFound() {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
  }

  function tryDirectoryIndex(dirPath) {
    const indexPath = path.join(dirPath, "index.html");
    fs.stat(indexPath, (err, stats) => {
      if (!err && stats.isFile()) {
        sendFile(res, indexPath);
        return;
      }
      // HTML navigations without an extension fall back to the homepage.
      // Missing assets (css/js/images) return a real 404.
      if (!path.extname(relPath) || safePath.endsWith("/")) {
        sendFile(res, path.join(ROOT, "index.html"));
        return;
      }
      sendNotFound();
    });
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      tryDirectoryIndex(filePath);
      return;
    }

    if (!err && stats.isFile()) {
      sendFile(res, filePath);
      return;
    }

    // /about-acts (no trailing slash) → about-acts/index.html
    if (!path.extname(relPath)) {
      tryDirectoryIndex(filePath);
      return;
    }

    sendNotFound();
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`ACTS server running at http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Try: PORT=3001 npm start`);
  } else {
    console.error("Server error:", err.message);
  }
  process.exit(1);
});
