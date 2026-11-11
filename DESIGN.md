# Design System

## Context

这是 Obsidian 桌面插件的原生工具界面，不是网站。使用者在连续阅读与收集论文时打开短表单，窗口大小及明暗环境不固定，因此界面跟随宿主主题。

## Theme and color

继承宿主的 background、text、border 和 interactive-accent CSS 变量。强调色用于主操作、焦点和进行中状态，错误使用宿主 text-error。论文原图可能透明，保留单独的白色图像画布。不要将白底扩展到插件整体。

## Typography

继承 Obsidian 字体与 font-ui-small / medium / large 等尺寸。控件标签使用 medium 权重，说明文字保持可读，不使用全局字体覆盖。

## Layout

导入窗口最大宽度 620px，受视口宽度限制。主输入位于顶部，阅读深度紧随其后，保存位置与翻译状态在提交前可见。补充 DOI、PDF 直链和本地 PDF 收纳到原生 details。小窗口纵向排列，操作按钮易于点击。

## Components

- 导入表单使用 label、input、select、details 与 button。
- 结果提示区使用真实任务阶段，错误同时提供文本与边线，不只依赖颜色。
- 提交期间禁用表单，防止中途改参或重复提交；完成后恢复。
- 设置页分为导入设置与摘要翻译。关闭翻译时收起服务与密钥字段，说明仍可见。
- 无效目录使用行内提示，避免输入过程中不断弹出通知。

## Scope

样式限定于 pb-import、pb-settings 及对应模态窗口。现有阅读模板和个人仓库主题不在本次视觉修改范围内。本次深色主题视觉复核在独立测试仓库完成；浅色与窄屏仍待实机检查。
