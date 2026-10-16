# Contributing

Use focused PRs for materials, bug fixes or features. Documentation, refactoring and maintenance changes can use the default template. Keep code, comments, filenames and tracked documentation in English, with ASCII filenames.

Submit code, documentation and theme JSON configs under the project's [MIT License](LICENSE). Image contributions retain their own licenses or permissions, documented in the material's `source.md`; see [SOURCES.md](docs/SOURCES.md).

## Report a bug or request a feature

You can open an issue without submitting code:

- [Bug report](https://github.com/The-time-forever/Trae-CN-Skin/issues/new?template=bug.md): describe the symptom, reproduction steps, expected/actual behavior and relevant environment. Logs and screenshots are optional.
- [Feature request](https://github.com/The-time-forever/Trae-CN-Skin/issues/new?template=feature.md): describe the use case, proposed behavior and observable success criteria. Implementation details are optional.

The templates live in `.github/ISSUE_TEMPLATE/`. Link the issue from a subsequent PR when applicable. Material submissions use the material PR template below.

## Choose a PR template

After pushing your branch or fork, open a comparison using one of these links and select the correct head repository and branch:

| Change | Create PR | Template file |
| --- | --- | --- |
| Add or update material | [Material PR](https://github.com/The-time-forever/Trae-CN-Skin/compare?expand=1&template=material.md) | `.github/PULL_REQUEST_TEMPLATE/material.md` |
| Fix an existing bug | [Bug-fix PR](https://github.com/The-time-forever/Trae-CN-Skin/compare?expand=1&template=bug.md) | `.github/PULL_REQUEST_TEMPLATE/bug.md` |
| Add a feature | [Feature PR](https://github.com/The-time-forever/Trae-CN-Skin/compare?expand=1&template=feature.md) | `.github/PULL_REQUEST_TEMPLATE/feature.md` |
| Documentation or maintenance | [General PR](https://github.com/The-time-forever/Trae-CN-Skin/compare?expand=1) | `.github/pull_request_template.md` |

On an existing comparison URL, append `&template=material.md`, `&template=bug.md` or `&template=feature.md` (use `?template=...` if there is no query string). Templates become available once merged into the default branch. GitHub's supported locations and query parameter are documented in [Creating a pull request template](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository).

For `gh pr create`, use `--template material.md`, `--template bug.md` or `--template feature.md`. If providing a body explicitly, copy the corresponding template into the body and fill it in.

## Material contributions

Submit a self-contained folder under `materials/<name>/`:

```text
materials/your-material/
  background.jpg
  dark.json
  light.json
  source.md
```

- Use one JPG/JPEG, PNG or WebP image up to 8 MiB. Both JSON configs reference its filename through `image`; each explicitly declares `mode` as `dark` or `light`.
- Keep original image pixels unchanged. Tune colors, crop focus, fading and panel opacity in the configs. File and folder names do not select the mode.
- Include the author, original source, redistribution license or permission evidence, and any required attribution in `source.md`; see [SOURCES.md](docs/SOURCES.md). The existing SUBARU image is personal reference material with no assumed redistribution permission; provide an image you have permission to distribute with your contribution.
- Leave the repository's active `themes/` files and runtime code unchanged in material-only PRs. Copy your files into your local `themes/` for visual checks, then exclude those local activation changes from the PR.
- Read [THEMING.md](docs/THEMING.md) for config fields and readability guidance.

From the repository root, validate the submitted folder offline in PowerShell (replace `your-material`):

```powershell
node --input-type=module -e "import { listThemes } from './src/core/theme.js'; console.log(await listThemes({ root: './materials/your-material' }));"
```

This checks config values, mode uniqueness, image presence and size. Visual checks cover image decoding, cropping and actual readability in TRAE. Report checked surfaces and pending checks separately; use sanitized previews without personal accounts, projects, code or chat content.

## Bug fixes and features

Describe the concrete trigger and resulting behavior, link the issue when available, and keep changes focused. Bug fixes should include reproduction steps and evidence that the symptom is addressed. Features should describe the workflow, command/config changes and any required user action. Update relevant docs when behavior changes.

Offline commands:

```powershell
node --test
node skin.mjs list
```

The test suite uses temporary fixtures and mocked startup/CDP interactions. `list` checks only the active files in `themes/`. Launching TRAE or injecting a skin requires authorization when an agent performs the checks. Record actual live validation separately in [VALIDATION.md](docs/VALIDATION.md).

Preserve the loopback CDP and installation-path filtering, original image pixels, and the rule that scripts never terminate TRAE or write its settings. Keep PowerShell compatible with Windows PowerShell 5.1 and save `.ps1` as UTF-8 with BOM; `.bat` stays ASCII. See [AGENTS.md](AGENTS.md) for repository conventions.

Logs and the watcher PID are written to `%APPDATA%\trae-work-skin\`. Include only relevant, sanitized log excerpts in PRs.
