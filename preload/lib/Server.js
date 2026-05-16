const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");
const archiver = require("archiver");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const { v4: uuidv4 } = require("uuid");
const Setting = require("./Setting");
const FileDb = require("./FileDb");
const EventDispatcher = require("./EventDispatcher");

const StatusRunning = 1;
const StatusStop = 0;

let server = null;
let httpServer = null;
let app = null;
let upload = null;
let token = null;
let currentUrl = null;

const uploadDir = path.join(os.tmpdir(), "file-share-uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

function generateToken() {
  token = uuidv4().replace(/-/g, "").substring(0, 8);
  return token;
}

const Server = {
  StatusRunning,
  StatusStop,

  getServerStatus() {
    return server ? StatusRunning : StatusStop;
  },

  getToken() {
    return token || generateToken();
  },

  startServer() {
    if (server) return;
    const setting = Setting.getSetting();
    const port = setting.port || 8080;
    const password = setting.password || "";

    if (!token) generateToken();

    app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(cookieParser());

    // Password protection (simple token-based)
    app.use((req, res, next) => {
      // Skip auth for API health check
      if (req.path === "/api/health") return next();
      if (!password) return next();
      const authHeader = req.headers["authorization"];
      const queryToken = req.query.token;
      const cookieToken = req.cookies?.file_share_token;
      const valid = authHeader === `Bearer ${token}` || queryToken === token || cookieToken === token;
      if (!valid) {
        if (req.path.startsWith("/api/")) {
          return res.status(401).json({ error: "unauthorized" });
        }
        return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
      }
      next();
    });

    // Login page
    app.get("/login", (req, res) => {
      res.send(`<!doctype html><html><head><meta charset="utf-8"><title>验证</title>
      <style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#1a1a2e;color:#eee;margin:0}
      form{background:#16213e;padding:32px;border-radius:12px;width:300px}
      input{width:100%;padding:10px;margin:8px 0;background:#0f3460;border:1px solid #1f2937;border-radius:8px;color:#eee;font-size:14px;box-sizing:border-box}
      button{width:100%;padding:10px;background:#e94560;border:none;border-radius:8px;color:#fff;font-size:14px;cursor:pointer}
      h2{margin:0 0 16px}</style></head><body>
      <form method="post" action="/login">
      <h2>🔒 输入密码</h2>
      <input type="password" name="password" placeholder="密码" required>
      <input type="hidden" name="redirect" value="${encodeURIComponent(req.query.redirect || "/")}">
      <button type="submit">验证</button></form></body></html>`);
    });

    app.post("/login", (req, res) => {
      const { password: inputPwd, redirect } = req.body;
      if (inputPwd === password) {
        res.cookie("file_share_token", token, { maxAge: 86400000 });
        res.redirect(redirect || "/");
      } else {
        res.status(403).send("密码错误");
      }
    });

    // Upload
    const storage = multer.diskStorage({
      destination: uploadDir,
      filename: (req, file, cb) => {
        const safeName = Date.now() + "_" + file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, safeName);
      },
    });
    upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

    app.post("/api/upload", upload.array("files"), (req, res) => {
      const uploaded = req.files || [];
      const results = [];
      uploaded.forEach((f) => {
        const entry = FileDb.addFile({
          name: f.originalname,
          path: f.path,
          size: f.size,
        });
        results.push(entry);
      });
      EventDispatcher.dispatchEvent("refresh");
      res.json({ success: true, files: results });
    });

    // List files
    app.get("/api/files", (req, res) => {
      const all = FileDb.listFiles();
      const files = all.filter((f) => f.type === "file").map((f) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        addedAt: f.addedAt,
      }));
      res.json({ success: true, files });
    });

    // Download file
    app.get("/api/download/:id", (req, res) => {
      const entry = FileDb.getFile(req.params.id);
      if (!entry || entry.type !== "file") {
        return res.status(404).json({ error: "not found" });
      }
      if (fs.existsSync(entry.path)) {
        res.download(entry.path, entry.name);
      } else {
        res.status(404).json({ error: "file not found on disk" });
      }
    });

    // Download all as zip
    app.get("/api/download-all", (req, res) => {
      const all = FileDb.listFiles().filter((f) => f.type === "file" && fs.existsSync(f.path));
      if (all.length === 0) return res.status(404).json({ error: "no files" });

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", "attachment; filename=files.zip");
      const archive = archiver("zip", { zlib: { level: 5 } });
      archive.pipe(res);
      all.forEach((f) => {
        archive.file(f.path, { name: f.name });
      });
      archive.finalize();
    });

    // Delete file
    app.delete("/api/files/:id", (req, res) => {
      const ok = FileDb.removeFile(req.params.id);
      EventDispatcher.dispatchEvent("refresh");
      res.json({ success: ok });
    });

    // Health
    app.get("/api/health", (req, res) => {
      res.json({ status: "ok", token: token, uptime: process.uptime() });
    });

    // Frontend static
    app.get(/^\/(index.html)?$/, (req, res) => {
      // Redirect to ZTools plugin or show a simple page
      res.send(`<!doctype html><html><head><meta charset="utf-8"><title>FileShare 文件共享</title>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style>body{font-family:sans-serif;background:#1a1a2e;color:#eee;margin:0;padding:20px;max-width:800px;margin:0 auto}
      a{color:#60a5fa}h1{color:#e94560}.card{background:#16213e;padding:16px;border-radius:10px;margin:12px 0}
      .url{font-family:monospace;color:#4ade80;font-size:18px;word-break:break-all;background:#0f3460;padding:10px;border-radius:8px;text-align:center}
      .btn{display:inline-block;padding:10px 20px;background:#e94560;color:#fff;text-decoration:none;border-radius:8px;margin:4px}
      table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px;border-bottom:1px solid #1f2937}th{color:#6b7280;font-size:12px}
      </style></head><body>
      <h1>📁 FileShare</h1>
      <div class="card"><strong>共享地址：</strong><br><div class="url" id="url">加载中...</div></div>
      <div class="card"><strong>文件列表</strong><div id="files">加载中...</div></div>
      <script>
      fetch('/api/files').then(r=>r.json()).then(d=>{
        const host=location.host;
        document.getElementById('url').textContent='http://'+host+'/';
        const list=d.files||[];
        let html='<table><tr><th>名称</th><th>大小</th><th>操作</th></tr>';
        list.forEach(f=>{html+='<tr><td>'+f.name+'</td><td>'+(f.size?(f.size/1024).toFixed(1)+' KB':'')+'</td><td><a href="/api/download/'+f.id+'" class="btn">下载</a></td></tr>'});
        html+= '</table>';
        if(list.length===0) html='<p style="color:#6b7280">暂无共享文件</p>';
        document.getElementById('files').innerHTML=html;
      }).catch(()=>{document.getElementById('files').innerHTML='<p>无法连接服务器</p>'});
      </script></body></html>`);
    });

    // Start server
    try {
      httpServer = app.listen(port, "0.0.0.0", () => {
        server = httpServer;
        // Get actual URL
        const interfaces = os.networkInterfaces();
        let ip = "127.0.0.1";
        for (const name of Object.keys(interfaces)) {
          const addr = interfaces[name].find((n) => n.family === "IPv4" && !n.internal);
          if (addr) { ip = addr.address; break; }
        }
        currentUrl = `http://${ip}:${port}`;
        Setting.setUrl(currentUrl);
        EventDispatcher.dispatchEvent("refresh");
        console.log(`FileShare server started: ${currentUrl}`);
      });
    } catch (e) {
      console.error("Server start error:", e);
    }
  },

  stopServer() {
    if (httpServer) {
      try {
        // 强制关闭所有活跃连接
        httpServer.closeAllConnections && httpServer.closeAllConnections();
        httpServer.close(function() { console.log("Server fully closed"); });
      } catch (e) { console.error("stopServer error:", e); }
      httpServer = null;
      server = null;
      currentUrl = null;
      Setting.setUrl(null);
      EventDispatcher.dispatchEvent("refresh");
      console.log("FileShare server stopped");
    }
  },
};

module.exports = Server;
