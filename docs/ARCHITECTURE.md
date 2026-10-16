# Architecture

## Components

```text
start.bat / stop.bat  double-click entry points; run scripts/*.ps1 with -ExecutionPolicy Bypass
scripts/              find TRAE, launch TRAE, manage the watcher
skin.mjs              CLI; the scripts call the core through it
src/core/             injection core, no dependencies (Node 22+ built-in fetch / WebSocket)
materials/<name>/     material library: one image + two JSON configs; not scanned at runtime
themes/              active files: image + JSON configs, at most one per light/dark mode
```

Local state lives in `%APPDATA%\trae-work-skin\`: `watcher.pid` holds the watcher's PID, and `watcher.log` its status log (state changes only). No theme selection is stored; old `config.json` files are ignored and left untouched.

## Start and stop

start.ps1 checks for Node 22+ and runs `skin.mjs list` to validate the active material before launching TRAE or stopping a watcher. It takes no theme arguments. It then locates `Trae CN.exe` from the uninstall registry entry written by the TRAE CN installer (`InstallLocation` under `HKCU\...\Uninstall\{98EB0EF0-...}_is1`) and handles three cases:

- TRAE not running: start it with `--remote-debugging-address=127.0.0.1 --remote-debugging-port=9341`.
- TRAE running with the port open: use it.
- TRAE running without the debug port: ask the user to fully quit it. The process is never terminated.

It then waits up to 40 seconds for an Agent (`solo-lite.html`) or IDE (`workbench.html`) page and runs `skin.mjs apply` in the foreground, so success or failure shows in the window. Next it stops any old watcher, starts `skin.mjs watch` with `Start-Process -WindowStyle Hidden`, and exits. The bat waits 3 seconds and closes on success, or pauses on failure.

Successful material validation suppresses the listing. A new TRAE launch redirects stdout and stderr to separate `trae.stdout.log` and `trae.stderr.log` files in the local state directory, so TRAE's long-lived output handles do not reuse the startup console. The logs are overwritten on the next scripted launch. The PowerShell script exits explicitly with zero after watcher startup; the BAT wrapper preserves failure status and returns zero after its success delay.

The watcher writes its PID to `watcher.pid` and state changes to `watcher.log`. It exits on its own when TRAE has been unreachable for 15 seconds (TRAE closed) or when a newer instance takes over the page.

stop.ps1 stops the watcher by PID (after checking the process is node), then runs `skin.mjs restore` to remove the injection. If TRAE is not running there is nothing to remove, and the script exits successfully.

All file names are ASCII, and .bat contents are ASCII only to avoid cmd code page issues. The .ps1 files keep a UTF-8 BOM so Windows PowerShell 5.1 reads any non-ASCII text correctly.

## Skin data

`theme.js` scans JSON files directly inside `themes/` and validates the complete set before changing a window. Each config must declare `mode`; duplicate modes are rejected with both config names. Empty sets and invalid configs fail instead of falling back to another material. Names do not imply modes. Images referenced by `image` must exist directly inside `themes/`, use jpg/jpeg/png/webp, and be at most 8 MiB. Metadata-only listing also checks image existence and size; full loading produces a data URL. JSON saved with a UTF-8 BOM is accepted.

One material can share an image between its two configs. `materials/<name>/` stores available materials and is never scanned at runtime; users activate a material by replacing the active files. Only known config fields are kept, numbers are range-checked, and colors must be `#rrggbb`. These values are interpolated into CSS, so validation is the style input boundary. No local HTTP server runs, and no arbitrary URLs, CSS or JS are accepted. Field meanings are in [THEMING.md](THEMING.md).

## Hot reload

`controller.js` re-imports `inject.js` and `adapter.js` with a timestamped URL on every apply. ESM caches by URL, so a single `skin.mjs apply` picks up the latest code. Running start.bat again replaces the watcher, so after editing `controller.js` or other core files, just run start.bat again. A standalone `skin.mjs apply` writes a newer owner, and the background watcher yields and exits.

## Connection lifecycle

`idle → connecting → connected → applying → applied / partial`; a lost connection goes to `waiting`, failures to `error`, an explicit removal to `restored`.

The default port is 9341 and only `Trae CN.exe` is accepted. Only `solo/solo-lite.html` (Agent) and `workbench/workbench.html` (IDE) pages (`file:` or `vscode-file:`) under that install folder are matched; other windows such as the floating chat button are skipped. If another service holds the port, the scripts report an error; they never take the port or kill processes. CDP addresses must be loopback with the matching port. Path and URL filtering reduce mistaken injection but are not authentication.

## Following TRAE's light/dark mode

The skin never changes TRAE settings. The user picks the mode in TRAE's theme menu (dark / light / follow system). The skin reads the page's `html[data-theme]` (`dark` and `dark-blue` count as dark, `light` as light) and picks a skin with the matching `mode`:

- A config exists for the current mode: inject it. At most one config per mode is allowed, with no preferred ID or saved choice.
- No skin for the current mode: remove the injection and keep watching; re-inject when TRAE switches back to a mode that has a skin.

Switching happens at two levels:

1. In the page: `installTheme` watches `data-theme` with a MutationObserver. On a mismatch it immediately sets the style to `disabled` and hides the background layer, so a wrong-mode skin never lingers. `inspect().enabled` reflects this.
2. In the watcher: every 3 seconds it swaps in the matching skin or removes the injection.

## Apply and watch

Each apply locates the windows, then picks and injects a skin per window based on that window's own `data-theme`. Payloads are cached per config file and surface inside the Controller; `apply` clears the cache, so running start.bat after replacing material files reads the new content. Restart the watcher through start.bat after editing active files; file-content hot reload in an existing watcher is not provided. A background that fails to decode or an install marker that cannot be confirmed raises an error instead of reporting success.

The watcher checks serially every 3 seconds and re-injects after page reloads. Each injection writes `window.__traeSnowInkOwner`, the Controller's creation time. If the watcher sees a newer owner on the page, another, later instance has taken over (e.g. a re-run of start.bat), so it stops instead of overwriting. No `Page.addScriptToEvaluateOnNewDocument` is registered; the trade-off is a brief flash of the native look after a page reload.

## Page runtime

Structure, token override levels and common pitfalls are in [THEMING.md](THEMING.md#injection-structure-read-before-editing-srccore). Key points: `installTheme` is self-contained and idempotent for the same revision, and it rebuilds the style or background layer if either is removed. Existing `data-tws-part` / `data-tws-mode` values are recorded before being overwritten and restored on removal.

## Check

`controller.check()` runs a read-only script in the page and returns the injected revision, skin ID, whether the skin is disabled due to a mode mismatch, match level, TRAE's light/dark mode, plus opaque light blocks in the viewport (dark skins only) and text below 3:1 contrast. It covers only what is visible; menus, tooltips and the like must be opened in TRAE first.
