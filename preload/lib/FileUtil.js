const { execSync } = require("child_process");
const path = require("path");

const FileUtil = {
  openFile(filePath) {
    if (!filePath) return;
    const resolved = path.resolve(filePath);
    try {
      // Windows: use explorer to select/open the file
      execSync(`explorer /select,"${resolved}"`, { timeout: 5000 });
    } catch (e) {
      console.error("FileUtil.openFile error:", e.message);
    }
  },
};

module.exports = FileUtil;
