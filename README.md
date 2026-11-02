# Idea Flows Site

Your own idea board, built and hosted with ChatGPT Sites.

[![Use this template](https://img.shields.io/badge/Use_this_template-111827?style=for-the-badge&logo=github)](https://github.com/patrlean/idea-flows-site/generate)
[![简体中文](https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-e5e7eb?style=for-the-badge)](README.zh-CN.md)

Keep ideas, research, work in progress, shipped projects, and archived directions in one editorial project index. Update cards from ChatGPT through the Site's own plugin, or connect the optional [Idea Flows Hook](https://github.com/patrlean/idea-flows-hook) for selected local Codex projects.

## Start here

**Ask Sites to build your copy.** Open a Codex or ChatGPT Work chat with Sites available, then paste:

> @Sites Use https://github.com/patrlean/idea-flows-site as the template for my own Idea Flows site. Follow its AGENTS.md and docs/DEPLOY.md. Keep the existing UI, start with an empty board, create my own owner-private Site and storage, run the checks, and publish it. Return my verified Site URL and help connect its plugin. Do not reuse the template author's Site identity, data, or credentials.

Or click **Use this template**, create your own repository, and open it in Codex. [Deployment guide →](docs/DEPLOY.md)

You need access to Sites in your own account/workspace. Creating a GitHub copy alone does not publish a website. No model API key or separate model service is required by this application. [About Sites](https://developers.openai.com/training/walkthroughs/building-a-shareable-site)

## What you get

- 🗂️ **Five states** — Idea, research, development, live/completed, and archived.
- ✏️ **Card controls** — Change status, archive/restore, and associate source chats directly on a card.
- ↗️ **Source links** — Open known ChatGPT conversations, local Codex chats/workspaces, and verified project websites.
- 🎞️ **Motion** — Animated category changes and card movement, with reduced-motion support.
- 💬 **Your Site's plugin** — Read and update your board through `list_ideas`, `sync_idea`, and `link_idea_chat`.
- 🔌 **Optional Codex hook** — A secret-protected receiver compatible with the separate public hook.
- 🧩 **A clean starting point** — No deployment ID, personal project catalog, chat history, or author credentials.

The interface copy is Simplified Chinese. Branding, headings, date locale, and timezone are configurable; the English and Chinese documentation are separate.

## Try it locally

Requires **Node.js 20+**. There are no npm dependencies to install.

```sh
git clone https://github.com/patrlean/idea-flows-site.git
cd idea-flows-site
npm run dev
```

Open the loopback URL printed in the terminal. The board starts empty. To preview fictional cards instead, stop that server and run:

```sh
npm run demo
```

Normal and demo data live in separate ignored `.local/` files. Production builds always start empty and never include either local state file.

## Make it yours

```sh
npm run setup -- --title 'My Ideas' --eyebrow 'MY / IDEAS' --timezone 'Asia/Shanghai'
```

Or edit [site.config.json](site.config.json). Layout and interactions live in `web/`; API and MCP tools live in `worker/index.js`. Changing `locale` affects dates, not interface translation.

| File | Purpose |
| --- | --- |
| `site.config.json` | Name, description, index label, heading lines, locale, timezone. |
| `.openai/hosting.json` | Sites storage/MCP declarations; your deployment ID is added only after registration. |
| `AGENTS.md` | Instructions for the agent that creates and publishes your copy. |
| `docs/DEPLOY.md` | Sites publishing, plugin connection, optional hook setup, and access boundaries. |
| `examples/ideas.json` | Fictional data used only by the local demo server. |

## Publish with Sites

The agent registers a fresh Site, persists its exact returned `project_id`, and follows the Sites source/save/deploy workflow. The build emits `dist/server/index.js` and `dist/.openai/hosting.json`; Sites provisions the R2 binding and handles ChatGPT authentication. This is a server application, not a static GitHub Pages export.

```sh
npm run check
npm run check:publish
```

`check:publish` deliberately fails until you register your own Site. It helps prevent accidental reuse of someone else's deployment. The tests and build work before registration.

New Sites should remain owner-private. Each Site is one shared board: anyone allowed into it shares its board API permissions. This is a personal/team starter, not a multi-tenant service with per-user isolated data.

## Connect the hook

The Site plugin is sufficient for ChatGPT updates. For automatic progress from selected local Codex directories, install [Idea Flows Hook](https://github.com/patrlean/idea-flows-hook), then follow [the connection guide](docs/DEPLOY.md#optional-native-codex-hook) to configure **your own** `/api/sync` URL, runtime sync secret, and Sites service access. No credential is included in this template.

Both integrations understand `idea`, `research`, `dev`, `live`, and `discarded`. Research completion is not a launch; archiving needs explicit user intent. Manual state takes priority over routine automatic updates.

## Development

```sh
npm run check
```

Includes Node tests for authentication, empty initial state, public-hook onboarding, research, idempotency, concurrency, manual-state precedence, verified delivery, chat links, config escaping, and the publication guard. CI is configured for Node 20/24 on Linux, macOS, and Windows. Local checks do not prove that a new user's hosting/account setup is available; verify their actual publication separately.

MIT · Built by [patrlean](https://github.com/patrlean)
