const STORAGE_KEY = 'task-planner:draft:v1';
const HISTORY_KEY = 'task-planner:history:v1';
const HISTORY_LIMIT = 8;

const form = document.getElementById('taskForm');
const preview = document.getElementById('preview');
const requestIdEl = document.getElementById('requestId');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const clearBtn = document.getElementById('clearBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const historyEl = document.getElementById('history');
const saveState = document.getElementById('saveState');
const toast = document.getElementById('toast');

const fields = ['feature', 'project', 'requirement', 'docs', 'figma', 'team', 'constraints', 'notes'];
let currentMarkdown = '';
let currentRequestId = '';
let saveTimer;

const getValues = () => Object.fromEntries(fields.map(id => [id, document.getElementById(id).value.trim()]));

const setValues = values => {
  fields.forEach(id => {
    const node = document.getElementById(id);
    node.value = values?.[id] || '';
  });
};

const showToast = message => {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 1600);
};

const makeRequestId = () => {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `REQ-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

const asBulletLines = value => {
  if (!value) return '- None provided';
  return value
    .split('\n')
    .map(v => v.trim())
    .filter(Boolean)
    .map(v => v.startsWith('- ') ? v : `- ${v}`)
    .join('\n');
};

const section = (title, value, mode = 'text') => {
  if (!value) return '';
  const body = mode === 'bullets' ? asBulletLines(value) : value;
  return `\n## ${title}\n${body}\n`;
};

const buildMarkdown = values => {
  const id = makeRequestId();
  const lines = [
    `# Task Breakdown Request — ${values.feature}`,
    '',
    `**Request ID:** ${id}`,
    values.project ? `**Project:** ${values.project}` : '',
    values.team ? `**Team:** ${values.team}` : '',
    '',
    '## Goal',
    'Break this work into clear developer tasks that can be assigned to a team with minimal overlap and merge conflicts.',
    '',
    '## Requirement',
    values.requirement,
    section('Docs / References', values.docs, 'bullets'),
    section('Figma', values.figma, 'bullets'),
    section('Constraints / Known Ownership', values.constraints),
    section('Additional Notes', values.notes),
    '## Breakdown Rules',
    '- Understand the complete feature before splitting.',
    '- Split by independent implementation ownership, not tiny coding steps.',
    '- Maximize safe parallel work.',
    '- Avoid assigning multiple developers to the same important screen/module/file area when practical.',
    '- Identify dependencies and the final integration owner.',
    '- Explicitly call out shared ownership or likely conflict points.',
    '- Keep the output concise enough to send directly to the development team.',
    '',
    '## Expected Output',
    '- Scope summary',
    '- Task breakdown with owner, dependency, main ownership, and done criteria',
    '- Parallel execution plan',
    '- Shared ownership / conflict notes',
    '- Merge order',
    '- Only material open questions',
  ].filter(line => line !== '');

  return { id, markdown: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n' };
};

const saveDraft = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getValues()));
  saveState.textContent = 'Draft saved';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveState.textContent = 'Draft autosaved', 1200);
};

const loadDraft = () => {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (data) setValues(data);
  } catch (_) {}
};

const readHistory = () => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch (_) { return []; }
};

const writeHistory = history => localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, HISTORY_LIMIT)));

const addHistory = (values, id, markdown) => {
  const history = readHistory().filter(item => item.id !== id);
  history.unshift({ id, feature: values.feature, project: values.project, createdAt: new Date().toISOString(), values, markdown });
  writeHistory(history);
  renderHistory();
};

const renderHistory = () => {
  const history = readHistory();
  historyEl.innerHTML = '';
  if (!history.length) {
    historyEl.className = 'history empty';
    historyEl.textContent = 'Chưa có draft nào.';
    return;
  }

  historyEl.className = 'history';
  history.forEach(item => {
    const row = document.createElement('div');
    row.className = 'history-item';

    const main = document.createElement('div');
    main.className = 'history-main';
    const title = document.createElement('div');
    title.className = 'history-title';
    title.textContent = item.feature || 'Untitled';
    const meta = document.createElement('div');
    meta.className = 'history-meta';
    meta.textContent = `${item.id}${item.project ? ` · ${item.project}` : ''}`;
    main.append(title, meta);

    const load = document.createElement('button');
    load.type = 'button';
    load.textContent = 'Load';
    load.addEventListener('click', () => {
      setValues(item.values);
      currentMarkdown = item.markdown;
      currentRequestId = item.id;
      preview.textContent = currentMarkdown;
      requestIdEl.textContent = currentRequestId;
      copyBtn.disabled = false;
      downloadBtn.disabled = false;
      saveDraft();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast('Draft loaded');
    });

    row.append(main, load);
    historyEl.append(row);
  });
};

form.addEventListener('input', saveDraft);

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const values = getValues();
  const output = buildMarkdown(values);
  currentMarkdown = output.markdown;
  currentRequestId = output.id;
  preview.textContent = currentMarkdown;
  requestIdEl.textContent = currentRequestId;
  copyBtn.disabled = false;
  downloadBtn.disabled = false;
  addHistory(values, currentRequestId, currentMarkdown);
  saveDraft();
  showToast('Request generated');
});

copyBtn.addEventListener('click', async () => {
  if (!currentMarkdown) return;
  const prompt = `Break task theo request dưới đây. Ưu tiên chia ownership để team làm song song và hạn chế dẫm code. Trả về Markdown có task, dependency, conflict ownership và merge order.\n\n${currentMarkdown}`;
  try {
    await navigator.clipboard.writeText(prompt);
    showToast('Copied for ChatGPT');
  } catch (_) {
    showToast('Không copy được — hãy copy từ preview');
  }
});

downloadBtn.addEventListener('click', () => {
  if (!currentMarkdown) return;
  const safeName = (getValues().feature || 'task-request')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'task-request';
  const blob = new Blob([currentMarkdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Markdown downloaded');
});

clearBtn.addEventListener('click', () => {
  form.reset();
  localStorage.removeItem(STORAGE_KEY);
  currentMarkdown = '';
  currentRequestId = '';
  preview.textContent = 'Điền thông tin bên trái rồi chọn “Generate request”.';
  requestIdEl.textContent = '—';
  copyBtn.disabled = true;
  downloadBtn.disabled = true;
  showToast('Form cleared');
});

clearHistoryBtn.addEventListener('click', () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  showToast('History cleared');
});

loadDraft();
renderHistory();
