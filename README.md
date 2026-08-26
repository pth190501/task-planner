# Task Planner

Static HTML/CSS/JS task planner with adaptive skill routing and a **live offline Markdown planner**.

Site:

`https://pth190501.github.io/task-planner/`

## Main flow

```text
Type / paste requirement
        ↓
Skill Router + Local Planner
        ↓
Live Markdown Task Breakdown
        ↓
Copy / Download .md
        ↓ optional
Refine with ChatGPT when Docs/Figma need real source inspection
```

There is no Generate step required for the baseline task plan. The preview updates while you type.

## Offline behavior

After the first online load, the Service Worker caches the app shell. The following continue to work offline:

- Quick Paste
- local auto-organize
- Skill Router
- live Markdown task generation
- Quick / Standard mode
- project profiles
- local autosave/history
- JSON import/export
- Markdown copy/download

Linked Docs/Figma are **not read by the offline planner**. They are preserved as references and can be inspected later through ChatGPT or another connected agent when online.

## Routed skill stack

- `requirements-clarifier` — sparse / ambiguous requests
- `spec-lite` — minimal implementation-facing spec
- `source-context` — Docs / tickets / external sources
- `figma-context` — screen, state, interaction, reusable component context
- `interface-planner` — SDK / API / library / framework boundaries
- `team-task-breakdown` — ownership, dependency, parallel work, conflict notes, merge order

The router uses only relevant skills instead of applying the entire stack to every request.

## Example

Input:

`Tôi cần tạo 1 SDK để show log networking call API`

Live local output is structured around:

- Networking Capture Core & Log Model
- SDK Public Interface & Host Integration
- Network Log Viewer
- Packaging, Safety & Integration Validation
- Parallel plan / ownership / merge order
- Assumptions and only critical open questions

## Privacy

- No backend
- No AI API key
- Requirement data stays in browser storage
- No task input is committed to GitHub by the page
- Public GitHub Pages contains only the static app source

## Offline files

```text
index.html
styles.css
router.css
live-planner.css
app.js
enhancements.js
live-planner.js
manifest.webmanifest
sw.js
```

## Skills

See [`skills/SOURCES.md`](skills/SOURCES.md) for the public patterns used as inspiration.
