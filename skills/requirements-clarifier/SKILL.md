---
name: requirements-clarifier
description: Clarifies sparse or ambiguous software requests before planning. Use when platform, user outcome, success criteria, integration style, or a binding constraint is missing and the gap would materially change the task breakdown.
---

# Requirements Clarifier

## Goal

Prevent confident planning from vague input.

## Use When

- The request is only a short idea or conventional phrase.
- Platform/stack is missing for an SDK, library, API, or platform-specific feature.
- Expected behavior or success criteria is unclear.
- Two plausible interpretations would produce different ownership or architecture.

## Rules

1. Read available Docs/Figma/source first if the environment can access them.
2. Never ask the user for information that can be answered from supplied sources.
3. Ask only questions that materially affect scope, architecture, ownership, or done criteria.
4. Ask at most 3–5 questions in one round.
5. Attach a likely default assumption to each question so the user can answer quickly.
6. Do not produce a final task breakdown until the critical ambiguity is resolved, unless the user explicitly asks to proceed with assumptions.
7. If proceeding with assumptions, label them clearly.

## Stop Condition

Stop clarifying when the feature objective, target environment, key behavior, and meaningful constraints are sufficient to produce independent team tasks.
