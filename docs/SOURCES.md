# 研究来源

本项目实现独立编写，参考了以下项目的架构与 TRAE 选择器信息。未将其完整应用、图片库或许可证文本替换为本项目自己的声明。

- Dream Work Theme，研究快照 `0a5f2fa97f5379b0fce18f6a07280746eccfc6f9`：https://github.com/xxxhh336/dream-work-theme
  - 应用注册、安装发现、CDP 接入、`buildVsCodeWorkCss` 中的 TRAE 部件名称。
  - 上游许可证 Apache-2.0；如后续直接移植代码，需要随代码保留相应许可证与声明。
- Codex Dream Skin，研究快照 `34335d27d54300eccb325cc652f6c93fef428b84`：https://github.com/Fei-Away/Codex-Dream-Skin
  - 主题数据、部件契约、失配降级、应用验证与回退的设计思路。
  - 上游许可证 MIT；如后续直接移植代码，需要保留相应版权与许可声明。

`.research/` 保存研究时获取的仓库，仅用于参考，已加入 gitignore，不属于运行应用所需文件。

`assets/snow-ink.jpg` 为用户在本次会话中提供的原始图片。未生成或修改图片内容，仅通过 CSS 在预览和主题中裁切、遮罩。当前将其作为个人本地参考素材；未假定具备公开再分发授权。

本机研究对象：`D:\SoftWare\Trae CN\Trae CN.exe`。安装目录包含 Agent 工作台页面 `resources/app/out/vs/code/electron-browser/solo/solo-lite.html`；部件类名参考该安装中的 `@byted-icube/solo-lite/dist/`。没有运行客户端读取 DOM，运行时适配仍待本机验收。

TRAE CN 界面结构参考官方文档：
- Agent 窗口快速开始：https://docs.trae.cn/ide_get-started-with-the-agent-window
- TRAE 快速开始（Agent / IDE 窗口、IDE / SOLO 模式）：https://docs.trae.cn/ide_get-started-with-trae
- 对话（侧边对话面板）：https://docs.trae.cn/ide_chat
