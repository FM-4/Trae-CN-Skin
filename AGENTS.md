# Repository Guidelines

## Project Structure & Module Organization

This Windows Electron application manages Snow Ink themes for the TRAE CN Agent workbench.

- `src/main/`: Electron lifecycle, restricted preload bridge, configuration storage, executable discovery, CDP transport, and application controller.
- `src/shared/theme.js`: theme defaults, presets, and validation.
- `src/runtime/`: TRAE selector adapter and serialized theme injection.
- `src/renderer/`: management UI and illustrative previews, using plain HTML, CSS, and JavaScript.
- `assets/snow-ink.jpg`: original reference image; preserve its pixels.
- `docs/`: architecture, validation checklist, and source attribution.

Keep `.research/` and `node_modules/` out of contributions. No test directory currently exists.

## Build, Test, and Development Commands

Run commands from the repository root in PowerShell when execution is authorized:

- `npm ci`: install dependencies from `package-lock.json`.
- `npm start`: launch the Electron manager via `electron .`.

There are no build, packaging, lint, or test scripts. The documented phase permits source edits and static review; obtain explicit authorization before dependency installation, application launch, runtime testing, TRAE injection, or packaging.

## Coding Style & Naming Conventions

Use two-space indentation, semicolons, single-quoted JavaScript strings, camelCase functions/variables, and PascalCase classes. Follow surrounding formatting without unrelated rewrites. JavaScript uses ES modules; `preload.cjs` uses CommonJS. Use lowercase filenames and kebab-case CSS classes and theme IDs, such as `quiet-night`. No formatter or linter is configured.

Keep `installTheme` self-contained: it is serialized into another renderer and must have no external closure dependencies.

## Testing Guidelines

No automated framework, test naming convention, or coverage threshold is established. Follow `docs/VALIDATION.md` for authorized manual checks: window sizing, IPC, target matching, multi-window rollback, reconnection, restoration, and save/apply independence. Record performed checks and pending runtime validation separately. The adapter's `full` status indicates key selector matches; visual acceptance requires inspection.

## Commit & Pull Request Guidelines

No prior commit history establishes a convention. Use concise imperative subjects, for example `Fix per-window theme rollback`. Keep changes focused. PR descriptions should explain behavior, link related issues when available, list validation performed, and include screenshots for UI changes after authorized execution.

## Security & Agent Instructions

Preserve sandboxing, context isolation, fixed IPC methods, theme validation, loopback CDP, and installation-path filtering. Keep saved configuration separate from runtime application. Consult `docs/SOURCES.md` before reusing upstream code or distributing assets.

Chinese responses should directly state facts and actions, avoid invented rebuttals and preventive disclaimers, and end when complete.
