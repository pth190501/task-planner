# Task Planner

Static HTML/CSS/JS web app for preparing feature requirements, Docs, Figma links, team context, and constraints before sending them to ChatGPT for task breakdown.

## Fast flow

1. Paste everything into **Quick Paste**: requirement, Jira, Google Doc, Figma, team notes, etc.
2. Click **Auto organize**.
3. Review the structured fields if needed.
4. Click **Generate request**.
5. Click **Copy + Open ChatGPT**.
6. Paste and send.

You can still skip Quick Paste and fill the structured form manually.

## Features

- Quick Paste: accepts mixed raw context and locally separates Figma links, references, requirement text, team, ownership, and constraints using simple heuristics.
- Add local `.md`, `.txt`, `.json`, or `.csv` files into Quick Paste without uploading them anywhere.
- Project Profiles: locally save reusable project/team/ownership/constraint defaults for different projects.
- Quick mode: concise breakdown, minimal task count, avoids overthinking.
- Standard mode: slightly more implementation detail.
- Prompt rules explicitly prevent AI from inventing unsupported files/modules/Figma/API details.
- Local autosave.
- Recent draft history with load/delete.
- Copy + Open ChatGPT.
- Download Markdown.
- Export/import JSON backup including project profiles and history.
- No backend and no AI API key.

## Privacy

- No requirement data is sent to GitHub by the app.
- Drafts, raw paste content, profiles, and recent history stay in browser `localStorage`.
- Local source files are read using the browser File API only.
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
