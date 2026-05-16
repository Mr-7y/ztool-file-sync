const { Database } = require("../lib");
const { machineIdSync } = require("node-machine-id");

// 区分不同设备的存储
let nodeId = null;
function getMachineId() {
  if (nodeId == null) {
    nodeId = machineIdSync(true);
  }
  return nodeId;
}

// 设置数据库适配器
class ZtoolsDatabaseAdapter {
  getStorageItem(key, defaultValue = null, machineUnique = true) {
    if (key.indexOf(":") === -1 && machineUnique) {
      key = key + ":" + getMachineId();
    }
    let value = ztools.dbStorage.getItem(key);
    // 存在直接返回
    if (value !== undefined && value !== null) {
      return value;
    }
    // 不存在且没有默认值
    if (defaultValue === undefined || defaultValue === null) {
      return null;
    }
    // 使用默认值
    if (typeof defaultValue === "function") {
      defaultValue = defaultValue();
    }
    this.setStorageItem(key, defaultValue, machineUnique);
    return defaultValue;
  }

  setStorageItem(key, value, machineUnique = true) {
    if (key.indexOf(":") === -1 && machineUnique) {
      key = key + ":" + getMachineId();
    }
    ztools.dbStorage.setItem(key, value);
  }

  removeStorageItem(key, machineUnique = true) {
    if (key.indexOf(":") === -1 && machineUnique) {
      key = key + ":" + getMachineId();
    }
    return ztools.dbStorage.removeItem(key);
  }
}

// 创建平台适配器对象
const PlatformAdapter = {
  dbStorage: ztools.dbStorage,
  onPluginEnter: ztools.onPluginEnter,
  onPluginOut: ztools.onPluginOut,
  onPluginReady: ztools.onPluginReady,
  getPlatform: () => {
    return "ztools";
  },
  initDatabaseAdapter: () => {
    // 设置适配器
    Database.setAdapter(new ZtoolsDatabaseAdapter());
  },
};

module.exports = PlatformAdapter;
