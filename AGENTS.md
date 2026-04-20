# AGENTS.md

## Project Overview

BitFun is an Agentic OS desktop application for building and running intelligent apps. The main product surface is the Tauri desktop app backed by Rust services and a React/TypeScript Web UI.

Focus routine development on:

- `src/apps/desktop` - Tauri 2 desktop shell, commands, capabilities, desktop-only integration.
- `src/web-ui` - React 18 + TypeScript UI used by the desktop app.
- `src/crates/core` - platform-agnostic business logic, agent runtime, services, storage, paths, and tools.
- `src/crates/events` - platform-agnostic event contracts.
- `src/crates/transport` - adapters between core/events and app surfaces.
- `src/crates/api-layer` - shared request/response handlers used by app commands.

Do not describe or design features around CLI/server "modes" unless the user explicitly asks for those targets. They may exist in the workspace, but desktop + Web UI is the default product path.

## Current Architecture

- `src/crates/core/src/agentic` - agents, prompts, sessions, dialog turns, model rounds, tool execution.
- `src/crates/core/src/service` - workspace, config, filesystem, terminal, git, and related services.
- `src/crates/core/src/infrastructure` - AI adapters, app paths, logging, storage, debug ingest, events.
- `src/web-ui/src/app` - application shell and desktop panels.
- `src/web-ui/src/flow_chat` - chat UI, tool cards, streaming/tool event presentation.
- `src/web-ui/src/tools` - feature tools such as editor, terminal, git, mermaid, design canvas.
- `src/web-ui/src/shared` - shared frontend services and utilities.
- `src/web-ui/src/infrastructure` - theme, i18n, config, API adapters, state wiring.
- `src/web-ui/src/component-library` - reusable UI components.
- `src/web-ui/src/locales` - translations.

## Development Commands

Use `pnpm` from the repository root.

```bash
pnpm run desktop:dev        # run the desktop app in development
pnpm run dev:web            # run only the Web UI with Vite
pnpm run type-check:web     # TypeScript check
pnpm run lint:web           # frontend lint
pnpm run build:web          # type-check + Web UI build + Monaco asset verification
pnpm run desktop:build      # desktop production build
pnpm run e2e:test           # Playwright E2E suite in debug app mode
```

For Rust-only checks, run the narrowest useful `cargo check` / `cargo test` command for the crate touched.

## Critical Rules

### Platform Boundaries

Core code must stay platform agnostic.

- In `src/crates/core`, do not depend on Tauri types such as `tauri::AppHandle`.
- Prefer `bitfun_events::EventEmitter`, service traits, and constructor-injected dependencies.
- Desktop-specific code belongs under `src/apps/desktop` or an adapter layer.
- Keep Tauri command DTOs and API-layer request/response structs structured and serializable.

### Tauri Commands

Command names are `snake_case` in Rust and invoked as `camelCase` through TypeScript helpers when exposed to the UI.

Always prefer a structured request object:

```rust
#[tauri::command]
pub async fn your_command(
    state: State<'_, AppState>,
    request: YourRequest,
) -> Result<YourResponse, String>
```

```ts
await api.invoke('your_command', { request: { /* fields */ } });
```

### Logging

Logging rules apply everywhere:

- English only.
- No emojis in log messages.
- Prefer structured data/context over string concatenation.
- Keep normal-path logging concise.
- Never log tokens, API keys, passwords, or personal data.

Frontend logging:

- Spec: `src/web-ui/LOGGING.md`
- Use `createLogger('ModuleName')` from `@/shared/utils/logger`.
- Log structured context: `log.info('Loaded items', { count })`.
- Include errors as data: `log.error('Failed to load config', { configPath, error })`.

Backend logging:

- Spec: `src/crates/LOGGING.md`
- Use `log::{trace, debug, info, warn, error}` macros.
- Include useful context such as `session_id`, `request_id`, `workspace_path`, and operation names when available.

Desktop runtime logs:

- Default root is the BitFun config log directory:
  - Windows: `%APPDATA%\bitfun_agentic_os\logs`
  - macOS: `~/Library/Application Support/bitfun_agentic_os/logs`
  - Linux: `~/.config/bitfun_agentic_os/logs`
- Each app launch creates a timestamped session directory: `<logs>/<YYYYMMDDTHHMMSS>/`.
- Session files are `app.log`, `ai.log`, and `webview.log`.
- `BITFUN_LOG_DIR` overrides the log root. `BITFUN_E2E_LOG_DIR` is used for E2E runs.
- Embedded webdriver debug mode writes logs under the temp `bitfun-e2e-logs` directory and may use stdout-only targets.

Debug instrumentation logs:

- The built-in debug ingest server defaults to `http://127.0.0.1:7242`.
- The default workspace debug log path is `.bitfun_agentic_os/debug.log`.
- The current JavaScript/TypeScript instrumentation template posts to:
  `http://127.0.0.1:{PORT}/ingest/{SESSION_ID}`.
- `scripts/debug-log-server.mjs` is only an ad hoc standalone helper. Its defaults are port `7469` and repository-root `debug-agent.log`; do not confuse it with the built-in ingest server.

### Paths And Persistence

- App config directory name: `bitfun_agentic_os`.
- Project hidden directory name: `.bitfun_agentic_os`.
- Project-local config lives under `<workspace>/.bitfun_agentic_os/config/`.
- Default debug log lives at `<workspace>/.bitfun_agentic_os/debug.log`.
- Runtime project data lives under the BitFun home project area, typically `~/.bitfun/projects/<workspace-slug>/`.
- Project sessions live under `~/.bitfun/projects/<workspace-slug>/sessions/`.
- Do not introduce new `.bitfun/` paths unless handling legacy migration or explicitly matching existing compatibility code.

### Frontend Reuse

When developing frontend features, reuse existing infrastructure:

- Theme: `src/web-ui/src/infrastructure/theme`
- I18n: `src/web-ui/src/infrastructure/i18n` and `src/web-ui/src/locales`
- Shared components: `src/web-ui/src/component-library`
- Shared services/utilities: `src/web-ui/src/shared`
- Feature-local state: use existing Zustand/module store patterns where present.

Keep UI text translated when the surrounding feature is localized. Add or update both `en-US` and `zh-CN` locale entries when introducing user-visible strings.

### Tool And Agent Development

Tools:

1. Implement the tool under `src/crates/core/src/agentic/tools/implementations/`.
2. Define typed input/output structs.
3. Register the tool in `src/crates/core/src/agentic/tools/registry.rs`.
4. Add frontend tool-card rendering in `src/web-ui/src/flow_chat/tool-cards/` when the tool has user-visible output.
5. Preserve streaming behavior and concurrency assumptions in the tool pipeline.

Agents:

1. Add or update agent code under `src/crates/core/src/agentic/agents/`.
2. Put long prompts in `src/crates/core/src/agentic/agents/prompts/`.
3. Register new agents in the agent registry.
4. Keep prompts and logs in English unless the content is intentionally user-facing/localized.

### Git And Workspace Safety

- The worktree may already contain user edits. Do not revert unrelated changes.
- Keep edits scoped to the requested task.
- Prefer existing project patterns over new abstractions.
- Avoid generated files unless the task requires regeneration.
- For frontend or UI work, run at least `pnpm run type-check:web` or explain why it was not run.
- For backend work, run the narrowest useful Rust check/test or explain why it was not run.

## Quick Debugging Reference

Ad hoc browser instrumentation helper:

```bash
node scripts/debug-log-server.mjs
```

This standalone helper listens on `http://127.0.0.1:7469` and writes NDJSON to `debug-agent.log` in the repository root.

Built-in Agentic debug ingest uses the app-managed server instead:

```ts
fetch('http://127.0.0.1:7242/ingest/session-id', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: 'file.ts:LINE',
    message: 'Description',
    data: {},
    timestamp: Date.now(),
    sessionId: 'session-id',
  }),
}).catch(() => {});
```

Read the resulting workspace log from:

```text
<workspace>/.bitfun_agentic_os/debug.log
```
