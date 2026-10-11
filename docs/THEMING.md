# Skin guide

For people making or editing skins, and for agents doing it on their behalf. After a change, run `node skin.mjs apply` and then `node skin.mjs check` to see whether the live page still has light blocks or low-contrast text.

## Skin folder

```text
themes/<id>/
  theme.json
  background.jpg   .png / .webp also work, up to 8MB; the file name goes in theme.json's image field
```

The folder name is the skin ID: letters, digits and hyphens, not starting with a hyphen, at most 48 characters, e.g. `SUBARU-Dark`. The command line matches it case-insensitively.

## theme.json fields

Unknown fields are dropped. Out-of-range values are rejected, never silently corrected.

| Field | Values | Purpose |
| --- | --- | --- |
| `schemaVersion` | `1` | Format version |
| `name` | 1–40 characters | Name shown in status messages and `skin.mjs list` |
| `mode` | `dark` / `light` | Which TRAE light/dark mode this skin applies to; the colors must suit it. TRAE settings are never changed |
| `image` | File name inside the skin folder | Background image |
| `imageWidth` | 30–100 | Image width as a percentage of the window, anchored right with a fade on the left edge |
| `focusX` / `focusY` | 0–100 | Crop focus, same as `background-position` percentages |
| `intensity` | 0–100 | Image opacity on the home (new task) page |
| `taskIntensity` | 0–100 | Image opacity on task chat pages; usually lower so text stays readable |
| `surfaceOpacity` | 0–100 | Opacity of panels such as the sidebar, composer and cards; menus and popovers use at least 88 |
| `blur` | 0–40 | Backdrop blur for the composer and popovers (px) |
| `radius` | 0–24 | Corner radius for the composer and popovers (px) |
| `background` | `#rrggbb` | Window base color, also the color the image fades into |
| `surface` | `#rrggbb` | Panel color |
| `text` | `#rrggbb` | Primary text and icons |
| `muted` | `#rrggbb` | Secondary text and placeholders |
| `accent` | `#rrggbb` | Brand color: primary buttons, focus rings, selection |

Keep at least 4.5:1 contrast between `text` and both `surface` and `background`.

## Injection structure (read before editing src/core)

`installTheme(theme, image, contract, revision)` in `inject.js` is serialized and run inside the TRAE page, so it must be self-contained: no references to other module variables and no Node APIs. It creates:

- `#trae-snow-ink-style`: all CSS.
- `#trae-snow-ink-background`: a `position:fixed; z-index:-1` layer; the image is drawn on its `::before`. It gets `data-home` on the home page, which switches to `intensity`.
- `html[data-tws-mode]`: every override rule is scoped under this attribute, so removing it reverts everything.
- A listener on `html[data-theme]`: when TRAE switches to a mode other than `theme.mode`, the style is disabled and the layer hidden immediately; the watcher then swaps in the matching skin or removes the injection.
- `[data-tws-part="…"]`: part markers placed on TRAE nodes according to `adapter.js`; a MutationObserver re-marks them after DOM changes.

### How colors take effect

Most TRAE components read tokens instead of hard-coded colors:

- `--bg-bg-*`, `--text-text-*`, `--icon-icon-*`, `--border-border-*` (solo-lite components)
- `--color-bg-*`, `--color-text-*`, `--color-fill-*`, `--color-border-*` (Arco components)
- `--vscode-*`, `--vscode-icube-*` (VS Code layer)

TRAE redeclares these tokens at several levels: `html[data-theme]`, `body.vs.solo-lite` / `body.vs-dark.solo-lite` and `.solo-theme[data-theme]`. The rule built from `tokenScope` in `inject.js` overrides them at the same levels; overriding only `html` is not enough.

Fix colors through the token mapping, not by adding per-component selectors from screenshots. When a light block appears:

1. Find the element's class with `check`.
2. Search for that class in `resources/app/node_modules/@byted-icube/solo-lite/dist/*.css` under the TRAE install folder and note which `var(--…)` it reads.
3. Add the missing token to the `tokenScope` rule.

Tokens deliberately left alone: brand gradients, `--status-*` status colors, `--code-*` syntax colors, `--accent-accent-*`, and `--bg-bg-white`, which is white in both native themes.

### Don'ts

- Don't force `color` on every descendant of an area, e.g. `[data-tws-part="dialog"] * { color: … }`. TRAE's tooltips and UID label are inverted by design (`--bg-bg-invert` light background with `--text-text-onaccent` dark text); forcing light text makes them blank.
- Don't add translucent backgrounds or borders to nested part nodes; the colors stack and darken. Only the outermost node gets the panel color.
- Don't change layout sizes, positioning, or the shape of the top-right IDE / sidebar buttons.

### adapter.js

`adapters` holds one contract per surface. `page` is the URL suffix used to match CDP targets, `root` must exist before injecting, and `required` lists the parts that must match for `full`.

**`agent`** (`solo/solo-lite.html`, the Agent workbench):

| Part | Purpose |
| --- | --- |
| `sidebar` | Left task list; the outermost node gets the panel color |
| `main` / `thread` / `home` | Main area, chat stream, home page; made transparent so the image shows through |
| `composer` | Composer shell, translucent glass |
| `dialog` | Menus, dialogs, dropdowns; popover color |

**`ide`** (`workbench/workbench.html`, the IDE window; SOLO mode is a layout of the same page):

| Part | Purpose |
| --- | --- |
| `editor` | Editor area; transparent, with `--vscode-editor-background` set to transparent |
| `pane` | Sidebar, auxiliary bar (AI chat), panel, and SOLO's `soloaisidebar`; one translucent surface each |
| `chrome` | Title bar (including SOLO's `soloTitlebar`), activity bar, status bar; transparent |
| `dialog` | Same as above |

IDE colors come from `--vscode-*` variables that TRAE writes on `:root`, so the IDE rules override them on `html[data-tws-mode]`. The AI chat inside the auxiliary bar is the same solo-lite component, so it also picks up the shared token overrides. The terminal (xterm canvas), minimap and extension webviews are drawn outside CSS reach; syntax colors come from TRAE's color theme.

`full` is reported when every `required` part matches. That only means the key nodes exist, not that the page looks right, so still run `check`.

TRAE updates may rename classes: watch for `match=basic` in `check`, then compare class names in the dist folder above, or in `resources/app/out/vs/workbench/workbench.desktop.main.css` for the IDE.
