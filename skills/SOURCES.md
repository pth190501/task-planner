# Skill Stack Sources

This planner uses a small, routed skill stack. The local skills are concise adaptations for this project's task-planning workflow; they are not verbatim copies.

Primary inspirations:

- Addy Osmani — `interview-me`
  - https://github.com/addyosmani/agent-skills/tree/main/skills/interview-me
- Addy Osmani — `spec-driven-development`
  - https://github.com/addyosmani/agent-skills/tree/main/skills/spec-driven-development
- Addy Osmani — `planning-and-task-breakdown`
  - https://github.com/addyosmani/agent-skills/tree/main/skills/planning-and-task-breakdown
- Addy Osmani — `context-engineering`
  - https://github.com/addyosmani/agent-skills/tree/main/skills/context-engineering
- Addy Osmani — `source-driven-development`
  - https://github.com/addyosmani/agent-skills/tree/main/skills/source-driven-development
- Addy Osmani — `api-and-interface-design`
  - https://github.com/addyosmani/agent-skills/tree/main/skills/api-and-interface-design
- EAI Agent Toolkit — `create-implementation-plan`
  - https://github.com/eai-org/agent-toolkit/tree/main/skills/create-implementation-plan
- Agent Skills open format
  - https://github.com/agentskills/agentskills

## Local routing

```text
Sparse requirement
  -> requirements-clarifier
  -> spec-lite

Docs / references
  -> source-context

Figma
  -> figma-context

SDK / API / library / framework
  -> interface-planner

Ready context
  -> team-task-breakdown
```

The router intentionally avoids loading every skill for every request.
