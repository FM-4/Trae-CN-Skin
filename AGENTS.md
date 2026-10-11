# Repository Guidelines

## Project Structure & Module Organization

Injects local themes into TRAE CN's Agent workbench and IDE window (IDE and SOLO layouts) over loopback CDP. Users double-click `start.bat` / `stop.bat`; there is no GUI and no npm dependency.

- `start.bat`, `stop.bat`: ASCII-only wrappers that run `scripts/*.ps1` with `-ExecutionPolicy Bypass`; they close on success and pause on failure. Keep all file names ASCII.
- `scripts/`: Windows PowerShell 5.1 scripts (saved as UTF-8 with BOM) that locate TRAE via its uninstall registry key, launch it with the debug port, and manage the watcher PID.
- `themes/<id>/`: `theme.json` plus background image; the reference image's pixels must be preserved.
- `src/core/`: dependency-free core: theme loading/validation, CDP transport, controller, adapter, and serialized injection (`inject.js`).
- `skin.mjs`: CLI (`watch`, `apply`, `restore`, `check`, `list`) called by the scripts.
- `docs/`: architecture, theming guide (`THEMING.md`), validation record, and source attribution.

Keep `.research/` out of contributions. No test directory currently exists.

## Build, Test, and Development Commands

Requires Node.js 22+ (built-in `fetch` and `WebSocket`); no install step. From the repository root:

- `start.bat [theme-id]` / `stop.bat`: start TRAE, inject, and leave a hidden watcher (log: `%APPDATA%\trae-work-skin\watcher.log`); or stop and restore.
- `node skin.mjs apply <id>` / `restore` / `check`: inject, remove, and inspect the live page.

There are no build, packaging, lint, or test scripts. Obtain authorization before injecting into or launching TRAE.

## Coding Style & Naming Conventions

Use two-space indentation, semicolons, single-quoted JavaScript strings, camelCase functions/variables, and PascalCase classes. Follow surrounding formatting without unrelated rewrites. JavaScript uses ES modules. PowerShell scripts must stay compatible with Windows PowerShell 5.1 and keep their UTF-8 BOM; `.bat` files stay ASCII-only. Write code, comments, user-facing messages, and tracked docs in English. Use lowercase filenames and kebab-case CSS classes. Skin folder IDs use letters, digits, and hyphens, such as `SUBARU-Dark`. No formatter or linter is configured.

Keep `installTheme` self-contained: it is serialized into another renderer and must have no external closure dependencies.

## Testing Guidelines

No automated framework, test naming convention, or coverage threshold is established. Follow `docs/VALIDATION.md` and record performed checks and pending validation separately. Use `node skin.mjs check` for light blocks and low-contrast text on the visible page; the adapter's `full` status only indicates key selector matches. Fix colors through token mappings described in `docs/THEMING.md` rather than per-component selectors.

## Commit & Pull Request Guidelines

No prior commit history establishes a convention. Use concise imperative subjects, for example `Fix per-window theme rollback`. Keep changes focused. PR descriptions should explain behavior, link related issues when available, list validation performed, and include screenshots for UI changes after authorized execution.

## Security & Agent Instructions

Preserve theme validation, loopback CDP, installation-path filtering, and the rule that scripts never terminate TRAE. Never write TRAE's own settings: skins follow TRAE's light/dark mode (`html[data-theme]`) and each skin's `mode` decides where it applies. Consult `docs/SOURCES.md` before reusing upstream code or distributing assets.

Chinese responses should directly state facts and actions, avoid invented rebuttals and preventive disclaimers, and end when complete.
