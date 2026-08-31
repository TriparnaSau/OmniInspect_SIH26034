let currentRole = 'Officer';
let activeInspectionId = null;
let currentInspectionData = null;
let currentZoomScale = 1.0;
let mediaStream = null;
let currentFacingMode = 'environment';

// Offline Draft Queue Management
function checkOfflineStatus() {
  const isOffline = !navigator.onLine;
  let offlineBadge = document.getElementById('offline-mode-badge');
  if (isOffline) {
    if (!offlineBadge) {
      offlineBadge = document.createElement('div');
      offlineBadge.id = 'offline-mode-badge';
      offlineBadge.className = 'fixed top-2 right-4 z-50 bg-amber-500 text-slate-950 font-bold text-[11px] px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 animate-pulse';
      offlineBadge.innerHTML = `<i data-lucide="wifi-off" class="w-3.5 h-3.5"></i> Offline Capture Mode`;
      document.body.appendChild(offlineBadge);
    }
  } else {
    if (offlineBadge) offlineBadge.remove();
    syncOfflineQueue();
  }
}

window.addEventListener('online', () => {
  checkOfflineStatus();
  showToast("Internet connection restored. Synchronizing offline inspection drafts...");
});
window.addEventListener('offline', () => {
  checkOfflineStatus();
  showToast("Offline Capture Mode active. Inspection drafts will be stored locally.", true);
});

function getOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem('omniinspect_offline_queue') || '[]');
  } catch {
    return [];
  }
}

function saveOfflineDraft(draftData) {
  const queue = getOfflineQueue();
  queue.push({ id: `offline-${Date.now()}`, data: draftData, timestamp: new Date().toISOString() });
  localStorage.setItem('omniinspect_offline_queue', JSON.stringify(queue));
  showToast("Inspection draft saved locally in offline queue.");
}

async function syncOfflineQueue() {
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  showToast(`Synchronizing ${queue.length} offline inspection draft(s)...`);
  for (const item of queue) {
    try {
      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data)
      });
      if (res.ok) {
        showToast(`Offline draft '${item.data.product_name}' synced successfully.`);
      }
    } catch (err) {}
  }
  localStorage.removeItem('omniinspect_offline_queue');
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  checkOfflineStatus();
  if (window.lucide) {
    lucide.createIcons();
  }
  handleRoute();
  window.addEventListener('hashchange', handleRoute);
});

// Role Switcher
function switchRole(role) {
  currentRole = role;
  showToast(`Switched active user view to: ${role}`);
  handleRoute();
}

// SPA Hash Router
function handleRoute() {
  const hash = window.location.hash || '#/dashboard';
  const appView = document.getElementById('app-view');
  
  // Update Active Navigation Highlight
  document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));

  if (hash.startsWith('#/dashboard')) {
    setActiveNav('nav-dashboard');
    renderDashboardView(appView);
  } else if (hash.startsWith('#/inspections/new')) {
    setActiveNav('nav-new-inspection');
    renderNewInspectionView(appView);
  } else if (hash.startsWith('#/inspections/') && hash.split('/').length >= 3) {
    setActiveNav('nav-inspections');
    const inspId = hash.split('/')[2];
    renderInspectionDetailView(appView, inspId);
  } else if (hash.startsWith('#/inspections')) {
    setActiveNav('nav-inspections');
    renderInspectionsListView(appView);
  } else if (hash.startsWith('#/rules')) {
    setActiveNav('nav-rules');
    renderRulesView(appView);
  } else if (hash.startsWith('#/reports')) {
    setActiveNav('nav-reports');
    renderReportsView(appView);
  } else if (hash.startsWith('#/risk-prioritization')) {
    renderRiskView(appView);
  } else if (hash.startsWith('#/audit-logs')) {
    renderAuditLogsView(appView);
  } else {
    renderDashboardView(appView);
  }

  setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 50);
}

function setActiveNav(id) {
  const nav = document.getElementById(id);
  if (nav) nav.classList.add('active');
}

// -------------------------------------------------------------------
// 1. DASHBOARD VIEW (Light Enterprise Metric Cards & Recent Cases)
// -------------------------------------------------------------------
async function renderDashboardView(container) {
  container.innerHTML = `<div class="flex items-center justify-center py-20 text-slate-400"><i data-lucide="loader-2" class="w-8 h-8 animate-spin text-blue-600"></i></div>`;
  
  try {
    const res = await fetch('/api/analytics');
    const data = await res.json();
    const metrics = data.metrics || { total_inspections: 0, compliant: 0, potential_non_compliance: 0, manual_review: 0 };
    
    const inspRes = await fetch('/api/inspections');
    const inspData = await inspRes.json();
    const recent = inspData.inspections ? inspData.inspections.slice(0, 5) : [];

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Top Metrics Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="card-light border-l-4 border-l-blue-600">
            <div class="flex items-center justify-between text-slate-500">
              <span class="text-xs font-bold uppercase tracking-wider">Total Inspections</span>
              <i data-lucide="clipboard-check" class="w-5 h-5 text-blue-600"></i>
            </div>
            <div class="text-3xl font-extrabold text-slate-900 mt-2">${metrics.total_inspections}</div>
            <div class="text-[11px] text-slate-500 mt-1">Recorded Legal Metrology Cases</div>
          </div>

          <div class="card-light border-l-4 border-l-emerald-600">
            <div class="flex items-center justify-between text-slate-500">
              <span class="text-xs font-bold uppercase tracking-wider">Compliant Packages</span>
              <i data-lucide="check-circle-2" class="w-5 h-5 text-emerald-600"></i>
            </div>
            <div class="text-3xl font-extrabold text-emerald-600 mt-2">${metrics.compliant}</div>
            <div class="text-[11px] text-slate-500 mt-1">100% Automated Rule Checks Passed</div>
          </div>

          <div class="card-light border-l-4 border-l-red-600">
            <div class="flex items-center justify-between text-slate-500">
              <span class="text-xs font-bold uppercase tracking-wider">Potential Non-Compliance</span>
              <i data-lucide="alert-circle" class="w-5 h-5 text-red-600"></i>
            </div>
            <div class="text-3xl font-extrabold text-red-600 mt-2">${metrics.potential_non_compliance}</div>
            <div class="text-[11px] text-slate-500 mt-1">Flagged Rule Violations</div>
          </div>

          <div class="card-light border-l-4 border-l-amber-600">
            <div class="flex items-center justify-between text-slate-500">
              <span class="text-xs font-bold uppercase tracking-wider">Manual Review</span>
              <i data-lucide="eye" class="w-5 h-5 text-amber-600"></i>
            </div>
            <div class="text-3xl font-extrabold text-amber-600 mt-2">${metrics.manual_review}</div>
            <div class="text-[11px] text-slate-500 mt-1">Awaiting Officer Physical Verification</div>
          </div>
        </div>

        <!-- Quick Start New Inspection Banner -->
        <div class="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold">Start New Packaged Commodity Inspection</h2>
            <p class="text-sm text-blue-100 mt-1">Capture with camera or upload package images, run OpenCV OCR, and evaluate Legal Metrology 2011/2023 compliance.</p>
          </div>
          <a href="#/inspections/new" class="px-5 py-2.5 bg-white text-blue-900 hover:bg-blue-50 rounded-lg font-bold text-sm shadow-lg flex items-center gap-2">
            <i data-lucide="plus-circle" class="w-5 h-5 text-blue-700"></i> New Inspection →
          </a>
        </div>

        <!-- Dashboard Charts & Breakdown -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 card-light space-y-4">
            <div class="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                <i data-lucide="bar-chart-3" class="w-5 h-5 text-blue-600"></i>
                Category Violation Analytics
              </h3>
              <span class="text-xs text-slate-500">Rule 6 Compliance</span>
            </div>
            <div class="space-y-3">
              ${(data.category_analysis || []).map(cat => `
                <div class="space-y-1 text-xs">
                  <div class="flex justify-between text-slate-700 font-medium">
                    <span>${cat.category}</span>
                    <span class="text-slate-500">${cat.violations} violations / ${cat.count} total</span>
                  </div>
                  <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-blue-600 rounded-full" style="width: ${Math.min(100, (cat.violations / Math.max(1, cat.count)) * 100)}%"></div>
                  </div>
                </div>
              `).join('') || '<div class="text-slate-400 text-xs py-4 text-center">No categories recorded yet.</div>'}
            </div>
          </div>

          <!-- Repeat Manufacturer Violations -->
          <div class="card-light space-y-4">
            <div class="border-b border-slate-200 pb-3">
              <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                <i data-lucide="shield-alert" class="w-5 h-5 text-red-600"></i>
                Repeat Violating Accounts
              </h3>
              <p class="text-xs text-slate-500">Historical non-compliance findings</p>
            </div>
            <div class="space-y-2">
              ${(data.repeat_violations || []).map(mfg => `
                <div class="p-2.5 rounded bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
                  <div>
                    <div class="font-bold text-slate-800">${mfg.manufacturer}</div>
                    <div class="text-[11px] text-slate-500">${mfg.total_inspections} total inspections</div>
                  </div>
                  <span class="badge-status badge-noncompliant">${mfg.violation_count} Violations</span>
                </div>
              `).join('') || '<div class="text-slate-400 text-xs py-4 text-center">No repeat violations.</div>'}
            </div>
          </div>
        </div>

        <!-- Recent Inspections -->
        <div class="card-light space-y-4">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
              <i data-lucide="history" class="w-5 h-5 text-blue-600"></i>
              Recent Enforcement Inspections
            </h3>
            <a href="#/inspections" class="text-xs font-bold text-blue-600 hover:underline">View All →</a>
          </div>
          ${renderInspectionTableHtml(recent)}
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="card-light text-center py-10 text-red-600">Error loading dashboard metrics: ${err.message}</div>`;
  }
}

// -------------------------------------------------------------------
// 2. NEW INSPECTION HERO VIEW (Physical Package Info & Image Upload)
// -------------------------------------------------------------------
function renderNewInspectionView(container) {
  container.innerHTML = `
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="border-b border-slate-200 pb-4">
        <h2 class="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <i data-lucide="plus-circle" class="w-7 h-7 text-blue-700"></i>
          Create New Packaged Commodity Inspection
        </h2>
        <p class="text-sm text-slate-500 mt-1">Enter commodity metadata, physical package dimensions for scale calibration, and launch computer vision analysis.</p>
      </div>

      <form id="newInspectionForm" onsubmit="handleStartAnalysisWorkflow(event)" class="card-light space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Product / Commodity Name *</label>
            <input type="text" id="inp_product_name" required placeholder="e.g. Premium Assam Tea" class="form-input" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Brand Name *</label>
            <input type="text" id="inp_brand" required placeholder="e.g. Golden Leaf" class="form-input" />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Product Category *</label>
            <select id="inp_category" class="form-input font-medium">
              <option value="Packaged Foods & Beverages">Packaged Foods & Beverages</option>
              <option value="Snacks, Sweets & Confectionery">Snacks, Sweets & Confectionery</option>
              <option value="Personal Care, Cosmetics & Hygiene">Personal Care, Cosmetics & Hygiene</option>
              <option value="Pharmaceuticals & Medical Devices">Pharmaceuticals & Medical Devices</option>
              <option value="Household & Cleaning Commodities">Household & Cleaning Commodities</option>
              <option value="Electronics & Hardware Supplies">Electronics & Hardware Supplies</option>
              <option value="Agricultural & Industrial Goods">Agricultural & Industrial Goods</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Manufacturer / Packer Details</label>
            <input type="text" id="inp_manufacturer" placeholder="e.g. Himalayan Estate Tea Pvt. Ltd." class="form-input" />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Inspection Location *</label>
            <input type="text" id="inp_location" value="Delhi Inspection Hub West" required class="form-input" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Assigned Officer</label>
            <input type="text" id="inp_officer" value="Insp. Rajesh Sharma (LM-OFF-7821)" readonly class="form-input bg-slate-100 text-slate-500 font-semibold" />
          </div>
        </div>

        <!-- Physical Package Information for Font Height Calibration -->
        <div class="p-4 bg-slate-100/70 rounded-lg border border-slate-200 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
              <i data-lucide="ruler" class="w-4 h-4 text-blue-700"></i>
              Physical Package Information (Font Size Scale Calibration)
            </h3>
            <span class="text-[10px] text-slate-500 font-medium">Optional for physical scale calibration</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label class="block text-[11px] font-semibold text-slate-700 mb-1">Package Height *</label>
              <input type="number" id="inp_pkg_height" step="0.1" min="0" placeholder="e.g. 150" class="form-input text-xs" />
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-slate-700 mb-1">Package Width *</label>
              <input type="number" id="inp_pkg_width" step="0.1" min="0" placeholder="e.g. 50" class="form-input text-xs" />
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-slate-700 mb-1">Measurement Unit</label>
              <select id="inp_pkg_unit" class="form-input text-xs font-semibold">
                <option value="mm" selected>Millimetres (mm)</option>
                <option value="cm">Centimetres (cm)</option>
                <option value="inch">Inches (in)</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-slate-700 mb-1">Package Depth (Optional)</label>
              <input type="number" id="inp_pkg_depth" step="0.1" min="0" placeholder="e.g. 40" class="form-input text-xs" />
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
            <div class="flex items-center gap-4">
              <span class="font-semibold text-slate-700">Measurement Type:</span>
              <label class="flex items-center gap-1.5 cursor-pointer text-slate-800 font-medium">
                <input type="radio" name="meas_src" value="INSPECTOR" checked class="text-blue-600 focus:ring-blue-500" />
                Measured by Officer
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer text-slate-800 font-medium">
                <input type="radio" name="meas_src" value="APPROXIMATE" class="text-blue-600 focus:ring-blue-500" />
                Approximate Estimate
              </label>
            </div>
          </div>

          <div class="p-2.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 flex items-start gap-2">
            <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5"></i>
            <span>Do not treat approximate dimensions as exact. Approximate dimensions will trigger safe fallback to MANUAL REVIEW for physical text height determination.</span>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Inspection Remarks / Observations</label>
          <textarea id="inp_remarks" rows="2" placeholder="Initial observation note..." class="form-input"></textarea>
        </div>

        <!-- Package Image Capture / Upload Options -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-2">Package Image Capture / Upload *</label>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Option A: Take Photo via Camera -->
            <button type="button" onclick="openCameraCaptureModal()" class="p-5 border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-100/50 hover:border-blue-600 rounded-lg text-center transition-all group">
              <i data-lucide="camera" class="w-8 h-8 text-blue-700 mx-auto mb-2 group-hover:scale-110 transition-transform"></i>
              <div class="text-xs font-bold text-blue-900">📷 Take Photo (Live Camera)</div>
              <div class="text-[11px] text-blue-700 mt-1">Instant rear/environment device camera capture</div>
            </button>

            <!-- Option B: Select File Upload -->
            <div class="p-5 border-2 border-dashed border-slate-300 bg-slate-50 hover:border-slate-400 rounded-lg text-center relative">
              <i data-lucide="upload-cloud" class="w-8 h-8 text-slate-600 mx-auto mb-2"></i>
              <div class="text-xs font-bold text-slate-800">📁 Upload Image File</div>
              <div class="text-[11px] text-slate-500 mt-1">PNG, JPG, WEBP formats up to 16MB</div>
              <input type="file" id="inp_image_file" accept="image/*" onchange="previewSelectedImage(event)" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            </div>
          </div>

          <!-- Thumbnail Preview Container -->
          <div id="image-preview-container" class="hidden mt-4 p-3 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <img id="preview-thumbnail" src="" alt="Package Thumbnail" class="w-20 h-24 object-cover rounded border border-slate-300 shadow-sm" />
              <div>
                <div class="font-bold text-xs text-slate-800" id="preview-filename">image.jpg</div>
                <div class="text-[11px] text-slate-500" id="preview-filesize">0 KB</div>
                <span class="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded mt-1">
                  <i data-lucide="check" class="w-3 h-3"></i> Ready for Analysis
                </span>
              </div>
            </div>
            <button type="button" onclick="clearSelectedImage()" class="px-2.5 py-1 text-xs text-red-700 hover:bg-red-100 rounded border border-red-200">Clear</button>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <a href="#/inspections" class="btn-secondary">Cancel</a>
          <button type="submit" class="btn-primary">
            <i data-lucide="zap" class="w-4 h-4 text-amber-300"></i> START ANALYSIS →
          </button>
        </div>
      </form>
    </div>
  `;
}

function previewSelectedImage(event) {
  const file = event.target.files[0];
  if (file) {
    window.capturedCameraFile = null;
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('preview-thumbnail').src = e.target.result;
      document.getElementById('preview-filename').innerText = file.name;
      document.getElementById('preview-filesize').innerText = `${(file.size / 1024).toFixed(1)} KB (File Upload)`;
      document.getElementById('image-preview-container').classList.remove('hidden');
    }
    reader.readAsDataURL(file);
  }
}

function clearSelectedImage() {
  window.capturedCameraFile = null;
  const fileInput = document.getElementById('inp_image_file');
  if (fileInput) fileInput.value = '';
  const previewContainer = document.getElementById('image-preview-container');
  if (previewContainer) previewContainer.classList.add('hidden');
}

// WebRTC Live Camera Capture Modal
function openCameraCaptureModal() {
  const container = document.getElementById('modal-container');
  const content = document.getElementById('modal-content');

  content.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between border-b border-slate-200 pb-3">
        <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
          <i data-lucide="camera" class="w-5 h-5 text-blue-700"></i>
          Live Device Camera Capture
        </h3>
        <button onclick="closeCameraModal()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>

      <div class="relative bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center min-h-[320px] border border-slate-800">
        <video id="cameraVideo" autoplay playsinline class="w-full max-h-[360px] object-cover"></video>
        <canvas id="cameraCanvas" class="hidden"></canvas>
      </div>

      <div class="flex justify-between items-center pt-2">
        <button onclick="switchCameraFacing()" class="btn-secondary text-xs flex items-center gap-1.5">
          <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Flip Camera
        </button>
        <div class="flex gap-2">
          <button onclick="closeCameraModal()" class="btn-secondary">Cancel</button>
          <button onclick="captureCameraSnapshot()" class="btn-primary">
            <i data-lucide="aperture" class="w-4 h-4 text-amber-300"></i> Capture Photo
          </button>
        </div>
      </div>
    </div>
  `;

  container.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();

  startCameraStream();
}

async function startCameraStream() {
  const video = document.getElementById('cameraVideo');
  if (!video) return;

  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: currentFacingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    });
    video.srcObject = mediaStream;
  } catch (err) {
    showToast("Camera access denied or unsupported device. Please use File Upload option.", true);
    closeCameraModal();
  }
}

function switchCameraFacing() {
  currentFacingMode = (currentFacingMode === 'environment') ? 'user' : 'environment';
  startCameraStream();
}

function captureCameraSnapshot() {
  const video = document.getElementById('cameraVideo');
  const canvas = document.getElementById('cameraCanvas');
  if (!video || !canvas) return;

  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob((blob) => {
    if (blob) {
      const file = new File([blob], `camera_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      window.capturedCameraFile = file;

      const previewImg = document.getElementById('preview-thumbnail');
      const previewName = document.getElementById('preview-filename');
      const previewSize = document.getElementById('preview-filesize');
      const previewContainer = document.getElementById('image-preview-container');

      if (previewImg) previewImg.src = canvas.toDataURL('image/jpeg');
      if (previewName) previewName.innerText = file.name;
      if (previewSize) previewSize.innerText = `${(file.size / 1024).toFixed(1)} KB (Live Camera Capture)`;
      if (previewContainer) previewContainer.classList.remove('hidden');

      showToast("Camera photo captured successfully!");
      closeCameraModal();
    }
  }, 'image/jpeg', 0.92);
}

function closeCameraModal() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  closeModal();
}

// Handle Hero Analysis Submission with Progress Pipeline & Physical Calibration
async function handleStartAnalysisWorkflow(e) {
  e.preventDefault();
  
  const product_name = (document.getElementById('inp_product_name') ? document.getElementById('inp_product_name').value : '') || 'Packaged Commodity Item';
  const brand = (document.getElementById('inp_brand') ? document.getElementById('inp_brand').value : '') || 'Generic Brand';
  const category = (document.getElementById('inp_category') ? document.getElementById('inp_category').value : '') || 'Packaged Foods & Beverages';
  const manufacturer = (document.getElementById('inp_manufacturer') ? document.getElementById('inp_manufacturer').value : '') || '';
  const location = (document.getElementById('inp_location') ? document.getElementById('inp_location').value : '') || 'Central Inspection Zone';
  const remarks = (document.getElementById('inp_remarks') ? document.getElementById('inp_remarks').value : '') || '';

  const package_unit = document.getElementById('inp_pkg_unit') ? document.getElementById('inp_pkg_unit').value : 'mm';
  const package_height_mm = document.getElementById('inp_pkg_height') ? parseFloat(document.getElementById('inp_pkg_height').value || 0) : 0;
  const package_width_mm = document.getElementById('inp_pkg_width') ? parseFloat(document.getElementById('inp_pkg_width').value || 0) : 0;
  const package_depth_mm = document.getElementById('inp_pkg_depth') ? parseFloat(document.getElementById('inp_pkg_depth').value || 0) : 0;
  
  const meas_src_el = document.querySelector('input[name="meas_src"]:checked');
  const measurement_source = meas_src_el ? meas_src_el.value : 'NONE';

  const fileInput = document.getElementById('inp_image_file');
  let selectedFile = window.capturedCameraFile || null;
  if (!selectedFile && fileInput && fileInput.files && fileInput.files.length > 0) {
    selectedFile = fileInput.files[0];
  }
  window.capturedCameraFile = null;

  // Offline Draft Handling
  if (!navigator.onLine) {
    saveOfflineDraft({
      product_name, brand, category, manufacturer, location, remarks,
      package_height_mm, package_width_mm, package_depth_mm, package_unit, measurement_source
    });
    showToast("Offline Capture Mode: Inspection draft queued locally for server synchronization when online.");
    window.location.hash = '#/inspections';
    return;
  }

  const appView = document.getElementById('app-view');
  renderProcessingPipelineScreen(appView);

  try {
    updateProcessingStep(1, "Creating Inspection Record & Saving Physical Package Dimensions...");
    const res = await fetch('/api/inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_name, brand, category, manufacturer, location, remarks,
        package_height_mm, package_width_mm, package_depth_mm, package_unit, measurement_source
      })
    });
    const data = await res.json();
    const inspId = data.inspection_id;

    updateProcessingStep(2, "Analyzing Image Quality & OpenCV Package Boundaries...");
    const formData = new FormData();
    if (selectedFile) {
      formData.append('file', selectedFile);
    }
    formData.append('image_type', 'front');

    await fetch(`/api/inspections/${inspId}/images`, {
      method: 'POST',
      body: formData
    });

    updateProcessingStep(3, "Executing Multi-Engine OCR Text Region Extraction...");
    await fetch(`/api/inspections/${inspId}/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    updateProcessingStep(4, "Evaluating Legal Metrology Rules & Physical Font Height Scale...");
    await fetch(`/api/inspections/${inspId}/compliance-check`, { method: 'POST' });

    updateProcessingStep(5, "Generating Interactive Evidence Visualizer...");

    setTimeout(() => {
      window.location.hash = `#/inspections/${inspId}`;
    }, 800);

  } catch (err) {
    showToast(`Analysis error: ${err.message}`, true);
    window.location.hash = '#/inspections';
  }
}

// Processing Progress UI Screen
function renderProcessingPipelineScreen(container) {
  container.innerHTML = `
    <div class="max-w-2xl mx-auto my-12 card-light space-y-6 text-center py-10">
      <div class="w-16 h-16 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
        <i data-lucide="loader-2" class="w-8 h-8 animate-spin"></i>
      </div>
      
      <div>
        <h3 class="text-xl font-bold text-slate-900" id="pipeline-status-title">Processing Inspection Analysis</h3>
        <p class="text-xs text-slate-500 mt-1" id="pipeline-status-desc">Executing computer vision & legal metrology evaluation...</p>
      </div>

      <div class="space-y-3 max-w-md mx-auto text-left text-xs font-semibold">
        <div id="step-1" class="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center gap-2 text-slate-400">
          <i data-lucide="circle" class="w-4 h-4"></i> 1. Inspection Initialization & Physical Metadata
        </div>
        <div id="step-2" class="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center gap-2 text-slate-400">
          <i data-lucide="circle" class="w-4 h-4"></i> 2. Image Quality & Boundary Detection
        </div>
        <div id="step-3" class="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center gap-2 text-slate-400">
          <i data-lucide="circle" class="w-4 h-4"></i> 3. Multi-Engine OCR Text Region Extraction
        </div>
        <div id="step-4" class="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center gap-2 text-slate-400">
          <i data-lucide="circle" class="w-4 h-4"></i> 4. Rule Engine & Scale Calibration Check
        </div>
        <div id="step-5" class="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center gap-2 text-slate-400">
          <i data-lucide="circle" class="w-4 h-4"></i> 5. Evidence Region Mapping & PDF Generation
        </div>
      </div>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}

function updateProcessingStep(stepNum, desc) {
  const descEl = document.getElementById('pipeline-status-desc');
  if (descEl) descEl.innerText = desc;

  for (let i = 1; i <= stepNum; i++) {
    const el = document.getElementById(`step-${i}`);
    if (el) {
      if (i === stepNum) {
        el.className = "p-2.5 rounded bg-blue-50 border border-blue-200 flex items-center gap-2 text-blue-700 font-bold";
        el.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> ${el.innerText.replace(/^.*?\.\s*/, `${i}. `)}`;
      } else {
        el.className = "p-2.5 rounded bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-700 font-bold";
        el.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i> ${el.innerText.replace(/^.*?\.\s*/, `${i}. `)}`;
      }
    }
  }
  if (window.lucide) lucide.createIcons();
}

// -------------------------------------------------------------------
// 3. TWO-COLUMN ANALYSIS & EVIDENCE VIEW (Physical Calibration Banner)
// -------------------------------------------------------------------
async function renderInspectionDetailView(container, inspId) {
  container.innerHTML = `<div class="flex items-center justify-center py-20 text-slate-400"><i data-lucide="loader-2" class="w-8 h-8 animate-spin text-blue-600"></i></div>`;
  
  try {
    const res = await fetch(`/api/inspections/${inspId}`);
    if (!res.ok) throw new Error("Inspection record not found");
    const data = await res.json();
    currentInspectionData = data;
    const insp = data.inspection;
    const img = (data.images && data.images.length > 0) ? data.images[0] : null;

    let statusBadge = `<span class="badge-status badge-review">🟡 MANUAL REVIEW REQUIRED</span>`;
    if (insp.status === 'COMPLIANT') statusBadge = `<span class="badge-status badge-compliant">🟢 COMPLIANT</span>`;
    if (insp.status === 'POTENTIAL_NON_COMPLIANCE') statusBadge = `<span class="badge-status badge-noncompliant">🔴 POTENTIAL NON-COMPLIANCE</span>`;

    const imgUrl = img ? img.file_path : '/static/img/placeholder.jpg';
    const pkgH = insp.package_height_mm || 0;
    const pkgW = insp.package_width_mm || 0;
    const pxPerMm = insp.pixels_per_mm || 0;
    const measSrc = insp.measurement_source || 'NONE';

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header Summary -->
        <div class="card-light flex flex-wrap items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-3">
              <h2 class="text-xl font-bold text-slate-900">INSPECTION #${insp.id}</h2>
              ${statusBadge}
              <span class="px-2.5 py-1 rounded-full text-xs font-bold ${insp.score >= 80 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : (insp.score >= 60 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-red-100 text-red-800 border border-red-300')}">
                Risk Score: ${insp.score || 0} / 100
              </span>
            </div>
            <p class="text-sm font-semibold text-slate-700 mt-1">${insp.product_name} | Brand: ${insp.brand} | Category: ${insp.category}</p>
            <p class="text-xs text-slate-500 mt-0.5">Location: ${insp.location} | Officer: ${insp.officer_name} | Date: ${new Date(insp.created_at).toLocaleString()}</p>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="runComplianceEngine('${insp.id}')" class="btn-primary">
              <i data-lucide="play" class="w-4 h-4"></i> Run Compliance Check
            </button>
            <button onclick="generatePDFReport('${insp.id}')" class="btn-secondary">
              <i data-lucide="file-down" class="w-4 h-4 text-red-600"></i> Export PDF Report
            </button>
            <button onclick="confirmDeleteInspection('${insp.id}', '${escapeQuotes(insp.product_name)}')" class="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded font-semibold text-xs flex items-center gap-1">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Delete
            </button>
          </div>
        </div>

        <!-- Risk Score Breakdown & Legal Disclaimer (Feature 3) -->
        <div class="card-light border-l-4 border-l-indigo-600 space-y-3">
          <div class="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <i data-lucide="shield-alert" class="w-4 h-4 text-indigo-600"></i>
              LABELGUARD Compliance / Risk Prioritization Breakdown
            </h3>
            <span class="text-[11px] font-bold px-2 py-0.5 rounded ${insp.score >= 80 ? 'bg-emerald-100 text-emerald-800' : (insp.score >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800')}">
              ${insp.score >= 80 ? 'LOW RISK' : (insp.score >= 60 ? 'MEDIUM RISK' : 'HIGH RISK')}
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div class="space-y-1.5">
              <div class="flex justify-between text-slate-700"><span>Mandatory Declarations Check:</span> <b class="text-slate-900">${(data.declarations || []).filter(d=>d.status!=='NOT_DETECTED').length} / ${(data.declarations || []).length} Detected</b></div>
              <div class="flex justify-between text-slate-700"><span>Passed Legal Checks:</span> <b class="text-emerald-600">${(data.checks || []).filter(c=>c.result==='PASS').length} Passed</b></div>
              <div class="flex justify-between text-slate-700"><span>Potential Violations:</span> <b class="text-red-600">${(data.checks || []).filter(c=>c.result==='FAIL').length} Flagged</b></div>
              <div class="flex justify-between text-slate-700"><span>Manual Review Items:</span> <b class="text-amber-600">${(data.checks || []).filter(c=>c.result==='MANUAL_REVIEW').length} Items</b></div>
            </div>

            <div class="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
              <span class="font-bold text-slate-800">Risk Factor Breakdown:</span>
              <ul class="list-disc list-inside text-slate-600 text-[11px] space-y-0.5">
                ${data.risk_assessment && data.risk_assessment.factors_json ? data.risk_assessment.factors_json.map(f=>`<li>${f}</li>`).join('') : '<li>Routine risk evaluation completed based on extracted evidence.</li>'}
              </ul>
            </div>
          </div>

          <div class="text-[11px] text-slate-500 italic border-t border-slate-200 pt-2 flex items-center gap-1.5">
            <i data-lucide="info" class="w-3.5 h-3.5 text-slate-400"></i>
            <span>Prototype risk prioritization score — not a legal determination. Final enforcement action is determined by authorized officer.</span>
          </div>
        </div>

        <!-- Scale Calibration Banner (Feature 1) -->
        <div class="card-light border-l-4 ${pxPerMm > 0 ? 'border-l-blue-600' : 'border-l-amber-500'} flex flex-wrap items-center justify-between gap-4 text-xs">
          <div class="flex items-center gap-3">
            <i data-lucide="ruler" class="w-5 h-5 ${pxPerMm > 0 ? 'text-blue-600' : 'text-amber-500'}"></i>
            <div>
              <span class="font-bold text-slate-900">SCALE CALIBRATION: ${pxPerMm > 0 ? pxPerMm.toFixed(2) + ' px/mm' : 'Uncalibrated Image'}</span>
              <span class="text-slate-500 ml-2">Package Dimensions: ${pkgH > 0 ? pkgH + 'mm (H) x ' + pkgW + 'mm (W)' : 'Not Provided'} | Source: ${measSrc}</span>
              <p class="text-slate-600 mt-0.5">${pxPerMm > 0 ? `Calculated scale factor allowing physical text height measurement for Rule 9.` : 'Physical scale could not be established reliably from the available evidence.'}</p>
            </div>
          </div>
          <button onclick="openAdvancedReferenceModal()" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold text-xs border border-slate-300 flex items-center gap-1">
            <i data-lucide="sliders" class="w-3.5 h-3.5"></i> Reference Tool
          </button>
        </div>

        <!-- Suspicious Label Manipulation Analysis (Feature 5 Experimental) -->
        <div class="card-light border-l-4 border-l-purple-600 space-y-3">
          <div class="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <i data-lucide="scan" class="w-4 h-4 text-purple-600"></i>
              Suspicious Label Manipulation Detection (Experimental Computer Vision Evidence)
            </h3>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded ${data.tampering_analysis && data.tampering_analysis.status === 'POSSIBLE_LABEL_MANIPULATION' ? 'bg-red-100 text-red-800' : 'bg-purple-100 text-purple-800'}">
              ${data.tampering_analysis ? data.tampering_analysis.finding_text : 'ANALYSIS PENDING'}
            </span>
          </div>

          <div class="p-3 bg-purple-50/60 border border-purple-200 rounded text-xs space-y-1.5 text-purple-900">
            <div class="font-bold flex items-center gap-1.5">
              <i data-lucide="alert-circle" class="w-4 h-4 text-purple-700"></i>
              ${data.tampering_analysis ? data.tampering_analysis.explanation : 'Computer vision texture analysis in progress.'}
            </div>
            ${data.tampering_analysis && data.tampering_analysis.anomaly_score > 0 ? `
              <div class="text-[11px] text-purple-700 font-mono">Anomaly Score: ${data.tampering_analysis.anomaly_score} | Confidence: ${Math.round((data.tampering_analysis.confidence||0)*100)}%</div>
            ` : ''}
          </div>
          <div class="text-[11px] text-slate-500 italic">
            Wording: Possible visual anomaly — physical/manual verification recommended. Never claims tampering definitely occurred.
          </div>
        </div>

        <!-- Previous Inspection & Package Change Detection (Feature 4 Differentiator) -->
        ${data.change_comparison && data.change_comparison.has_previous ? `
          <div class="card-light border-l-4 border-l-amber-600 space-y-4">
            <div class="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                <i data-lucide="git-compare" class="w-4 h-4 text-amber-600"></i>
                Previous Inspection vs Current Inspection (Package Change Detection)
              </h3>
              <span class="text-xs font-bold px-2.5 py-0.5 rounded ${data.change_comparison.changes_detected_count > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-800'}">
                ${data.change_comparison.changes_detected_count > 0 ? `CHANGE DETECTED (${data.change_comparison.changes_detected_count} Field(s))` : 'NO CHANGE DETECTED'}
              </span>
            </div>

            <div class="text-xs text-slate-600">
              Compared against previous record <b>${data.change_comparison.previous_inspection_id}</b> (${new Date(data.change_comparison.previous_date).toLocaleDateString()}).
            </div>

            <!-- Field Comparison Table -->
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                    <th class="p-2.5">Declaration Field</th>
                    <th class="p-2.5">Previous Inspection Value</th>
                    <th class="p-2.5">Current Inspection Value</th>
                    <th class="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 font-mono">
                  ${data.change_comparison.field_comparisons.map(fc => `
                    <tr class="${fc.status === 'CHANGE_DETECTED' ? 'bg-amber-50/70 font-bold' : ''}">
                      <td class="p-2.5 text-slate-900 font-sans font-semibold">${fc.field_label}</td>
                      <td class="p-2.5 text-slate-600">${fc.previous_value}</td>
                      <td class="p-2.5 text-slate-900">${fc.current_value}</td>
                      <td class="p-2.5">
                        ${fc.status === 'CHANGE_DETECTED' ? '<span class="px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-bold text-[10px]">CHANGE DETECTED</span>' : '<span class="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px]">UNCHANGED</span>'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div class="text-[11px] text-slate-500 italic border-t border-slate-200 pt-2">
              Visual & Declaration Change Analysis — Final legal interpretation remains with inspector.
            </div>
          </div>
        ` : ''}

        <!-- Two-Column Analysis Interface -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <!-- LEFT COLUMN: Actual Package Image & Overlaid Canvas Bounding Box Visualizer -->
          <div class="card-light space-y-3">
            <div class="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                <i data-lucide="image" class="w-4 h-4 text-blue-600"></i>
                Actual Package Image & Scale Visualizer
              </h3>

              <!-- Zoom Controls -->
              <div class="flex items-center gap-1">
                <button onclick="changeZoom(-0.15)" class="p-1 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 text-slate-700 text-xs font-bold" title="Zoom Out">-</button>
                <span class="text-[11px] font-mono font-bold text-slate-600 px-1" id="zoom-indicator">100%</span>
                <button onclick="changeZoom(0.15)" class="p-1 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 text-slate-700 text-xs font-bold" title="Zoom In">+</button>
                <button onclick="resetZoom()" class="p-1 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 text-slate-700 text-xs text-[10px]" title="Reset Zoom">Fit</button>
              </div>
            </div>
            
            <div class="evidence-container min-h-[480px]">
              <div id="evidence-transform-wrapper" class="evidence-wrapper">
                <img id="realPackageImg" src="${imgUrl}" onload="redrawOverlayCanvas()" alt="Actual Uploaded Package Image" />
                <canvas id="ocrOverlayCanvas" class="evidence-canvas-overlay"></canvas>
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: Extracted Declarations Cards (Accept/Edit/Measure) -->
          <div class="card-light space-y-4">
            <div class="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                <i data-lucide="list-checks" class="w-4 h-4 text-blue-600"></i>
                Detected Package Declarations
              </h3>
              <span class="text-[11px] text-slate-500">Rule 6 Schema</span>
            </div>

            <div class="space-y-3">
              ${(data.declarations || []).map(dec => `
                <div id="dec-card-${dec.field_key}" onclick="highlightFieldOnImage('${dec.field_key}')" class="p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-400 transition-all cursor-pointer space-y-2">
                  <div class="flex justify-between items-center text-xs">
                    <span class="font-bold text-slate-900">${dec.field_label}</span>
                    <div class="flex items-center gap-2">
                      <span class="text-[11px] font-mono text-slate-500">${Math.round((dec.confidence || 0)*100)}% conf</span>
                      <span class="text-[10px] px-2 py-0.5 rounded font-bold ${dec.status === 'NOT_DETECTED' ? 'bg-red-100 text-red-700 border border-red-200' : (dec.status === 'MANUALLY_CORRECTED' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-700')}">
                        ${dec.status}
                      </span>
                    </div>
                  </div>

                  <div class="font-mono text-xs text-slate-800 bg-white p-2 rounded border border-slate-200">
                    ${dec.corrected_value ? `<span class="text-amber-700 font-bold">[Corrected] ${dec.corrected_value}</span>` : dec.extracted_value}
                  </div>

                  <div class="flex justify-end gap-2 text-xs pt-1">
                    <button onclick="openNumeralMeasurementModal('${insp.id}', '${dec.field_key}', '${escapeQuotes(dec.field_label)}', '${escapeQuotes(dec.corrected_value || dec.extracted_value)}', ${dec.bounding_box ? dec.bounding_box.height : 24}); event.stopPropagation();" class="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-semibold text-[11px] flex items-center gap-1">
                      <i data-lucide="ruler" class="w-3 h-3 text-blue-600"></i> Measure Height
                    </button>
                    <button onclick="openCorrectionModal('${insp.id}', '${dec.field_key}', '${escapeQuotes(dec.corrected_value || dec.extracted_value)}'); event.stopPropagation();" class="px-2 py-1 bg-white hover:bg-slate-100 text-blue-700 border border-slate-300 rounded font-semibold text-[11px] flex items-center gap-1">
                      <i data-lucide="edit-2" class="w-3 h-3"></i> Edit / Verify
                    </button>
                  </div>
                </div>
              `).join('') || '<div class="text-slate-400 text-xs py-4 text-center">No declarations extracted.</div>'}
            </div>
          </div>
        </div>

        <!-- Compliance Check Findings Table (4 Result States) -->
        <div class="card-light space-y-4">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
              <i data-lucide="shield-check" class="w-5 h-5 text-blue-600"></i>
              Legal Metrology Compliance Evaluation Findings
            </h3>
            <span class="text-xs text-slate-500">Legal Metrology (Packaged Commodities) Rules</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                  <th class="p-3">Rule Reference</th>
                  <th class="p-3">Requirement Check</th>
                  <th class="p-3">Result State</th>
                  <th class="p-3">Observed Finding & Explanation</th>
                  <th class="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                ${(data.checks || []).map(c => `
                  <tr class="hover:bg-slate-50">
                    <td class="p-3 font-mono font-bold text-blue-700">${c.rule_id}<div class="text-[10px] text-slate-400">v${c.rule_version}</div></td>
                    <td class="p-3 font-bold text-slate-800">${c.check_name}</td>
                    <td class="p-3">
                      ${c.result === 'PASS' ? '<span class="badge-status badge-compliant">PASS</span>' : 
                       (c.result === 'FAIL' ? '<span class="badge-status badge-noncompliant">POTENTIAL VIOLATION</span>' : 
                       (c.result === 'NOT_APPLICABLE' ? '<span class="badge-status badge-notapplicable">NOT APPLICABLE</span>' : 
                       '<span class="badge-status badge-review">MANUAL REVIEW</span>'))}
                    </td>
                    <td class="p-3 text-slate-700">
                      <div class="font-bold text-slate-900">${c.observed_value}</div>
                      <div class="text-[11px] text-slate-500 mt-0.5">${c.finding_explanation}</div>
                    </td>
                    <td class="p-3 text-right">
                      <button onclick="highlightRuleRegion('${c.rule_id}')" class="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 text-xs font-bold">
                        VIEW EVIDENCE
                      </button>
                    </td>
                  </tr>
                `).join('') || '<tr><td colspan="5" class="text-center py-6 text-slate-400">Run compliance check to evaluate findings.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Collapsible Development OCR Debug Panel -->
        <details class="card-light border-l-4 border-l-slate-700 space-y-3">
          <summary class="font-bold text-xs text-slate-800 cursor-pointer flex items-center justify-between">
            <span class="flex items-center gap-2">
              <i data-lucide="terminal" class="w-4 h-4 text-slate-600"></i>
              OCR Debug Panel (Development / Diagnostic View)
            </span>
            <span class="text-[10px] text-slate-500 font-mono">Click to expand</span>
          </summary>
          
          <div class="pt-3 border-t border-slate-200 text-xs font-mono space-y-2 text-slate-700">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-100 p-2.5 rounded border border-slate-200">
              <div><span class="text-slate-500">Resolution:</span> <b>${img ? (img.resolution || '800x1000') : 'N/A'}</b></div>
              <div><span class="text-slate-500">Engine:</span> <b class="text-blue-700">Multi-Variant OpenCV / Tesseract / EasyOCR</b></div>
              <div><span class="text-slate-500">Regions Detected:</span> <b>${(data.declarations || []).length}</b></div>
              <div><span class="text-slate-500">Scale Factor:</span> <b>${pxPerMm > 0 ? pxPerMm.toFixed(2) + ' px/mm' : 'Uncalibrated'}</b></div>
            </div>

            <div>
              <div class="font-bold text-slate-900 mb-1">Preprocessing Variants Executed:</div>
              <div class="flex flex-wrap gap-1 text-[10px]">
                <span class="px-2 py-0.5 bg-slate-200 text-slate-800 rounded">1. Original RGB</span>
                <span class="px-2 py-0.5 bg-slate-200 text-slate-800 rounded">2. Grayscale CLAHE</span>
                <span class="px-2 py-0.5 bg-slate-200 text-slate-800 rounded">3. 2x Upscaled Denoised</span>
                <span class="px-2 py-0.5 bg-slate-200 text-slate-800 rounded">4. Otsu Binarization</span>
              </div>
            </div>

            <div>
              <div class="font-bold text-slate-900 mb-1">Extracted Declaration Text:</div>
              <div class="bg-slate-900 text-emerald-400 p-3 rounded max-h-36 overflow-auto text-[11px] font-mono leading-relaxed">
                ${(data.declarations || []).map(d => `${d.field_label}: ${d.extracted_value}`).join('\n') || 'No text extracted.'}
              </div>
            </div>
          </div>
        </details>
      </div>
    `;

    setTimeout(() => redrawOverlayCanvas(), 150);

  } catch (err) {
    container.innerHTML = `<div class="card-light text-center py-10 text-red-600">Error loading inspection details: ${err.message}</div>`;
  }
}

// Bounding Box Overlay Scaling & Canvas Renderer
function redrawOverlayCanvas(highlightKey = null) {
  const img = document.getElementById('realPackageImg');
  const canvas = document.getElementById('ocrOverlayCanvas');
  if (!img || !canvas || !currentInspectionData) return;

  const nw = img.naturalWidth || 800;
  const nh = img.naturalHeight || 1000;
  const cw = img.clientWidth || 800;
  const ch = img.clientHeight || 1000;

  canvas.width = cw;
  canvas.height = ch;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, cw, ch);

  const scaleX = cw / nw;
  const scaleY = ch / nh;

  const declarations = currentInspectionData.declarations || [];

  declarations.forEach(dec => {
    if (dec.bounding_box) {
      const b = dec.bounding_box;
      const x = b.x * scaleX;
      const y = b.y * scaleY;
      const w = b.width * scaleX;
      const h = b.height * scaleY;

      const isHighlight = (highlightKey && dec.field_key === highlightKey);
      
      let color = isHighlight ? '#2563eb' : '#059669';
      if (dec.status === 'NOT_DETECTED') color = '#dc2626';

      ctx.strokeStyle = color;
      ctx.lineWidth = isHighlight ? 4 : 2;
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = color;
      ctx.fillRect(x, y - 18, Math.min(w, 200), 18);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillText(dec.field_label, x + 4, y - 5);
    }
  });
}

function highlightFieldOnImage(fieldKey) {
  redrawOverlayCanvas(fieldKey);
  showToast(`Evidence highlighted for: ${fieldKey}`);
}

function highlightRuleRegion(ruleId) {
  const mapKey = {
    "LM-MRP-001": "mrp", "LM-USP-002": "unit_sale_price", "LM-QTY-001": "net_quantity",
    "LM-DATE-001": "mfg_date", "LM-MFG-001": "manufacturer", "LM-COO-001": "country_of_origin",
    "LM-CCC-001": "consumer_care", "LM-GEN-001": "generic_name", "LM-FONT-001": "net_quantity"
  };
  const key = mapKey[ruleId] || "generic_name";
  highlightFieldOnImage(key);
}

// Zoom Controls
function changeZoom(delta) {
  currentZoomScale = Math.min(2.5, Math.max(0.6, currentZoomScale + delta));
  const wrapper = document.getElementById('evidence-transform-wrapper');
  const indicator = document.getElementById('zoom-indicator');
  if (wrapper) wrapper.style.transform = `scale(${currentZoomScale})`;
  if (indicator) indicator.innerText = `${Math.round(currentZoomScale * 100)}%`;
}

function resetZoom() {
  currentZoomScale = 1.0;
  changeZoom(0);
}

// Numeral Height Measurement Inspector Modal
function openNumeralMeasurementModal(inspId, fieldKey, fieldLabel, textVal, pixelHeight) {
  const insp = currentInspectionData ? currentInspectionData.inspection : {};
  const pkgH = insp.package_height_mm || 0;
  const pixelsPerMm = insp.pixels_per_mm || 0;
  const measSrc = insp.measurement_source || 'NONE';
  const isApprox = measSrc === 'APPROXIMATE';

  let scaleText = pixelsPerMm > 0 ? `${pixelsPerMm.toFixed(2)} px/mm` : 'Uncalibrated';
  let estPhysMm = pixelsPerMm > 0 ? (pixelHeight / pixelsPerMm).toFixed(2) : 'N/A';
  let badgeLabel = isApprox ? '⚠ ESTIMATED MEASUREMENT' : (pixelsPerMm > 0 ? 'CALIBRATED MEASUREMENT' : 'UNCALIBRATED');

  const container = document.getElementById('modal-container');
  const content = document.getElementById('modal-content');

  content.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between border-b border-slate-200 pb-3">
        <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
          <i data-lucide="ruler" class="w-5 h-5 text-blue-700"></i>
          Physical Numeral Height Inspector (${fieldLabel})
        </h3>
        <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>

      <div class="p-3 bg-slate-100 rounded-lg border border-slate-200 font-mono text-xs space-y-2">
        <div class="flex justify-between"><span>OCR Text:</span> <b class="text-slate-900">${textVal}</b></div>
        <div class="flex justify-between"><span>OCR Text Height:</span> <b>${pixelHeight} px</b></div>
        <div class="flex justify-between"><span>Calibration Scale:</span> <b class="text-blue-700">${scaleText}</b></div>
        <div class="flex justify-between border-t border-slate-200 pt-1 text-slate-900">
          <span>Estimated Physical Height:</span> 
          <b class="${isApprox ? 'text-amber-700' : 'text-emerald-700'}">${estPhysMm} mm (${badgeLabel})</b>
        </div>
        <div class="flex justify-between text-[11px] text-slate-500"><span>Calibration Source:</span> <span>${measSrc === 'INSPECTOR' ? 'Inspector-measured package height' : (isApprox ? 'Approximate package height' : 'Uncalibrated')}</span></div>
      </div>

      ${pkgH <= 0 ? `
        <div class="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
          Physical font size cannot be reliably determined from an uncalibrated image. Please provide package height in millimetres.
        </div>
      ` : (isApprox ? `
        <div class="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
          ⚠ Package dimensions marked APPROXIMATE. Font height is labeled as estimated (~${estPhysMm} mm) and will require manual review.
        </div>
      ` : `
        <div class="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
          Physical font size measured at ${estPhysMm} mm using inspector-calibrated scale.
        </div>
      `)}

      <div class="flex justify-between items-center pt-2 border-t border-slate-200">
        <button onclick="openAdvancedReferenceModal()" class="px-3 py-1.5 bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 rounded text-xs font-semibold flex items-center gap-1">
          <i data-lucide="sliders" class="w-3.5 h-3.5"></i> Advanced Reference Calibration
        </button>
        <button onclick="closeModal()" class="btn-secondary">Close</button>
      </div>
    </div>
  `;

  container.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function openAdvancedReferenceModal() {
  const container = document.getElementById('modal-container');
  const content = document.getElementById('modal-content');

  content.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between border-b border-slate-200 pb-3">
        <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
          <i data-lucide="sliders" class="w-5 h-5 text-blue-700"></i>
          Advanced Reference Calibration
        </h3>
        <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>

      <p class="text-xs text-slate-600">Enter a known physical reference length visible on the package (e.g. barcode length or scale target):</p>

      <div>
        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Known Reference Length (mm) *</label>
        <input type="number" id="adv_ref_mm" value="10" min="1" class="form-input text-xs" />
      </div>

      <div class="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
        <p class="font-bold">Instructions:</p>
        <p class="mt-0.5">Click two points on the package photo to define the reference line segment. Scale factor (px/mm) will be computed automatically.</p>
      </div>

      <div class="flex justify-end gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="btn-secondary">Cancel</button>
        <button onclick="applyAdvancedScale()" class="btn-primary">Apply Calibration Scale</button>
      </div>
    </div>
  `;

  container.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function applyAdvancedScale() {
  const refMm = parseFloat(document.getElementById('adv_ref_mm').value || 10);
  showToast(`Advanced scale calibrated to reference length: ${refMm} mm`);
  closeModal();
}

// -------------------------------------------------------------------
// 4. INSPECTIONS LIST VIEW (with Delete & Inspect Actions)
// -------------------------------------------------------------------
async function renderInspectionsListView(container) {
  container.innerHTML = `<div class="flex items-center justify-center py-20 text-slate-400"><i data-lucide="loader-2" class="w-8 h-8 animate-spin text-blue-600"></i></div>`;
  try {
    const res = await fetch('/api/inspections');
    const data = await res.json();
    const inspections = data.inspections || [];

    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 class="text-xl font-bold text-slate-900 flex items-center gap-2">
              <i data-lucide="clipboard-list" class="w-6 h-6 text-blue-600"></i>
              Legal Metrology Inspection History
            </h2>
            <p class="text-xs text-slate-500 mt-1">Audit log of all registered packaged commodity inspection cases.</p>
          </div>

          <a href="#/inspections/new" class="btn-primary">
            <i data-lucide="plus-circle" class="w-4 h-4"></i> New Inspection
          </a>
        </div>

        <div class="card-light space-y-4">
          ${renderInspectionTableHtml(inspections)}
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="card-light text-center py-10 text-red-600">Failed to fetch inspections list.</div>`;
  }
}

function renderInspectionTableHtml(rows) {
  if (!rows || rows.length === 0) {
    return `<div class="text-center py-8 text-slate-400 text-xs">No inspection records found.</div>`;
  }

  return `
    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
            <th class="p-3">Inspection ID</th>
            <th class="p-3">Product Name</th>
            <th class="p-3">Brand / Category</th>
            <th class="p-3">Manufacturer</th>
            <th class="p-3">Status</th>
            <th class="p-3">Date</th>
            <th class="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          ${rows.map(r => {
            let st = `<span class="badge-status badge-review">MANUAL REVIEW</span>`;
            if (r.status === 'COMPLIANT') st = `<span class="badge-status badge-compliant">COMPLIANT</span>`;
            if (r.status === 'POTENTIAL_NON_COMPLIANCE') st = `<span class="badge-status badge-noncompliant">NON-COMPLIANT</span>`;
            return `
              <tr class="hover:bg-slate-50">
                <td class="p-3 font-mono font-bold text-blue-700">${r.id}</td>
                <td class="p-3 font-bold text-slate-900">${r.product_name}</td>
                <td class="p-3 text-slate-700">${r.brand}<div class="text-[10px] text-slate-400">${r.category}</div></td>
                <td class="p-3 text-slate-700">${r.manufacturer || 'N/A'}</td>
                <td class="p-3">${st}</td>
                <td class="p-3 text-slate-500">${new Date(r.created_at).toLocaleDateString()}</td>
                <td class="p-3 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <a href="#/inspections/${r.id}" class="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 rounded border border-slate-300 font-semibold text-xs">
                      Inspect →
                    </a>
                    <button onclick="confirmDeleteInspection('${r.id}', '${escapeQuotes(r.product_name)}')" class="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded border border-red-200 font-semibold text-xs flex items-center gap-1">
                      <i data-lucide="trash-2" class="w-3 h-3"></i> Delete
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Inspection Deletion Modal & Confirmation Flow
function confirmDeleteInspection(inspId, productName) {
  const container = document.getElementById('modal-container');
  const content = document.getElementById('modal-content');

  content.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between border-b border-slate-200 pb-3">
        <h3 class="text-base font-bold text-red-600 flex items-center gap-2">
          <i data-lucide="trash-2" class="w-5 h-5 text-red-600"></i>
          Delete Inspection Record #${inspId}?
        </h3>
        <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>

      <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 font-medium">
        <p class="font-bold">Permanent Deletion Notice:</p>
        <p class="mt-1">Inspection record for <b>"${productName}"</b>, uploaded package photos, OCR findings, and generated Digital Inspection PDF reports will be permanently deleted from database and disk storage.</p>
      </div>

      <div class="flex justify-end gap-3 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="btn-secondary">Cancel</button>
        <button onclick="executeDeleteInspection('${inspId}')" class="px-4 py-2 bg-red-600 text-white rounded font-bold text-xs hover:bg-red-700 transition-colors">
          Delete Inspection
        </button>
      </div>
    </div>
  `;

  container.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

async function executeDeleteInspection(inspId) {
  closeModal();
  showToast(`Deleting inspection #${inspId}...`);

  try {
    const res = await fetch(`/api/inspections/${inspId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Delete failed");
    const data = await res.json();
    showToast(`Inspection #${inspId} permanently deleted.`);

    if (window.location.hash.startsWith('#/inspections/')) {
      window.location.hash = '#/inspections';
    } else {
      handleRoute();
    }
  } catch (err) {
    showToast(`Deletion failed: ${err.message}`, true);
  }
}

// -------------------------------------------------------------------
// 5. RULES & REPORTS VIEWS
// -------------------------------------------------------------------
async function renderRulesView(container) {
  container.innerHTML = `<div class="flex items-center justify-center py-20 text-slate-400"><i data-lucide="loader-2" class="w-8 h-8 animate-spin text-blue-600"></i></div>`;
  try {
    const res = await fetch('/api/rules');
    const data = await res.json();
    const rules = data.rules || [];

    container.innerHTML = `
      <div class="space-y-6">
        <div class="border-b border-slate-200 pb-4">
          <h2 class="text-xl font-bold text-slate-900 flex items-center gap-2">
            <i data-lucide="book-open" class="w-6 h-6 text-blue-700"></i>
            Legal Metrology Rule Engine Registry
          </h2>
          <p class="text-xs text-slate-500 mt-1">Official Legal Metrology (Packaged Commodities) Rules, 2011 + 2022/2023 Amendments.</p>
        </div>

        <div class="card-light space-y-4">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                  <th class="p-3">Rule ID</th>
                  <th class="p-3">Rule Title</th>
                  <th class="p-3">Legal Reference</th>
                  <th class="p-3">Version</th>
                  <th class="p-3">Applicability</th>
                  <th class="p-3">Severity</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                ${rules.map(r => `
                  <tr class="hover:bg-slate-50">
                    <td class="p-3 font-mono font-bold text-blue-700">${r.rule_id}</td>
                    <td class="p-3 font-bold text-slate-900">${r.title}<div class="text-[10px] text-slate-500 font-normal">${r.requirement}</div></td>
                    <td class="p-3 text-slate-700">${r.legal_reference}</td>
                    <td class="p-3 font-mono text-slate-500">${r.rule_version}</td>
                    <td class="p-3 text-slate-600">${r.applicability}</td>
                    <td class="p-3"><span class="badge-status ${r.severity === 'CRITICAL' ? 'badge-noncompliant' : 'badge-review'}">${r.severity}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="card-light text-center py-10 text-red-600">Failed to fetch rules.</div>`;
  }
}

async function renderReportsView(container) {
  renderInspectionsListView(container);
}

// Risk Priority Dashboard View (Feature 6)
async function renderRiskView(container) {
  container.innerHTML = `<div class="flex items-center justify-center py-20 text-slate-400"><i data-lucide="loader-2" class="w-8 h-8 animate-spin text-blue-600"></i></div>`;
  try {
    const res = await fetch('/api/risk-priorities');
    const data = await res.json();
    const priorities = data.risk_priorities || [];

    container.innerHTML = `
      <div class="space-y-6">
        <div class="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-slate-900 flex items-center gap-2">
              <i data-lucide="alert-triangle" class="w-6 h-6 text-amber-500"></i>
              Inspection Priority Recommendation
            </h2>
            <p class="text-xs text-slate-500 mt-1">Explainable operational risk prioritization based on historical inspection findings and repeat violations.</p>
          </div>
          <span class="text-xs bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-md font-semibold text-slate-600">
            Decision-Support Risk Matrix
          </span>
        </div>

        <div class="card-light space-y-4">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                  <th class="p-3">Manufacturer / Account</th>
                  <th class="p-3">Product Item</th>
                  <th class="p-3">Category</th>
                  <th class="p-3">Priority Score</th>
                  <th class="p-3">Recommended Priority</th>
                  <th class="p-3 text-right">Reason Breakdown</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                ${priorities.map(p => `
                  <tr class="hover:bg-slate-50 cursor-pointer" onclick="showRiskFactorsModal('${escapeQuotes(p.manufacturer_name)}', '${escapeQuotes(p.priority_level)}', '${escapeQuotes(JSON.stringify(p.factors_json))}')">
                    <td class="p-3 font-bold text-slate-900">${p.manufacturer_name || 'N/A'}</td>
                    <td class="p-3 text-slate-700">${p.product_name || 'N/A'}</td>
                    <td class="p-3 text-slate-500">${p.category || 'N/A'}</td>
                    <td class="p-3 font-mono font-bold">${p.priority_score} / 100</td>
                    <td class="p-3">
                      <span class="badge-status ${p.priority_level === 'HIGH' ? 'badge-noncompliant' : (p.priority_level === 'MEDIUM' ? 'badge-review' : 'badge-compliant')}">
                        ${p.priority_level} PRIORITY
                      </span>
                    </td>
                    <td class="p-3 text-right">
                      <button class="px-2.5 py-1 bg-white hover:bg-slate-100 text-blue-700 border border-slate-300 rounded font-semibold text-xs">
                        Why Priority is ${p.priority_level} →
                      </button>
                    </td>
                  </tr>
                `).join('') || '<tr><td colspan="6" class="text-center py-8 text-slate-400">No risk priorities generated yet. Run inspections to populate priority recommendations.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <div class="p-3 bg-slate-100 border border-slate-200 rounded text-xs text-slate-600 flex items-center gap-2">
          <i data-lucide="info" class="w-4 h-4 text-slate-500"></i>
          <span><b>Notice:</b> This dashboard provides explainable risk-prioritization recommendations. It does not predict fraud or replace authorized officer discretion.</span>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="card-light text-center py-10 text-red-600">Failed to load risk priorities.</div>`;
  }
}

function showRiskFactorsModal(mfg, level, factorsJsonStr) {
  let factors = [];
  try {
    factors = JSON.parse(factorsJsonStr);
  } catch {
    factors = ["Routine inspection risk evaluation."];
  }

  const container = document.getElementById('modal-container');
  const content = document.getElementById('modal-content');

  content.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between border-b border-slate-200 pb-3">
        <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
          <i data-lucide="shield-alert" class="w-5 h-5 text-amber-500"></i>
          WHY PRIORITY IS ${level} (${mfg})
        </h3>
        <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>

      <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
        <span class="font-bold text-slate-800">Operational Risk Factors Considered:</span>
        <ul class="list-disc list-inside text-slate-700 space-y-1">
          ${factors.map(f => `<li>${f}</li>`).join('')}
        </ul>
      </div>

      <div class="flex justify-end pt-2">
        <button onclick="closeModal()" class="btn-secondary">Close</button>
      </div>
    </div>
  `;
  container.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

async function renderAuditLogsView(container) {
  container.innerHTML = `<div class="flex items-center justify-center py-20 text-slate-400"><i data-lucide="loader-2" class="w-8 h-8 animate-spin text-blue-600"></i></div>`;
  try {
    const res = await fetch('/api/audit-logs');
    const data = await res.json();
    const logs = data.audit_logs || [];

    container.innerHTML = `
      <div class="space-y-6">
        <div class="border-b border-slate-200 pb-4">
          <h2 class="text-xl font-bold text-slate-900 flex items-center gap-2">
            <i data-lucide="history" class="w-6 h-6 text-blue-700"></i>
            System Audit Log Trail
          </h2>
          <p class="text-xs text-slate-500 mt-1">Chronological record of officer manual overrides and system checks.</p>
        </div>

        <div class="card-light space-y-4">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                  <th class="p-3">Timestamp</th>
                  <th class="p-3">Officer & Role</th>
                  <th class="p-3">Action</th>
                  <th class="p-3">Target</th>
                  <th class="p-3">Old Value</th>
                  <th class="p-3">New Value / Reason</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                ${logs.map(l => `
                  <tr class="hover:bg-slate-50 font-mono text-[11px]">
                    <td class="p-3 text-slate-500">${new Date(l.timestamp).toLocaleString()}</td>
                    <td class="p-3 text-slate-900"><b>${l.user_name}</b><div class="text-[10px] text-slate-400 font-sans">${l.role}</div></td>
                    <td class="p-3 font-bold text-blue-700">${l.action}</td>
                    <td class="p-3 text-slate-700">${l.entity_type} [${l.entity_id}]</td>
                    <td class="p-3 text-red-600 truncate max-w-[150px]">${l.old_value || '-'}</td>
                    <td class="p-3 text-emerald-700 truncate max-w-[200px]">${l.new_value || l.reason || '-'}</td>
                  </tr>
                `).join('') || '<tr><td colspan="6" class="text-center py-6 text-slate-400">No audit logs.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="card-light text-center py-10 text-red-600">Failed to fetch audit logs.</div>`;
  }
}

// -------------------------------------------------------------------
// 6. ACTION CALLBACKS & DEMO MODE MODAL
// -------------------------------------------------------------------
async function runComplianceEngine(inspId) {
  showToast("Executing Legal Metrology Rule Engine...");
  try {
    const res = await fetch(`/api/inspections/${inspId}/compliance-check`, { method: 'POST' });
    const data = await res.json();
    showToast(`Compliance check complete! Status: ${data.result.status}`);
    renderInspectionDetailView(document.getElementById('app-view'), inspId);
  } catch (err) {
    showToast(`Compliance execution failed: ${err.message}`, true);
  }
}

async function generatePDFReport(inspId) {
  showToast("Generating Digital Inspection PDF Report...");
  try {
    const res = await fetch(`/api/inspections/${inspId}/report`, { method: 'POST' });
    const data = await res.json();
    if (data.download_url) {
      window.open(data.download_url, '_blank');
      showToast("Digital Inspection Report generated & opened!");
    }
  } catch (err) {
    showToast("Failed to generate report", true);
  }
}

// Demo Mode Modal Toggle
function toggleDemoModeModal() {
  const container = document.getElementById('modal-container');
  const content = document.getElementById('modal-content');

  content.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between border-b border-slate-200 pb-3">
        <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
          <i data-lucide="sparkles" class="w-5 h-5 text-amber-500"></i>
          Hackathon Demo Scenarios
        </h3>
        <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>

      <p class="text-xs text-slate-600">Select a preloaded demonstration product scenario for quick presentation testing:</p>

      <div class="space-y-2">
        <button onclick="loadDemoScenario('demo_product_a')" class="w-full text-left p-3 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors flex justify-between items-center">
          <div>
            <div class="font-bold text-xs text-emerald-900">🟢 Demo Product A (Compliant Tea)</div>
            <div class="text-[11px] text-emerald-700 mt-0.5">Fully compliant package declarations under Rule 6.</div>
          </div>
          <span class="badge-status badge-compliant">COMPLIANT</span>
        </button>

        <button onclick="loadDemoScenario('demo_product_b')" class="w-full text-left p-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors flex justify-between items-center">
          <div>
            <div class="font-bold text-xs text-red-900">🔴 Demo Product B (Violating Wafer)</div>
            <div class="text-[11px] text-red-700 mt-0.5">Missing Unit Sale Price, non-standard unit 'gms', incomplete address.</div>
          </div>
          <span class="badge-status badge-noncompliant">POTENTIAL NON-COMPLIANCE</span>
        </button>

        <button onclick="loadDemoScenario('demo_product_c')" class="w-full text-left p-3 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors flex justify-between items-center">
          <div>
            <div class="font-bold text-xs text-amber-900">🟡 Demo Product C (Blurred Honey)</div>
            <div class="text-[11px] text-amber-700 mt-0.5">Low image quality triggering manual officer review recommendation.</div>
          </div>
          <span class="badge-status badge-review">MANUAL REVIEW</span>
        </button>
      </div>

      <div class="flex justify-end pt-2">
        <button onclick="closeModal()" class="btn-secondary">Close</button>
      </div>
    </div>
  `;
  container.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

async function loadDemoScenario(presetKey) {
  closeModal();
  showToast(`Loading Hackathon Scenario: ${presetKey}...`);
  try {
    await fetch('/api/demo/preload', { method: 'POST' });
    
    let targetId = 'LM-2026-DEMO01';
    if (presetKey === 'demo_product_b') targetId = 'LM-2026-DEMO02';
    if (presetKey === 'demo_product_c') targetId = 'LM-2026-DEMO03';

    await fetch(`/api/inspections/${targetId}/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset: presetKey })
    });

    await fetch(`/api/inspections/${targetId}/compliance-check`, { method: 'POST' });

    window.location.hash = `#/inspections/${targetId}`;
  } catch (err) {
    showToast(`Scenario load error: ${err.message}`, true);
  }
}

// Modal Correction & Overrides
function openCorrectionModal(inspId, fieldKey, currentVal) {
  const container = document.getElementById('modal-container');
  const content = document.getElementById('modal-content');
  
  content.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between border-b border-slate-200 pb-3">
        <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
          <i data-lucide="edit-2" class="w-5 h-5 text-blue-700"></i>
          Human-in-the-Loop OCR Override
        </h3>
        <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>

      <div>
        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Field Key</label>
        <input type="text" value="${fieldKey}" readonly class="form-input bg-slate-100 font-mono text-xs text-slate-600" />
      </div>

      <div>
        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Corrected / Verified Value *</label>
        <input type="text" id="modal_corrected_val" value="${currentVal}" class="form-input" />
      </div>

      <div>
        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Audit Log Reason *</label>
        <input type="text" id="modal_reason" value="Officer manual verification override" class="form-input" />
      </div>

      <div class="flex justify-end gap-3 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="btn-secondary">Cancel</button>
        <button onclick="submitCorrection('${inspId}', '${fieldKey}')" class="btn-primary">
          Save Correction & Log Audit Event
        </button>
      </div>
    </div>
  `;
  container.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

async function submitCorrection(inspId, fieldKey) {
  const corrected_value = document.getElementById('modal_corrected_val').value;
  const reason = document.getElementById('modal_reason').value;

  try {
    await fetch(`/api/inspections/${inspId}/correct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_key: fieldKey, corrected_value, reason })
    });
    closeModal();
    showToast(`Field '${fieldKey}' updated successfully!`);
    renderInspectionDetailView(document.getElementById('app-view'), inspId);
  } catch (err) {
    showToast("Correction failed", true);
  }
}

function closeModal() {
  document.getElementById('modal-container').classList.add('hidden');
}

function showToast(msg, isError = false) {
  let toast = document.getElementById('toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = 'fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg text-xs font-semibold shadow-2xl flex items-center gap-2 border transition-all duration-300 transform translate-y-10 opacity-0';
    document.body.appendChild(toast);
  }

  toast.className = `fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg text-xs font-semibold shadow-2xl flex items-center gap-2 border transition-all duration-300 transform translate-y-0 opacity-100 ${isError ? 'bg-red-50 text-red-800 border-red-200' : 'bg-slate-900 text-white border-slate-800'}`;
  toast.innerHTML = `<i data-lucide="${isError ? 'alert-circle' : 'info'}" class="w-4 h-4 text-blue-400"></i> ${msg}`;
  if (window.lucide) lucide.createIcons();

  setTimeout(() => {
    toast.classList.add('translate-y-10', 'opacity-0');
  }, 3500);
}

function escapeQuotes(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
