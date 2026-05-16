let _setImmediate = setTimeout;
process.once("loaded", function () {
  global.setImmediate = _setImmediate;
});

const fs = require("fs");
const path = require("path");
const PlatformAdapter = require("./utils/PlatformAdapterInstance");
PlatformAdapter.initDatabaseAdapter();

const {
  IpUtil,
  FileUtil,
  Setting,
  Server,
  FileDb,
  EventDispatcher,
} = require("./lib");

// 通用：从 payload 中提取文件并添加到共享列表
function processPayloadFiles(payload) {
  if (!payload) return false;
  const files = Array.isArray(payload) ? payload : [payload];
  let added = 0;
  files.forEach((f) => {
    if (!f) return;
    // 兼容多种字段名：path / realPath / name(纯文件名时用name做fallback)
    const filePath = f.path || f.realPath || "";
    const fileName = f.name || f.filename || (filePath ? filePath.split(/[/\\]/).pop() : "未知文件");
    const fileSize = f.size || 0;
    if (filePath && fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      FileDb.addFile({ name: fileName, path: filePath, size: fileSize || stat.size });
      added++;
    } else if (filePath) {
      // 路径存在但不验证（可能是网络路径等）
      FileDb.addFile({ name: fileName, path: filePath, size: fileSize });
      added++;
    }
  });
  console.log("processPayloadFiles: added " + added + " files");
  return added > 0;
}

// 进入插件
ztools.onPluginEnter(({ code, type, payload }) => {
  try {
    console.log("onPluginEnter:", JSON.stringify({ code, type, payload: payload ? (Array.isArray(payload) ? "Array[" + payload.length + "]" : typeof payload) : null }));
    let hasFiles = false;
    // ZTools 的 type 可能是 "files" "over" "text" 等，不局限于 "files"
    // 只要 payload 看起来像文件数据（有 path 或 name 属性）就处理
    if (payload) {
      if (type === "files" || type === "over") {
        hasFiles = processPayloadFiles(payload);
      } else {
        // 兜底：检查 payload 是否含文件对象（有 path 或 name 字段）
        const first = Array.isArray(payload) ? payload[0] : payload;
        if (first && (first.path || first.realPath || first.name)) {
          hasFiles = processPayloadFiles(payload);
        }
      }
    }
    if (hasFiles || Setting.getAutoStart()) {
      if (Server.getServerStatus() === Server.StatusStop) {
        Server.startServer();
      }
    }
  } catch (e) {
    console.error("onPluginEnter error:", e);
  }
});

// 退出插件
ztools.onPluginOut(() => {
  console.log("用户退出插件");
});

// 插件装配
ztools.onPluginReady(() => {
  console.log("插件装配完成，已准备好");
  Setting.getSetting(); // 初始化配置

  // 初始化IP相关配置
  const savedIpFamily = IpUtil.getIpFamily();
  const savedNetInterface = IpUtil.getNetInterface();
  const ipAddress = IpUtil.getIp();
  console.log("加载保存的IP配置:", {
    ipFamily: savedIpFamily,
    netInterface: savedNetInterface,
    ipAddress: ipAddress,
  });
});

// 配置更新
const updateSetting = (setting) => {
  let old = Setting.getSetting();
  return Setting.updateSetting(setting)
    .then((msg) => {
      if (old.port !== setting.port || old.password !== setting.password) {
        console.log("重启服务", old, setting);
        Server.stopServer();
        Server.startServer();
      }
      return msg;
    })
    .catch((e) => {
      console.log(e);
      throw e;
    });
};

const openFile = (filename) => {
  try {
    let file = FileDb.getFile(filename);
    if (file) FileUtil.openFile(file.path);
  } catch (e) {
    console.error("openFile error:", e);
  }
};

// 从页面传来的文件路径添加共享（HTML input 获取的 File.path）
const addFilesFromPage = (fileArray) => {
  try {
    if (!fileArray || fileArray.length === 0) return;
    fileArray.forEach(function(item) {
      if (item.path && fs.existsSync(item.path)) {
        var stat = fs.statSync(item.path);
        FileDb.addFile({ name: item.name || path.basename(item.path), path: item.path, size: stat.size });
      }
    });
  } catch (e) { console.error("addFilesFromPage error:", e); }
};

// 通过 ZTools 对话框选择文件
const selectFiles = () => {
  try {
    const result = ztools.showOpenDialog({
      title: "选择要共享的文件",
      properties: ["openFile", "multiSelections", "showHiddenFiles"],
    });
    if (!result || result.length === 0) return [];
    const added = [];
    result.forEach(function(filePath) {
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        const entry = FileDb.addFile({ name: path.basename(filePath), path: filePath, size: stat.size });
        added.push(entry);
      }
    });
    return added;
  } catch (e) { console.error("selectFiles error:", e); return []; }
};

// 把拖拽的 File 对象通过 ztools.getPathForFile 转为路径后添加
const addDropFiles = (fileArray) => {
  try {
    if (!fileArray || fileArray.length === 0) return [];
    const added = [];
    fileArray.forEach(function(file) {
      const filePath = ztools.getPathForFile(file);
      if (filePath && fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        const entry = FileDb.addFile({ name: path.basename(filePath), path: filePath, size: stat.size });
        added.push(entry);
      }
    });
    return added;
  } catch (e) { console.error("addDropFiles error:", e); return []; }
};

// 清空所有共享
const clearAllFiles = () => {
  try {
    var list = FileDb.listFiles();
    list.forEach(function(f) { FileDb.removeFile(f.name || f.id); });
  } catch (e) { console.error("clearAll error:", e); }
};

window.api = {
  updateSetting: updateSetting,
  getSetting: Setting.getSetting,
  getUrl: Setting.getUrl,
  startServer: Server.startServer,
  stopServer: Server.stopServer,
  getServerStatus: Server.getServerStatus,
  openFile,
  registryEventListener: EventDispatcher.registryEventListener,
  addFile: (f) => FileDb.addFile(f),
  removeFile: (n) => FileDb.removeFile(n),
  listFiles: () => FileDb.listFiles(),
  getIp: IpUtil.getIp,
  getIpAddress: IpUtil.getIpAddress,
  getIpAddresses: IpUtil.getIpAddresses,
  getNetInterfaceNames: IpUtil.getNetInterfaceNames,
  setIpFamily: IpUtil.setIpFamily,
  setNetInterface: IpUtil.setNetInterface,
  getIpFamily: IpUtil.getIpFamily,
  getNetInterface: IpUtil.getNetInterface,
  getToken: Server.getToken,
  getPlatform: PlatformAdapter.getPlatform,
  addFilesFromPage: addFilesFromPage,
  addDropFiles: addDropFiles,
  selectFiles: selectFiles,
  clearAllFiles: clearAllFiles,
};
