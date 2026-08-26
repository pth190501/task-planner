(() => {
  const $ = id => document.getElementById(id);
  const target = $('agentTarget');
  const intent = $('agentIntent');
  const copyBtn = $('copyAgentPromptBtn');
  const downloadBtn = $('downloadAgentPromptBtn');
  const promptPreview = $('agentPromptPreview');
  const status = $('agentPromptStatus');
  const STORAGE_KEY = 'task-planner:agent-target:v1';
  const INTENT_KEY = 'task-planner:agent-intent:v1';

  if (!target || !copyBtn || !promptPreview) return;

  const value = id => ($(id)?.value || '').trim();

  const planMarkdown = () => {
    const preview = $('preview');
    const text = (preview?.textContent || '').trim();
    if (!text || /Nhập hoặc paste requirement/i.test(text)) return '';
    return text;
  };

  const contextHeader = () => {
    const parts = [];
    if (value('project')) parts.push(`Project: ${value('project')}`);
    if (value('figma')) parts.push(`Figma: ${value('figma')}`);
    if (value('docs')) parts.push(`Docs/Refs: ${value('docs')}`);
    if (value('constraints')) parts.push(`Constraints: ${value('constraints')}`);
    return parts.length ? parts.join('\n') : 'Use the current workspace/repository as the primary source of truth.';
  };

  const common = plan => `Work from the task plan below. Treat repository/workspace source as truth. Read relevant code and available linked context before making implementation decisions. Do not invent files, APIs, architecture, or design details that you have not verified. Ask only questions that materially block implementation; otherwise make the smallest reasonable assumption and state it. Keep changes scoped, preserve existing conventions, avoid unrelated refactors, and validate the result.\n\n${contextHeader()}\n\nTASK PLAN\n${plan}`;

  const prompts = {
    chatgpt(plan, action) {
      return `${common(plan)}\n\nExecution style for ChatGPT:\n- Use available connected tools for source/Figma/Docs when relevant.\n- First reconcile the task plan with the actual source.\n- ${action === 'implement' ? 'Implement the work directly when tools allow it; otherwise produce an implementation-ready plan.' : action === 'review' ? 'Review the plan/source for gaps, conflicts, risks, and unnecessary complexity.' : 'Refine the plan only where source evidence requires it.'}\n- Keep the response concise and in Vietnamese unless source/code conventions require English.\n- End with concrete next actions and any material blockers.`;
    },

    claude(plan, action) {
      return `${common(plan)}\n\nExecution style for Claude Code / Claude:\n- Inspect the repository before proposing edits; search for existing patterns and reuse them.\n- Prefer a short plan, then act. Do not over-plan.\n- Use available MCP/context sources such as Figma or Docs when provided, but never claim to have read them if unavailable.\n- Preserve existing architecture unless the requirement explicitly needs a structural change.\n- ${action === 'implement' ? 'Make the smallest complete code changes needed to finish the task.' : action === 'review' ? 'Perform a focused implementation review and identify exact files/areas that need changes.' : 'Produce an implementation-ready plan mapped to real code ownership.'}\n- Run the most relevant available checks/tests/build after changes.\n- Final response: summary, files changed, validation performed, remaining blockers.\n- Be concise; do not repeat the full requirement.`;
    },

    codex(plan, action) {
      return `${common(plan)}\n\nExecution style for Codex:\n- Start by inspecting the working tree and locating the exact implementation areas.\n- Reuse existing helpers/components before creating new abstractions.\n- Keep diffs minimal and localized; do not touch unrelated files.\n- ${action === 'implement' ? 'Implement autonomously once the source confirms the intended behavior.' : action === 'review' ? 'Review the real code against this plan and return actionable findings ordered by impact.' : 'Create a repo-grounded execution plan with exact ownership boundaries.'}\n- For code changes, run targeted tests/build/lint when available and fix issues caused by your changes.\n- Never claim a command/test passed unless it was actually run.\n- Final response: what changed, validation commands/results, risks or follow-up only if material.`;
    },

    antigravity(plan, action) {
      return `${common(plan)}\n\nExecution style for Antigravity:\n- Treat the current workspace plus connected context/tools as one working environment.\n- Inspect existing code, project instructions, reusable components, and connected design/context before editing.\n- Use Figma/context tooling when a Figma link is supplied and available; otherwise explicitly mark design assumptions.\n- Work autonomously through discovery → focused plan → ${action === 'review' ? 'review' : action === 'plan' ? 'implementation-ready plan' : 'implementation'} → validation.\n- Keep ownership boundaries from the task plan and avoid parallel tasks modifying the same shared area without an integration owner.\n- Prefer existing project conventions over generic best practices.\n- Validate the final state with the strongest practical checks available in the workspace.\n- Final response: completed work, changed areas, validation, unresolved blockers. Keep it short.`;
    }
  };

  function selectedIntent() {
    return intent?.value || 'implement';
  }

  function buildPrompt() {
    const plan = planMarkdown();
    if (!plan) return '';
    const fn = prompts[target.value] || prompts.claude;
    return fn(plan, selectedIntent());
  }

  function render() {
    const prompt = buildPrompt();
    promptPreview.textContent = prompt || 'Nhập requirement để có Live Markdown Plan, sau đó prompt cho agent sẽ xuất hiện ở đây.';
    copyBtn.disabled = !prompt;
    if (downloadBtn) downloadBtn.disabled = !prompt;
    if (status) status.textContent = prompt ? `${target.options[target.selectedIndex].text} · ${selectedIntent()}` : 'Waiting for task plan';
  }

  async function copyPrompt() {
    const prompt = buildPrompt();
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      if (status) status.textContent = `Copied for ${target.options[target.selectedIndex].text}`;
    } catch (_) {
      promptPreview.focus?.();
      if (status) status.textContent = 'Copy failed — select prompt manually';
    }
  }

  function downloadPrompt() {
    const prompt = buildPrompt();
    if (!prompt) return;
    const blob = new Blob([prompt], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${target.value}-${selectedIntent()}-prompt.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  target.value = localStorage.getItem(STORAGE_KEY) || 'claude';
  if (intent) intent.value = localStorage.getItem(INTENT_KEY) || 'implement';

  target.addEventListener('change', () => {
    localStorage.setItem(STORAGE_KEY, target.value);
    render();
  });
  intent?.addEventListener('change', () => {
    localStorage.setItem(INTENT_KEY, intent.value);
    render();
  });
  copyBtn.addEventListener('click', copyPrompt);
  downloadBtn?.addEventListener('click', downloadPrompt);

  const watched = ['rawInput','feature','project','requirement','docs','figma','team','ownership','constraints','notes'];
  watched.forEach(id => $(id)?.addEventListener('input', () => setTimeout(render, 220)));
  document.querySelectorAll('[data-mode]').forEach(node => node.addEventListener('click', () => setTimeout(render, 220)));

  const observer = new MutationObserver(render);
  const sourcePreview = $('preview');
  if (sourcePreview) observer.observe(sourcePreview, { childList: true, subtree: true, characterData: true });

  render();
})();