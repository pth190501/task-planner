(() => {
  const $ = id => document.getElementById(id);
  const root = $('taskAgentGrid');
  if (!root) return;

  const val = id => ($(id)?.value || '').trim();
  const feature = () => val('feature') || ((window.TaskPlannerCurrent?.markdown || '').match(/^#\s+(.+)$/m) || [,'Current feature'])[1];
  const context = () => [
    val('project') && `Project: ${val('project')}`,
    val('constraints') && `Constraints: ${val('constraints')}`,
    val('docs') && `Docs/Refs: ${val('docs')}`,
    val('figma') && `Figma: ${val('figma')}`
  ].filter(Boolean).join('\n') || 'Use the current repository/workspace as the source of truth.';

  const base = task => `Feature: ${feature()}\n\nAssigned task:\n${taskToMarkdown(task)}\n\nContext:\n${context()}\n\nRules:\n- Own only this task scope unless a dependency requires a small integration change.\n- Treat the listed Figma areas and mapped document sections as the primary ownership boundary for this task.\n- Inspect existing source before editing and reuse project conventions.\n- Do not invent files, APIs, source content, or Figma details.\n- Respect dependencies and shared ownership from the task.\n- Avoid unrelated refactors and keep the diff minimal.\n- Ask only if a blocker materially changes implementation; otherwise state the smallest reasonable assumption.\n- Validate the result with the strongest practical targeted checks available.`;

  function taskToMarkdown(t) {
    const bullets = xs => (xs || []).map(x => `- ${x}`).join('\n');
    const figma = t.figma?.length ? `\n\n**Figma areas**\n${bullets(t.figma)}` : '';
    const docs = t.docs?.length ? `\n\n**Document mapping**\n${bullets(t.docs)}` : '';
    return `### ${t.id} — ${t.title}\n**Owner:** ${t.owner}\n**Depends on:** ${t.depends || 'None'}\n**Can run in parallel:** ${t.parallel}${figma}${docs}\n\n**Scope**\n${bullets(t.scope)}\n\n**Main ownership**\n${bullets(t.ownership)}\n\n**Done when**\n${bullets(t.done)}`;
  }

  const AGENTS = {
    codex(task) { return `${base(task)}\n\nCodex execution:\n- Inspect git status/working tree and locate exact implementation areas first.\n- Read/verify the Figma and document context for this assigned region when available before changing code.\n- Implement autonomously after source confirms the path.\n- Prefer existing helpers/components over new abstraction.\n- Run targeted build/test/lint commands when available; never claim they passed unless actually run.\n- Final: changed files/areas, validation commands/results, material blocker only.`; },
    claude(task) { return `${base(task)}\n\nClaude Code execution:\n- Search the repository for existing patterns before proposing changes.\n- Use connected MCP/Docs/Figma context to verify this task's region and mapped rules when available.\n- Keep planning brief, then implement the smallest complete change for this ownership area.\n- Preserve architecture unless the task genuinely requires structural change.\n- Final: summary, files changed, validation performed, remaining blocker only.`; },
    antigravity(task) { return `${base(task)}\n\nAntigravity execution:\n- Treat workspace instructions, source, Figma and connected context tools as one environment.\n- Follow discovery → verify assigned Figma region/docs → focused plan → implementation → validation.\n- Prefer project conventions over generic best practices.\n- Keep this task's ownership boundary; do not drift into sibling Figma regions.\n- Final: completed work, changed areas, validation, unresolved blocker only.`; },
    chatgpt(task) { return `${base(task)}\n\nChatGPT execution:\n- Reconcile this assigned Figma region and mapped document rules against actual source first.\n- Use Figma/Docs/source connectors when relevant and available.\n- Implement directly when tools allow; otherwise return an implementation-ready repo-grounded patch plan.\n- Keep response concise and do not repeat the whole requirement.\n- Final: result, validation, material next action only.`; }
  };

  async function copy(text, button) {
    try {
      await navigator.clipboard.writeText(text);
      const old = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => button.textContent = old, 1000);
    } catch (_) {
      button.textContent = 'Copy failed';
      setTimeout(() => render(), 1200);
    }
  }

  function normalizedTasks() {
    const tasks = window.TaskPlannerCurrent?.tasks || [];
    return tasks.map((t, i) => ({ ...t, id: `TASK-${String(i+1).padStart(2,'0')}` }));
  }

  function render() {
    const tasks = normalizedTasks();
    root.innerHTML = '';
    if (!tasks.length) {
      root.className = 'task-agent-grid empty';
      root.textContent = /figma/i.test(window.TaskPlannerCurrent?.skill?.id || '')
        ? 'Figma source chưa được map thành vùng. Dùng Source Mapping Prompt hoặc paste Figma outline.'
        : 'Nhập requirement để task prompt riêng xuất hiện.';
      return;
    }
    root.className = 'task-agent-grid';
    tasks.forEach(task => {
      const card = document.createElement('article');
      card.className = 'task-agent-card';
      const head = document.createElement('div');
      head.className = 'task-agent-head';
      head.innerHTML = `<div><span>${task.id}</span><strong>${escapeHtml(task.title)}</strong></div><small>${escapeHtml(task.owner)} · ${task.parallel === 'Yes' ? 'parallel' : 'sequential'}</small>`;
      const mapping = document.createElement('div');
      mapping.className = 'task-agent-mapping';
      const parts = [];
      if (task.figma?.length) parts.push(`<b>Figma:</b> ${escapeHtml(task.figma.join(', '))}`);
      if (task.docs?.length) parts.push(`<b>Docs:</b> ${escapeHtml(task.docs.join('; '))}`);
      mapping.innerHTML = parts.join('<br>');
      const actions = document.createElement('div');
      actions.className = 'task-agent-actions';
      [['codex','Codex'],['claude','Claude'],['antigravity','Antigravity'],['chatgpt','ChatGPT']].forEach(([key,label]) => {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = label;
        b.addEventListener('click', () => copy(AGENTS[key](task), b));
        actions.appendChild(b);
      });
      const detail = document.createElement('details');
      detail.innerHTML = `<summary>Task scope</summary><pre>${escapeHtml(taskToMarkdown(task))}</pre>`;
      card.append(head);
      if (parts.length) card.append(mapping);
      card.append(actions, detail);
      root.appendChild(card);
    });
  }

  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }

  window.addEventListener('taskplanner:plan-updated', render);
  ['feature','project','constraints','docs','figma'].forEach(id => $(id)?.addEventListener('input', () => setTimeout(render,320)));
  setTimeout(render, 500);
})();