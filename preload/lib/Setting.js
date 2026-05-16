const db = require("./Database");

const STORAGE_KEY_SETTING = "file_share_setting";

const defaultSetting = {
  port: 16888,
  password: "",
};

let currentSetting = null;

const Setting = {
  getSetting() {
    if (currentSetting) return currentSetting;
    const adapter = db.getAdapter();
    const stored = adapter ? adapter.getStorageItem(STORAGE_KEY_SETTING, null, false) : null;
    if (stored && typeof stored === "object") {
      currentSetting = { ...defaultSetting, ...stored };
    } else {
      currentSetting = { ...defaultSetting };
    }
    return currentSetting;
  },

  getAutoStart() {
    const s = this.getSetting();
    return s?.autoStart === true;
  },

  getUrl() {
    const s = this.getSetting();
    if (!s) return null;
    // Will be set by server when it starts
    return s._url || null;
  },

  updateSetting(newSetting) {
    return new Promise((resolve, reject) => {
      try {
        const merged = { ...this.getSetting(), ...newSetting };
        const adapter = db.getAdapter();
        if (adapter) adapter.setStorageItem(STORAGE_KEY_SETTING, merged, false);
        currentSetting = merged;
        resolve(merged);
      } catch (e) {
        reject(e);
      }
    });
  },

  setUrl(url) {
    const s = this.getSetting();
    if (s) s._url = url;
  },
};

module.exports = Setting;
