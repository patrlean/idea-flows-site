# Idea Flows Site

用 ChatGPT Sites 生成属于自己的 Idea 看板。

[![使用此模板](https://img.shields.io/badge/%E4%BD%BF%E7%94%A8%E6%AD%A4%E6%A8%A1%E6%9D%BF-111827?style=for-the-badge&logo=github)](https://github.com/patrlean/idea-flows-site/generate)
[![English](https://img.shields.io/badge/English-e5e7eb?style=for-the-badge)](README.md)

把想法、调研、开发进展、已上线作品和暂时放下的方向，整理成持续更新的项目索引。可以通过站点自己的 ChatGPT 插件更新，也可以接入 [Idea Flows Hook](https://github.com/patrlean/idea-flows-hook)，同步指定本机 Codex 项目的进展。

## 最快开始

在可用 **Sites** 的 Codex 或 ChatGPT Work 对话里复制下面这段：

> @Sites 请使用 https://github.com/patrlean/idea-flows-site 作为模板，创建我自己的 Idea Flows 站点。先阅读 AGENTS.md 与 docs/DEPLOY.md，保留现有界面、五种状态、卡片操作和动画。新建属于我的独立站点与存储，首次使用空看板，默认仅我可访问。缺少必要的账户连接时再提示我，其他设置先用模板默认值。运行检查，通过 Sites 正式发布，验证实际网址和 MCP 工具后返回站点链接，并帮助连接本站插件。不要复用模板作者的站点 ID、项目数据或凭据。

也可以先点击 **Use this template → Create a new repository**，再用 Codex 打开自己的仓库。[完整发布指南 →](docs/PUBLISH.zh-CN.md)

需要你的账户或工作区可用 Sites。复制 GitHub 仓库本身不会自动部署网站；本项目不需要额外模型 API Key，也不附带托管账户或额度。[Sites 官方介绍](https://developers.openai.com/training/walkthroughs/building-a-shareable-site)

## 包含什么

- 🗂️ **五种状态**：想法、调研、开发中、已上线／完成、已归档。
- ✏️ **卡片内操作**：直接改状态、归档、恢复和关联来源对话。
- ↗️ **来源跳转**：打开真实 ChatGPT 对话、本地 Codex 聊天／工作区和已验证的网址。
- 🎞️ **切换动画**：分类与卡片变化有过渡，尊重减少动态效果设置。
- 💬 **站点自己的插件**：读取想法、同步进展、补充对话关联。
- 🔌 **本机 hook 接收端**：可对接独立开源的 Idea Flows Hook。
- 🧩 **干净的初始环境**：不含作者的部署标识、个人卡片、聊天记录和凭据。

界面文案为简体中文。中英文文档分开，站点名称、左侧标识、标题分行、日期格式与时区均可调整。

## 本地运行

需要 **Node.js 20+**，没有 npm 依赖需要安装：

```sh
git clone https://github.com/patrlean/idea-flows-site.git
cd idea-flows-site
npm run dev
```

打开终端输出的本机网址，首次为空看板。要看虚构演示卡片，先停止前一个服务，再运行：

```sh
npm run demo
```

自己的本地记录与演示数据分开保存在 `.local/`，不进入 Git 或部署产物。生产站点始终从空看板开始。

## 换成自己的名字

```sh
npm run setup -- --title '我的想法' --eyebrow 'MY / IDEAS' --timezone 'Asia/Shanghai'
```

也可以直接编辑 [site.config.json](site.config.json)。`locale` 只控制日期，不会自动翻译界面。

| 位置 | 用途 |
| --- | --- |
| `site.config.json` | 名称、描述、左侧标识、标题、日期格式与时区。 |
| `.openai/hosting.json` | 存储和 MCP 声明；新建站点后再保存自己的部署 ID。 |
| `AGENTS.md` | 让 Codex / Sites 理解如何生成和发布站点。 |
| `docs/DEPLOY.md` | 发布、插件连接、hook 对接与访问边界。 |
| `examples/ideas.json` | 仅用于本地演示的虚构卡片。 |

## 发布为 GPT 站点

让 Sites 按仓库里的指引新建站点，保存实际返回的 `project_id`，通过源码、构建和部署流程发布。Sites 配置独立的 R2 存储并处理 ChatGPT 身份认证。

```sh
npm run check
npm run check:publish
```

模板尚未登记站点时，`check:publish` 会按设计报错；先让 Sites 创建你的站点。普通测试和构建不需要部署 ID。这是有服务器 API 的应用，不能只上传到 GitHub Pages。

默认保持站点仅自己可访问。一份站点对应一份共享看板：允许访问的人共享看板和操作权限，不是每个人独立隔离的 SaaS 产品。

## 连接 Codex hook

只用 ChatGPT 更新时，连接站点生成的插件即可。要同步指定本机 Codex 目录，再安装 [Idea Flows Hook](https://github.com/patrlean/idea-flows-hook)，按 [连接指南](docs/DEPLOY.md#optional-native-codex-hook) 配置自己站点的 `/api/sync`、同步密钥和 Sites 服务访问凭据。

调研完成不等于上线；已上线必须有验证依据；归档需要用户明确指令；手动状态优先。

## 开发检查

```sh
npm run check
```

包含认证、空看板、首次 hook 同步、调研状态、去重、并发、手动状态优先、交付验证、对话关联、配置转义与发布前检查。CI 配置覆盖 Linux、macOS、Windows 的 Node 20/24。每个使用者仍需单独验证自己站点的真实部署结果。

MIT · [patrlean](https://github.com/patrlean)
