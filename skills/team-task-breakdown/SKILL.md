---
name: team-task-breakdown
description: Breaks clarified feature requirements, Docs, Figma designs, SDK/API boundaries, or project context into concise development tasks for a human software team with clear ownership, dependencies, parallel work, and minimal overlap. Use after critical ambiguity has been resolved or when the user explicitly asks to proceed with assumptions.
---

# Team Task Breakdown

## Goal

Produce the smallest practical set of team tasks that can be implemented and reviewed with clear ownership and low merge-conflict risk.

## Router

Before planning, apply only the skills that match the input:

- Sparse / ambiguous request → `requirements-clarifier`
- Non-trivial feature → `spec-lite`
- Docs / tickets / external references → `source-context`
- Figma → `figma-context`
- SDK / API / library / framework / public boundary → `interface-planner`
- Then → `team-task-breakdown`

Do not run every skill when it adds no value.

## Planning Rules

1. Understand the complete clarified feature before splitting.
2. Split by independent ownership, not by tiny coding steps.
3. Keep task count as small as practical; 2–5 meaningful tasks is a useful default for a normal feature.
4. Maximize safe parallel work.
5. Prefer one primary owner for each important shared code area.
6. If two tasks heavily modify the same screen/module/file area, merge them or nominate one integration owner.
7. Create dependencies only when technically necessary.
8. Do not invent exact files, APIs, architecture, or design behavior not supported by context.
9. Separate confirmed facts from assumptions.
10. Keep the output concise enough to paste directly into a team channel or Jira.

## Task Shape

Each task should include only what helps assignment:

- Owner
- Can run in parallel
- Depends on
- Scope
- Main ownership area
- Done criteria

Avoid task boundaries such as individual labels, constraints, methods, or trivial file edits.

## Output

```markdown
# <Feature Name>

## Scope
- ...

## Task Breakdown

### TASK-01 — <Task>
**Owner:** Dev A
**Can run in parallel:** Yes
**Depends on:** None

**Scope**
- ...

**Main ownership**
- ...

**Done when**
- ...

## Parallel Plan
- ...

## Shared Ownership / Conflict Notes
- ...

## Merge Order
1. ...

## Open Questions
Only material questions, if any remain.
```

## Final Check

Before returning:

- Are any tasks unnecessarily small?
- Are two developers unknowingly owning the same important area?
- Is integration ownership explicit?
- Can more work safely run in parallel?
- Are dependencies real rather than convenient?
- Did the plan invent anything not present in the source?
