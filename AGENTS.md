# Repository Guidelines

## Project Structure & Module Organization
- `src/plugin.ts`: entrypoint that registers Stream Deck actions and calls `streamDeck.connect()`.
- `src/actions/*.ts`: action implementations (`clock-in`, `clock-out`, `open-kot`).
- `src/actions/__tests__/` and `src/lib/__tests__/`: Vitest unit tests.
- `src/lib/*.ts`: shared logic (settings, Puppeteer access, error-image handling).
- `com.hrk-m.kot-punch.sdPlugin/`: plugin package (`ui/`, `imgs/`, generated `manifest.json`, build output in `bin/`).
- `manifest.template.json` and `src/labels/labels.json` are the source inputs for manifest generation.

## Build, Test, and Development Commands
Run from repository root:

```bash
bun install --frozen-lockfile   # Install dependencies
bun run lint                    # Lint TypeScript in src/ with oxlint
bun run test                    # Run Vitest suite
bunx tsc --noEmit               # Type-check only (CI gate)
bun run build                   # Generate manifest + Rollup production bundle
bun run watch                   # Watch build + restart Stream Deck plugin
bun run generate-manifest       # Regenerate manifest only
```

## Coding Style & Naming Conventions
- Language: TypeScript (ESM). Use explicit `.js` extensions in local imports.
- Prefer double quotes and semicolons, consistent with existing files.
- File naming: kebab-case for modules (`clock-in.ts`), PascalCase for exported classes (`ClockIn`).
- Action UUID pattern: `com.hrk-m.kot-punch.<action-name>`.
- Do not manually edit `com.hrk-m.kot-punch.sdPlugin/manifest.json`; regenerate it.

## Testing Guidelines
- Framework: Vitest (`environment: node`) with V8 coverage (`text`, `lcov`).
- Test file pattern: `**/__tests__/*.test.ts`.
- Mock SDK/browser boundaries (`@elgato/streamdeck`, Puppeteer) with `vi.mock` for deterministic unit tests.
- Before pushing, run:

```bash
bun run lint && bun run test && bunx tsc --noEmit && bun run build
```

## Commit & Pull Request Guidelines
- Follow Conventional Commit style used in history: `feat(scope): ...`, `fix(scope): ...`, `docs(scope): ...`, `test(scope): ...`.
- Keep commits focused and scoped to one logical change.
- PRs should include a short problem/solution summary, linked task or issue, and verification evidence (test/lint/build output). Add screenshots when changing `ui/` or icon assets.

## Security & Configuration Tips
- Never commit real KOT credentials or tokens.
- Use Stream Deck global settings for runtime secrets and validate required fields in new actions before invoking Puppeteer flows.
