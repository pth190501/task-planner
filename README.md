# Task Planner

Static HTML/CSS/JS task-intake web app with an adaptive **Skill Router**.

Site:

`https://pth190501.github.io/task-planner/`

## Main idea

Do not force a task breakdown from bad input.

```text
Raw requirement / Docs / Figma
          ↓
      Skill Router
          ↓
Sparse? ───── yes ──→ Clarify critical gaps
  │
  no
  ↓
Spec-lite
  ↓
Read relevant sources
  ↓
Interface/Figma context when applicable
  ↓
Team Task Breakdown
```

## Routed skill stack

- `requirements-clarifier` — sparse / ambiguous requests
- `spec-lite` — minimal implementation-facing spec
- `source-context` — Docs / tickets / external sources
- `figma-context` — screen, state, interaction, reusable component context
- `interface-planner` — SDK / API / library / framework boundaries
- `team-task-breakdown` — ownership, dependency, parallel work, conflict notes, merge order

The router uses only relevant skills instead of applying the entire stack to every request.

## Sparse requirement example

Input:

`Tôi cần tạo 1 SDK để show log networking call API`

Expected route:

`Clarify → Spec-lite → Interface Design → Task Breakdown`

The generated AI request asks only the critical questions first, such as target platform or integration behavior, instead of inventing a full SDK architecture.

## Features

- Quick Paste + local auto-organize
- Quick / Standard planning mode
- Automatic sparse-context scoring
- Visual Skill Router
- Force-plan option when assumptions are acceptable
- Figma / Docs detection
- SDK/API/interface detection
- Project profiles stored locally
- Recent history
- Copy + Open ChatGPT
- Markdown download
- JSON import/export backup

## Privacy

- No backend
- No AI API key
- Requirement data stays in browser `localStorage`
- No task input is committed to GitHub by the page
- Public GitHub Pages contains only the static app source

## Skill sources

See [`skills/SOURCES.md`](skills/SOURCES.md) for the public skill repositories and patterns used as inspiration.

## Files

```text
index.html
styles.css
router.css
app.js

skills/
  requirements-clarifier/
  spec-lite/
  source-context/
  figma-context/
  interface-planner/
  team-task-breakdown/
  SOURCES.md
```
