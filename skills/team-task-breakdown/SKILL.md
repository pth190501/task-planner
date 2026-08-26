---
name: team-task-breakdown
description: Break feature requirements, product docs, Figma designs, or GitHub intake issues into concise development tasks for a human software team, with clear ownership, dependencies, parallel work, and minimal overlap.
---

# Team Task Breakdown

## Goal

Turn a requirement, document, Figma flow, or GitHub issue into a concise Markdown plan that can be sent directly to a development team.

Prioritize:
- clear responsibility
- parallel work
- minimal overlap
- minimal merge conflicts
- explicit dependencies
- simple handoff

Do not over-plan.

## Process

1. Understand the complete feature before splitting.
2. Identify major implementation areas.
3. Split by independent ownership, not by tiny implementation steps.
4. Check likely shared files/modules/screens.
5. Prefer one primary owner for important shared areas.
6. Identify tasks that can run in parallel.
7. Identify integration tasks and merge order.
8. Keep the final Markdown concise.

## Splitting Rules

Prefer task boundaries such as:
- API / data
- standalone UI component
- navigation / routing
- analytics / tracking
- integration
- substantial migration / testing

Avoid splits like:
- create label
- add constraints
- bind text

If two developers would likely modify the same important screen, ViewModel, XIB, router, manager, or shared configuration, reconsider the split.

Rule of thumb:

> One important shared code area should have one primary owner within the feature whenever practical.

## Figma

When Figma is provided:
- understand screens, states, interactions, navigation, and reusable components
- do not create one task per frame
- group frames by implementation ownership
- prefer one owner for reusable components

## Output

Return Markdown in this shape:

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
- ...

**Main ownership**
- ...

**Done when**
- ...
- ...

## Parallel Plan
- TASK-01 + TASK-02 can start together
- TASK-03 starts after ...

## Shared Ownership / Conflict Notes
- <area> → Dev X
- <area> → Dev Y

## Merge Order
1. TASK-01
2. TASK-02
3. TASK-03

## Open Questions
Only include questions that materially affect ownership, dependency, or scope.
```

## Final Check

Before returning:
- merge tasks that are unnecessarily small
- avoid assigning the same important area to multiple people
- maximize safe parallel work
- keep integration ownership clear
- keep output usable by a real team
