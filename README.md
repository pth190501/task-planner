# Task Planner Web

A small private-source web app for collecting feature requirements, Docs, Figma links, team context, and constraints before sending them to ChatGPT for task breakdown.

## Recommended flow

1. Open the web app.
2. Fill in Feature, Requirement, Docs, Figma, Team, Constraints, and Notes.
3. Click **Generate request**.
4. Click **Save to private GitHub**.
5. GitHub opens a prefilled Issue in `pth190501/task-planner`; submit it.
6. Ask ChatGPT:

   `Break task pth190501/task-planner issue #<number>`

ChatGPT can read the private issue through the connected GitHub integration and return Markdown with ownership, dependencies, parallel work, conflict notes, and merge order.

You can also use **Copy for ChatGPT** or **Download .md** without creating an Issue.

## Privacy in v1

- No OpenAI / Anthropic / Gemini API key is stored in the page.
- Drafts and recent history are stored only in browser `localStorage`.
- Data is sent to GitHub only when you choose **Save to private GitHub** and submit the private Issue.
- Large requests are copied to clipboard instead of being put into an oversized URL; the web opens a new Issue and you paste the copied Markdown.

## Run locally

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## GitHub Pages

The app is fully static (`index.html`, `styles.css`, `app.js`) and can be published from the repository root with GitHub Pages.

GitHub Pages is available from private repositories on plans that support it. On personal accounts, a privately accessible Pages site itself requires Enterprise access control; otherwise the published UI should be treated as public. The current app does not embed private data in the source and stores drafts locally in the browser.

## Files

```text
index.html
styles.css
app.js

skills/
  team-task-breakdown/
    SKILL.md

.github/
  ISSUE_TEMPLATE/        # fallback intake flow
```
