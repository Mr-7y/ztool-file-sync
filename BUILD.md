# FileShare — ZTools 插件打包指南

## 项目结构

```
file-sync/
├── plugin.json              # 插件配置
├── index.html               # 插件主页（UI）
├── logo.png                 # 插件图标（64x64）
├── USAGE.md                 # 使用文档
├── BUILD.md                 # 本文件 — 打包指南
├── build.js                 # 打包脚本：编译 → 压缩 → dist/
├── package.json             # 根目录包（esbuild + archiver）
├── dist/
│   └── file-share.zip       # 构建产物（655KB，拖入 ZTools 安装）
├── preload/                 # 源代码（编译后不再进 zip）
│   ├── index.js             # 入口
│   ├── lib/                 # 模块
│   ├── utils/               # ZTools 适配器
│   └── node_modules/        # npm 依赖
└── preload.bundle.js        # esbuild 编译产物（gitignore 建议添加）
```

## 前置条件

- Node.js >= 16.0.0
- npm
- ZTools 桌面应用

## 安装依赖

```bash
# 根目录（编译工具）
npm install

# preload（运行时依赖）
cd preload && npm install
```

## 构建

```bash
cd file-sync
node build.js
```

输出 → `dist/file-share.zip`（**仅 4 个文件**，不包含 node_modules）

### 构建流程

| 步骤 | 工具 | 说明 |
|------|------|------|
| 编译 | esbuild | 将 preload 源码 + 所有 npm 依赖编译为 `preload.bundle.js`（2.5MB） |
| 打包 | archiver + zlib:9 | 只打包 plugin.json / index.html / logo.png / preload.bundle.js |
| 输出 | — | `dist/file-share.zip`（仅 655KB） |

> 因为用了 `esbuild` 编译，zip 里**不需要** node_modules，体积从 5MB 降到 655KB。

## 安装到 ZTools

1. 打开 ZTools
2. 输入 **已安装插件** → 插件管理
3. 将 `dist/file-share.zip` **拖入 ZTools 窗口**
4. 输入 `FileShare` / `FS` / `共享` 进入插件

## 开发注意事项

- 修改 `preload/` 下的源码后，需要重新 `node build.js` 再安装
- `plugin.json` 的 `preload` 字段指向 `preload.bundle.js`（编译产物）
- 开发时可以直接把 `preload` 路径改为 `preload/index.js` 调试

## 版本更新

1. 修改 `plugin.json` 中的 `version`
2. `node build.js`
3. 拖入 `dist/file-share.zip` 覆盖安装

## 常见问题

### Q: 窗口加载中 / 白屏
- 检查 `preload.bundle.js` 是否存在：`ls -lh preload.bundle.js`
- 重新执行 `node build.js`
- 查看 ZTools 日志

### Q: 编译错误
- 检查 preload 依赖：`cd preload && npm install`
- 可能是 esbuild 版本问题：`npx esbuild --version`

### Q: 服务器启动失败
- 检查端口 16888 是否被占用
- ZTools 日志查看 `Server start error`
