# Task Planner

Static HTML/CSS/JS web app for preparing feature requirements, Docs, Figma links, team context, and constraints before sending them to ChatGPT for task breakdown.

## Flow

1. Open the web app.
2. Fill in Feature, Requirement, Docs, Figma, Team, Constraints, and Notes.
3. Click **Generate request**.
4. Click **Copy for ChatGPT** and paste it into ChatGPT.
5. ChatGPT returns Markdown with ownership, dependencies, parallel work, conflict notes, and merge order.

You can also use **Download .md**.

## Privacy

- No backend.
- No AI API key.
- No requirement data is sent to GitHub.
- Drafts and recent history are stored only in browser `localStorage`.
- The repository can therefore be public for GitHub Pages while your actual task input stays local in your browser.

## GitHub Pages

This project is fully static and can be hosted directly by GitHub Pages.

After making the repository **Public**:

1. Open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select `main` and `/ (root)`.
4. Save.

The site URL will normally be:

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
