# 验证记录 · 2026-10-21

## 已通过

- TypeScript：`pnpm exec tsc --noEmit`，通过。
- ESLint：`pnpm lint`，通过。
- Vitest：15 个测试文件，102 项通过。覆盖原有逻辑及新增机翻字节限制、取消、配额错误、中文实体解码、CSV 转义、Anki 格式、Chat Completions / Responses 对话载荷、追问历史、缺少 Key 的提示和失败重试。新增模型接口异常响应、HTTP 401、异常条目的回归测试，先复现 `Cannot read properties of undefined (reading 'filter')` 再验证修复。
- Playwright：7 项端到端测试通过。覆盖网页选区浮窗、快捷键、固定/关闭、设置，以及免费短语翻译 → 两轮 AI 追问 → 收藏原文/译文/对话 → 下载并检查 Anki 文件内容。网络回复使用测试桩，浏览器使用独立临时配置。
- Windows x64 原生 release 构建成功，使用工作目录内独立安装的 Rust 和已有 Visual Studio C++ 工具。构建保留了上游的 16 条编译警告，没有用禁用警告掩盖问题。
- 真实 Windows 桌面验证通过：启动编译出的 NextAI → 在独立 RichTextBox 测试进程里实际拖选 `take ownership` → 自动显示 NextAI 取词图标 → 实际鼠标点击图标 → 桌面浮窗接收原选区 → 调用真实 MyMemory 服务并显示译文。测试完成后退出测试进程，恢复原鼠标位置和前台窗口。

模型列表修复后重新通过类型检查、lint、102 项单测并重新构建 Windows 程序。随后发现通知组件从 `react-hot-toast/headless` 订阅，而调用方从 `react-hot-toast` 发送，导致保存已完成但成功提示不可见。统一入口后，新增真实设置页回归测试通过：点击保存、出现 Saved 提示、读回修改后的地址；全部 8 项浏览器端到端测试通过。独立原生实例的配置临时文件写入、替换和读回也通过。真实桌面取词验证来自此前版本；用户的真实服务 Key 和 AI 调用尚未验证。

`browser-ui-preview.png` 为完整功能测试的真实界面截图，API 内容来自测试桩。`native-ui-preview.png` 为桌面版调用真实机翻后的 WebView2 界面截图。`native-verification.json` 记录桌面测试步骤。它们不代表对所有 Windows 应用的兼容性保证。

## 仍需使用时验收

- 你的 OpenAI 兼容服务：尚未提供真实 Key，AI 连续追问已验证请求和界面流程，但未用实际账户调用。
- Anki 原生客户端导入、复习和同步：已验证导出格式与文件内容，没有运行 Anki 客户端导入。
- 你日常使用的全部应用、受保护 PDF、提权应用、远程桌面和混合 DPI 多屏。

## 来源与依赖

- 上游源码：[nextai-translator/nextai-translator](https://github.com/nextai-translator/nextai-translator)，本次下载的 main 快照。原始源码 ZIP 的 SHA-256：`0369956D27AB514DB9B7A58DCCE2B5BCFFBF377E9A46E3F6241D1798DB5508AF`。
- 本地 fork 保留原 UI / 取词方式，修改翻译引擎、收藏译文保存、导出和追问。应用配置改用独立标识 `local.nextai.study`，不迁移或重命名已有官方配置目录。
- 为解决上游语音依赖下载脚本停滞，使用其官方 v1.13.4 Windows x64 静态库 archive。实际下载大小 119,847,445 字节，SHA-256 与 GitHub 官方 release asset 的 digest 一致：`d81bd1d25112540862d2387072e76b2b6843ef962918d6b5c7db5a19c6276b4c`。
- 所有构建工具和缓存放在本任务工作目录，未修改系统 PATH。打包文件的 SHA-256 见 `SHA256SUMS.txt`。


## 2026-10-22 翻译与朗读卡住修复

- 修复前：模拟原生请求永不返回时，主翻译取消/超时和本地 TTS 三项回归均失败（测试超时）；修复后通过。
- 最终类型检查、lint、111 项测试通过。8 项浏览器端到端检查通过；浏览器接口使用测试桩。
- 最终 Windows release 构建成功。实际桌面输入 `mammoths`，真实 MyMemory 服务返回“猛犸象”。
- 点击原文朗读，真实 Windows SpeechSynthesis 发出 start/end 事件，无 error，按钮恢复；未录制或主观确认扬声器音量。
- 原生窗口配置更新验证通过；本机模拟 API 接收到模型 `gpt-6-luna`，返回 503 后界面显示错误并停止等待。此项不代表用户真实 AI 服务验收。
- 当次检查 `127.0.0.1:18080` 拒绝连接，当前保存配置未包含 API Key；没有读取或输出其他位置的凭据。
- 新回归覆盖：永久等待、取消、迟到结果、系统朗读开始/结束/错误/启动超时、独立设置窗口同步。


## 2026-10-22 按需 AI 再译及窗口恢复

- 新增“✦ AI 再译”，仅点击时调用 OpenAI 兼容配置；保留机翻和默认引擎，回答进入同一追问上下文，可连同对话收藏。
- 修复原生流请求忽略 Result::error 的问题：连接失败会显示真实错误。监听注册完成后再发送请求，避免快速响应首条/结束事件丢失。
- 失败测试已复现，再译按钮及两项原生流回归修复后通过。最终 TypeScript、lint、114 项测试、8 项浏览器端到端测试通过；浏览器 AI 内容由测试桩提供。
- 再次打开 EXE 会唤回窗口；--silently 保持静默。Windows release 构建成功。
- 独立记事本真实选中短语后按钮未出现；鼠标库用空 MSG 指针读取消息。改为 Windows 标准 GetMessageW 消息循环，保留现有取词与浮窗处理，并按按下到松开的位移识别快速拖选。
- 用户保存退出后，已替换最终 EXE（SHA-256：fba0480529a1c377fdd455379d977a4c4e23a301c20d650f030dadc21dd09955）。真实记事本快速拖选 take ownership → 显示小按钮 → 鼠标点击按钮 → 桌面接收到原文 → 真实 MyMemory 返回“取得所有权”，AI 再译按钮可见。
- 原生桌面使用本机模拟 Responses SSE 服务验证：点击 AI 再译、保留机翻结果、继续追问、第二轮包含上一轮回答、请求模型为 gpt-6-luna，默认提供商仍为 MyMemory；已恢复原始配置，未消耗真实 AI 额度。
- 主窗口关闭后原生可见性为 false；--silently 再启动仍为 false；普通再启动变为 true，且只有一个主进程。
- 实际 AI 服务仍未配置可用 Key，127.0.0.1:18080 当次检查拒绝连接。
