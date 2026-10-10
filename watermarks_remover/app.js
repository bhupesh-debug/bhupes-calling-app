/**
 * WATERMARKS REMOVER — WEB INTERFACE CLIENT CONTROLLER
 * Zero-dependency frontend interacting with the watermarks-remover HTTP service.
 */

// Configuration & State
const state = {
  apiBase: window.location.origin.includes('http') ? window.location.origin : 'http://127.0.0.1:8765',
  apiKey: '',
  connected: false,
  capabilities: null,
  activeTab: 'text-tab',
  activeFile: null,
  activeBatchFiles: [],
};

// DOM Elements & Initialization
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initTextCleaner();
  initFileSanitizer();
  initBatchProcessor();
  initWatermarkStudio();
  initHealthPolling();
});

// -----------------------------------------------------------------------------
// Toast Notifications
// -----------------------------------------------------------------------------
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span class="toast-msg">${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// -----------------------------------------------------------------------------
// Tab Management
// -----------------------------------------------------------------------------
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      switchTab(target);
    });
  });
}

function switchTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach(p => {
    p.classList.toggle('active', p.id === tabId);
  });
}

// -----------------------------------------------------------------------------
// API Client
// -----------------------------------------------------------------------------
async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.apiKey) {
    headers['Authorization'] = `Bearer ${state.apiKey}`;
  }
  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${state.apiBase}${endpoint}`, options);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// Service Health & Capabilities
// -----------------------------------------------------------------------------
async function initHealthPolling() {
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');

  async function check() {
    try {
      const res = await apiRequest('/health');
      if (res.ok) {
        state.connected = true;
        statusIndicator.className = 'status-indicator';
        statusText.textContent = `Online (v${res.version || 'dev'})`;
        loadCapabilities();
      } else {
        throw new Error('Service returned non-ok');
      }
    } catch {
      state.connected = false;
      statusIndicator.className = 'status-indicator offline';
      statusText.textContent = 'Service Disconnected';
    }
  }

  check();
  setInterval(check, 10000);
}

async function loadCapabilities() {
  try {
    const caps = await apiRequest('/capabilities');
    state.capabilities = caps;
    renderCapabilities(caps);
  } catch (err) {
    console.warn('Could not load capabilities:', err);
  }
}

function renderCapabilities(caps) {
  const grid = document.getElementById('capabilities-grid');
  if (!grid || !caps) return;

  const tools = caps.tools || {};
  const pixel = caps.pixel_backends || {};
  const scorers = caps.scorers || {};
  const detectors = caps.text_detectors || {};

  grid.innerHTML = `
    <div class="capability-card">
      <div class="capability-name">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        C2PA Tool (Provenance)
      </div>
      <span class="${tools.c2patool ? 'badge-active' : 'badge-missing'}">${tools.c2patool ? 'Ready' : 'Not installed'}</span>
    </div>
    <div class="capability-card">
      <div class="capability-name">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
        ExifTool (Image Metadata)
      </div>
      <span class="${tools.exiftool ? 'badge-active' : 'badge-missing'}">${tools.exiftool ? 'Ready' : 'Not installed'}</span>
    </div>
    <div class="capability-card">
      <div class="capability-name">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
        QPDF (PDF Container)
      </div>
      <span class="${tools.qpdf ? 'badge-active' : 'badge-missing'}">${tools.qpdf ? 'Ready' : 'Not installed'}</span>
    </div>
    <div class="capability-card">
      <div class="capability-name">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
        FFmpeg (AV Metadata)
      </div>
      <span class="${tools.ffmpeg ? 'badge-active' : 'badge-missing'}">${tools.ffmpeg ? 'Ready' : 'Not installed'}</span>
    </div>
    <div class="capability-card">
      <div class="capability-name">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
        Stylometry Analyzer
      </div>
      <span class="${scorers.stylometry ? 'badge-active' : 'badge-missing'}">Ready</span>
    </div>
    <div class="capability-card">
      <div class="capability-name">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 12h8"></path></svg>
        Layer A Unicode Sanitizer
      </div>
      <span class="badge-active">Deterministic Ready</span>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// Text Cleaner & Detector (Layer A & B)
// -----------------------------------------------------------------------------
function initTextCleaner() {
  const textInput = document.getElementById('text-input');
  const btnCleanText = document.getElementById('btn-clean-text');
  const btnDetectText = document.getElementById('btn-detect-text');
  const btnCopyCleaned = document.getElementById('btn-copy-cleaned');
  const btnDownloadCleaned = document.getElementById('btn-download-cleaned');
  const textDiffView = document.getElementById('text-diff-view');

  // Sample Presets
  document.querySelectorAll('.text-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.preset;
      loadTextPreset(type);
    });
  });

  // Clean Text Action
  btnCleanText?.addEventListener('click', async () => {
    const raw = textInput.value;
    if (!raw.trim()) {
      showToast('Please enter text to sanitize.', 'error');
      return;
    }

    setButtonLoading(btnCleanText, true);
    try {
      const b64 = toBase64Utf8(raw);
      const res = await apiRequest('/clean', 'POST', {
        file: b64,
        name: 'sample.txt',
        options: {
          nfkc: document.getElementById('opt-nfkc')?.checked ?? true,
          aggressive_homoglyphs: document.getElementById('opt-homoglyphs')?.checked ?? true,
          normalize_spaces: document.getElementById('opt-spaces')?.checked ?? true,
          also_layer_a_text: true,
          strategy: 'none'
        }
      });

      if (res.ok && res.cleaned) {
        const cleanedText = fromBase64Utf8(res.cleaned);
        renderTextDiff(raw, cleanedText, res.report);
        showToast('Text successfully sanitized!', 'success');
      } else {
        throw new Error(res.error || 'Cleaning failed');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setButtonLoading(btnCleanText, false);
    }
  });

  // Detect Watermark Action
  btnDetectText?.addEventListener('click', async () => {
    const raw = textInput.value;
    if (!raw.trim()) {
      showToast('Please enter text to inspect.', 'error');
      return;
    }

    setButtonLoading(btnDetectText, true);
    try {
      const b64 = toBase64Utf8(raw);
      const [inspectRes, detectRes] = await Promise.all([
        apiRequest('/inspect', 'POST', { file: b64, name: 'input.txt' }),
        apiRequest('/detect', 'POST', { file: b64, name: 'input.txt' }).catch(() => null)
      ]);

      renderInspectionResults(inspectRes, detectRes, raw);
      showToast('Analysis completed!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setButtonLoading(btnDetectText, false);
    }
  });

  // Copy Cleaned
  btnCopyCleaned?.addEventListener('click', () => {
    const target = document.getElementById('cleaned-text-target');
    if (!target || !target.innerText) return;
    navigator.clipboard.writeText(target.innerText);
    showToast('Cleaned text copied to clipboard!', 'success');
  });

  // Download Cleaned
  btnDownloadCleaned?.addEventListener('click', () => {
    const target = document.getElementById('cleaned-text-target');
    if (!target || !target.innerText) return;
    downloadFile(target.innerText, 'cleaned_text.txt', 'text/plain;charset=utf-8');
  });
}

function loadTextPreset(type) {
  const textInput = document.getElementById('text-input');
  if (!textInput) return;

  if (type === 'zero-width') {
    textInput.value = "Artificial\u200BIntelligence\u200Cprovenance\u200Dmarkers\uFEFFcan be stealthily injected into unicode text strings\u202E to track originators.";
  } else if (type === 'homoglyphs') {
    textInput.value = "Thіs sеntеncе соntаіns Cyrillic homoglyph lооkаlikеs (а, е, і, о, с) thаt trіck humаn еyеs but flаg mасhіnе vаlіdаtоrs.";
  } else if (type === 'ai-essay') {
    textInput.value = "In conclusion, it is crucially important to delve into the tapestry of digital innovation. Furthermore, testament to the holistic paradigms, the multifaceted nuances illustrate a pivotal dichotomy.";
  }
  showToast(`Loaded preset: ${type}`, 'info');
}

function renderTextDiff(original, cleaned, report) {
  const container = document.getElementById('text-diff-container');
  const originalTarget = document.getElementById('original-text-target');
  const cleanedTarget = document.getElementById('cleaned-text-target');
  const statsTarget = document.getElementById('text-stats-bar');

  if (!container || !originalTarget || !cleanedTarget) return;

  container.style.display = 'grid';

  // Highlight invisible Unicode in original
  originalTarget.innerHTML = highlightInvisibleChars(original);
  cleanedTarget.innerText = cleaned;

  // Render stats
  const origLen = original.length;
  const cleanLen = cleaned.length;
  const diffChars = Math.abs(origLen - cleanLen);

  if (statsTarget) {
    statsTarget.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${origLen}</div>
        <div class="stat-label">Original Chars</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${cleanLen}</div>
        <div class="stat-label">Cleaned Chars</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: var(--accent-emerald);">${diffChars}</div>
        <div class="stat-label">Stripped Carriers</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${report?.homoglyphs_replaced || 0}</div>
        <div class="stat-label">Homoglyphs Normalized</div>
      </div>
    `;
  }
}

function highlightInvisibleChars(str) {
  let html = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    const char = str[i];
    if (code === 0x200B) {
      html += '<span class="carrier-highlight" title="U+200B Zero Width Space">[ZWSP]</span>';
    } else if (code === 0x200C) {
      html += '<span class="carrier-highlight" title="U+200C Zero Width Non-Joiner">[ZWNJ]</span>';
    } else if (code === 0x200D) {
      html += '<span class="carrier-highlight" title="U+200D Zero Width Joiner">[ZWJ]</span>';
    } else if (code === 0xFEFF) {
      html += '<span class="carrier-highlight" title="U+FEFF Byte Order Mark">[BOM]</span>';
    } else if (code === 0x202E) {
      html += '<span class="carrier-highlight" title="U+202E Right-to-Left Override">[RLO]</span>';
    } else if (code >= 0x0400 && code <= 0x04FF) {
      html += `<span class="carrier-highlight" title="U+${code.toString(16).toUpperCase()} Cyrillic Homoglyph">${escapeHtml(char)}</span>`;
    } else {
      html += escapeHtml(char);
    }
  }
  return html;
}

function renderInspectionResults(inspectRes, detectRes, text) {
  const container = document.getElementById('text-inspect-container');
  if (!container) return;
  container.style.display = 'block';

  const isSuspicious = inspectRes.suspicious || false;
  const rep = inspectRes.report || {};
  const findings = rep.findings || [];

  container.innerHTML = `
    <div class="finding-banner ${isSuspicious ? 'suspicious' : 'clean'}">
      <div class="finding-banner-content">
        <div class="finding-banner-icon">
          ${isSuspicious ? '⚠' : '✓'}
        </div>
        <div>
          <div class="finding-title">${isSuspicious ? 'AI Watermark / Provenance Signals Detected' : 'No Covert Signals Detected'}</div>
          <div class="finding-desc">${isSuspicious ? 'Text contains invisible Unicode carriers, homoglyph lookalikes, or provenance markers.' : 'Text appears standard without detected covert carrier channels.'}</div>
        </div>
      </div>
      <div>
        <span class="tag-pill" style="font-size: 13px; font-weight: 700;">${isSuspicious ? 'SUSPICIOUS' : 'CLEAN'}</span>
      </div>
    </div>
    <div class="findings-list">
      ${findings.length > 0 ? findings.map(f => `
        <div class="finding-item">
          <span class="finding-carrier">${escapeHtml(f.carrier || 'Signal')}:</span>
          <span class="finding-value">${escapeHtml(f.finding || f.description || JSON.stringify(f))}</span>
        </div>
      `).join('') : '<div style="color: var(--text-dim); text-align: center; padding: 12px;">No carrier patterns flagged</div>'}
    </div>
  `;
}

// -----------------------------------------------------------------------------
// File & Container Sanitizer (Inspect & Clean)
// -----------------------------------------------------------------------------
function initFileSanitizer() {
  const dropzone = document.getElementById('file-dropzone');
  const fileInput = document.getElementById('file-input');
  const btnInspectFile = document.getElementById('btn-inspect-file');
  const btnCleanFile = document.getElementById('btn-clean-file');
  const filePreviewArea = document.getElementById('file-preview-area');

  dropzone?.addEventListener('click', () => fileInput?.click());

  dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone?.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleSingleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput?.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleSingleFile(e.target.files[0]);
    }
  });

  // Action: Inspect File
  btnInspectFile?.addEventListener('click', async () => {
    if (!state.activeFile) {
      showToast('Please select a file first.', 'error');
      return;
    }
    setButtonLoading(btnInspectFile, true);
    try {
      const b64 = await fileToBase64(state.activeFile);
      const res = await apiRequest('/inspect', 'POST', {
        file: b64,
        name: state.activeFile.name
      });
      renderFileInspection(res);
      showToast('File inspection complete', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setButtonLoading(btnInspectFile, false);
    }
  });

  // Action: Clean File
  btnCleanFile?.addEventListener('click', async () => {
    if (!state.activeFile) {
      showToast('Please select a file first.', 'error');
      return;
    }
    setButtonLoading(btnCleanFile, true);
    try {
      const b64 = await fileToBase64(state.activeFile);
      const res = await apiRequest('/clean', 'POST', {
        file: b64,
        name: state.activeFile.name,
        options: {
          strip_all_metadata: document.getElementById('opt-strip-all')?.checked ?? false,
          deep_images: 'auto',
          clean_attachments: 'strip',
          normalize_spaces: true,
          also_layer_a_text: true
        }
      });

      if (res.ok && res.cleaned) {
        renderFileCleanedResult(res);
        showToast('File sanitized successfully!', 'success');
      } else {
        throw new Error(res.error || 'Cleaning returned an error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setButtonLoading(btnCleanFile, false);
    }
  });
}

function handleSingleFile(file) {
  state.activeFile = file;
  const fileName = document.getElementById('active-file-name');
  const fileSize = document.getElementById('active-file-size');
  const fileCard = document.getElementById('active-file-card');

  if (fileName) fileName.textContent = file.name;
  if (fileSize) fileSize.textContent = formatBytes(file.size);
  if (fileCard) fileCard.style.display = 'flex';

  showToast(`Loaded ${file.name}`, 'info');
}

function renderFileInspection(res) {
  const container = document.getElementById('file-report-container');
  if (!container) return;
  container.style.display = 'block';

  const isSuspicious = res.suspicious || false;
  const rep = res.report || {};
  const findings = rep.findings || [];

  container.innerHTML = `
    <div class="finding-banner ${isSuspicious ? 'suspicious' : 'clean'}">
      <div class="finding-banner-content">
        <div class="finding-banner-icon">${isSuspicious ? '⚠' : '✓'}</div>
        <div>
          <div class="finding-title">Classification: ${res.kind?.toUpperCase()} — ${isSuspicious ? 'Watermark / Provenance Found' : 'Clean'}</div>
          <div class="finding-desc">${isSuspicious ? 'Metadata tags, C2PA signatures, or hidden AI attributes detected.' : 'No AI provenance traces detected.'}</div>
        </div>
      </div>
    </div>
    <div class="findings-list">
      <div class="finding-item">
        <span>File Type Category:</span>
        <span class="finding-value">${escapeHtml(res.kind || 'unknown')}</span>
      </div>
      ${findings.map(f => `
        <div class="finding-item">
          <span class="finding-carrier">${escapeHtml(f.carrier || 'Signal')}:</span>
          <span class="finding-value">${escapeHtml(f.finding || f.name || JSON.stringify(f))}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderFileCleanedResult(res) {
  const container = document.getElementById('file-cleaned-container');
  if (!container) return;
  container.style.display = 'block';

  const rep = res.report || {};
  const downloadBtn = document.getElementById('btn-download-cleaned-file');

  container.innerHTML = `
    <div class="finding-banner clean">
      <div class="finding-banner-content">
        <div class="finding-banner-icon">✓</div>
        <div>
          <div class="finding-title">File Sanitized & Provenance Stripped</div>
          <div class="finding-desc">Document body preserved with all C2PA, EXIF, XMP, and invisible carrier signatures eliminated.</div>
        </div>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${res.kind}</div>
        <div class="stat-label">Format Class</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: var(--accent-emerald);">Clean</div>
        <div class="stat-label">Status</div>
      </div>
    </div>
    <button id="btn-download-now" class="btn btn-success" style="width: 100%; margin-top: 14px;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
      Download Sanitized File
    </button>
  `;

  document.getElementById('btn-download-now')?.addEventListener('click', () => {
    const filename = `cleaned_${state.activeFile?.name || 'output'}`;
    downloadBase64(res.cleaned, filename, getMimeType(filename));
  });
}

// -----------------------------------------------------------------------------
// Batch Processor
// -----------------------------------------------------------------------------
function initBatchProcessor() {
  const batchDropzone = document.getElementById('batch-dropzone');
  const batchFileInput = document.getElementById('batch-file-input');
  const btnProcessBatch = document.getElementById('btn-process-batch');

  batchDropzone?.addEventListener('click', () => batchFileInput?.click());

  batchDropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    batchDropzone.classList.add('dragover');
  });

  batchDropzone?.addEventListener('dragleave', () => {
    batchDropzone.classList.remove('dragover');
  });

  batchDropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    batchDropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      addBatchFiles(Array.from(e.dataTransfer.files));
    }
  });

  batchFileInput?.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      addBatchFiles(Array.from(e.target.files));
    }
  });

  btnProcessBatch?.addEventListener('click', async () => {
    if (state.activeBatchFiles.length === 0) {
      showToast('Please add files to batch process.', 'error');
      return;
    }

    setButtonLoading(btnProcessBatch, true);
    try {
      // Prepare payload
      const encodedFiles = await Promise.all(
        state.activeBatchFiles.map(async f => ({
          name: f.name,
          file: await fileToBase64(f),
          options: {
            strip_all_metadata: false,
            also_layer_a_text: true,
            normalize_spaces: true
          }
        }))
      );

      const res = await apiRequest('/clean/batch', 'POST', { files: encodedFiles });
      if (res.ok && res.results) {
        renderBatchResults(res.results);
        showToast('Batch processing finished!', 'success');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setButtonLoading(btnProcessBatch, false);
    }
  });
}

function addBatchFiles(files) {
  state.activeBatchFiles = [...state.activeBatchFiles, ...files];
  const table = document.getElementById('batch-files-table');
  const tableBody = document.getElementById('batch-table-body');
  const countBadge = document.getElementById('batch-count-badge');

  if (countBadge) countBadge.textContent = `${state.activeBatchFiles.length} files`;
  if (table) table.style.display = 'table';

  if (tableBody) {
    tableBody.innerHTML = state.activeBatchFiles.map((f, i) => `
      <tr>
        <td><strong>${escapeHtml(f.name)}</strong></td>
        <td>${formatBytes(f.size)}</td>
        <td><span class="tag-pill">Pending</span></td>
        <td>—</td>
      </tr>
    `).join('');
  }
}

function renderBatchResults(results) {
  const tableBody = document.getElementById('batch-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = results.map(r => `
    <tr>
      <td><strong>${escapeHtml(r.name)}</strong></td>
      <td><span class="tag-pill">${r.kind || 'file'}</span></td>
      <td>
        <span class="${r.ok ? 'badge-active' : 'badge-missing'}">
          ${r.ok ? 'Cleaned' : 'Error'}
        </span>
      </td>
      <td>
        ${r.cleaned ? `
          <button class="btn btn-secondary btn-sm" onclick="downloadBase64('${r.cleaned}', 'cleaned_${escapeHtml(r.name)}')">
            Download
          </button>
        ` : `<span style="color: var(--accent-rose);">${escapeHtml(r.error || 'Failed')}</span>`}
      </td>
    </tr>
  `).join('');
}

// -----------------------------------------------------------------------------
// Watermark Studio
// -----------------------------------------------------------------------------
function initWatermarkStudio() {
  const btnGenWatermark = document.getElementById('btn-generate-watermark');
  const wmText = document.getElementById('wm-text-input');
  const wmOutput = document.getElementById('wm-output');

  btnGenWatermark?.addEventListener('click', async () => {
    const text = wmText?.value;
    if (!text || !text.trim()) {
      showToast('Please enter text to watermark.', 'error');
      return;
    }

    setButtonLoading(btnGenWatermark, true);
    try {
      const res = await apiRequest('/watermark', 'POST', {
        text: text,
        keys: [42, 84, 126],
        options: { scheme: 'kgw' }
      });

      if (res.ok && res.watermarked_text) {
        if (wmOutput) wmOutput.value = res.watermarked_text;
        showToast('Watermarked text generated', 'success');
      } else {
        throw new Error(res.error || 'Watermark generation not supported without configured backend');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setButtonLoading(btnGenWatermark, false);
    }
  });
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------
function toBase64Utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64Utf8(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result.split(',')[1];
      resolve(b64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function downloadFile(content, filename, contentType = 'text/plain') {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadBase64(base64Data, filename, mimeType = 'application/octet-stream') {
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setButtonLoading(btn, isLoading) {
  if (!btn) return;
  if (isLoading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> Processing...`;
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    btn.disabled = false;
  }
}

function getMimeType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
    'md': 'text/markdown',
    'txt': 'text/plain',
    'html': 'text/html',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'mp4': 'video/mp4',
    'mp3': 'audio/mpeg',
  };
  return map[ext] || 'application/octet-stream';
}
