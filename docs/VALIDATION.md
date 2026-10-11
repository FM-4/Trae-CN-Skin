# Validation record

Target: local TRAE CN 1.107.1 (Electron 39.2.7 / Chrome 142), `D:\SoftWare\Trae CN\Trae CN.exe`, Agent workbench `solo-lite.html` and IDE window `workbench.html` (IDE and SOLO layouts).

## Done (2026-10-10, live via CDP)

- [x] Located the levels where TRAE actually declares its tokens; with the dark skin the home page has no light blocks and no text below 3:1 contrast (`node skin.mjs check`).
- [x] Skin follows TRAE light/dark: TRAE dark → SUBARU-Dark, light → SUBARU-Light, swapped within one watcher cycle; TRAE `settings.json` untouched throughout.
- [x] With no skin for the current mode (light skin temporarily moved away, then switched to light), the injection is removed and the watcher keeps running; switching back to dark re-injects the dark skin.
- [x] Tooltips and the UID label (inverted by design) are no longer blanked by forced light text (confirmed by user).
- [x] Main panel rounded border and top-right buttons are back to native (confirmed by user).
- [x] When two Controllers apply one after the other, the earlier one stops watching.
- [x] Edits to `theme.json` and `inject.js` take effect on the next apply without restarting.
- [x] start.bat connects to a TRAE already running with the port, injects, and exits after 7 seconds; the watcher has no window and re-injects after a page reload.
- [x] stop.bat stops the watcher, removes the injection, and exits after 4 seconds.
- [x] TRAE path comes from the uninstall registry entry; `skin.mjs` also finds it when run directly.
- [x] .ps1 files parse without errors in Windows PowerShell 5.1 (UTF-8 BOM).
- [x] All code messages and tracked docs are in English; CLI, scripts and watcher log output verified.
- [x] IDE window injected alongside the Agent workbench; editor shows the background, sidebar / auxiliary bar / tabs share one translucent surface; `check` reports 0 light blocks and 0 low-contrast text in both dark and light.
- [x] Both windows follow TRAE dark/light together; SOLO parts (`soloaisidebar`, `soloTitlebar`) are matched by the IDE rules.

## Pending

- [ ] Readability of task chat, settings, and file / diff / terminal panels in both modes.
- [ ] Chinese IME input, sending, scrolling, selection, copy and drag are unaffected.
- [ ] Several Agent workbench windows injected at once.
- [ ] SOLO layout inspected live (entering SOLO was not triggered; only its DOM parts were confirmed).
- [ ] IDE terminal, diff editor, settings editor and extension webviews.
- [ ] start.bat launching TRAE when it is not running; start.bat's quit prompt when TRAE was launched normally.
- [ ] Watcher exiting about 15 seconds after TRAE closes.
- [ ] Double-clicking start.bat / stop.bat in File Explorer (so far verified via Start-Process).
- [ ] Switching from TRAE's theme menu (so far simulated by rewriting settings.json); follow-system tracking Windows light/dark.
- [ ] Light blocks and contrast for SUBARU-Light in light mode (`check`'s light-block detection only runs for dark skins). The latest check reported 2 low-contrast items: a markdown file link (2.87) and a `+6` diff count (2.50).
