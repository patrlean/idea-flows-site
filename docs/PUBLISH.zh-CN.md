# 一段话生成自己的 GPT 站点

在启用了 **Sites** 的 Codex 或 ChatGPT Work 对话中复制：

> @Sites 请使用 https://github.com/patrlean/idea-flows-site 作为模板，创建我自己的 Idea Flows 站点。先阅读 AGENTS.md 与 docs/DEPLOY.md，保留现有界面、五种状态、卡片操作和动画。新建属于我的独立站点与存储，首次使用空看板，默认仅我可访问。缺少必要的账户连接时再提示我，其他设置先用模板默认值。运行检查，通过 Sites 正式发布，验证实际网址和 MCP 工具后返回站点链接。不要复用模板作者的站点 ID、项目数据或凭据。

也可以先在 GitHub 点 **Use this template → Create a new repository**，再用 Codex 打开自己的仓库，输入上面的要求。

模板不附带托管额度或 Sites 使用权限；需要你的账户可用 Sites，并按提示完成必要的账户连接。复制 GitHub 仓库不会自动部署网站。

## 本地先看效果

需要 Node.js 20+，没有 npm 依赖，也不需要模型 API Key：

```sh
npm run dev
```

打开终端输出的本机网址，首次是空看板。想看虚构演示卡片时，停止前一个进程，再运行：

```sh
npm run demo
```

演示数据与自己的本地记录分别存储在 `.local/`，不会进入发布产物。

## 改成自己的样子

```sh
npm run setup -- --title '我的想法' --eyebrow 'MY / IDEAS' --timezone 'Asia/Shanghai'
```

也可以直接编辑 `site.config.json`，修改名称、浏览器描述、左侧标识、标题分行和时区。界面文案目前为简体中文；`locale` 只控制日期格式，不是界面语言开关。

## 发布和同步

- Sites 创建新站点后，保存它实际返回的 `project_id`；模板中没有任何人的部署 ID。`npm run check:publish` 会阻止未登记站点的模板直接发布。
- 发布会为你生成独立的站点插件。对话启用这个插件后，先读取已有想法，再同步想法或项目进展；不会自动监听所有 ChatGPT 聊天。
- 想从本机 Codex 自动同步，可另装 [Idea Flows Hook](https://github.com/patrlean/idea-flows-hook)，为自己的网站设置 `IDEA_SYNC_SECRET`，并通过 Sites 配置私有站点所需的服务访问凭据。完整步骤在 [部署说明](DEPLOY.md#optional-native-codex-hook)。不接本机 hook 时，云端 MCP 插件不需要这个同步密钥。
- 站点是一份共享看板，默认保持仅自己可访问；开放给其他人后，这些人会共享同一份看板及操作权限，不是每人隔离的 SaaS 产品。

五种状态：想法、调研、开发中、已上线／完成、已归档。调研完成不等于上线；归档需要用户明确指令；手动状态优先。
