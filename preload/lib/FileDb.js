const { v4: uuidv4 } = require("uuid");
const db = require("./Database");
const EventDispatcher = require("./EventDispatcher");

const STORAGE_KEY_FILES = "file_share_files";

let files = null; // null = 未加载, [] = 空但已加载

const FileDb = {
  _load() {
    if (files !== null) return; // 已加载过，直接返回（包括空数组的情况）
    try {
      const adapter = db.getAdapter();
      const stored = adapter ? adapter.getStorageItem(STORAGE_KEY_FILES, [], false) : [];
      files = Array.isArray(stored) ? stored : [];
      console.log("FileDb._load(): loaded " + files.length + " files from storage");
    } catch (e) {
      console.error("FileDb._load() error:", e);
      files = [];
    }
  },

  _save() {
    try {
      const adapter = db.getAdapter();
      if (adapter) adapter.setStorageItem(STORAGE_KEY_FILES, files, false);
      console.log("FileDb._save(): saved " + files.length + " files");
    } catch (e) {
      console.error("FileDb._save() error:", e);
    }
  },

  addFile(fileInfo) {
    this._load();
    const entry = {
      id: uuidv4(),
      type: "file",
      name: fileInfo.name || fileInfo.path?.split(/[/\\]/).pop() || "unknown",
      path: fileInfo.path || fileInfo.name || "",
      size: fileInfo.size || 0,
      addedAt: Date.now(),
    };
    const existing = files.find((f) => f.path === entry.path && f.type === "file");
    if (!existing) {
      files.push(entry);
      this._save();
    }
    EventDispatcher.dispatchEvent("file-changed");
    return entry;
  },

  removeFile(nameOrId) {
    this._load();
    const idx = files.findIndex((f) => f.name === nameOrId || f.id === nameOrId);
    if (idx >= 0) {
      files.splice(idx, 1);
      this._save();
      EventDispatcher.dispatchEvent("file-changed");
      return true;
    }
    return false;
  },

  getFile(nameOrId) {
    this._load();
    return files.find((f) => f.name === nameOrId || f.id === nameOrId) || null;
  },

  listFiles() {
    this._load();
    return [...files];
  },

  getAll() {
    return this.listFiles();
  },
};

module.exports = FileDb;
