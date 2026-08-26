# Task Planner Web

A small private-source web app for collecting feature requirements, Docs, Figma links, team context, and constraints before sending them to ChatGPT for task breakdown.

## Current flow

1. Open the web app.
2. Fill in Feature, Requirement, Docs, Figma, Team, Constraints, and Notes.
3. Click **Generate request**.
4. Review the generated Markdown.
5. Click **Copy for ChatGPT** and paste it into ChatGPT.
6. ChatGPT breaks the work into team tasks with ownership, dependencies, parallel work, conflict notes, and merge order.

## Privacy in v1

- No OpenAI / Anthropic / Gemini API key is stored in the page.
- Form data is not sent to a server.
- Drafts and recent history are stored only in browser `localStorage`.
- Downloaded Markdown stays on your machine.

## Run locally

Clone the repository and open `index.html` in a browser, or serve it with any static HTTP server.

Example with Python:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## GitHub Pages

The app is fully static (`index.html`, `styles.css`, `app.js`) and can be published from the repository root with GitHub Pages.

For a personal account, GitHub Pages from a private repository requires a GitHub plan that supports Pages for private repositories. A privately published Pages site itself requires GitHub Enterprise Cloud access control; otherwise treat the published UI as public and rely on the current local-only storage design for submitted data.

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

## Planned next step

If the web workflow feels right, add optional authenticated persistence so submissions can be stored centrally and referenced by Request ID without putting AI API keys in the frontend.
