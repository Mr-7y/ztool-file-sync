const os = require("os");
const db = require("./Database");

// IP utility
const STORAGE_KEY_IP_FAMILY = "file_share_ip_family";
const STORAGE_KEY_NET_INTERFACE = "file_share_net_interface";

const IpUtil = {
  getIp() {
    const family = this.getIpFamily();
    const iface = this.getNetInterface();
    const nets = os.networkInterfaces();
    const filterFamily = family === "IPv6" ? "IPv6" : "IPv4";
    if (iface && nets[iface]) {
      const addr = nets[iface].find((n) => n.family === filterFamily && !n.internal);
      if (addr) return addr.address;
    }
    for (const name of Object.keys(nets)) {
      const addr = nets[name].find((n) => n.family === filterFamily && !n.internal);
      if (addr) return addr.address;
    }
    return "127.0.0.1";
  },

  getIpAddress() {
    return this.getIpAddresses();
  },

  getIpAddresses() {
    const family = this.getIpFamily();
    const iface = this.getNetInterface();
    const nets = os.networkInterfaces();
    const filterFamily = family === "IPv6" ? "IPv6" : "IPv4";
    const result = [];
    if (iface && nets[iface]) {
      nets[iface].forEach((n) => {
        if (n.family === filterFamily && !n.internal) result.push(n.address);
      });
    }
    for (const name of Object.keys(nets)) {
      nets[name].forEach((n) => {
        if (n.family === filterFamily && !n.internal && !result.includes(n.address)) {
          result.push(n.address);
        }
      });
    }
    return result;
  },

  getNetInterfaceNames() {
    return Object.keys(os.networkInterfaces()).filter(name => {
      return os.networkInterfaces()[name].some(n => !n.internal);
    });
  },

  setIpFamily(family) {
    const adapter = db.getAdapter();
    if (adapter) adapter.setStorageItem(STORAGE_KEY_IP_FAMILY, family);
  },

  setNetInterface(name) {
    const adapter = db.getAdapter();
    if (adapter) adapter.setStorageItem(STORAGE_KEY_NET_INTERFACE, name);
  },

  getIpFamily() {
    const adapter = db.getAdapter();
    return adapter ? adapter.getStorageItem(STORAGE_KEY_IP_FAMILY, "IPv4") : "IPv4";
  },

  getNetInterface() {
    const adapter = db.getAdapter();
    return adapter ? adapter.getStorageItem(STORAGE_KEY_NET_INTERFACE, null) : null;
  },
};

module.exports = IpUtil;
