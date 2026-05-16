const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

// ── 1) 编译 preload/index.js + node_modules → preload.bundle.js ──
console.log("→ Bundling preload/index.js → preload.bundle.js ...");
esbuild.buildSync({
  entryPoints: ["./preload/index.js"],
  outfile: "preload.bundle.js",
  bundle: true,
  platform: "node",
  target: "node16",
  format: "cjs",
  external: ["electron"],
  logLevel: "warning",
});
const bundleStat = fs.statSync("preload.bundle.js");
console.log(`  ✓ preload.bundle.js (${(bundleStat.size / 1024).toFixed(1)} KB)`);

// ── 2) 生成 zip 用的 plugin.json（preload 指向编译产物）──
const pluginJson = JSON.parse(fs.readFileSync("plugin.json", "utf8"));
pluginJson.preload = "preload.bundle.js";
const pluginJsonTemp = JSON.stringify(pluginJson, null, 2);

// ── 3) 打包 zip（无需 node_modules）──
const archiver = require("./preload/node_modules/archiver");
const DIST = path.join(__dirname, "dist");
const OUT = path.join(DIST, "file-share.zip");

if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });
if (fs.existsSync(OUT)) fs.unlinkSync(OUT);

const output = fs.createWriteStream(OUT);
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => {
  console.log(`  ✓ dist/file-share.zip (${(archive.pointer() / 1024).toFixed(1)} KB) → DONE`);
});
archive.on("error", (err) => { console.error("Archive error:", err); process.exit(1); });

archive.pipe(output);

// 写入修改后的 plugin.json（内存中，不影响源文件）
archive.append(pluginJsonTemp, { name: "plugin.json" });
archive.file("index.html");
if (fs.existsSync("logo.png")) archive.file("logo.png");
archive.file("preload.bundle.js");

archive.finalize();
