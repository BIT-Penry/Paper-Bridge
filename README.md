# Paper Bridge

在 Obsidian 里粘贴 arXiv 链接、IEEE Xplore 链接或 DOI，即可创建一篇带有论文信息和原文摘要（如来源提供）的阅读笔记。插件会尝试把可访问的 PDF 和方法主图一起存进论文文件夹。基础导入无需 API Key。

**[下载插件 ZIP](https://github.com/BIT-Penry/Paper-Bridge/releases/latest/download/paper-bridge.zip)** · [版本说明](https://github.com/BIT-Penry/Paper-Bridge/releases/latest) · [问题反馈](https://github.com/BIT-Penry/Paper-Bridge/issues)

## 安装

适用于 **Obsidian 桌面版 1.15.0 及以上**，安装包已构建好。

1. 下载上方的 `paper-bridge.zip` 并解压。
2. 把解压得到的整个 `paper-bridge` 文件夹放进**要使用插件的 Obsidian 仓库**的 `.obsidian/plugins/` 下。在 macOS 的 Finder 中可按 `⌘ + Shift + .` 显示隐藏的 `.obsidian` 文件夹。
3. 重新打开 Obsidian，在「设置 → 第三方插件」启用 **Paper Bridge**。如果列表里找不到它，检查文件路径是否为 `.obsidian/plugins/paper-bridge/manifest.json`。

## 导入第一篇论文

1. 点击左侧工具栏的下载图标，或打开命令面板，搜索「导入论文」。
2. 粘贴论文链接或 DOI，例如 `10.1109/LRA.2025.3546069`。第一次可以直接使用默认的「粗读」模板，按回车导入。
3. 打开生成的笔记。摘要在前，阅读提纲在后。插件按「年份-题目」建立文件夹，取得的 PDF 和主图与笔记放在一起。

```text
论文笔记/
└── 2025-Paper title/
    ├── Paper title.md
    ├── paper.pdf
    └── images/
        └── main-figure-fig1.png
```

目录按 `年份-题目` 命名。标签留空，由使用者填写。DOI 和 arXiv 编号用于查重，重复导入打开原笔记；同名但未确认是同一论文的目录不会合并或覆盖。

正文顺序为中文摘要、原文摘要、主图、阅读笔记。粗读包含：研究问题与贡献、方法与关键假设、实验证据与局限、关键公式解读、相关笔记。精读增加速览、方法拆解、训练部署、研究关联和复现记录。修改阅读深度属性不会重写已有正文。

### 使用自己的阅读模板

1. 在当前仓库新建一篇普通 Markdown 笔记，例如 `模板/我的复现清单.md`。正文写自己的问题、表格或待办清单：
   ```markdown
   ## 我想复现什么？
   - 对照原文哪张图？
   - [ ] 确认代码与数据版本

   ## 实验结果与差异
   ```
2. 打开 **设置 → Paper Bridge → 导入设置 → 自定义阅读模板 → 添加模板**，按文件名选中它。常用的可以设为「默认阅读模板」。
3. 下次导入时，在「阅读模板」中选择它。插件每次读取模板最新正文，放在摘要和主图之后；无需复制论文属性或编写占位符。模板自己的 YAML 属性不参与导入。

修改模板只影响之后新导入的论文。「移除」只取消登记，原模板与已有论文笔记都保留。如果移动或重命名模板文件，请重新添加新路径并移除旧路径。

## 可选：自动翻译中文摘要

在「设置 → Paper Bridge → AI 服务」配置一次，以后导入带原文摘要的论文时，就会在笔记顶部看到中文译文和原文对照。翻译默认关闭。

1. 选择 DeepSeek、Kimi、Qwen、MiniMax、GLM、Xiaomi MiMo、火山引擎，或选择「自定义」接入自己的 OpenAI 兼容服务。
2. 确认 Base URL、填写 API Key，点击「获取模型」后从下拉列表选择，也可以手动填写模型名。Base URL 填接口根地址，例如 `https://api.example.com/v1`。MiMo 和火山引擎请填写自己账号可用的模型。
3. 点击「验证并启用」。插件用一句示例文本测试翻译，成功后自动打开摘要翻译。已有论文可以在命令面板选择「为当前论文补充中文摘要」。

插件内置翻译提示词，要求保留原文中的术语、数值、公式和限定条件。译文会标明机器翻译，已有译文会保留。翻译失败时仍会创建阅读笔记。

API Key 保存在本设备的 Obsidian 钥匙串中，换设备需重新配置。获取模型时会向该服务请求模型列表；启用翻译后，会将原文摘要发送给所选供应商，可能产生 API 费用。远程接口须使用 HTTPS，本机接口支持 HTTP。

## PDF 与主图

优先使用原始来源提供的全文地址，并尝试核对标题与作者后匹配 arXiv 预印本；必要时查询 Semantic Scholar 开放全文地址。PDF 可能是预印本，版本和来源会写入属性。插件不读取浏览器登录凭据，也不绕过出版社访问权限。

主图根据 HTML 图注中 framework、architecture、schematic overview 等线索选择，不固定选第一张。下载到 `images/`，正文和 `cover` 共用该图。透明主图使用白底显示样式，原图保留。判断不唯一时，可执行“为当前论文拉取／选择方法主图”并按图注选择。

仅有 PDF、组合子图、SVG-only 图示、站点限流或页面结构变化时，可能无法自动获取主图。目前不从 PDF 自动裁图。支持 PNG、JPEG、GIF、WebP；主图上限 20 MB，PDF 上限 80 MB。

也提供“为当前论文重试下载 PDF／补全摘要”和“为当前论文补入本地 PDF”命令。

## 开发

需要 Node.js 18+，当前构建和测试无第三方依赖，不需要 `npm install`。

```sh
npm run build
npm run check
npm test
```

- `src/core.js`：元数据解析、模板、查重和图示候选规则。
- `src/main.js`：Obsidian 入口、保存、网络请求和设置。
- `scripts/build.cjs`：生成自包含 `main.js`。
- `tests/`：离线回归测试；不调用付费 API。
- `docs/release-checklist.md`：后续公开发布前的核对项。

已在全新 macOS / Obsidian 1.15.0 仓库中完成实际安装、独立设置页、两篇 arXiv 论文导入、自定义目录、粗读／精读、主图显示和重复导入验证。详见 [实机测试记录](docs/manual-test-2026-11-11.md)。真实翻译接口、其他出版社和跨平台场景仍待验证；尚未通过社区审核。

MIT License。论文 PDF、图片及摘要的权利归各自权利人，不包含在本仓库中。

供应商图标来自 [Lobe Icons](https://github.com/lobehub/lobe-icons)，MIT 许可。
