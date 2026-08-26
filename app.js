const STORAGE_KEY = 'task-planner:draft:v4';
const HISTORY_KEY = 'task-planner:history:v4';
const MODE_KEY = 'task-planner:mode:v4';
const PROFILE_KEY = 'task-planner:profiles:v4';
const PROFILE_SELECTED_KEY = 'task-planner:selected-profile:v4';
const HISTORY_LIMIT = 12;

const $ = id => document.getElementById(id);
const form = $('taskForm');
const preview = $('preview');
const requestIdEl = $('requestId');
const copyBtn = $('copyBtn');
const openChatBtn = $('openChatBtn');
const downloadBtn = $('downloadBtn');
const clearBtn = $('clearBtn');
const clearHistoryBtn = $('clearHistoryBtn');
const historyEl = $('history');
const saveState = $('saveState');
const toast = $('toast');
const exportBtn = $('exportBtn');
const importInput = $('importInput');
const requirementCount = $('requirementCount');
const sourceStatus = $('sourceStatus');
const rawInput = $('rawInput');
const organizeBtn = $('organizeBtn');
const clearRawBtn = $('clearRawBtn');
const rawStatus = $('rawStatus');
const rawFileInput = $('rawFileInput');
const profileSelect = $('profileSelect');
const saveProfileBtn = $('saveProfileBtn');
const deleteProfileBtn = $('deleteProfileBtn');
const forcePlan = $('forcePlan');
const qualityBadge = $('qualityBadge');
const skillStack = $('skillStack');
const routerReason = $('routerReason');
const modeButtons = [...document.querySelectorAll('[data-mode]')];

const fields = ['feature', 'project', 'requirement', 'docs', 'figma', 'team', 'ownership', 'constraints', 'notes'];
let mode = localStorage.getItem(MODE_KEY) || 'quick';
let currentMarkdown = '';
let currentRequestId = '';
let currentRoute = null;
let saveTimer;

const getValues = () => Object.fromEntries(fields.map(id => [id, $(id).value.trim()]));
const setValues = values => fields.forEach(id => { $(id).value = values?.[id] || ''; });
const setActions = enabled => [copyBtn, openChatBtn, downloadBtn].forEach(button => { button.disabled = !enabled; });
const uniqueLines = value => [...new Set((value || '').split(/\r?\n/).map(v => v.trim()).filter(Boolean))];
const mergeLines = (a, b) => [...new Set([...uniqueLines(a), ...b.filter(Boolean)])].join('\n');
const asBullets = value => uniqueLines(value).map(v => v.startsWith('- ') ? v : `- ${v}`).join('\n');
const section = (title, value, bullets = false) => value ? `\n## ${title}\n${bullets ? asBullets(value) : value}\n` : '';

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function makeRequestId() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `REQ-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function routeSkills(values) {
  const all = [values.feature, values.requirement, values.constraints, values.notes].join(' ').toLowerCase();
  const req = values.requirement.trim();
  const words = req.split(/\s+/).filter(Boolean).length;
  const hasPlatform = /\b(ios|android|web|backend|frontend|flutter|react|swift|swiftui|uikit|kotlin|java|node|python|go|dotnet|\.net|macos)\b/i.test(all);
  const interfaceHeavy = /\b(sdk|framework|library|thư viện|api|endpoint|contract|interface|module|plugin|package)\b/i.test(all);
  const hasOutcomeDetail = /(cần|phải|hiển thị|show|capture|log|response|request|success|fail|khi|nếu|user|người dùng|flow|acceptance|done|scope)/i.test(req) && words >= 18;
  const hasSources = Boolean(values.docs || values.figma);

  let score = 0;
  if (words >= 8) score += 20;
  if (words >= 25) score += 20;
  if (hasOutcomeDetail) score += 15;
  if (values.docs) score += 10;
  if (values.figma) score += 10;
  if (values.team) score += 10;
  if (values.constraints || values.ownership) score += 10;
  if (!interfaceHeavy || hasPlatform) score += 5;
  score = Math.min(100, score);

  const criticalGaps = [];
  if (words < 12) criticalGaps.push('requirement quá ngắn để xác định scope');
  if (interfaceHeavy && !hasPlatform) criticalGaps.push('chưa rõ target platform / stack');
  if (!hasOutcomeDetail && words < 30) criticalGaps.push('chưa rõ expected behavior / success criteria');
  const sparse = score < 45 || criticalGaps.length >= 2;

  const skills = [];
  if (sparse && !forcePlan.checked) skills.push({ id: 'clarify', name: 'Clarify', tier: 'S', reason: 'Requirement còn thiếu context critical.' });
  skills.push({ id: 'spec', name: 'Spec-lite', tier: 'S', reason: 'Chuẩn hóa scope và acceptance criteria trước khi chia task.' });
  if (hasSources) skills.push({ id: 'source', name: 'Source Context', tier: 'S', reason: 'Đọc source có thể truy cập, không hallucinate.' });
  if (values.figma) skills.push({ id: 'design', name: 'Figma Context', tier: 'S', reason: 'Hiểu screen/state/interaction/component trước khi chia việc.' });
  if (interfaceHeavy) skills.push({ id: 'interface', name: 'Interface Design', tier: 'S', reason: 'SDK/API/library cần boundary và public contract rõ.' });
  skills.push({ id: 'plan', name: 'Task Breakdown', tier: 'S', reason: 'Chia ownership, dependency, parallel work và merge order.' });

  return {
    score,
    sparse,
    criticalGaps,
    skills,
    action: sparse && !forcePlan.checked ? 'clarify' : 'plan'
  };
}

function renderRouter() {
  const values = getValues();
  currentRoute = routeSkills(values);
  skillStack.innerHTML = '';
  currentRoute.skills.forEach(skill => {
    const chip = document.createElement('span');
    chip.className = `skill-chip ${skill.id}`;
    chip.textContent = `${skill.name} · ${skill.tier}`;
    chip.title = skill.reason;
    skillStack.appendChild(chip);
  });

  if (!values.requirement) {
    qualityBadge.textContent = 'Waiting';
    qualityBadge.className = 'quality-badge';
    routerReason.textContent = 'Nhập requirement để router đánh giá.';
    return;
  }

  if (currentRoute.action === 'clarify') {
    qualityBadge.textContent = `Sparse · ${currentRoute.score}`;
    qualityBadge.className = 'quality-badge warn';
    routerReason.textContent = `Clarify first: ${currentRoute.criticalGaps.join(' · ') || 'thiếu context critical'}.`;
  } else {
    qualityBadge.textContent = `Ready · ${currentRoute.score}`;
    qualityBadge.className = 'quality-badge ready';
    routerReason.textContent = forcePlan.checked && currentRoute.sparse
      ? 'Force plan bật: AI sẽ plan với assumptions được đánh dấu rõ.'
      : 'Đủ context để spec-lite và break task trực tiếp.';
  }
}

function buildMarkdown(values) {
  const id = makeRequestId();
  const route = routeSkills(values);
  const activeSkills = route.skills.map(s => s.name).join(' → ');
  const quickRules = [
    '- Keep task count as small as practical; 2–5 meaningful tasks is a good default for normal features.',
    '- Do not split by individual functions, files, labels, or tiny UI elements.',
    '- Ask only questions that materially change scope, architecture, ownership, or acceptance criteria.'
  ];
  const standardRules = [
    '- Produce independently reviewable tasks without excessive granularity.',
    '- Include enough context for a developer to start without re-reading everything.',
    '- Surface meaningful architecture, integration, testing, and rollout dependencies.'
  ];

  const clarifyBlock = route.action === 'clarify' ? [
    '',
    '## Required AI Behavior — Clarify First',
    '- Do NOT produce the final task breakdown yet.',
    '- Ask at most 3–5 critical questions that materially change scope or ownership.',
    '- For each question, include your best likely default assumption so the user can answer quickly.',
    '- Do not ask anything that can be answered by reading supplied Docs/Figma/source with available tools.',
    '- After the user answers, create a spec-lite and then break tasks.',
    `- Detected gaps: ${route.criticalGaps.join('; ') || 'insufficient implementation context'}`
  ] : [
    '',
    '## Required AI Behavior — Plan Now',
    '- Read accessible linked sources first when tools/connectors are available.',
    '- Create a concise spec-lite internally: objective, in-scope, non-scope, key behaviors, acceptance criteria, unknowns.',
    '- Then produce the team task breakdown.'
  ];

  const sourceRules = [];
  if (values.docs || values.figma) {
    sourceRules.push(
      '',
      '## Source Verification Rules',
      '- Open supplied Docs/Figma when the environment has access before planning.',
      '- Clearly state which sources were actually read and which could not be accessed.',
      '- Never invent details for inaccessible sources.'
    );
  }
  if (values.figma) {
    sourceRules.push(
      '',
      '## Figma Rules',
      '- Inspect the provided node/flow and related states, interactions, reusable components, and navigation.',
      '- Do not create one task per Figma frame; group by implementation ownership.',
      '- Separate design-confirmed behavior from assumptions.'
    );
  }
  if (route.skills.some(s => s.id === 'interface')) {
    sourceRules.push(
      '',
      '## Interface / SDK Rules',
      '- Before splitting tasks, identify the public boundary/contract, integration style, configuration surface, and compatibility concerns.',
      '- Do not invent an SDK API signature unless supported by context; describe the contract responsibility instead.',
      '- Prefer an interface that is hard to misuse and keeps integration ownership clear.'
    );
  }

  const lines = [
    `# Task Planner Request — ${values.feature}`,
    '',
    `**Request ID:** ${id}`,
    `**Break mode:** ${mode === 'quick' ? 'Quick' : 'Standard'}`,
    `**Skill route:** ${activeSkills}`,
    `**Context score:** ${route.score}/100`,
    values.project ? `**Project:** ${values.project}` : '',
    values.team ? `**Team:** ${values.team}` : '',
    values.ownership ? `**Preferred ownership:** ${values.ownership}` : '',
    '',
    '## Goal',
    'Turn the supplied context into a practical team plan with clear ownership, safe parallel work, minimal overlap, and minimal merge conflict.',
    '',
    '## Requirement',
    values.requirement,
    section('Docs / References', values.docs, true),
    section('Figma', values.figma, true),
    section('Constraints / Shared Areas', values.constraints),
    section('Additional Notes', values.notes),
    ...clarifyBlock,
    ...sourceRules,
    '',
    '## Planning Rules',
    ...(mode === 'quick' ? quickRules : standardRules),
    '- Separate confirmed facts from assumptions.',
    '- Prefer one primary owner for each important shared screen/module/file area.',
    '- If two tasks heavily modify the same shared area, merge them or assign one integration owner.',
    '- Maximize safe parallel work; create dependencies only when technically necessary.',
    '- Never invent exact file names, modules, APIs, architecture, or source behavior not supported by context.',
    '- Output in concise Vietnamese suitable to send directly to a development team.',
    '',
    '## Final Output When Ready',
    '- Short scope summary',
    '- Task list: owner, dependency, ownership area, scope, done criteria',
    '- Parallel execution plan',
    '- Shared ownership / likely conflict points',
    '- Recommended merge order',
    '- Only material open questions'
  ].filter(line => line !== '');

  return { id, route, markdown: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n' };
}

const aiPrompt = markdown => `Follow the skill route embedded in this request. Do not overthink and do not fabricate missing implementation details. If the router says Clarify First, ask only the critical questions and stop. If it says Plan Now, read accessible sources, create a spec-lite internally, then return the concise Vietnamese task breakdown.\n\n${markdown}`;

function updateIndicators() {
  const values = getValues();
  const status = [Boolean(values.requirement), Boolean(values.docs), Boolean(values.figma), Boolean(values.team)];
  [...sourceStatus.children].forEach((node, i) => node.classList.toggle('ready', status[i]));
  requirementCount.textContent = `${$('requirement').value.length.toLocaleString()} chars`;
  renderRouter();
}

function saveDraft() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ raw: rawInput.value, forcePlan: forcePlan.checked, values: getValues() }));
  saveState.textContent = 'Draft saved locally';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveState.textContent = 'Draft autosaved locally', 1200);
}

function loadDraft() {
  try {
    const v4 = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    const v3 = JSON.parse(localStorage.getItem('task-planner:draft:v3') || 'null');
    const older = JSON.parse(localStorage.getItem('task-planner:draft:v2') || 'null');
    const data = v4 || v3;
    if (data?.values) {
      setValues(data.values);
      rawInput.value = data.raw || '';
      forcePlan.checked = Boolean(data.forcePlan);
    } else if (older) setValues(older);
  } catch (_) {}
}

function readHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || 'null')
      || JSON.parse(localStorage.getItem('task-planner:history:v3') || 'null')
      || JSON.parse(localStorage.getItem('task-planner:history:v2') || '[]')
      || [];
  } catch (_) { return []; }
}
const writeHistory = history => localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, HISTORY_LIMIT)));

function addHistory(values, output) {
  const history = readHistory().filter(item => item.id !== output.id);
  history.unshift({ id: output.id, feature: values.feature, project: values.project, createdAt: new Date().toISOString(), values, markdown: output.markdown, mode, route: output.route.action });
  writeHistory(history);
  renderHistory();
}

function loadGenerated(markdown, id) {
  currentMarkdown = markdown;
  currentRequestId = id;
  preview.textContent = markdown;
  requestIdEl.textContent = id;
  setActions(true);
}

function renderHistory() {
  const history = readHistory();
  historyEl.innerHTML = '';
  if (!history.length) {
    historyEl.className = 'history empty';
    historyEl.textContent = 'Chưa có draft nào.';
    return;
  }
  historyEl.className = 'history';
  history.forEach(item => {
    const row = document.createElement('div'); row.className = 'history-item';
    const main = document.createElement('div'); main.className = 'history-main';
    const title = document.createElement('div'); title.className = 'history-title'; title.textContent = item.feature || 'Untitled';
    const meta = document.createElement('div'); meta.className = 'history-meta'; meta.textContent = `${item.id}${item.project ? ` · ${item.project}` : ''}${item.route ? ` · ${item.route}` : ''}`;
    main.append(title, meta);
    const actions = document.createElement('div'); actions.className = 'history-actions';
    const load = document.createElement('button'); load.type = 'button'; load.textContent = 'Load';
    load.onclick = () => { setValues(item.values); loadGenerated(item.markdown, item.id); saveDraft(); updateIndicators(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'delete'; remove.textContent = '×';
    remove.onclick = () => { writeHistory(readHistory().filter(v => v.id !== item.id)); renderHistory(); };
    actions.append(load, remove); row.append(main, actions); historyEl.append(row);
  });
}

function setMode(next) {
  mode = next === 'standard' ? 'standard' : 'quick';
  localStorage.setItem(MODE_KEY, mode);
  modeButtons.forEach(button => button.classList.toggle('active', button.dataset.mode === mode));
  renderRouter();
}

function classifyRaw(raw) {
  const result = { feature: '', project: '', requirement: [], docs: [], figma: [], team: '', ownership: '', constraints: [], notes: [] };
  const lines = raw.split(/\r?\n/).map(v => v.trim()).filter(Boolean);
  const prefix = {
    feature: 'feature', title: 'feature', task: 'feature', 'tính năng': 'feature',
    project: 'project', 'dự án': 'project', team: 'team', dev: 'team', devs: 'team',
    ownership: 'ownership', owner: 'ownership', 'phân công': 'ownership',
    constraint: 'constraints', constraints: 'constraints', 'ràng buộc': 'constraints',
    note: 'notes', notes: 'notes', 'ghi chú': 'notes', figma: 'figma', design: 'figma',
    doc: 'docs', docs: 'docs', jira: 'docs', ticket: 'docs', reference: 'docs', references: 'docs', 'tài liệu': 'docs'
  };
  const push = (key, value) => { if (value && !result[key].includes(value)) result[key].push(value); };

  lines.forEach((original, index) => {
    const urls = original.match(/https?:\/\/[^\s)\]}>,]+/gi) || [];
    urls.forEach(url => /figma\.com/i.test(url) ? push('figma', url) : push('docs', url));
    let text = original; urls.forEach(url => { text = text.replace(url, ''); });
    text = text.replace(/^[-*•]\s*/, '').trim(); if (!text) return;
    const m = text.match(/^([^:：]{1,30})[:：]\s*(.*)$/);
    if (m) {
      const target = prefix[m[1].trim().toLowerCase()]; const value = m[2].trim();
      if (target) {
        if (['feature', 'project', 'team', 'ownership'].includes(target)) { if (value) result[target] = value; }
        else push(target, value);
        return;
      }
    }
    if (!result.feature && index === 0 && /^#{1,3}\s+/.test(text)) { result.feature = text.replace(/^#{1,3}\s+/, ''); return; }
    push('requirement', text);
  });
  return { result, lineCount: lines.length };
}

function organizeRaw() {
  const raw = rawInput.value.trim();
  if (!raw) return showToast('Chưa có raw context');
  const { result, lineCount } = classifyRaw(raw);
  const current = getValues();
  if (!current.feature && result.feature) $('feature').value = result.feature;
  if (!current.project && result.project) $('project').value = result.project;
  if (!current.team && result.team) $('team').value = result.team;
  if (!current.ownership && result.ownership) $('ownership').value = result.ownership;
  $('requirement').value = mergeLines(current.requirement, result.requirement);
  $('docs').value = mergeLines(current.docs, result.docs);
  $('figma').value = mergeLines(current.figma, result.figma);
  $('constraints').value = mergeLines(current.constraints, result.constraints);
  $('notes').value = mergeLines(current.notes, result.notes);
  rawStatus.textContent = `Organized ${lineCount} lines · ${result.figma.length} Figma · ${result.docs.length} refs`;
  saveDraft(); updateIndicators(); showToast('Context organized');
}

function readProfiles() { try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') || {}; } catch (_) { return {}; } }
function writeProfiles(v) { localStorage.setItem(PROFILE_KEY, JSON.stringify(v)); }
function renderProfiles() {
  const profiles = readProfiles(); const selected = localStorage.getItem(PROFILE_SELECTED_KEY) || '';
  profileSelect.innerHTML = '<option value="">No profile</option>';
  Object.keys(profiles).sort().forEach(name => { const o = document.createElement('option'); o.value = name; o.textContent = name; profileSelect.appendChild(o); });
  if (profiles[selected]) profileSelect.value = selected;
  deleteProfileBtn.disabled = !profileSelect.value;
}
function applyProfile(name) {
  const p = readProfiles()[name]; if (!p) return;
  ['project', 'team', 'ownership', 'constraints'].forEach(k => { if (p[k] !== undefined) $(k).value = p[k]; });
  if (p.mode) setMode(p.mode);
  localStorage.setItem(PROFILE_SELECTED_KEY, name); saveDraft(); updateIndicators();
}

async function copyPrompt() {
  if (!currentMarkdown) return false;
  try { await navigator.clipboard.writeText(aiPrompt(currentMarkdown)); showToast('Prompt copied'); return true; }
  catch (_) { showToast('Không copy được — copy từ preview'); return false; }
}

form.addEventListener('input', () => { saveDraft(); updateIndicators(); });
forcePlan.addEventListener('change', () => { saveDraft(); updateIndicators(); });
form.addEventListener('submit', event => {
  event.preventDefault(); if (!form.reportValidity()) return;
  const values = getValues(); const output = buildMarkdown(values);
  loadGenerated(output.markdown, output.id); addHistory(values, output); saveDraft(); renderRouter(); showToast(output.route.action === 'clarify' ? 'Clarification request ready' : 'Planning request ready');
});
document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); form.requestSubmit(); } });
modeButtons.forEach(button => button.onclick = () => { setMode(button.dataset.mode); saveDraft(); });
organizeBtn.onclick = organizeRaw;
clearRawBtn.onclick = () => { rawInput.value = ''; rawStatus.textContent = 'Paste raw context then Auto organize.'; saveDraft(); };
rawInput.addEventListener('input', saveDraft);
rawFileInput.addEventListener('change', async e => {
  const files = [...(e.target.files || [])]; const chunks = [];
  for (const file of files) { try { chunks.push(`\n--- ${file.name} ---\n${await file.text()}`); } catch (_) {} }
  rawInput.value += chunks.join('\n'); rawFileInput.value = ''; saveDraft(); showToast(`${files.length} file(s) added`);
});
copyBtn.onclick = copyPrompt;
openChatBtn.onclick = async () => { if (await copyPrompt()) window.open('https://chatgpt.com/', '_blank', 'noopener'); };
downloadBtn.onclick = () => {
  if (!currentMarkdown) return;
  const safe = (getValues().feature || 'task-request').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'task-request';
  const blob = new Blob([currentMarkdown], { type: 'text/markdown;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${safe}.md`; a.click(); URL.revokeObjectURL(url);
};
clearBtn.onclick = () => { form.reset(); forcePlan.checked = false; localStorage.removeItem(STORAGE_KEY); currentMarkdown = ''; preview.textContent = 'Paste vào Quick Paste hoặc nhập form. Router sẽ quyết định clarify trước hay plan ngay.'; requestIdEl.textContent = '—'; setActions(false); updateIndicators(); };
clearHistoryBtn.onclick = () => { localStorage.removeItem(HISTORY_KEY); renderHistory(); };

saveProfileBtn.onclick = () => {
  const values = getValues(); const suggested = values.project || 'Default'; const name = window.prompt('Profile name', suggested); if (!name?.trim()) return;
  const profiles = readProfiles(); profiles[name.trim()] = { project: values.project, team: values.team, ownership: values.ownership, constraints: values.constraints, mode }; writeProfiles(profiles); localStorage.setItem(PROFILE_SELECTED_KEY, name.trim()); renderProfiles(); showToast('Profile saved');
};
profileSelect.onchange = () => { const name = profileSelect.value; deleteProfileBtn.disabled = !name; if (name) applyProfile(name); else localStorage.removeItem(PROFILE_SELECTED_KEY); };
deleteProfileBtn.onclick = () => { const name = profileSelect.value; if (!name) return; const profiles = readProfiles(); delete profiles[name]; writeProfiles(profiles); localStorage.removeItem(PROFILE_SELECTED_KEY); renderProfiles(); };

exportBtn.onclick = () => {
  const payload = { version: 4, exportedAt: new Date().toISOString(), mode, draft: { raw: rawInput.value, forcePlan: forcePlan.checked, values: getValues() }, history: readHistory(), profiles: readProfiles() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `task-planner-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
};
importInput.addEventListener('change', async e => {
  const file = e.target.files?.[0]; if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    if (payload.draft?.values) { setValues(payload.draft.values); rawInput.value = payload.draft.raw || ''; forcePlan.checked = Boolean(payload.draft.forcePlan); }
    else if (payload.draft) setValues(payload.draft);
    if (Array.isArray(payload.history)) writeHistory(payload.history);
    if (payload.profiles) writeProfiles(payload.profiles);
    if (payload.mode) setMode(payload.mode);
    saveDraft(); renderHistory(); renderProfiles(); updateIndicators(); showToast('Data imported');
  } catch (_) { showToast('Invalid backup file'); }
  importInput.value = '';
});

setMode(mode);
loadDraft();
renderHistory();
renderProfiles();
updateIndicators();
