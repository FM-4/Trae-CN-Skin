# 雪墨 · TRAE CN Skin

以用户提供的黑白漫画为参考，为 TRAE CN Agent 工作台编写的 Windows 主题管理应用。视觉方向是炭黑、银灰、右侧人物构图与局部玻璃，任务对话页降低背景强度。

**本轮完成了 TRAE CN 客户端适配与界面说明调整，未运行 Electron 或向 TRAE CN 注入。静态源码修改尚未经过运行兼容性验收。**

## 已编写的功能

- Electron 桌面壳、受限 preload、单实例、系统托盘。
- 主题与外观、应用连接、使用说明三个页面。
- 雪墨 / 静夜 / 银笺三个预设；首页与任务页效果示意。
- 背景强度、面板透明度、模糊、圆角、图片宽度与焦点、强调色调节。
- JSON 参数校验、用户数据目录持久化、临时文件替换写入。
- 默认发现或手动选择 `Trae CN.exe`。
- 本机 CDP 启动和连接；仅匹配所选 TRAE CN 安装目录下的 Agent 工作台 `solo/solo-lite.html` 页面。
- 部件映射、运行时样式与背景层、DOM 重建后重新标记。
- 多窗口顺序应用、每个窗口原状态快照、失败回退、连接恢复后补注入。
- 原生外观恢复与适配状态展示。

## 文件布局

```text
assets/snow-ink.jpg       用户参考图，原样保存
src/shared/theme.js      主题参数、预设和校验
src/main/main.js         Electron 窗口、托盘、IPC
src/main/preload.cjs     页面可调用的最小桥接 API
src/main/store.js        配置持久化
src/main/discovery.js    安装目录发现与校验
src/main/cdp.js          CDP 传输、超时与连接清理
src/main/controller.js   启动、应用、守护、回退与还原
src/runtime/adapter.js   TRAE 选择器契约
src/runtime/inject.js    自包含的页面注入函数
src/renderer/           管理界面及示意预览
docs/ARCHITECTURE.md     边界、状态和扩展点
docs/VALIDATION.md       本轮静态审阅与后续验收清单
docs/SOURCES.md          研究来源与素材说明
```

## 后续运行入口（本轮未执行）

使用 `npm start` 打开桌面应用。目前没有打包脚本或安装包配置。

选择 TRAE CN → 连接 / 启动 → 调整主题 → 保存参数 → 应用到 TRAE CN。保存参数不改变客户端；应用不会隐式保存。若 TRAE CN 已运行但未开启调试端口，需用户保存工作后手动完全退出再连接；不会强制结束进程。当前只覆盖 Agent 工作台，不覆盖 IDE 编辑器窗口。

关闭窗口收起到托盘。退出管理器停止补注入，但现有 TRAE CN 页面可能保留运行时样式；先点击还原可以清除。重启管理器后不会自动重新应用保存的主题。

## 当前范围

仅 Windows 国内版、静态本地图片和结构化参数。主题 ZIP、在线主题商店、任意 CSS / JS、快捷方式安装、开机自启、多平台及原生标题栏补丁不在这版实现中。未知页面保持低背景强度；组件缺失会报告基础适配，实际遮挡与文字对比仍需后续实机验收。
