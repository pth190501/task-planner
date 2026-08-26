(() => {
  const $ = id => document.getElementById(id);
  const preview = $('preview');
  if (!preview) return;

  const value = id => ($(id)?.value || '').trim();
  const sourceText = () => value('requirement') || ($('rawInput')?.value || '').trim();
  const fullText = () => [sourceText(), value('project'), value('constraints'), value('notes'), value('docs'), value('figma')].join('\n');
  const lower = () => fullText().toLowerCase();
  const mode = () => localStorage.getItem('task-planner:mode:v3') === 'standard' ? 'standard' : 'quick';
  const bullet = items => items.filter(Boolean).map(x => `- ${x}`).join('\n');
  const id = () => `LIVE-${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}`;

  function owners() {
    const team = value('team');
    const explicit = value('ownership').split(/[,;\n]+/).map(x => x.trim()).filter(Boolean).map(x => x.split(/\s+(?:owns?|owner|api|ui|integration|core|data|sdk)\b/i)[0].trim()).filter(x => x && x.length < 32);
    let names = team.replace(/^\d+\s*(?:devs?|developers?|người)?\s*[-—:]?\s*/i, '').split(/[,;/\n]+/).map(x => x.trim()).filter(Boolean);
    const count = Number((team.match(/\b([1-9])\s*(?:devs?|developers?|người)\b/i) || [])[1] || 0);
    const merged = [...new Set([...explicit, ...names])].slice(0, 6);
    if (merged.length) return merged;
    if (count) return Array.from({ length: Math.min(count, 6) }, (_, i) => `Dev ${String.fromCharCode(65 + i)}`);
    return ['Dev A', 'Dev B', 'Dev C'];
  }

  const o = (list, i) => list[i % list.length] || `Dev ${String.fromCharCode(65 + i)}`;
  const task = (title, owner, parallel, depends, ownership, scope, done, confidence = 'Baseline') => ({ title, owner, parallel, depends, ownership, scope, done, confidence });

  const REGISTRY = [
    { id: 'bug-crash', label: 'Bug / Crash', tier: 'S', match: t => /\b(crash|bug|exception|fatal|freeze|hang|lỗi|treo|regression)\b/i.test(t), build: bugTasks },
    { id: 'release-build', label: 'Release / Build', tier: 'S', match: t => /\b(archive|testflight|app store|release|build|signing|provision|firebase distribution|deployment target|version|ipa)\b/i.test(t), build: releaseTasks },
    { id: 'cicd', label: 'CI/CD', tier: 'S', match: t => /\b(ci\/cd|github actions|fastlane|pipeline|automation|launchagent|script|workflow)\b/i.test(t), build: cicdTasks },
    { id: 'performance', label: 'Performance', tier: 'S', match: t => /\b(performance|lag|slow|memory|leak|cpu|fps|optimi[sz]e|cache|startup)\b/i.test(t), build: performanceTasks },
    { id: 'auth-security', label: 'Auth / Security', tier: 'S', match: t => /\b(auth|login|biometric|token|jwt|encrypt|decrypt|security|keychain|oauth|mã hóa|xác thực)\b/i.test(t), build: authTasks },
    { id: 'analytics', label: 'Analytics / Tracking', tier: 'S', match: t => /\b(analytics|tracking|event|log event|firebase analytics|metric|telemetry)\b/i.test(t), build: analyticsTasks },
    { id: 'localization', label: 'Localization', tier: 'S', match: t => /\b(localization|localisation|localized|strings|đa ngôn ngữ|tiếng anh|tiếng việt|i18n|l10n)\b/i.test(t), build: localizationTasks },
    { id: 'navigation', label: 'Navigation / Routing', tier: 'S', match: t => /\b(navigation|routing|router|push|present|deeplink|deep link|navigate|điều hướng)\b/i.test(t), build: navigationTasks },
    { id: 'network-sdk', label: 'Network SDK', tier: 'S', match: t => /\b(sdk|framework|library|xcframework|spm|cocoapods)\b/i.test(t) && /\b(network|api|request|response|urlsession|alamofire|http|log)\b/i.test(t), build: networkSdkTasks },
    { id: 'sdk', label: 'SDK / Interface', tier: 'S', match: t => /\b(sdk|framework|library|xcframework|spm|cocoapods|public api|interface)\b/i.test(t), build: sdkTasks },
    { id: 'data-api', label: 'API / Data', tier: 'S', match: t => /\b(api|endpoint|repository|service layer|data source|request|response|networking)\b/i.test(t), build: dataTasks },
    { id: 'migration-refactor', label: 'Migration / Refactor', tier: 'S', match: t => /\b(refactor|migrate|migration|legacy|rebuild|rewrite|architecture|kiến trúc)\b/i.test(t), build: migrationTasks },
    { id: 'testing', label: 'Testing', tier: 'S', match: t => /\b(test|testing|unit test|ui test|snapshot|regression|qa|qc)\b/i.test(t), build: testingTasks },
    { id: 'ui-feature', label: 'UI / Feature', tier: 'S', match: t => /\b(figma|screen|màn hình|ui|viewcontroller|view model|xib|swiftui|uikit|component|button|view)\b/i.test(t), build: uiTasks },
    { id: 'generic', label: 'General Feature', tier: 'S', match: () => true, build: genericTasks }
  ];

  function base3(list, names) {
    return [
      task('Core Implementation', o(names,0), 'Yes', 'None', ['Primary feature logic'], ['Implement the main requested behavior with a narrow ownership boundary.', 'Reuse existing project patterns before adding new abstractions.'], ['Main happy path works.', 'No unrelated refactor is introduced.']),
      task('Integration & Supporting Flow', o(names,1), 'Yes', 'TASK-01 contract', ['Integration points'], ['Wire the core behavior into surrounding modules, routing, data, or UI as required.', 'Handle required secondary states.'], ['Feature works in the real app flow.', 'Dependencies are explicit.']),
      task('Validation & Regression', o(names,2), 'No', 'TASK-01, TASK-02', ['Validation', 'Regression'], ['Validate acceptance behavior and likely edge cases.', 'Check regressions around shared areas touched by the feature.'], ['Defined behavior is verified.', 'No known regression remains in scope.'])
    ];
  }

  function networkSdkTasks(names) { return [
    task('Networking Capture Core & Log Model', o(names,0), 'Yes', 'None', ['Capture core','Log model','Sanitization'], ['Normalize request/response/error/timing logs.', 'Define capture boundary independent from viewer UI.', 'Support host-provided pre-encrypt/post-decrypt values where applicable.'], ['One request lifecycle produces one consistent log entry.', 'Capture can be enabled/disabled safely.', 'Sensitive values can be masked.']),
    task('SDK Public Interface & Host Integration', o(names,1), 'Yes', 'None', ['Public API','Adapters','Configuration'], ['Define minimal start/stop/config APIs.', 'Add adapters/hooks for the host networking stack.', 'Keep project-specific integration outside the core.'], ['Host app integrates through a small stable surface.', 'Integration failure does not break production networking.']),
    task('Network Log Viewer', o(names,2), 'Yes', 'TASK-01 log contract', ['Debug UI','Viewer state'], ['Show API history with method/status/duration.', 'Show request/response/error details.', 'Add search/filter/copy where useful.'], ['New logs appear live.', 'One request can be inspected end-to-end.', 'Large payloads do not crash the viewer.']),
    task('Packaging, Safety & Validation', o(names,0), 'No', 'TASK-01, TASK-02, TASK-03', ['Packaging','Docs/tests'], ['Package for the chosen distribution format.', 'Validate memory/release safety and disable behavior.', 'Add integration guide and smoke coverage.'], ['Host/sample app consumes the SDK.', 'Production guardrails are clear.', 'Core capture/viewer passes smoke tests.'])
  ]; }

  function sdkTasks(names) { return [
    task('SDK Contract & Core', o(names,0), 'Yes', 'None', ['Public API','Core'], ['Define minimal public contract and implement primary capability.'], ['Public API is small and stable.', 'Core works without UI coupling.']),
    task('Host Integration & Adapters', o(names,1), 'Yes', 'TASK-01 contract', ['Adapters','Configuration'], ['Integrate with host project while isolating project-specific dependencies.'], ['Host app integration is minimal.', 'Core remains reusable.']),
    task('Packaging, Validation & Docs', o(names,2), 'No', 'TASK-01, TASK-02', ['Packaging','Tests','Docs'], ['Package, smoke test, and document integration.'], ['Clean consumer target can integrate.', 'Critical flows are validated.'])
  ]; }
  function dataTasks(names) { return [
    task('Data Contract & Networking Layer', o(names,0), 'Yes', 'None', ['Models','API client','Repository/service'], ['Normalize contracts and error/loading/result handling.'], ['Stable feature-facing contract exists.', 'Success/error paths are testable.']),
    task('Feature Logic & State Integration', o(names,1), 'Yes', 'TASK-01 contract', ['Business rules','Feature state'], ['Map API results into business/state logic and keep transport details out of presentation.'], ['Required API outcomes are handled.', 'Business rules are centralized.']),
    task('Flow Integration & Regression', o(names,2), 'No', 'TASK-01, TASK-02', ['Target flow','Regression'], ['Wire the feature into real flow and validate loading/empty/error/navigation.'], ['End-to-end flow works.', 'Neighboring flows are not regressed.'])
  ]; }
  function uiTasks(names) { return [
    task('UI Structure & Reusable Components', o(names,0), 'Yes', 'None', ['Main UI','Reusable components'], ['Implement meaningful screen/component structure from available context.', 'Avoid splitting one task per frame or tiny UI element.'], ['Required states render.', 'Shared component ownership is explicit.']),
    task('State, Binding & Interaction', o(names,1), 'Yes', 'UI contracts', ['ViewModel/state','Interactions'], ['Implement state/business interaction and loading/empty/error/user actions.'], ['Behavior is deterministic across required states.', 'Presentation does not own transport details.']),
    task('Navigation, Integration & Regression', o(names,2), 'No', 'TASK-01, TASK-02', ['Routing','Integration','Regression'], ['Integrate navigation and surrounding dependencies, then validate devices/states.'], ['End-to-end flow works.', 'No unresolved shared-area conflict.'])
  ]; }
  function bugTasks(names) { return [
    task('Reproduce, Isolate & Root Cause', o(names,0), 'Yes', 'None', ['Reproduction path','Root cause'], ['Reproduce from logs/steps.', 'Trace the smallest failing ownership area.', 'Document root cause with evidence before broad changes.'], ['Failure is reproducible or bounded.', 'Root cause points to concrete code/flow.']),
    task('Minimal Fix', o(names,1), 'No', 'TASK-01 root cause', ['Fix area'], ['Apply the smallest behavior-preserving fix.', 'Avoid opportunistic refactor unless required.'], ['Original failure no longer reproduces.', 'Diff remains localized.']),
    task('Regression & Guardrail', o(names,2), 'No', 'TASK-02', ['Regression/tests'], ['Add targeted regression coverage or reproducible validation.', 'Check adjacent flow most likely to regress.'], ['Fix is validated.', 'Relevant neighbor flow remains stable.'])
  ]; }
  function releaseTasks(names) { return [
    task('Release Preconditions & Versioning', o(names,0), 'Yes', 'None', ['Version/build','Signing/config'], ['Verify deployment target, version/build uniqueness, signing, environment and distribution prerequisites.'], ['Release inputs are valid.', 'No duplicate/version blocker remains.']),
    task('Archive / Export / Distribution', o(names,1), 'No', 'TASK-01', ['Archive pipeline','Export/upload'], ['Produce archive/export artifact and upload/distribute through the required channel.'], ['Archive/export succeeds.', 'Artifact reaches intended distribution system.']),
    task('Post-upload Validation', o(names,2), 'No', 'TASK-02', ['App Store/TestFlight/Firebase validation'], ['Verify processing status, installability, and release-critical warnings.'], ['Build is visible/usable by intended testers.', 'Blocking warnings are resolved or documented.'])
  ]; }
  function cicdTasks(names) { return [
    task('Pipeline Contract & Inputs', o(names,0), 'Yes', 'None', ['Workflow inputs','Environment'], ['Define triggers, required secrets/config, artifact paths and failure behavior.'], ['Inputs are explicit and reproducible.', 'No hidden machine-only dependency.']),
    task('Automation Implementation', o(names,1), 'No', 'TASK-01', ['Script/workflow'], ['Implement the smallest reliable automation with clear logs and safe failure handling.'], ['Happy path completes unattended.', 'Failures point to actionable causes.']),
    task('Idempotency & Validation', o(names,2), 'No', 'TASK-02', ['Rerun safety','Validation'], ['Test reruns, partial failures, path/space handling and machine portability.'], ['Rerun is safe.', 'Expected artifact/result is verified.'])
  ]; }
  function performanceTasks(names) { return [
    task('Measure & Establish Baseline', o(names,0), 'Yes', 'None', ['Metrics','Hot path'], ['Measure the real bottleneck before optimizing and define target metric.'], ['Baseline exists.', 'Primary bottleneck is evidenced.']),
    task('Targeted Optimization', o(names,1), 'No', 'TASK-01', ['Hot path implementation'], ['Optimize the measured bottleneck with minimal behavioral change.'], ['Target metric improves materially.', 'Behavior remains correct.']),
    task('Regression & Resource Validation', o(names,2), 'No', 'TASK-02', ['Memory/CPU/UI regression'], ['Re-measure and check memory, CPU, responsiveness and adjacent regressions.'], ['Improvement is repeatable.', 'No new resource regression is introduced.'])
  ]; }
  function authTasks(names) { return [
    task('Auth Contract & Threat-sensitive Flow', o(names,0), 'Yes', 'None', ['Auth state','Credential boundary'], ['Define auth states, failure paths, secret storage and session boundaries.'], ['Sensitive data boundary is explicit.', 'Required auth states are covered.']),
    task('Auth Implementation / Integration', o(names,1), 'No', 'TASK-01', ['Login/session integration'], ['Implement or modify auth flow using existing project primitives.'], ['Happy/failure/fallback flows work.', 'Secrets are not logged or exposed.']),
    task('Security & Regression Validation', o(names,2), 'No', 'TASK-02', ['Security checks','Regression'], ['Validate logout/session expiry/biometric fallback/token handling as relevant.'], ['No obvious credential leakage.', 'Existing login/session flow is not regressed.'])
  ]; }
  function analyticsTasks(names) { return [
    task('Event Contract & Taxonomy', o(names,0), 'Yes', 'None', ['Event names','Parameters'], ['Define events, parameters, trigger points and ownership without duplicating existing telemetry.'], ['Event contract is consistent.', 'Required dimensions are defined.']),
    task('Instrumentation', o(names,1), 'Yes', 'TASK-01 contract', ['Tracking calls'], ['Instrument the smallest reliable trigger points and avoid double fire.'], ['Events fire exactly at intended moments.', 'No duplicate event is introduced.']),
    task('Validation & Reporting Check', o(names,2), 'No', 'TASK-02', ['Debug validation','Reporting'], ['Validate event payloads in debug tools/logs and confirm downstream visibility where possible.'], ['Payload matches contract.', 'Missing/duplicate events are resolved.'])
  ]; }
  function localizationTasks(names) { return [
    task('String Inventory & Key Contract', o(names,0), 'Yes', 'None', ['Localization keys'], ['Inventory affected strings and define stable keys/placeholders/plurals.'], ['No duplicate/ambiguous key in scope.', 'Dynamic placeholders are accounted for.']),
    task('Language Content & Integration', o(names,1), 'Yes', 'TASK-01 key contract', ['Localized resources','UI binding'], ['Add translations/resources and wire them into the feature.'], ['Target languages render correct content.', 'No hard-coded user-facing string remains in scope.']),
    task('Layout & Regression Validation', o(names,2), 'No', 'TASK-02', ['UI regression'], ['Check truncation, plurals/placeholders, RTL only if relevant, and affected flows.'], ['No clipping/truncation in target layouts.', 'Runtime formatting is correct.'])
  ]; }
  function navigationTasks(names) { return [
    task('Routing Contract & Entry Conditions', o(names,0), 'Yes', 'None', ['Route contract','Entry state'], ['Define push/present/deeplink contract and required input/state.'], ['Route behavior is explicit.', 'Entry conditions are testable.']),
    task('Navigation Integration', o(names,1), 'No', 'TASK-01', ['Router/navigation code'], ['Implement routing using existing project navigation conventions.'], ['Correct screen/flow opens with required state.', 'Back-stack behavior is preserved.']),
    task('Flow Regression', o(names,2), 'No', 'TASK-02', ['Back stack','Neighbor routes'], ['Validate back/dismiss/deeplink/re-entry cases relevant to the feature.'], ['No duplicate screen or broken back stack.', 'Neighbor routes remain stable.'])
  ]; }
  function migrationTasks(names) { return [
    task('Target Boundary & Migration Plan', o(names,0), 'Yes', 'None', ['Architecture boundary','Sequence'], ['Define target boundary, compatibility constraints and independent migration slices.'], ['Target ownership is explicit.', 'Critical shared area has one primary owner.']),
    task('Core Migration / Refactor', o(names,1), 'No', 'TASK-01', ['Core refactor area'], ['Move primary implementation while preserving observable behavior unless required otherwise.'], ['Primary behavior is preserved.', 'Legacy dependency is reduced or isolated.']),
    task('Integration Cleanup & Regression', o(names,2), 'No', 'TASK-02', ['Callers','Cleanup/tests'], ['Reconnect callers, remove obsolete paths and run focused regression.'], ['No stale path remains in scope.', 'Affected flows pass regression.'])
  ]; }
  function testingTasks(names) { return [
    task('Test Scope & Risk Matrix', o(names,0), 'Yes', 'None', ['Test plan'], ['Identify critical flows, states, devices/envs and highest-risk regressions.'], ['Test scope maps to requirement risk.', 'No obvious critical path is omitted.']),
    task('Automated / Repeatable Coverage', o(names,1), 'Yes', 'TASK-01 scope', ['Tests','Fixtures'], ['Implement the most valuable repeatable coverage using existing test patterns.'], ['Coverage reproduces required behavior.', 'Tests are deterministic.']),
    task('Execution & Findings', o(names,2), 'No', 'TASK-02 where automated', ['Validation results'], ['Run targeted suite/manual checks and capture actionable failures.'], ['Results are recorded.', 'Blocking failures are isolated.'])
  ]; }
  function genericTasks(names) { return base3(null, names); }

  function deriveFeature(text) {
    const explicit = value('feature'); if (explicit) return explicit;
    let line = text.split(/\r?\n/).map(x => x.trim()).find(Boolean) || 'New Feature';
    line = line.replace(/^[-*•#\s]+/, '').replace(/^(tôi\s+)?(đang\s+)?(muốn|cần|cần tạo|muốn tạo|xây dựng|tạo|thêm|làm)\s+/i, '').replace(/[.!?]+$/, '').trim();
    return line.length > 72 ? `${line.slice(0,69).trim()}...` : line;
  }

  function sourceConfidence() {
    const out = [];
    out.push(sourceText() ? 'Requirement: confirmed from local input' : 'Requirement: missing');
    if (value('figma')) out.push(navigator.onLine ? 'Figma: linked · requires agent/source inspection' : 'Figma: linked · not inspected offline');
    if (value('docs')) out.push(navigator.onLine ? 'Docs: linked · requires agent/source inspection' : 'Docs: linked · not inspected offline');
    if (value('team')) out.push('Team: confirmed from local input');
    return out;
  }

  function questions(skill, text) {
    const q = [];
    if (!/\b(iOS|Android|web|macOS|Windows|Swift|Kotlin|Flutter|UIKit|SwiftUI|React Native)\b/i.test(text)) q.push('Target platform / stack cụ thể là gì?');
    if (text.replace(/https?:\/\/\S+/g,'').trim().length < 100) q.push('Acceptance behavior quan trọng nhất để coi task hoàn thành là gì?');
    if (skill.id === 'network-sdk' && !/(capture|intercept|hook|middleware|manual|push log|urlprotocol)/i.test(text)) q.push('SDK tự capture network hay host app chủ động push log?');
    if (skill.id === 'bug-crash' && !/(steps|reproduce|log|stack|crashlog)/i.test(text)) q.push('Có steps reproduce / log / crash trace nào không?');
    return q.slice(0,4);
  }

  function renderTask(t, i) {
    return [
      `### TASK-${String(i+1).padStart(2,'0')} — ${t.title}`,
      `**Owner:** ${t.owner}`,
      `**Can run in parallel:** ${t.parallel}`,
      `**Depends on:** ${t.depends || 'None'}`,
      `**Confidence:** ${t.confidence}`,
      '', '**Scope**', bullet(t.scope), '', '**Main ownership**', bullet(t.ownership), '', '**Done when**', bullet(t.done)
    ].join('\n');
  }

  function build() {
    const req = sourceText(); if (!req) return null;
    const text = fullText();
    const skill = REGISTRY.find(s => s.match(text)) || REGISTRY[REGISTRY.length-1];
    const names = owners();
    let tasks = skill.build(names);
    if (mode() === 'quick' && tasks.length > 4) tasks = tasks.slice(0,4);
    const q = questions(skill, text);
    const parallel = tasks.map((t,i)=>({t,i})).filter(x=>x.t.parallel==='Yes').map(x=>`TASK-${String(x.i+1).padStart(2,'0')}`);
    const merge = tasks.map((_,i)=>`${i+1}. TASK-${String(i+1).padStart(2,'0')}`).join('\n');
    const lines = [
      `# ${deriveFeature(req)}`, '', `**Plan ID:** ${id()}`, `**Skill:** ${skill.label} · ${skill.tier}-tier`, `**Mode:** ${mode()==='quick'?'Quick':'Standard'}`,
      value('project') ? `**Project:** ${value('project')}` : '', value('team') ? `**Team:** ${value('team')}` : '', '',
      '## Scope', req,
      value('constraints') ? `\n## Constraints / Shared Areas\n${value('constraints')}` : '',
      value('notes') ? `\n## Additional Notes\n${value('notes')}` : '',
      value('docs') ? `\n## References\n${bullet(value('docs').split(/\r?\n/).filter(Boolean))}` : '',
      value('figma') ? `\n## Figma\n${bullet(value('figma').split(/\r?\n/).filter(Boolean))}` : '',
      '', '## Source Confidence', bullet(sourceConfidence()), '', '## Task Breakdown', '', tasks.map(renderTask).join('\n\n'), '',
      '## Parallel Plan', parallel.length > 1 ? `- ${parallel.join(' + ')} can start in parallel where their stated contracts are sufficient.` : '- Keep shared-area ownership sequential unless contracts are explicit.', '',
      '## Shared Ownership / Conflict Notes', '- One important shared code area should have one primary owner.', '- If two tasks need heavy edits in the same screen/module/router/manager/config, merge ownership or name an integration owner.', '',
      '## Merge Order', merge,
      q.length ? `\n## Open Questions\n${bullet(q)}` : ''
    ].filter(Boolean);
    return { markdown: lines.join('\n').replace(/\n{3,}/g,'\n\n').trim()+'\n', skill, tasks };
  }

  let timer;
  function render() {
    const result = build();
    if (!result) return;
    preview.textContent = result.markdown;
    $('requestId') && ($('requestId').textContent = 'LIVE · SKILL');
    const badge = $('qualityBadge'); if (badge) badge.textContent = result.skill.label;
    const stack = $('skillStack');
    if (stack) stack.innerHTML = `<span class="skill-pill active"><b>${result.skill.tier}</b>${result.skill.label}</span><span class="skill-pill active"><b>S</b>Task Breakdown</span>`;
    const reason = $('routerReason'); if (reason) reason.textContent = `Matched ${result.skill.label}. Planner đang dùng registry local; linked source vẫn cần agent đọc thật khi online.`;
    window.TaskPlannerCurrent = result;
    window.dispatchEvent(new CustomEvent('taskplanner:plan-updated', { detail: result }));
  }
  const schedule = () => { clearTimeout(timer); timer = setTimeout(render, 280); };
  ['rawInput','feature','project','requirement','docs','figma','team','ownership','constraints','notes'].forEach(k => $(k)?.addEventListener('input', schedule));
  document.querySelectorAll('[data-mode]').forEach(x => x.addEventListener('click', () => setTimeout(render,320)));
  $('organizeBtn')?.addEventListener('click', () => setTimeout(render,340));
  window.addEventListener('online', schedule); window.addEventListener('offline', schedule);
  setTimeout(render, 360);
})();