# Task Planner

Static HTML/CSS/JS web app for preparing feature requirements, Docs, Figma links, team context, and constraints before sending them to ChatGPT for task breakdown.

## Main flow

1. Fill in Feature, Requirement, Docs, Figma, Team, and optional constraints.
2. Choose **Quick** or **Standard** break mode.
3. Click **Generate request**.
4. Click **Copy + Open ChatGPT**.
5. Paste and send.

The generated prompt asks AI to keep task count practical, maximize safe parallel work, assign clear ownership, reduce overlap, identify dependencies, and recommend merge order.

## Features

- Quick mode: concise breakdown, minimal task count, avoids overthinking.
- Standard mode: slightly more implementation detail.
- Local autosave.
- Recent draft history with load/delete.
- Copy + Open ChatGPT.
- Download Markdown.
- Export/import JSON backup for moving drafts between browsers or machines.
- No backend and no AI API key.

## Privacy

- No requirement data is sent to GitHub by the app.
- Drafts and recent history stay in browser `localStorage`.
- Export only happens when you explicitly download a JSON backup.
- The repository can be public for GitHub Pages while task input remains local in your browser.

## GitHub Pages

The project is fully static and can be hosted directly by GitHub Pages from `main` → `/ (root)`.

Site URL:

`https://pth190501.github.io/task-planner/`

## Run locally

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Files

```text
index.html
styles.css
app.js
skills/
  team-task-breakdown/
    SKILL.md
```
