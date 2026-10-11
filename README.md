# TRAE CN Skin

Injects a local background image and color scheme into the TRAE CN Agent workbench without modifying TRAE's install files or settings. Injection goes through TRAE's debug port (127.0.0.1:9341 only), and the skin follows TRAE's own light/dark mode.

## Usage

Requires Node.js 22 or later. No `npm install` needed.

- **start.bat**: starts TRAE CN and applies the skin. On success the window closes after 3 seconds. A hidden background watcher stays behind: it re-applies the skin after page reloads, switches or removes it when TRAE changes light/dark mode, and exits when TRAE closes.
- **stop.bat**: stops the watcher and removes the skin, then closes.

On failure the window stays open with the reason; press any key to close it.

TRAE CN must be started by start.bat, because injection needs the debug port and a normally launched TRAE doesn't open it. If TRAE is already running, start.bat asks you to fully quit it (including the tray icon) first; it never closes TRAE for you. TRAE's install folder is read from the installer's registry entry, so there is nothing to configure.

## Light and dark mode

Pick dark, light or follow-system in TRAE's theme menu and the skin follows:

| TRAE mode | Skin |
| --- | --- |
| Dark (including Deep Blue) | `SUBARU-Dark` |
| Light | `SUBARU-Light` |

If a mode has no skin, switching to it removes the injection and TRAE shows its native look; switching back re-applies the skin. For example, delete `SUBARU-Light` and TRAE's light mode stays native.

When several skins share a mode, choose one with `start.bat <skin-id>`; the choice is remembered. `node skin.mjs list` shows every skin and its mode. The watcher log is `%APPDATA%\trae-work-skin\watcher.log`.

## Making your own skin

Copy `themes/SUBARU-Dark/` to a new folder (the folder name is the skin ID: letters, digits and hyphens), replace `background.jpg`, and edit `theme.json`. The `mode` field decides which TRAE light/dark mode it applies to.

With TRAE open, edit `theme.json` or the injection code in `src/core/`, then run `start.bat` again to see the change without restarting TRAE. `node skin.mjs check` reports any light blocks or low-contrast text left on the page.

Fields and injection structure are documented in [docs/THEMING.md](docs/THEMING.md). Hand that file to anyone, or any agent, editing a skin.

## Layout

```text
start.bat / stop.bat    double-click entry points
scripts/                PowerShell: find TRAE, launch it, manage the watcher
skin.mjs                CLI: watch / apply / restore / check / list
themes/<id>/            theme.json + background image
src/core/               injection core (no dependencies)
docs/                   architecture, skin guide, sources
```

## Scope

Windows only, TRAE CN (China edition) Agent workbench only. The IDE editor window and the native title bar buttons are out of scope. `themes/*/background.jpg` is personal local reference material with no assumed right to redistribute; see [docs/SOURCES.md](docs/SOURCES.md).
