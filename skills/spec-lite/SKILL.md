---
name: spec-lite
description: Converts clarified software requirements into a concise implementation-facing mini spec before task breakdown. Use for non-trivial features, integrations, SDKs, flows, or changes where scope and acceptance criteria should be explicit.
---

# Spec Lite

## Goal

Create only enough specification to make task splitting reliable.

## Produce Internally

- Objective
- In scope
- Non-scope when known
- Key user/system behaviors
- Inputs, outputs, states, and integrations that matter
- Acceptance criteria
- Confirmed facts vs assumptions
- Material unknowns

## Rules

- Keep it short; this is not a full PRD.
- Do not invent requirements to make the spec look complete.
- Treat supplied Docs/Figma as authoritative only for what was actually read.
- Preserve explicit constraints from the user.
- For simple work, acceptance criteria may be only a few bullets.
- The spec exists to improve planning, not to create documentation overhead.
