# 架构与实现边界

## 数据流

管理页面编辑 draft → shared 校验 → preload 的固定 IPC → 主进程再校验 → Controller → CDP → TRAE 页面。

保存走 Store，不经过 CDP。应用走 Controller，不改保存配置。页面读取到的是业务结果 `{ok,value}` 或 `{ok:false,error}`，不提供文件读写、任意 shell 或任意 CDP 方法。

主题只有已定义的数值、十六进制颜色、模式和内置图片引用；未知字段丢弃。主题数据不会携带脚本或任意 URL。背景以本地图片 data URL 注入，不启动资源 HTTP 服务。

## 连接生命周期

`idle → connecting → connected → applying → applied / partial`；连接丢失进入 `waiting`；异常进入 `error`；主动还原进入 `restored`。

默认端口 9341。仅接受 TRAE CN 的 `Trae CN.exe`，并在连接被拒绝时通过所选程序启动，传入 loopback 调试参数。只匹配所选安装目录里的 Agent 工作台 `solo/solo-lite.html` 页面；IDE 编辑器窗口不注入。CDP 可能返回 `file:` 或 TRAE 自定义 `vscode-file:` 页面 URL，匹配时统一校验路径前缀。已有服务但页面不匹配时停止；不会抢占端口或结束进程。文件路径和 renderer URL 联合过滤减少误注入，但不是密码学身份验证。生产化前需要验证目标 Electron 实际监听地址以及端口归属。

每次用户应用前校验所有数据、定位窗口、读取本地图片。逐窗口记录原主题后应用。图片无法解码或运行时安装标记未确认即进入回退。每个窗口恢复自己的快照，而不是假设所有窗口之前一致。若回退无法确认，停止守护并报告；不得报告恢复成功。

守护每三秒检查目标页面，串行执行，避免与用户操作重入。页面重载后重新注入；不注册永久的 `Page.addScriptToEvaluateOnNewDocument` 脚本，所以还原只需要停止守护与清除当前页面。其代价是页面刷新后可能短暂闪现原生外观，后续实机阶段再决定是否引入提前注入。

## 页面运行时

`installTheme` 必须完全自包含，主进程将函数序列化发送给 renderer。禁止增加闭包依赖或 Electron API。

运行时拥有一个 style、一个不可交互背景层、一个 MutationObserver 和节流定时器。原有 `data-tws-part` / `data-tws-mode` 值先记录后覆盖，还原时恢复原值。样式随 style 节点删除一并撤销，不改原有内联样式或主题设置。相同 revision 幂等；style 或背景被移除时允许重建。

主区域与输入框同时命中时报告 `full`，只表示这两个关键部件存在，不表示全页面适配或视觉验收通过。其他情况报告 `basic`。首页锚点命中才提高图片强度；未知页面默认任务强度。

适配器参考 TRAE CN 本机 Agent / SOLO 模块样式中的语义类名与上游选择器；尚未观察当前运行 DOM。后续可依据实际 DOM 扩充设置页、任务页、门户菜单、代码块等契约，避免通配所有后代或修改布局几何。当前不做第三方任意 Safe CSS 导入；结构化参数本身就是样式输入边界。

## 界面与素材

预览使用简化的桌面示意，不冒充 TRAE 截图。图片右置、局部遮罩、左侧低干扰；首页与任务分别配置强度。银笺用纸白与石墨，另外两套保持暗色。管理应用本身保持固定暗色以便对比预览。

Electron renderer 开启 sandbox 与 contextIsolation，关闭 nodeIntegration。CSP 限制网络与脚本来源；阻止打开外部窗口和页面跳转；IPC 校验调用 WebContents 和主 frame。

## 扩展顺序

1. 获准后解析依赖并生成 lockfile，先完成真实 DOM 与样式验收。
2. 引入可追溯的版本 profile 和局部计算样式断言。
3. 基于明确素材路径、大小、解码限制增加自选图片。
4. 根据需要增加 ZIP manifest 与 Safe CSS 白名单；不直接导入 Codex 的 DOM 选择器。
5. 最后再添加打包、签名、升级与分发配置。
