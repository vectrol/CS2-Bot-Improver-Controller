# CBIC — CS2-Bot-Improver-Controller

基于 [CS2-Bot-Improver v1.4.3](https://github.com/ed0ard/CS2-Bot-Improver)（AGPL-3.0）二次开发的 Electron 控制器。保留上游插件整合包，内置一键安装、模式/难度/机器人项目管理、命令浏览器，并支持自动检测上游插件与控制器自身的版本更新。

## 功能

- **一键安装插件整合包** — 内置 v1.4.3 完整插件包（addons / cfg / overrides / backup），自动检测 CS2 目录（Steam 注册表 + libraryfolders.vdf），实时进度条安装，装完自动套用中等难度 + 人机模式
- **游戏模式** — 人机 / 在线切换（gameinfo.gi 替换 + Steam 启动项 `-insecure` 管理），一键启动 CS2（检测 Steam 是否运行）
- **难度** — 简单 / 中等 / 困难（botprofile.vpk），自动识别当前难度
- **机器人项目** — 皮肤外观（BotRandomizer + core.json）、Steam 资料（BotHider）开关
- **预设** — 瞄准模式、投掷物频率、投刀按键与刀型
- **命令浏览器** — Commands.txt 分区筛选、收藏、搜索高亮、命令说明、CT/T 阵容标注、**自定义命令区块**（增/删/编辑）
- **外观自定义** — 6 种主题色预设 + 自定义色值、紧凑模式、窗口置顶
- **Steam 启动选项** — 自定义启动参数（自动合并 -insecure）
- **数据备份** — 导出/导入设置、收藏与自定义命令（JSON）
- **操作日志** — 记录安装/模式/难度等操作历史（最多 100 条，可清空）
- **包完整性** — 内置整合包 SHA-256 校验，损坏包拒绝安装；安装失败自动回滚
- **首页快捷操作** — 飞碟模式/重开对局/重随皮肤等常用命令一键复制
- **版本检查** — 启动自动检查上游插件包与 CBIC 控制器 GitHub Release，发现新版首页横幅提示
- **卸载** — 一键移除全部插件文件并恢复在线模式
- 简体中文 / 繁體中文 / English 三语，暗色主题 + SVG 图标（lucide-react），流畅 CSS 动画（含启动水印），快捷键 Ctrl+1/2/3 切换页面

## 使用

从 [Releases](https://github.com/vectrol/CS2-Bot-Improver-Controller/releases) 下载安装包（内置插件整合包约 140MB）。运行后选择 CS2 的 `game/csgo` 目录，点击「一键安装」→「启动 CS2」即可。

## 开发

```bash
npm install          # 自动执行 prepare（内置包来自 resources/CS2BotImprover.zip）
npm run dev          # 开发模式（tsc + vite + electron）
npm run build        # 构建（tsc + vite）
npm run dist         # 打包 NSIS 安装程序（release/）
npm test             # 逻辑测试（test-controls）
```

内置整合包来源（不随 git 分发，首次安装需手动准备）：

```bash
# 下载上游 v1.4.3 的 CS2BotImprover.zip 后执行：
$env:CSBIP_ZIP = "D:\path\to\CS2BotImprover.zip"; npm run prepare
```

## 测试

- `scripts/test-controls.cjs` — 模式/难度/机器人项目/预设/投刀逻辑
- `scripts/test-install.cjs` — 一键安装 + 卸载管线（Electron 环境）
- `scripts/test-ui.cjs` / `scripts/test-commands.cjs` — 界面冒烟
- `scripts/test-updates.cjs` — 版本检查（Electron 环境，需网络）

## 许可

[AGPL-3.0](LICENSE)，与上游一致。本控制器仅供离线人机对局 / 私人服务器使用。
