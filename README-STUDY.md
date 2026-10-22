# NextAI Study

直接基于 [NextAI Translator](https://github.com/nextai-translator/nextai-translator) 修改，保留原项目的 UI、桌面划词浮窗、主题和设置。新增免费机翻、短语收藏、AI 连续追问与 Anki 导出。

Windows 包解压后双击 **NextAI-Study.exe**。需要 Windows 10/11 x64 和 WebView2 Runtime；无需安装 Node.js 或 Rust。可执行文件未做代码签名。桌面原文输入区默认缩为四行，窗口仍可调整大小。

## 日常使用

1. 退出旧版 WordDock 或其他同时使用的划词翻译工具，再启动此版本。
2. 在浏览器、编辑器等应用里拖选或双击选中单词/短语，点击旁边出现的 NextAI 小图标，打开翻译浮窗。无需自己复制到应用里。
3. 默认引擎是 **MyMemory 免费机翻**，不需要 Key。每次最多 500 UTF-8 字节，服务额度和可用性以服务方为准；超额或失败会显示错误，不会偷偷调用付费 AI。
4. 译文下方点击 **☆ 收藏单词 / 短语**。本版本可以收藏短语，保存完整译文；已收藏的项目再次点击会取消收藏。
5. 需要时点击 **✦ AI 再译**：保留机翻结果，展开 AI 对话并重新翻译原文；平时不会自动调用 AI，也不改变默认引擎。随后可在 **✦ AI 追问** 中继续提问。也可以直接展开 **✦ AI 追问**，提问含义、语气、语法、例句等。每轮都包含原文、译文和当前对话。点击 **收藏翻译和这段对话** 可将对话一起保存到生词本。
6. 点击原文下方的生词本图标，展开复习、CSV 导出和 **Anki 导出**。

划词能力沿用 NextAI 的实现。Windows 下会自动借助复制快捷键读取选区并尝试恢复原有文本/图片剪贴板；富文本等其他格式不保证完整恢复。图片里的文字、禁止复制的内容、提权运行的软件等不保证可以划词，可使用原项目的截图/OCR功能。浏览器扩展只覆盖网页；桌面版才负责跨应用取词。

## 朗读与请求超时

朗读默认使用 Windows 已安装的系统声音（TTS → System Default），无需首次下载模型。可自行选择 Local TTS；语音合成超过 30 秒会结束等待并提示错误，模型下载也设置了连接和总时限。系统声音启动失败或超过 10 秒没有启动时会提示错误。

翻译请求超过 60 秒会结束等待，切换选区会取消旧请求，旧结果不会覆盖当前译文。独立设置窗口保存后，翻译窗口会立即读取新配置；按动作设置的提供商和模型仍然优先。

## 稍后配置 AI

设置中即使选择 MyMemory，也可以填写下方的 OpenAI 兼容配置，留空不影响机翻。

- **API Key**：填写自己的 Key。
- **API URL**：填写服务根地址，例如 `https://your-provider.example`。
- **API URL Path**：常见为 `/v1/chat/completions`。如果服务方给你 `https://your-provider.example/v1`，通常把 `/v1` 留在 Path，避免重复。
- **API Model**：填写服务方的完整模型名；可使用自定义模型。

新增的 AI 追问使用这组 OpenAI 兼容配置。要让主翻译功能也使用 AI，可把翻译引擎切换到 OpenAI，或使用原项目的按动作配置功能。润色、总结等功能需要 AI，MyMemory 只处理翻译。AI 请求会发送原文、译文和对话到你设置的服务，费用按服务方计费。

切换入口：齿轮设置 → 通用 → 默认服务提供商 → OpenAI → 填好配置 → 保存。如果模型下拉框报错，先检查 API URL、密钥和模型列表权限；服务不支持标准 `/v1/models` 时，勾选“无模型 API 支持”并保存，然后在模型框手动填写服务方的模型名。这只跳过模型列表查询，翻译依然使用 AI。

API Key 沿用 NextAI 的本地 JSON 配置存储，未新增 Windows 凭据库加密。请保护本地配置目录，不要把含 Key 的配置文件发给别人。没有必要把 Key 发在本次聊天中。

## 导出到 Anki / CSV

- 桌面端导出文件写入 Windows **桌面**。浏览器扩展使用浏览器下载。
- **Anki 导出**生成 UTF-8 文本文件，Front 为原文，Back 为译文和保存的追问记录。Anki 桌面端选择“文件 → 导入”，选择基础/Basic 等两字段笔记类型，并在导入预览中确认字段对应。文件头包含 Tab 分隔和 HTML 设置。它是可导入文本，不是 `.apkg` 包。
- Anki 可以按首字段识别重复笔记，导入时确认更新/忽略选项，避免意外覆盖已有内容。参见 [Anki 官方导入说明](https://docs.ankiweb.net/importing/text-files.html)。
- **CSV** 导出保留原词库字段，修复引号、换行和中文 BOM，并对公式样式的内容加前置单引号，以避免在电子表格里作为公式执行。

## 数据与版本

本地改版使用独立的应用标识 `local.nextai.study`。配置位于应用自己的配置目录，Windows 通常是 `%APPDATA%\local.nextai.study`；生词本沿用 NextAI 的本地数据库。不会自动迁移或删除官方 NextAI、旧 WordDock 的配置和生词。

本地改版已关闭启动时检查官方更新，避免被未修改的上游版本覆盖。没有配置自动启动；是否启用由设置决定。原项目的其他网络访问、统计和第三方服务行为未做全面审计。

## 源码与构建

源码包包含完整的修改后项目及原许可证。原项目采用 AGPL-3.0；保留其品牌资源和版权说明。上游：[nextai-translator/nextai-translator](https://github.com/nextai-translator/nextai-translator)。

常规构建需要 Node.js、项目声明的 pnpm 9.1.3、Rust stable、Visual Studio C++ 构建工具、Windows SDK 和 WebView2 Runtime。在源码目录执行：

```powershell
pnpm install --frozen-lockfile
pnpm build-tauri-renderer
pnpm exec tauri build --no-bundle --target x86_64-pc-windows-msvc
```

原项目的 Sherpa ONNX 语音依赖会在首次原生构建时下载约 120 MB 的官方库。如下载脚本受网络影响，可从官方同版本发布页取得 archive，校验后通过 `SHERPA_ONNX_ARCHIVE_DIR` 指向 archive 所在目录再构建；不需要改依赖源码。

验证命令：`pnpm exec tsc --noEmit`、`pnpm lint`、`pnpm exec vitest run --threads=false`、`pnpm test:e2e`。端到端测试可通过 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指定已安装的测试 Chromium。

详细验证结果见随包的验证记录。`browser-ui-preview.png` 是真实 React 界面截图，翻译与 AI 回复来自测试桩；不是实际 AI 服务的验收证据。
