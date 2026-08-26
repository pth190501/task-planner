(() => {
  const $ = id => document.getElementById(id);
  const preview = $('preview');
  const form = $('taskForm');
  const rawInput = $('rawInput');
  const featureInput = $('feature');
  const requirementInput = $('requirement');
  const requestIdEl = $('requestId');
  const copyBtn = $('copyBtn');
  const openChatBtn = $('openChatBtn');
  const downloadBtn = $('downloadBtn');
  const qualityBadge = $('qualityBadge');
  const saveState = $('saveState');
  const modeButtons = [...document.querySelectorAll('[data-mode]')];

  if (!preview || !form || !requirementInput) return;

  const LIVE_HISTORY_KEY = 'task-planner:live-history:v1';
  const MODE_KEY = 'task-planner:mode:v3';
  const MAX_HISTORY = 12;
  let liveMarkdown = '';
  let liveTimer;
  let currentId = makeId();

  function makeId() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `PLAN-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  }

  function val(id) { return ($(id)?.value || '').trim(); }

  function mode() {
    return localStorage.getItem(MODE_KEY) === 'standard' ? 'standard' : 'quick';
  }

  function sourceText() {
    const structured = val('requirement');
    const raw = (rawInput?.value || '').trim();
    return structured || raw;
  }

  function deriveFeature(text) {
    const explicit = val('feature');
    if (explicit) return explicit;
    let title = (text || '').split(/\r?\n/).map(v => v.trim()).find(Boolean) || 'New Feature';
    title = title
      .replace(/^[-*•#\s]+/, '')
      .replace(/^(tôi\s+)?(đang\s+)?(muốn|cần|cần tạo|muốn tạo|xây dựng|tạo|thêm|làm)\s+/i, '')
      .replace(/[.!?]+$/, '')
      .trim();
    return title.length > 72 ? `${title.slice(0, 69).trim()}...` : title;
  }

  function normalizeText() {
    return [sourceText(), val('project'), val('constraints'), val('notes'), val('docs'), val('figma')]
      .join('\n')
      .toLowerCase();
  }

  function detectDomain(text) {
    const has = re => re.test(text);
    if (has(/\b(sdk|framework|library|thư viện|public api|interface|package|xcframework|spm|cocoapods)\b/i)) {
      if (has(/network|api|request|response|urlsession|alamofire|http|log/i)) return 'network-sdk';
      return 'sdk';
    }
    if (has(/network|api|request|response|endpoint|repository|service layer|data source/i)) return 'data-api';
    if (has(/figma|screen|màn hình|ui|viewcontroller|view model|xib|swiftui|uikit|component/i)) return 'ui-feature';
    if (has(/refactor|migrate|migration|legacy|rebuild|rewrite|kiến trúc|architecture/i)) return 'refactor';
    return 'generic';
  }

  function parseOwners() {
    const team = val('team');
    const ownership = val('ownership');
    const fromOwnership = ownership
      .split(/[,;\n]+/)
      .map(x => x.trim())
      .filter(Boolean)
      .map(x => x.split(/\s+(?:owns?|owner|api|ui|integration|core|data|sdk)\b/i)[0].trim())
      .filter(x => x && x.length <= 30);

    let names = team
      .replace(/^\d+\s*(devs?|developers?|người)?\s*[-—:]?\s*/i, '')
      .split(/[,;/\n]+/)
      .map(x => x.trim())
      .filter(x => x && !/^\d+\s*dev/i.test(x));

    if (names.length === 1 && /\b[A-Z](?:\s+[A-Z])+\b/.test(names[0])) names = names[0].split(/\s+/);
    const countMatch = team.match(/\b([1-9])\s*(?:devs?|developers?|người)\b/i);
    const count = countMatch ? Number(countMatch[1]) : 0;

    const merged = [...new Set([...fromOwnership, ...names])].slice(0, 6);
    if (merged.length) return merged;
    if (count) return Array.from({ length: Math.min(count, 6) }, (_, i) => `Dev ${String.fromCharCode(65 + i)}`);
    return ['Dev A', 'Dev B', 'Dev C'];
  }

  function ownerFor(index, owners) {
    return owners[index % owners.length] || `Dev ${String.fromCharCode(65 + index)}`;
  }

  function contextSignals(text) {
    const hasPlatform = /\b(iOS|Android|web|macOS|Windows|Swift|Kotlin|Flutter|React Native|UIKit|SwiftUI)\b/i.test(text);
    const hasTeam = Boolean(val('team'));
    const hasAcceptance = /(acceptance|done when|expected|kỳ vọng|hoàn thành khi|phải|cần hỗ trợ|scope)/i.test(sourceText());
    const hasRefs = Boolean(val('docs') || val('figma')) || /https?:\/\//i.test(sourceText());
    const length = sourceText().replace(/https?:\/\/\S+/g, '').trim().length;
    const sparse = length < 90 || (!hasPlatform && !hasAcceptance && length < 180);
    return { hasPlatform, hasTeam, hasAcceptance, hasRefs, sparse, length };
  }

  function assumptionsAndQuestions(domain, signals) {
    const assumptions = [];
    const questions = [];
    const full = normalizeText();

    if (domain === 'network-sdk' || domain === 'sdk') {
      if (!signals.hasPlatform) questions.push('Target platform / language / packaging format là gì?');
      if (!/(intercept|hook|swizzle|urlprotocol|middleware|interceptor|manual|push log|capture)/i.test(full)) {
        questions.push('SDK tự capture network traffic hay host app chủ động push log vào SDK?');
      }
      if (!/(floating|notification|screen|viewer|overlay|console|ui|màn hình|popup)/i.test(full)) {
        questions.push('Log cần hiển thị bằng UI nào: screen, overlay/floating entry hay chỉ console?');
      }
      if (!/(header|param|body|response|status|duration|timing|error|encrypt|decrypt|mã hóa|giải mã)/i.test(full)) {
        questions.push('Phạm vi log cần có gì: URL/method/headers/params/response/status/timing/error, và có hook trước mã hóa/sau giải mã không?');
      }
      assumptions.push('Thiết kế public interface tối giản, không khóa implementation vào một networking library cụ thể nếu requirement chưa chỉ rõ.');
      assumptions.push('Không log secret/token mặc định; dữ liệu nhạy cảm cần có cơ chế mask/redact.');
    } else {
      if (!signals.hasPlatform) questions.push('Target platform/module nào chịu trách nhiệm implementation?');
      if (!signals.hasAcceptance) questions.push('Expected behavior / acceptance criteria quan trọng nhất là gì?');
      assumptions.push('Không tự bịa file/module/API cụ thể khi source chưa cung cấp.');
    }

    if (val('figma')) assumptions.push('Figma được xem là source thiết kế; local planner chỉ ghi nhận link, chưa đọc nội dung frame khi offline.');
    if (val('docs')) assumptions.push('Docs/References được xem là source; local planner không tự khẳng định nội dung chưa đọc.');

    return { assumptions, questions: questions.slice(0, 5) };
  }

  function task(title, owner, parallel, depends, scope, ownership, done) {
    return { title, owner, parallel, depends, scope, ownership, done };
  }

  function buildTasks(domain, owners, m) {
    const quick = m === 'quick';
    const t = [];

    if (domain === 'network-sdk') {
      t.push(task(
        'Networking Capture Core & Log Model', ownerFor(0, owners), 'Yes', 'None',
        ['Define a normalized request/response/error/timing log model.', 'Implement capture/instrumentation boundary without coupling UI to transport internals.', 'Provide hooks for sanitized metadata and optional pre-encrypt/post-decrypt values when host app can supply them.'],
        ['Capture core', 'Log model', 'Sanitization boundary'],
        ['A request lifecycle can produce one consistent log entry.', 'Capture can be enabled/disabled without changing feature code.', 'Sensitive fields can be masked/redacted.']
      ));
      t.push(task(
        'SDK Public Interface & Host Integration', ownerFor(1, owners), 'Yes', 'None',
        ['Define minimal start/stop/configuration APIs.', 'Define host-app hooks/interceptors/adapters for the chosen networking stack.', 'Keep integration surface stable while capture implementation remains replaceable.'],
        ['Public SDK API', 'Integration adapters', 'Configuration'],
        ['Host app can integrate through a small documented interface.', 'SDK works without direct dependency from UI feature code.', 'Integration failure does not break production networking flow.']
      ));
      t.push(task(
        'Network Log Viewer', ownerFor(2, owners), 'Yes', 'TASK-01 log contract',
        ['Show session API history with method/status/duration summary.', 'Provide detail view for request/response/error content.', 'Add practical filter/search and copy/share actions where useful.'],
        ['Debug UI', 'Viewer state', 'Presentation formatting'],
        ['New API logs appear without reopening the viewer.', 'A developer/QC can inspect one request end-to-end.', 'Large or malformed payloads do not crash the viewer.']
      ));
      t.push(task(
        'Packaging, Safety & Integration Validation', ownerFor(0, owners), 'No', 'TASK-01, TASK-02, TASK-03',
        ['Package the SDK for the target distribution format.', 'Validate enable/disable behavior, memory footprint and release-safety guardrails.', 'Add a minimal integration guide and smoke/regression coverage.'],
        ['Packaging', 'Integration verification', 'Docs/tests'],
        ['A sample/host app can consume the SDK cleanly.', 'Debug logging can be disabled for production policy.', 'Core capture and viewer flow pass smoke tests.']
      ));
      return quick ? t : [...t.slice(0, 3), task(
        'Advanced Filtering & Exportability', ownerFor(1, owners), 'Yes', 'TASK-01',
        ['Add request grouping/filtering by screen/session/domain/status.', 'Support safe export/copy of selected logs for QC/debugging.', 'Keep storage bounded to avoid uncontrolled memory growth.'],
        ['Filter/query layer', 'Export formatting', 'Retention policy'],
        ['Filtering remains responsive with realistic log volume.', 'Export honors masking rules.', 'Retention policy is configurable or bounded.']
      ), t[3]];
    }

    if (domain === 'sdk') {
      t.push(task('SDK Contract & Core', ownerFor(0, owners), 'Yes', 'None', ['Define public interface and internal core boundary.', 'Implement the primary capability behind that interface.'], ['Public API', 'Core implementation'], ['Public API is minimal and stable.', 'Core capability works without UI coupling.']));
      t.push(task('Host Integration & Adapters', ownerFor(1, owners), 'Yes', 'TASK-01 contract', ['Implement integration adapters/configuration for the host project.', 'Isolate project-specific dependencies from SDK core.'], ['Integration adapter', 'Configuration'], ['Host app can integrate with minimal changes.', 'Project-specific code does not leak into core.']));
      t.push(task('Validation, Packaging & Docs', ownerFor(2, owners), 'No', 'TASK-01, TASK-02', ['Package SDK for target distribution.', 'Add smoke tests and integration guide.'], ['Packaging', 'Tests', 'Documentation'], ['SDK can be consumed by a clean sample/host target.', 'Critical flows are covered by smoke tests.']));
      return t;
    }

    if (domain === 'data-api') {
      t.push(task('Data Contract & Networking Layer', ownerFor(0, owners), 'Yes', 'None', ['Normalize request/response models and API boundary.', 'Implement error/loading/result handling needed by the feature.'], ['API client', 'Models', 'Repository/service boundary'], ['Data layer exposes stable feature-facing contracts.', 'Success/error/loading paths are testable.']));
      t.push(task('Feature Logic & State Integration', ownerFor(1, owners), 'Yes', 'TASK-01 contract', ['Map API results into feature state/business rules.', 'Keep networking details out of presentation code.'], ['Feature state', 'Business rules'], ['Feature state handles all required API outcomes.', 'Business rules are centralized.']));
      t.push(task('UI/Flow Integration & Regression', ownerFor(2, owners), 'No', 'TASK-01, TASK-02', ['Wire data/state into the target flow.', 'Validate navigation, empty/error/loading and regression cases.'], ['Target screen/flow', 'Integration tests'], ['End-to-end flow works with realistic API states.', 'Existing neighboring flow is not regressed.']));
      return t;
    }

    if (domain === 'ui-feature') {
      t.push(task('UI Structure & Reusable Components', ownerFor(0, owners), 'Yes', 'None', ['Implement the main screen/component structure from provided design/context.', 'Extract only genuinely reusable pieces; avoid one task per frame.'], ['Main UI area', 'Reusable components'], ['Required states can be rendered.', 'Shared component ownership is clear.']));
      t.push(task('State, Data Binding & Interaction', ownerFor(1, owners), 'Yes', 'UI contracts', ['Implement state/business interaction for the UI.', 'Handle loading/empty/error/user actions as required.'], ['ViewModel/state', 'Interaction logic'], ['UI behavior is deterministic across defined states.', 'Presentation code does not own transport details.']));
      t.push(task('Navigation, Integration & Regression', ownerFor(2, owners), 'No', 'TASK-01, TASK-02', ['Integrate routing/navigation and surrounding feature dependencies.', 'Validate layout and behavior on target devices/states.'], ['Routing', 'Integration point', 'Regression'], ['End-to-end feature path works.', 'Shared navigation/screen ownership has no unresolved conflict.']));
      return t;
    }

    if (domain === 'refactor') {
      t.push(task('Target Boundary & Migration Plan', ownerFor(0, owners), 'Yes', 'None', ['Define target ownership/boundaries and compatibility constraints.', 'Identify migration slices that can move independently.'], ['Architecture boundary', 'Migration sequence'], ['Target boundary is explicit.', 'No duplicate ownership of critical shared area.']));
      t.push(task('Core Migration / Refactor', ownerFor(1, owners), 'No', 'TASK-01', ['Move the primary implementation to the target boundary.', 'Preserve observable behavior unless requirement says otherwise.'], ['Core refactor area'], ['Primary behavior is preserved.', 'Legacy dependency is reduced or isolated.']));
      t.push(task('Integration Cleanup & Regression', ownerFor(2, owners), 'No', 'TASK-02', ['Reconnect callers and remove obsolete paths.', 'Run focused regression around affected flows.'], ['Integration callers', 'Cleanup/tests'], ['No stale path remains in scope.', 'Affected flows pass regression.']));
      return t;
    }

    t.push(task('Core Feature Implementation', ownerFor(0, owners), 'Yes', 'None', ['Implement the main behavior described by the requirement.', 'Keep the ownership boundary narrow and explicit.'], ['Primary feature logic'], ['Main happy path works.', 'No unnecessary shared-area changes.']));
    t.push(task('Integration & Supporting Flow', ownerFor(1, owners), 'Yes', 'TASK-01 contract', ['Integrate the feature with surrounding modules/navigation/data as needed.', 'Handle required secondary states.'], ['Integration points'], ['Feature works in the real app flow.', 'Dependencies are explicit.']));
    t.push(task('Validation & Regression', ownerFor(2, owners), 'No', 'TASK-01, TASK-02', ['Validate acceptance behavior and likely edge cases.', 'Check regression around shared areas touched by the feature.'], ['Validation', 'Regression'], ['Defined behavior is verified.', 'No known regression remains in scope.']));
    return t;
  }

  function mdList(lines) {
    return lines.map(x => `- ${x}`).join('\n');
  }

  function renderTask(t, i) {
    const depends = t.depends || 'None';
    return [
      `### TASK-${String(i + 1).padStart(2, '0')} — ${t.title}`,
      `**Owner:** ${t.owner}`,
      `**Can run in parallel:** ${t.parallel}`,
      `**Depends on:** ${depends}`,
      '',
      '**Scope**', mdList(t.scope), '',
      '**Main ownership**', mdList(t.ownership), '',
      '**Done when**', mdList(t.done)
    ].join('\n');
  }

  function buildPlan() {
    const req = sourceText();
    if (!req) return '';

    const feature = deriveFeature(req);
    const text = normalizeText();
    const domain = detectDomain(text);
    const owners = parseOwners();
    const signals = contextSignals(text);
    const aq = assumptionsAndQuestions(domain, signals);
    const tasks = buildTasks(domain, owners, mode());
    const docs = val('docs');
    const figma = val('figma');
    const project = val('project');
    const constraints = val('constraints');
    const notes = val('notes');
    const sparseLabel = signals.sparse ? 'Draft / sparse context' : 'Ready baseline';

    const parallel = tasks
      .map((t, i) => ({ ...t, n: i + 1 }))
      .filter(t => t.parallel === 'Yes')
      .map(t => `TASK-${String(t.n).padStart(2, '0')}`);

    const lines = [
      `# ${feature}`,
      '',
      `**Plan ID:** ${currentId}`,
      `**Local planner:** ${sparseLabel}`,
      `**Mode:** ${mode() === 'quick' ? 'Quick' : 'Standard'}`,
      project ? `**Project:** ${project}` : '',
      val('team') ? `**Team:** ${val('team')}` : '',
      '',
      '## Scope',
      req,
      docs ? `\n**References**\n${docs.split(/\r?\n/).filter(Boolean).map(x => `- ${x}`).join('\n')}` : '',
      figma ? `\n**Figma**\n${figma.split(/\r?\n/).filter(Boolean).map(x => `- ${x}`).join('\n')}` : '',
      constraints ? `\n**Constraints / Shared Areas**\n${constraints}` : '',
      notes ? `\n**Notes**\n${notes}` : '',
      '',
      '## Task Breakdown',
      '',
      ...tasks.flatMap((t, i) => [renderTask(t, i), '']),
      '## Parallel Plan',
      parallel.length > 1
        ? `- ${parallel.join(' + ')} can start in parallel once their stated contracts are agreed.`
        : '- Start independent contract/core work first; integrate after required dependency is stable.',
      '- Keep one primary owner for each important shared area.',
      '',
      '## Shared Ownership / Conflict Notes',
      '- Do not split the same important screen/module/public interface across multiple owners unless one integration owner is explicit.',
      val('ownership') ? `- Preferred ownership from input: ${val('ownership')}` : '- No explicit ownership map supplied; owner names above are provisional.',
      '',
      '## Merge Order',
      ...tasks.map((t, i) => `${i + 1}. TASK-${String(i + 1).padStart(2, '0')} — ${t.title}`),
      '',
      aq.assumptions.length ? '## Assumptions' : '',
      ...aq.assumptions.map(x => `- ${x}`),
      '',
      aq.questions.length ? '## Open Questions' : '',
      ...aq.questions.map(x => `- ${x}`),
      '',
      '> Generated locally in the browser. Linked Docs/Figma are not read by the offline planner; use ChatGPT refinement when source inspection is required.'
    ].filter((line, index, arr) => !(line === '' && arr[index - 1] === ''));

    return lines.join('\n').trim() + '\n';
  }

  function updateLive() {
    liveMarkdown = buildPlan();
    if (!liveMarkdown) {
      preview.textContent = 'Nhập hoặc paste requirement — Markdown task plan sẽ xuất hiện ngay tại đây.';
      requestIdEl.textContent = 'LIVE';
      [copyBtn, openChatBtn, downloadBtn].forEach(b => { if (b) b.disabled = true; });
      return;
    }
    preview.textContent = liveMarkdown;
    requestIdEl.textContent = 'LIVE';
    [copyBtn, openChatBtn, downloadBtn].forEach(b => { if (b) b.disabled = false; });
    if (qualityBadge) {
      const sparse = contextSignals(normalizeText()).sparse;
      qualityBadge.textContent = sparse ? 'Draft plan' : 'Live plan';
      qualityBadge.classList.toggle('warn', sparse);
      qualityBadge.classList.toggle('good', !sparse);
    }
    if (saveState) saveState.textContent = 'Live preview · autosaved locally';
  }

  function scheduleLive() {
    clearTimeout(liveTimer);
    liveTimer = setTimeout(updateLive, 160);
  }

  function safeName() {
    return deriveFeature(sourceText()).toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'task-plan';
  }

  async function copyMarkdown(openChat = false) {
    if (!liveMarkdown) return;
    try {
      await navigator.clipboard.writeText(liveMarkdown);
      if (openChat) window.open('https://chatgpt.com/', '_blank', 'noopener');
    } catch (_) {
      // Preview remains selectable as fallback.
    }
  }

  function downloadMarkdown() {
    if (!liveMarkdown) return;
    const blob = new Blob([liveMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName()}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function saveSnapshot() {
    if (!liveMarkdown) return;
    let history = [];
    try { history = JSON.parse(localStorage.getItem(LIVE_HISTORY_KEY) || '[]'); } catch (_) {}
    history.unshift({
      id: currentId,
      feature: deriveFeature(sourceText()),
      createdAt: new Date().toISOString(),
      markdown: liveMarkdown
    });
    localStorage.setItem(LIVE_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
    currentId = makeId();
    updateLive();
    if (saveState) saveState.textContent = 'Plan snapshot saved locally';
  }

  // Live preview from both structured form and raw paste.
  form.addEventListener('input', scheduleLive, true);
  rawInput?.addEventListener('input', scheduleLive, true);
  modeButtons.forEach(btn => btn.addEventListener('click', () => setTimeout(updateLive, 0)));
  $('organizeBtn')?.addEventListener('click', () => setTimeout(updateLive, 30));
  $('profileSelect')?.addEventListener('change', () => setTimeout(updateLive, 30));

  // Replace old submit behavior: save current live plan instead of generating an AI request.
  form.addEventListener('submit', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!sourceText()) return;
    saveSnapshot();
  }, true);

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) submitButton.textContent = 'Save plan snapshot';

  copyBtn?.addEventListener('click', event => {
    event.preventDefault(); event.stopImmediatePropagation(); copyMarkdown(false);
  }, true);
  openChatBtn?.addEventListener('click', event => {
    event.preventDefault(); event.stopImmediatePropagation(); copyMarkdown(true);
  }, true);
  downloadBtn?.addEventListener('click', event => {
    event.preventDefault(); event.stopImmediatePropagation(); downloadMarkdown();
  }, true);

  // Register offline cache when served over HTTPS/GitHub Pages.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }

  window.addEventListener('online', () => document.body.dataset.connection = 'online');
  window.addEventListener('offline', () => document.body.dataset.connection = 'offline');
  document.body.dataset.connection = navigator.onLine ? 'online' : 'offline';

  // Initial live plan from restored local draft.
  setTimeout(updateLive, 40);
})();
