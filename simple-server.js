const http = require("http");
const fs = require("fs");
const path = require("path");
const PORT = 7777;
const ROOT = "C:\Users\PC\Desktop\WorkGrid\resources\app\dist";
const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css" };
http.createServer((req, res) => {
  let fp = path.join(ROOT, req.url === "/" ? "index.html" : req.url);
  fs.readFile(fp, (err, content) => {
    if (err) { res.writeHead(404); res.end(); }
    else { res.writeHead(200, { "Content-Type": mime[path.extname(fp).toLowerCase()] || "application/octet-stream", "Access-Control-Allow-Origin": "*" }); res.end(content); }
  });
}).listen(PORT, () => console.log("OK:" + PORT));
