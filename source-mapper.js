(() => {
  const $ = id => document.getElementById(id);
  const preview = $('preview');
  const form = $('taskForm');
  if (!preview || !form) return;

  const STORAGE_KEY = 'task-planner:source-mapping:v1';
  let applying = false;
  let timer;

  const val = id => ($(id)?.value || '').trim();
  const mode = () => localStorage.getItem('task-planner:mode:v3') === 'standard' ? 'standard' : 'quick';
  const hasUrl = text => /https?:\/\/\S+/i.test(text || '');
  const clean = s => String(s || '').replace(/https?:\/\/\S+/gi, '').replace(/^[-*•]+\s*/, '').trim();
  const uniq = xs => [...new Set(xs.map(x => String(x || '').trim()).filter(Boolean))];
  const slug = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const STOP = new Set(['the','and','or','of','to','in','for','a','an','is','la','va','voi','cho','cua','trong','khu','vuc','phan','vung','man','hinh','nhom','group','screen','section','frame','component','view']);
  const tokens = s => slug(s).split(' ').filter(x => x.length > 1 && !STOP.has(x));

  function injectUI() {
    if (!$('figmaOutline')) {
      const details = document.createElement('details');
      details.className = 'source-mapping-details';
      details.innerHTML = `
        <summary>Figma / Docs mapping context <span>optional for local/offline preview</span></summary>
        <div class="source-mapping-body">
          <div class="two-col">
            <label><span>Figma outline / regions</span><textarea id="figmaOutline" rows="5" placeholder="Ví dụ:\n# Home\n- Banner\n- Greeting\n- Service group\n# Home Group\n- Header\n- Item grid\n- See all"></textarea></label>
            <label><span>Document outline / mapping</span><textarea id="docOutline" rows="5" placeholder="Ví dụ:\n1. Banner home\n2. Greeting\n3. Nhóm dịch vụ\nHome Group -> 4, 5, 6"></textarea></label>
          </div>
          <p class="source-help">Nếu chỉ có Figma/Doc URL, local planner không thể đọc private source. Dán outline để preview offline, hoặc dùng nút Source Mapping Prompt để agent có connector đọc source thật.</p>
        </div>`;
      const advanced = form.querySelector('.advanced');
      form.insertBefore(details, advanced || form.querySelector('.force-row'));
    }

    const right = document.querySelector('.right-column');
    if (right && !$('sourceMappingCard')) {
      const card = document.createElement('section');
      card.id = 'sourceMappingCard';
      card.className = 'card source-mapping-card';
      card.innerHTML = `
        <div class="section-title compact"><div><span class="step">F</span><h2>Figma-first Breakdown</h2></div><span id="sourceMappingBadge" class="optional">auto</span></div>
        <p id="sourceMappingStatus" class="router-reason">Có Figma thì planner ưu tiên chia theo phân vùng/flow trong design và map sang tài liệu.</p>
        <div class="source-mapping-actions">
          <button id="copySourceMappingPrompt" type="button">Copy Source Mapping Prompt</button>
        </div>`;
      const previewCard = right.querySelector('.preview-card');
      right.insertBefore(card, previewCard || right.firstChild);
    }

    if (!$('sourceMapperStyle')) {
      const style = document.createElement('style');
      style.id = 'sourceMapperStyle';
      style.textContent = `
        .source-mapping-details{border:1px solid var(--line);border-radius:14px;margin:2px 0 18px;overflow:hidden;background:rgba(5,9,19,.3)}
        .source-mapping-details summary{cursor:pointer;padding:12px 14px;font-size:13px;font-weight:700}
        .source-mapping-details summary span{color:var(--muted);font-weight:500;margin-left:6px}
        .source-mapping-body{padding:14px 14px 2px;border-top:1px solid var(--line)}
        .source-help{margin:0 0 12px;color:var(--muted);font-size:12px;line-height:1.55}
        .source-mapping-card{padding:18px}
        .source-mapping-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
        .source-mapping-card.ready{border-color:rgba(142,162,255,.32)}
        .source-mapping-card.pending{border-color:rgba(255,196,92,.28)}
      `;
      document.head.appendChild(style);
    }
  }

  function loadLocal() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if ($('figmaOutline')) $('figmaOutline').value = saved.figmaOutline || '';
      if ($('docOutline')) $('docOutline').value = saved.docOutline || '';
    } catch (_) {}
  }

  function saveLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ figmaOutline: val('figmaOutline'), docOutline: val('docOutline') }));
  }

  function owners() {
    const team = val('team');
    const explicit = val('ownership').split(/[,;\n]+/).map(x => x.trim()).filter(Boolean).map(x => x.split(/\s+(?:owns?|owner|api|ui|integration|core|data|sdk)\b/i)[0].trim()).filter(x => x && x.length < 32);
    let names = team.replace(/^\d+\s*(?:devs?|developers?|người)?\s*[-—:]?\s*/i, '').split(/[,;/\n]+/).map(x => x.trim()).filter(Boolean);
    const count = Number((team.match(/\b([1-9])\s*(?:devs?|developers?|người)\b/i) || [])[1] || 0);
    const merged = uniq([...explicit, ...names]).slice(0, 8);
    if (merged.length) return merged;
    if (count) return Array.from({ length: Math.min(count, 8) }, (_, i) => `Dev ${String.fromCharCode(65 + i)}`);
    return ['Dev A', 'Dev B', 'Dev C'];
  }

  function featureName() {
    if (val('feature')) return val('feature');
    const raw = val('requirement') || val('rawInput');
    const first = raw.split(/\r?\n/).map(x => x.trim()).find(Boolean) || 'Figma Feature Breakdown';
    return first.replace(/^[-*•#\s]+/, '').replace(/^(tôi\s+)?(đang\s+)?(muốn|cần|xây dựng|tạo|thêm|làm)\s+/i, '').slice(0, 80);
  }

  function sourceLines(...texts) {
    return uniq(texts.join('\n').split(/\r?\n/).map(line => {
      const noUrl = line.replace(/https?:\/\/\S+/gi, '').trim();
      if (!noUrl || /^(figma|doc|docs|reference|references|jira|ticket)\s*[:：]?$/i.test(noUrl)) return '';
      return noUrl;
    }).filter(Boolean));
  }

  function parseGroups(text) {
    const groups = [];
    const byKey = new Map();
    let current = null;
    const ensure = name => {
      const n = clean(name).replace(/^#+\s*/, '').replace(/[:：]+$/, '').trim();
      if (!n) return null;
      const key = slug(n);
      if (!key) return null;
      if (!byKey.has(key)) {
        const g = { name: n, items: [] };
        byKey.set(key, g); groups.push(g);
      }
      return byKey.get(key);
    };

    sourceLines(text).forEach(raw => {
      const line = raw.trim();
      if (!line) return;

      const heading = line.match(/^#{1,6}\s+(.+)$/);
      if (heading) { current = ensure(heading[1]); return; }

      const explicit = line.match(/^([^:：]{2,80})[:：]\s*(.+)$/);
      if (explicit && !/^https?$/i.test(explicit[1])) {
        const right = explicit[2].split(/[,;|]+/).map(clean).filter(Boolean);
        if (right.length >= 2 || /\b(home|login|profile|account|header|footer|group|section|flow|popup|modal|tab|screen|màn hình|nhóm)\b/i.test(explicit[1])) {
          current = ensure(explicit[1]);
          if (current) current.items = uniq([...current.items, ...right]);
          return;
        }
      }

      const hierarchy = line.split(/\s*(?:>|→|\/|::)\s*/).map(clean).filter(Boolean);
      if (hierarchy.length >= 2) {
        const g = ensure(hierarchy[0]);
        if (g) g.items = uniq([...g.items, hierarchy.slice(1).join(' > ')]);
        current = g;
        return;
      }

      if (/^[-*•]\s+/.test(raw) && current) {
        current.items = uniq([...current.items, clean(raw)]);
        return;
      }

      const numbered = line.match(/^\d+[.)]\s+(.+)$/);
      if (numbered && current) {
        current.items = uniq([...current.items, clean(numbered[1])]);
        return;
      }

      if (current && (/^[-*•]/.test(raw) || /^\s{2,}/.test(raw))) {
        current.items = uniq([...current.items, clean(raw)]);
        return;
      }

      current = ensure(line);
    });

    return groups.filter(g => g.name && !/^https?:/i.test(g.name));
  }

  function parseDocContext(text) {
    const items = [];
    const explicit = new Map();
    sourceLines(text).forEach(raw => {
      const line = clean(raw);
      if (!line) return;
      const map = line.match(/^(.{2,80}?)\s*(?:->|→|=>)\s*([\d\s,.;-]+)$/);
      if (map) {
        explicit.set(slug(map[1]), uniq((map[2].match(/\d+/g) || []).map(x => x)));
        return;
      }
      const numbered = line.match(/^(\d+(?:\.\d+)*)[.)-]?\s+(.+)$/);
      if (numbered) items.push({ ref: numbered[1], title: numbered[2].trim() });
    });
    return { items, explicit };
  }

  function score(area, doc) {
    const a = new Set(tokens([area.name, ...area.items].join(' ')));
    const b = tokens(doc.title);
    return b.reduce((sum, x) => sum + (a.has(x) ? 1 : 0), 0);
  }

  function mapDocs(area, docs) {
    const explicit = docs.explicit.get(slug(area.name));
    if (explicit?.length) return docs.items.filter(x => explicit.includes(x.ref)).length
      ? docs.items.filter(x => explicit.includes(x.ref))
      : explicit.map(ref => ({ ref, title: '' }));

    const ranked = docs.items.map(d => ({ d, s: score(area, d) })).filter(x => x.s > 0).sort((a,b) => b.s - a.s);
    if (!ranked.length) return [];
    const max = ranked[0].s;
    return ranked.filter(x => x.s === max || (max > 1 && x.s >= max - 1)).slice(0, 4).map(x => x.d);
  }

  function hasFigmaSource() {
    return Boolean(val('figma') || val('figmaOutline') || /figma\.com/i.test(val('rawInput')));
  }

  function buildMappedTasks(groups, docs) {
    const names = owners();
    return groups.map((g, i) => {
      const mapped = mapDocs(g, docs);
      const figmaItems = g.items.length ? g.items : [g.name];
      const docLabels = mapped.map(x => x.title ? `Mục ${x.ref} — ${x.title}` : `Mục ${x.ref}`);
      return {
        title: `Phân vùng ${g.name}`,
        owner: names[i % names.length],
        parallel: 'Yes',
        depends: 'None',
        figma: figmaItems,
        docs: docLabels,
        ownership: [g.name, ...g.items],
        scope: [
          `Implement toàn bộ UI, interaction và binding thuộc phân vùng ${g.name} theo source đã xác nhận.`,
          g.items.length ? `Bao gồm: ${g.items.join(', ')}.` : 'Giữ ownership trong đúng phân vùng này.',
          mapped.length ? `Đối chiếu với ${docLabels.join('; ')}.` : (docs.items.length ? 'Mapping tài liệu chưa đủ chắc chắn — cần đối chiếu source trước khi implement chi tiết.' : 'Không có document outline để map local.')
        ],
        done: [
          `Các khu vực Figma của ${g.name} được implement đầy đủ theo design.`,
          mapped.length ? 'Behavior/business rules khớp các mục tài liệu đã map.' : 'Các assumption còn thiếu được xác nhận trước khi chốt behavior.',
          'Không dẫm ownership sang phân vùng sibling nếu không có shared-component agreement.'
        ],
        confidence: mapped.length ? 'Source-mapped' : 'Figma-mapped / docs pending'
      };
    });
  }

  function taskMarkdown(t, i) {
    const n = `TASK-${String(i + 1).padStart(2, '0')}`;
    if (mode() === 'quick') {
      return [
        `### ${n} — ${t.title}`,
        `- **Owner:** ${t.owner}`,
        `- **Figma:** ${t.figma.join(', ')}`,
        `- **Tài liệu:** ${t.docs.length ? t.docs.join('; ') : 'Chưa map chắc chắn'}`,
        `- **Parallel:** ${t.parallel}`,
        `- **Scope:** ${t.scope[0]}`
      ].join('\n');
    }
    const bullets = xs => xs.map(x => `- ${x}`).join('\n');
    return [
      `### ${n} — ${t.title}`,
      `**Owner:** ${t.owner}`,
      `**Can run in parallel:** ${t.parallel}`,
      `**Depends on:** ${t.depends}`,
      '', '**Figma areas**', bullets(t.figma),
      '', '**Document mapping**', t.docs.length ? bullets(t.docs) : '- Chưa map chắc chắn',
      '', '**Scope**', bullets(t.scope),
      '', '**Main ownership**', bullets(t.ownership),
      '', '**Done when**', bullets(t.done)
    ].join('\n');
  }

  function buildMappedMarkdown(groups, docs, tasks) {
    const figmaUrlState = hasUrl(val('figma') || val('rawInput')) ? 'linked' : 'context pasted';
    const docState = val('docs') ? (hasUrl(val('docs')) ? 'linked' : 'context pasted') : (val('docOutline') ? 'outline pasted' : 'not provided');
    const lines = [
      `# ${featureName()}`,
      '', '**Break strategy:** Figma-first · functional ownership',
      `**Figma source:** ${figmaUrlState}`,
      `**Docs source:** ${docState}`,
      '', '## Task Breakdown', '',
      ...tasks.flatMap((t, i) => [taskMarkdown(t, i), '']),
      '## Parallel Plan',
      tasks.length > 1 ? `- ${tasks.map((_,i) => `TASK-${String(i+1).padStart(2,'0')}`).join(' + ')} có thể bắt đầu song song nếu không share cùng component/file ownership.` : '- Một vùng ownership chính.',
      '', '## Shared Ownership / Conflict Notes',
      '- Shared component dùng bởi nhiều phân vùng phải có một owner chính hoặc contract ổn định trước khi các task song song cùng dùng.',
      '- Không chia thêm API/UI/Integration thành task riêng nếu chúng chỉ phục vụ một phân vùng Figma; giữ chúng bên trong owner của phân vùng đó.'
    ];
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  function buildPendingMarkdown() {
    const docs = Boolean(val('docs') || val('docOutline'));
    return [
      `# ${featureName()}`,
      '', '**Break strategy:** Figma-first · source mapping required',
      '', '## Source Status',
      '- Figma: đã có link nhưng local/offline planner chưa đọc được hierarchy/frame/component từ URL.',
      `- Tài liệu: ${docs ? 'đã có reference nhưng cần inspect nội dung để map chính xác.' : 'chưa có.'}`,
      '', '## Expected Breakdown',
      '- TASK-01 — Phân vùng <khu vực chức năng 1> · Figma: <x, y, z> · Docs: <1, 2, 3>',
      '- TASK-02 — Phân vùng <khu vực chức năng 2> · Figma: <a, b, c> · Docs: <4, 5>',
      '', '## Rule',
      '- Không chia theo API / UI / Integration trước khi đã hiểu phân vùng chức năng từ Figma.',
      '- Không tự bịa tên khu vực từ URL.',
      '- Dùng Source Mapping Prompt với agent có Figma/Docs connector, hoặc paste Figma outline vào web để có preview local.'
    ].join('\n');
  }

  function sourcePrompt() {
    const target = val('agentTarget') || 'claude';
    const figma = val('figma') || (val('rawInput').match(/https?:\/\/[^\s]*figma\.com\/\S+/i) || [])[0] || '(không có URL)';
    const docs = val('docs') || '(không có tài liệu)';
    const requirement = val('requirement') || val('rawInput') || '(không có requirement bổ sung)';
    const targetRules = {
      claude: 'Ưu tiên dùng Figma/Docs MCP hoặc connected tools nếu workspace có. Nếu source không truy cập được, nói rõ và dừng trước khi bịa structure.',
      codex: 'Inspect source/workspace trước. Nếu Codex không truy cập được Figma/Docs trực tiếp, yêu cầu extracted context thay vì đoán.',
      antigravity: 'Dùng connected workspace/Figma/context tools trước khi lập plan; giữ ownership theo vùng chức năng.',
      chatgpt: 'Dùng Figma/Docs connectors nếu khả dụng; đọc source thật trước khi chia task.'
    };
    return `Bạn đang chia đầu việc cho team dev từ Figma + tài liệu.\n\nMỤC TIÊU\nChia theo PHÂN VÙNG CHỨC NĂNG / FLOW / ownership trong Figma, không chia mặc định theo technical layer như API/UI/Integration. Mỗi task phải đủ lớn để một member ownership trọn vùng và các task có thể làm song song an toàn.\n\nFIGMA\n${figma}\n\nDOCS / REFERENCES\n${docs}\n\nREQUIREMENT\n${requirement}\n\nCÁCH LÀM\n1. Đọc node/flow Figma được cung cấp và các frame/component liên quan.\n2. Xác định các vùng chức năng cấp cao, ví dụ Home, Home Group, Header, Account... theo đúng source, không tự đặt nếu Figma không có bằng chứng.\n3. Với mỗi vùng, liệt kê các khu vực con/frame/state x, y, z thuộc ownership đó.\n4. Đọc tài liệu và map vùng Figma với đúng mục/section/business rule tương ứng.\n5. Gộp API/data/UI/interaction vào task của vùng nếu chúng chỉ phục vụ vùng đó. Chỉ tách cross-cutting task khi thực sự dùng chung nhiều vùng.\n6. Hạn chế số task; ưu tiên ownership rõ và ít conflict.\n\nOUTPUT BẮT BUỘC\n# <Feature>\n\n### TASK-01 — Phân vùng <Tên vùng>\n- Owner: Dev A\n- Figma: <x>, <y>, <z>\n- Tài liệu: mục <1>, <2>, <3>\n- Scope: <mô tả ngắn gọn những gì member này ownership>\n- Depends on: None / TASK-xx\n\n### TASK-02 — Phân vùng <Tên vùng>\n- Owner: Dev B\n- Figma: <a>, <b>, <c>\n- Tài liệu: mục <...>\n- Scope: ...\n\n## Shared / Conflict\n- Chỉ ghi các component/file/flow thực sự dùng chung và đề xuất owner chính.\n\nKhông tạo task kiểu “API layer”, “UI layer”, “Integration” nếu có thể gom chúng theo phân vùng chức năng.\n\nAGENT TARGET: ${target}\n${targetRules[target] || targetRules.claude}`;
  }

  async function copySourcePrompt() {
    const btn = $('copySourceMappingPrompt');
    try {
      await navigator.clipboard.writeText(sourcePrompt());
      if (btn) { const old = btn.textContent; btn.textContent = 'Copied'; setTimeout(() => btn.textContent = old, 1200); }
    } catch (_) {
      if (btn) btn.textContent = 'Copy failed';
    }
  }

  function updateCard(groups) {
    const card = $('sourceMappingCard');
    const status = $('sourceMappingStatus');
    const badge = $('sourceMappingBadge');
    if (!card || !status || !badge) return;
    card.classList.remove('ready','pending');
    if (!hasFigmaSource()) {
      badge.textContent = 'inactive';
      status.textContent = 'Có Figma thì planner tự chuyển sang chia theo phân vùng/flow thay vì technical layer.';
      return;
    }
    if (groups.length) {
      card.classList.add('ready');
      badge.textContent = `${groups.length} areas`;
      status.textContent = `Đã nhận ${groups.length} phân vùng Figma. Preview đang chia theo ownership từng vùng và map sang tài liệu khi đủ tín hiệu.`;
    } else {
      card.classList.add('pending');
      badge.textContent = 'source pending';
      status.textContent = 'Đã có Figma URL nhưng local planner chưa đọc được hierarchy. Dùng Source Mapping Prompt hoặc paste Figma outline.';
    }
  }

  function render() {
    if (!hasFigmaSource()) return;
    const figmaContext = sourceLines(val('figmaOutline'), val('figma')).join('\n');
    const docContext = sourceLines(val('docOutline'), val('docs')).join('\n');
    const groups = parseGroups(figmaContext);
    const docs = parseDocContext(docContext);
    updateCard(groups);

    applying = true;
    if (groups.length) {
      const tasks = buildMappedTasks(groups, docs);
      const markdown = buildMappedMarkdown(groups, docs, tasks);
      preview.textContent = markdown;
      if ($('requestId')) $('requestId').textContent = 'FIGMA';
      if ($('qualityBadge')) $('qualityBadge').textContent = 'Figma-first';
      window.TaskPlannerCurrent = { markdown, tasks, skill: { id: 'figma-functional', label: 'Figma Functional Ownership', tier: 'S' }, confidence: 'source-mapped' };
    } else {
      const markdown = buildPendingMarkdown();
      preview.textContent = markdown;
      if ($('requestId')) $('requestId').textContent = 'SOURCE';
      if ($('qualityBadge')) $('qualityBadge').textContent = 'Need source';
      window.TaskPlannerCurrent = { markdown, tasks: [], skill: { id: 'figma-functional', label: 'Figma Functional Ownership', tier: 'S' }, confidence: 'source-pending' };
    }
    window.dispatchEvent(new CustomEvent('taskplanner:plan-updated', { detail: window.TaskPlannerCurrent }));
    setTimeout(() => { applying = false; }, 0);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(render, 90);
  }

  injectUI();
  loadLocal();
  $('copySourceMappingPrompt')?.addEventListener('click', copySourcePrompt);
  ['figmaOutline','docOutline'].forEach(id => $(id)?.addEventListener('input', () => { saveLocal(); schedule(); }));
  ['rawInput','feature','requirement','docs','figma','team','ownership','constraints','notes'].forEach(id => $(id)?.addEventListener('input', schedule));
  document.querySelectorAll('[data-mode]').forEach(node => node.addEventListener('click', schedule));
  window.addEventListener('taskplanner:plan-updated', () => { if (!applying && hasFigmaSource()) schedule(); });
  if ($('appVersion')) $('appVersion').textContent = 'v2.1.0';
  schedule();
})();