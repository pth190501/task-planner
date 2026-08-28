const CACHE_NAME = 'task-planner-offline-v7-pdf';
const PDF_JS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDF_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest'];

const PDF_SUPPORT = `
<script src="${PDF_JS}"></script>
<script>
(() => {
  const input = document.getElementById('files');
  const req = document.getElementById('req');
  if (!input || !req) return;

  input.accept = '.pdf,application/pdf,.md,.txt,.csv,.json';
  let status = document.getElementById('fileStatus');
  if (!status) {
    status = document.createElement('small');
    status.id = 'fileStatus';
    status.className = 'muted';
    status.style.display = 'block';
    status.style.marginTop = '6px';
    input.insertAdjacentElement('afterend', status);
  }
  status.textContent = 'PDF / MD / TXT / CSV / JSON · processed locally in your browser';

  async function readPdf(file) {
    if (!window.pdfjsLib) throw new Error('PDF reader unavailable');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '${PDF_WORKER}';
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      status.textContent = 'Reading ' + file.name + ': ' + i + '/' + pdf.numPages + ' pages…';
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map(item => item.str).join(' ').replace(/\\s+/g, ' ').trim();
      if (text) pages.push('[Page ' + i + '] ' + text);
    }
    return pages.join('\\n\\n');
  }

  input.onchange = async event => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    let imported = 0;
    const scanned = [];
    const failed = [];

    for (const file of files) {
      try {
        status.textContent = 'Reading ' + file.name + '…';
        const isPdf = file.type === 'application/pdf' || /\\.pdf$/i.test(file.name);
        let text = isPdf ? await readPdf(file) : await file.text();
        if (isPdf && !text.trim()) {
          scanned.push(file.name);
          text = '[PDF has no extractable text — likely scanned/image PDF. OCR is required.]';
        }
        req.value += '\\n\\n--- ' + file.name + ' ---\\n' + text;
        imported++;
      } catch (error) {
        failed.push(file.name);
        req.value += '\\n\\n--- ' + file.name + ' ---\\n[Could not read file: ' + (error.message || error) + ']';
      }
    }

    req.dispatchEvent(new Event('input', { bubbles: true }));
    if (scanned.length) {
      status.textContent = 'Imported ' + imported + '/' + files.length + '. Scanned PDF needs OCR: ' + scanned.join(', ');
    } else if (failed.length) {
      status.textContent = 'Imported ' + imported + '/' + files.length + '. Failed: ' + failed.join(', ');
    } else {
      status.textContent = 'Imported ' + imported + '/' + files.length + ' file(s) successfully.';
    }
  };
})();
</script>`;

async function injectPdfSupport(response) {
  if (!response) return response;
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;
  let html = await response.text();
  if (!html.includes('id="files"') || html.includes('PDF / MD / TXT / CSV / JSON')) {
    return new Response(html, { status: response.status, statusText: response.statusText, headers: response.headers });
  }
  html = html.replace('</body>', PDF_SUPPORT + '</body>');
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(() => undefined));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('task-planner-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('task-planner-')).map(k => caches.delete(k)))));
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const network = await fetch(request, { cache: 'no-store' });
        const raw = network.clone();
        caches.open(CACHE_NAME).then(cache => cache.put('./index.html', raw)).catch(() => undefined);
        return await injectPdfSupport(network);
      } catch {
        const cached = await caches.match('./index.html') || await caches.match('./');
        return injectPdfSupport(cached);
      }
    })());
    return;
  }

  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone())).catch(() => undefined);
    return response;
  }).catch(() => cached)));
});
