# Idea Flows Site template

This repository is a reusable Sites project, not the author's deployed Site. Use the installed **sites** skill for hosting. Keep changes focused on the user's requested board and preserve its design and interactions.

## First run

- Read README.md and docs/DEPLOY.md. Node 20+ is the only local prerequisite; no package install or model API key is needed.
- Read site.config.json for language, branding, headings, date locale, and timezone. Respect the requested UI language: en or zh-CN. New templates default to English; legacy configs without language remain Chinese. Change it to match the user's requested name; do not infer personal facts.
- `npm run dev` starts an empty board on loopback. `npm run demo:en` and `npm run demo:zh` use localized fictional examples in separate storage. Screenshots in each README must match its language; capture them from the running application rather than editing screenshot text. Never copy `.local/` into a deployment.
- Run `npm run check` before publication.

## Create the user's Site

1. Read `.openai/hosting.json`. If it has no project_id, create a NEW Site through Sites once and persist the exact returned ID immediately. If it has an ID, inspect and reuse that Site; do not create a duplicate. Never invent an ID or reuse a template author's deployment or account.
2. Retain `r2: "BUCKET"` and `capabilities: ["mcp"]`. Sites provisions a fresh R2 bucket. This is a dependency-free Worker ESM application; do not convert it to a static-only host or replace it with a starter UI.
3. Use the Sites source workflow from this checkout. Build commands are `["npm", "run", "check"]` followed by `["npm", "run", "check:publish"]`. The archive must contain the exact output from `dist/`, built with this Site's persisted ID. Publish the verified pushed source state using the Sites skill, and wait for a terminal deployment result.
4. New boards start owner-private. Preserve the audience on later edits. The board is shared by all users allowed into the Site; it is not a multi-tenant service with per-user data isolation.
5. Return the actual deployed URL and verify the empty board and MCP tools. Use the Site's auto-provisioned plugin for ChatGPT/Codex; `get_site(include_mcp_connection=true)` returns its connection details. Do not claim every web chat automatically syncs. It must use the connected plugin.

## Optional native hook

MCP works without an application sync secret. Enable the separate public `patrlean/idea-flows-hook` only when requested. Set `IDEA_SYNC_SECRET` as a Sites runtime secret, and configure that user's hook with this new Site's `/api/sync` endpoint. For a private Site, use supported Sites service access as well. Never make a Site public to bypass authentication. Never commit credentials, tokens, prompts, local paths, or project data.

States are idea / research / dev / live / discarded. Research includes active literature, competitor, requirements, or feasibility work before implementation. Only verified deployment or a checked usable final artifact establishes live. Explicit user intent is required for archival. Manual card state stays authoritative. New ideas must have a name, goal, and evidence; reuse existing IDs across chats.
