---
name: interface-planner
description: Plans SDK, API, library, framework, module, or public integration boundaries before task splitting. Use when another team or code area will consume a stable interface or contract.
---

# Interface Planner

## Goal

Make integration boundaries explicit before assigning work.

## Identify

- Consumer and provider
- Public responsibility / contract
- Configuration surface
- Inputs and outputs
- Error / failure behavior
- Compatibility and lifecycle concerns
- Integration ownership

## Rules

- Design responsibilities before exact method names.
- Do not invent API signatures unsupported by context.
- Prefer simple interfaces that make correct usage obvious.
- Keep internal implementation details out of the public contract unless necessary.
- If two teams depend on the boundary, make contract ownership a first-class task or acceptance criterion.
- For SDKs, clarify target platform, integration method, enable/disable behavior, and what the host app must provide when those facts materially affect architecture.
