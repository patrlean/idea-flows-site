# Publish your own ChatGPT Site

This template contains the website, Worker API, R2-backed board, and MCP tools. The separate [Idea Flows Hook](https://github.com/patrlean/idea-flows-hook) is an optional local Codex integration. Each person creates their own Site and data store.

## Easiest path: ask Sites to use this template

Copy this into a Codex/ChatGPT Work chat with **Sites** available (and GitHub access if needed):

> @Sites Use https://github.com/patrlean/idea-flows-site as the template for my own Idea Flows site. Read its AGENTS.md and docs/DEPLOY.md, retain the existing UI and five project states, and create a new owner-private Site with its own storage and deployment ID. Use the English interface (`language: "en"`) and an empty board. Ask only for any missing account connection or essential branding choice; otherwise use the template defaults. Run its checks, publish through Sites, verify the actual URL and MCP tools, and return my Site link. Do not reuse anyone else's Site identity, personal data, or credentials.

Sites availability depends on the account/workspace. See the [official Sites walkthrough](https://developers.openai.com/training/walkthroughs/building-a-shareable-site). This repository does not itself grant Sites hosting access. Creating a GitHub repository from the template does not automatically deploy a website.

## Local Codex path

1. Click **Use this template → Create a new repository** on GitHub, or clone it directly. Open that folder in Codex.
2. Optional: personalize `site.config.json` or run `npm run setup -- --title "My Ideas" --language en --timezone "UTC"`.
3. Run `npm run dev` to preview your empty board. Use `npm run demo:en` or `npm run demo:zh` instead to preview localized fictional cards; the two commands use separate `.local/` state files.
4. In that Codex chat, ask Sites to publish this repository using AGENTS.md. No separate model API key or npm dependencies are required for this application.

## Deployment contract for the publishing agent

- Register a **new Site once** if `.openai/hosting.json` has no `project_id`. Persist the exact returned ID immediately. A template deliberately ships without one. If an ID exists, inspect/reuse it.
- Preserve `r2: "BUCKET"` and `capabilities: ["mcp"]`. Sites provisions storage and handles ChatGPT sign-in. Never copy a different deployment's storage or identity.
- This project already builds a Worker ESM artifact. Preserve the source tree and the Sites Worker build contract:

  ```text
  dist/
  ├── .openai/hosting.json
  └── server/index.js
  ```

- Use the installed Sites skill's source workflow to commit/push the selected source and package **that exact build**. Remaining commands can be passed as `[["npm","run","check"],["npm","run","check:publish"]]`. `check:publish` intentionally rejects an unregistered template.
- Save/deploy through the Sites tools. Do not substitute GitHub Pages for the Worker; the board needs authenticated APIs and server storage. Keep new Sites owner-private and preserve existing access on updates.
- Wait for the terminal deployment result, then verify the actual URL. Each published MCP-enabled Site receives its own private plugin. Inspect `get_site(include_mcp_connection=true)` and connect/use its returned plugin rather than inventing a custom OAuth application.

## ChatGPT synchronization

The Site plugin exposes:

| Tool | Purpose |
| --- | --- |
| `list_ideas` | Read the current board and find existing IDs. |
| `sync_idea` | Add an idea or update grounded project/research progress. |
| `link_idea_chat` | Associate a known real ChatGPT chat URL with an existing idea. |

In a chat where this Site's plugin is enabled, ask it to keep the board current. It does not listen to every ChatGPT chat globally. For a new idea, provide a name, goal, status, progress, and evidence; the server creates its stable ID. Avoid inventing chat URLs.

## Optional native Codex hook

1. Install [Idea Flows Hook](https://github.com/patrlean/idea-flows-hook), enroll only selected directories, and review/trust its hooks.
2. Set a unique `IDEA_SYNC_SECRET` in **your Site's runtime environment** through Sites. Keep it out of Git and browser assets. Deploy a saved version to apply runtime changes.
3. Configure the hook's webhook:

   ```json
   "webhook": {
     "url": "https://YOUR-OWN-SITE.chatgpt.site/api/sync",
     "headers_env": {
       "X-Idea-Sync-Key": "MY_IDEA_SYNC_SECRET",
       "OAI-Sites-Authorization": "MY_SITES_SERVICE_AUTH"
     }
   }
   ```

4. Set those environment variables in the Codex process. `MY_IDEA_SYNC_SECRET` must match the Site's secret. For an owner-private Site, `MY_SITES_SERVICE_AUTH` is `Bearer ` plus the **supported Sites service-access token for that same Site**, obtained through your authenticated Sites connection. The template does not contain one. If service access is unavailable, use the authenticated Site MCP plugin until supported access is configured.
5. The Site accepts a selected project's first authenticated hook event without a server-side project allowlist. Hook 0.2.0 events work with the project ID as the default display name; versions that include name/description use those fields. Receivers deduplicate by event ID and reject older progress. Manual status remains authoritative.

MCP-only use needs no `IDEA_SYNC_SECRET`. The local dev server uses a loopback-only identity shim and test secret; it must never be exposed as a public production server.

## Access and scope

A Site is one shared board. Anyone permitted into it has the same board API permissions. Owner-private is the intended initial setting. This starter does not implement independent private boards for visitors to a shared/public Site; add an authorization/data-isolation model before offering that product.

The UI supports English (`en`) and Simplified Chinese (`zh-CN`) through `language` in `site.config.json`. New templates default to English; legacy configurations without a language keep Chinese. Built-in headings and descriptive copy follow the language unless explicitly overridden. `locale` changes date formatting only. Personal project content is never automatically translated.
