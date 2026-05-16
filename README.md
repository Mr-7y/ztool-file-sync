# File Sync

一个基于局域网的文件同步工具，可以在多个设备之间实时同步文件，特别适合在没有云服务或U盘的情况下快速传输文件。

## 功能特性

- **文件监听**: 实时监控指定目录的文件变化（新增、修改、删除）
- **局域网发现**: 自动发现同一局域网内的其他同步节点
- **自动同步**: 在节点之间自动同步文件变更
- **轻量服务端**: 内置HTTP/Socket服务器用于文件传输
- **设置持久化**: 保存用户配置（如同步路径、端口等）

## 技术架构

- **前端**: HTML + JavaScript
- **后端**: Node.js
- **运行时**: Electron
- **网络通信**: HTTP/WebSocket
- **数据存储**: 自定义文件型数据库

## 项目结构

```
file-sync/
├── preload/              # Electron预加载脚本
│   ├── lib/              # 核心库文件
│   ├── utils/            # 工具类
│   └── index.js          # 预加载入口
├── index.html            # 应用主界面
├── package.json          # 项目配置
├── plugin.json           # 插件配置
├── BUILD.md              # 构建说明
├── USAGE.md              # 使用说明
├── build.js              # 构建脚本
└── preload.bundle.js     # 预加载脚本打包文件
```

## 安装与使用

1. 克隆项目到本地：
   ```bash
   git clone <repository-url>
   cd file-sync
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 启动应用：
   ```bash
   npm start
   ```

详细使用说明请参阅 [USAGE.md](./USAGE.md)。

## 构建

构建说明请参阅 [BUILD.md](./BUILD.md)。

## 开发

本项目使用Electron构建跨平台桌面应用，采用模块化设计，各个功能模块位于 [preload/lib/](./preload/lib/) 目录下：

- [Database.js](./preload/lib/Database.js): 数据库管理
- [EventDispatcher.js](./preload/lib/EventDispatcher.js): 事件分发器
- [FileDb.js](./preload/lib/FileDb.js): 文件数据库
- [FileUtil.js](./preload/lib/FileUtil.js): 文件操作工具
- [IpUtil.js](./preload/lib/IpUtil.js): IP地址工具
- [Server.js](./preload/lib/Server.js): 服务器模块
- [Setting.js](./preload/lib/Setting.js): 设置管理
- [PlatformAdapterInstance.js](./preload/utils/PlatformAdapterInstance.js): 平台适配器

## 许可证

请参阅 LICENSE 文件获取许可证信息。