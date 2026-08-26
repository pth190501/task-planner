# Task Planner

Private intake repo for collecting feature requirements and breaking them into development tasks.

## Flow

1. Open **Issues**.
2. Create a new **Task Breakdown Request**.
3. Fill in requirement, docs, Figma, team context, and constraints.
4. Submit the issue.
5. Ask ChatGPT:

   `Break task pth190501/task-planner issue #<number>`

ChatGPT can read the issue through the connected GitHub integration and return a Markdown task breakdown.

## Goal

- Keep requirements in one place.
- Reuse across different projects.
- Split work for multiple developers.
- Reduce overlapping ownership and merge conflicts.
- Keep output concise enough to send directly to the team.

## Structure

```text
.github/
  ISSUE_TEMPLATE/
    config.yml
    task-breakdown.yml

skills/
  team-task-breakdown/
    SKILL.md
```
