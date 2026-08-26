---
name: figma-context
description: Extracts implementation-relevant context from supplied Figma designs before task breakdown. Use when a Figma file, node, section, or prototype flow is provided.
---

# Figma Context

## Goal

Translate design context into implementation ownership without creating one task per frame.

## Inspect

- Screens and major regions
- UI states and variants
- User interactions and navigation
- Reusable components
- Content/data dependencies visible in the design
- Cross-screen patterns that suggest shared ownership

## Rules

1. Read the supplied node/flow when Figma access is available.
2. Distinguish design-confirmed behavior from inferred behavior.
3. Do not invent backend/API requirements from visual appearance alone.
4. Group related frames by implementation ownership rather than frame count.
5. Prefer one owner for reusable components shared by multiple screens.
6. Identify the integration point when a new component must be inserted into an existing shared screen.
7. If Figma cannot be accessed, state that and plan only from the supplied textual context.
