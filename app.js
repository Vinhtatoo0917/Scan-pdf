/**
 * DocScan Pro Mobile - Full CamScanner Web Engine
 * 1. OpenCV.js Real-time Document Detection & Auto-Capture on Steady
 * 2. 4-Corner Manual Cropping with Magnifier Loupe & Perspective Warp
 * 3. CamScanner Magic Color filter (background whitening + text preservation + vivid stamps)
 * 4. Client-side OCR (Tesseract.js)
 * 5. Multi-page PDF / High-res Images Export & IndexedDB offline storage
 */

// Lucide icon render
lucide.createIcons();

// --- IndexedDB Management ---
const DB_NAME = 'DocScanDB_Mobile';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveDocumentToDB(doc) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(doc);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function getAllDocumentsFromDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function deleteDocumentFromDB(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// --- App State ---
let currentBatch = [];
let activeEditIndex = null;
let currentFacingMode = 'environment';
let mediaStream = null;
let trackTorch = null;
let isTorchOn = false;
let isOpenCvReady = false;
let autoCropEnabled = true;

// Auto-Shoot (Auto-capture on steady) state
let autoShootEnabled = false;
let steadyFrames = 0;
let lastDetectedPoints = null;
let isAutoCapturing = false;

let latestDetectedCorners = null;
let detectedOrientation = 'portrait';
let isDetecting = false;

// DOM Elements
const video = document.getElementById('webcam');
const docOverlayCanvas = document.getElementById('docOverlayCanvas');
const captureCanvas = document.getElementById('captureCanvas');
const detectCanvas = document.getElementById('detectCanvas');
const btnCapture = document.getElementById('btnCapture');
const btnSwitchCamera = document.getElementById('btnSwitchCamera');
const btnToggleTorch = document.getElementById('btnToggleTorch');
const btnToggleAutoCrop = document.getElementById('btnToggleAutoCrop');
const btnToggleAutoShoot = document.getElementById('btnToggleAutoShoot');
const autoShootLabel = document.getElementById('autoShootLabel');
const autoCaptureDot = document.getElementById('autoCaptureDot');
const detectedDocBadge = document.getElementById('detectedDocBadge');
const guideText = document.getElementById('guideText');
const viewfinderGuide = document.getElementById('viewfinderGuide');

const pagesThumbRow = document.getElementById('pagesThumbRow');
const pagesThumbList = document.getElementById('pagesThumbList');
const batchActionRow = document.getElementById('batchActionRow');
const btnSaveDocument = document.getElementById('btnSaveDocument');
const saveBtnText = document.getElementById('saveBtnText');
const btnClearCurrentBatch = document.getElementById('btnClearCurrentBatch');
const fileUploadInput = document.getElementById('fileUploadInput');
const totalDocBadge = document.getElementById('totalDocBadge');

// Docs Drawer Modal
const docsModal = document.getElementById('docsModal');
const btnOpenDocsModal = document.getElementById('btnOpenDocsModal');
const btnCloseDocsModal = document.getElementById('btnCloseDocsModal');
const savedDocsContainer = document.getElementById('savedDocsContainer');

// Edit & Filter Modal
const editPageModal = document.getElementById('editPageModal');
const btnCloseEditModal = document.getElementById('btnCloseEditModal');
const btnApplyEdit = document.getElementById('btnApplyEdit');
const editImagePreview = document.getElementById('editImagePreview');
const btnRotateLeft = document.getElementById('btnRotateLeft');
const btnRotateRight = document.getElementById('btnRotateRight');
const filterBtns = document.querySelectorAll('.btn-filter');
const btnReCrop = document.getElementById('btnReCrop');
const btnRunOcr = document.getElementById('btnRunOcr');

// Crop Modal Elements
const cropModal = document.getElementById('cropModal');
const cropCanvas = document.getElementById('cropCanvas');
const btnCancelCrop = document.getElementById('btnCancelCrop');
const btnConfirmCrop = document.getElementById('btnConfirmCrop');
const btnResetCorners = document.getElementById('btnResetCorners');
const cropMagnifier = document.getElementById('cropMagnifier');
const magnifierCanvas = document.getElementById('magnifierCanvas');

// OCR Modal Elements
const ocrModal = document.getElementById('ocrModal');
const btnCloseOcrModal = document.getElementById('btnCloseOcrModal');
const ocrLoading = document.getElementById('ocrLoading');
const ocrProgressStatus = document.getElementById('ocrProgressStatus');
const ocrResultText = document.getElementById('ocrResultText');
const btnCopyOcrText = document.getElementById('btnCopyOcrText');

// Toast
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');
let toastTimer = null;

function showToast(msg) {
  toastMsg.textContent = msg;
  toast.classList.remove('opacity-0');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('opacity-0');
  }, 2200);
}

function vibratePhone(ms = 35) {
  if (navigator.vibrate) {
    try { navigator.vibrate(ms); } catch (e) {}
  }
}

// --- Check OpenCV.js Readiness ---
function checkOpenCv() {
  if (window.cv && window.cv.Mat) {
    isOpenCvReady = true;
    detectedDocBadge.textContent = "AI Vision sẵn sàng";
  } else {
    setTimeout(checkOpenCv, 250);
  }
}
checkOpenCv();

// --- Toggle Auto Crop ---
btnToggleAutoCrop.addEventListener('click', () => {
  vibratePhone(25);
  autoCropEnabled = !autoCropEnabled;
  if (autoCropEnabled) {
    btnToggleAutoCrop.classList.replace('text-slate-400', 'text-blue-400');
    showToast("Đã bật tự bắt mép CamScanner");
  } else {
    btnToggleAutoCrop.classList.replace('text-blue-400', 'text-slate-400');
    showToast("Đã tắt tự cắt (chụp toàn khung)");
    clearOverlay();
  }
});

// --- Toggle Auto Shoot (CamScanner steady capture) ---
btnToggleAutoShoot.addEventListener('click', () => {
  vibratePhone(25);
  autoShootEnabled = !autoShootEnabled;
  if (autoShootEnabled) {
    btnToggleAutoShoot.classList.replace('text-slate-400', 'text-amber-400');
    btnToggleAutoShoot.classList.add('border-amber-400/50');
    autoShootLabel.textContent = "Tự chụp: BẬT";
    showToast("Bật tự động chụp khi tài liệu đứng yên");
  } else {
    btnToggleAutoShoot.classList.replace('text-amber-400', 'text-slate-400');
    btnToggleAutoShoot.classList.remove('border-amber-400/50');
    autoShootLabel.textContent = "Tự chụp: Tắt";
    showToast("Đã tắt tự động chụp");
  }
});

// --- Camera Initialization: Mobile-first 1080p @ 60fps ---
async function startCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
  }

  const constraints = {
    audio: false,
    video: {
      facingMode: { ideal: currentFacingMode },
      width: { ideal: 1920, min: 1280 },
      height: { ideal: 1080, min: 720 },
      frameRate: { ideal: 60, min: 30 }
    }
  };

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = mediaStream;

    const track = mediaStream.getVideoTracks()[0];
    if (track) {
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        trackTorch = track;
        btnToggleTorch.classList.remove('hidden');
      } else {
        btnToggleTorch.classList.add('hidden');
      }
    }

    video.onloadedmetadata = () => {
      startRealtimeDetectionLoop();
    };
  } catch (err) {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: currentFacingMode }
      });
      video.srcObject = mediaStream;
      video.onloadedmetadata = () => startRealtimeDetectionLoop();
    } catch (e) {
      showToast("Vui lòng cấp quyền mở Camera!");
    }
  }
}

// Toggle Torch
btnToggleTorch.addEventListener('click', async () => {
  if (!trackTorch) return;
  vibratePhone(30);
  try {
    isTorchOn = !isTorchOn;
    await trackTorch.applyConstraints({ advanced: [{ torch: isTorchOn }] });
    btnToggleTorch.classList.toggle('text-amber-400', isTorchOn);
  } catch (e) {
    console.log("Torch error:", e);
  }
});

// Switch camera
btnSwitchCamera.addEventListener('click', () => {
  vibratePhone(30);
  currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
  startCamera();
});

// --- Real-time Edge Detection & Steady Auto-Capture Loop ---
function startRealtimeDetectionLoop() {
  setInterval(() => {
    if (!autoCropEnabled || !isOpenCvReady || !video.videoWidth || !video.videoHeight || isDetecting) {
      if (!autoCropEnabled) clearOverlay();
      return;
    }
    detectA4DocumentInFrame();
  }, 90);
}

function clearOverlay() {
  const ctx = docOverlayCanvas.getContext('2d');
  ctx.clearRect(0, 0, docOverlayCanvas.width, docOverlayCanvas.height);
}

function detectA4DocumentInFrame() {
  isDetecting = true;
  try {
    const vW = video.videoWidth;
    const vH = video.videoHeight;

    const scale = 0.22;
    const sW = Math.round(vW * scale);
    const sH = Math.round(vH * scale);

    detectCanvas.width = sW;
    detectCanvas.height = sH;
    const dCtx = detectCanvas.getContext('2d');
    dCtx.drawImage(video, 0, 0, sW, sH);

    const src = cv.imread(detectCanvas);
    const gray = new cv.Mat();
    const blurred = new cv.Mat();
    const edges = new cv.Mat();

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.Canny(blurred, edges, 45, 140);

    const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    cv.dilate(edges, edges, kernel);

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    let maxArea = (sW * sH) * 0.12;
    let bestQuad = null;

    for (let i = 0; i < contours.size(); ++i) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt);
      if (area > maxArea) {
        const peri = cv.arcLength(cnt, true);
        const approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

        if (approx.rows === 4 && cv.isContourConvex(approx)) {
          maxArea = area;
          bestQuad = [];
          for (let p = 0; p < 4; p++) {
            bestQuad.push({
              x: (approx.data32S[p * 2]) / scale,
              y: (approx.data32S[p * 2 + 1]) / scale
            });
          }
        }
        approx.delete();
      }
      cnt.delete();
    }

    if (bestQuad) {
      latestDetectedCorners = orderQuadPoints(bestQuad);

      const wTop = Math.hypot(latestDetectedCorners[1].x - latestDetectedCorners[0].x, latestDetectedCorners[1].y - latestDetectedCorners[0].y);
      const wBottom = Math.hypot(latestDetectedCorners[2].x - latestDetectedCorners[3].x, latestDetectedCorners[2].y - latestDetectedCorners[3].y);
      const hLeft = Math.hypot(latestDetectedCorners[3].x - latestDetectedCorners[0].x, latestDetectedCorners[3].y - latestDetectedCorners[0].y);
      const hRight = Math.hypot(latestDetectedCorners[2].x - latestDetectedCorners[1].x, latestDetectedCorners[2].y - latestDetectedCorners[1].y);

      const avgW = (wTop + wBottom) / 2;
      const avgH = (hLeft + hRight) / 2;

      if (avgW > avgH) {
        detectedOrientation = 'landscape';
        detectedDocBadge.textContent = "Đã khóa A4 Ngang";
        detectedDocBadge.className = "font-semibold text-emerald-400 text-[11px]";
      } else {
        detectedOrientation = 'portrait';
        detectedDocBadge.textContent = "Đã khóa A4 Dọc";
        detectedDocBadge.className = "font-semibold text-emerald-400 text-[11px]";
      }

      drawOverlayQuad(latestDetectedCorners, vW, vH);
      viewfinderGuide.classList.add('opacity-0');

      // Auto-shoot detection check: document steady
      if (autoShootEnabled && !isAutoCapturing) {
        checkSteadyAutoCapture(latestDetectedCorners);
      }
    } else {
      latestDetectedCorners = null;
      steadyFrames = 0;
      clearOverlay();
      detectedDocBadge.textContent = "Đang tìm tài liệu...";
      detectedDocBadge.className = "font-medium text-amber-300 text-[11px]";
      viewfinderGuide.classList.remove('opacity-0');
    }

    src.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    kernel.delete();
    contours.delete();
    hierarchy.delete();
  } catch (e) {
  } finally {
    isDetecting = false;
  }
}

function checkSteadyAutoCapture(pts) {
  if (!lastDetectedPoints) {
    lastDetectedPoints = pts;
    steadyFrames = 0;
    return;
  }

  let totalDiff = 0;
  for (let i = 0; i < 4; i++) {
    totalDiff += Math.hypot(pts[i].x - lastDetectedPoints[i].x, pts[i].y - lastDetectedPoints[i].y);
  }
  lastDetectedPoints = pts;

  // If points moved less than 15px across frame
  if (totalDiff < 20) {
    steadyFrames++;
    if (steadyFrames >= 7) { // ~800ms steady
      isAutoCapturing = true;
      steadyFrames = 0;
      btnCapture.click();
      setTimeout(() => { isAutoCapturing = false; }, 2000);
    }
  } else {
    steadyFrames = 0;
  }
}

function orderQuadPoints(pts) {
  const sumSorted = [...pts].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  const tl = sumSorted[0];
  const br = sumSorted[3];

  const remaining = [sumSorted[1], sumSorted[2]];
  remaining.sort((a, b) => (a.y - a.x) - (b.y - b.x));
  const tr = remaining[0];
  const bl = remaining[1];

  return [tl, tr, br, bl];
}

function drawOverlayQuad(pts, videoW, videoH) {
  const containerW = video.clientWidth;
  const containerH = video.clientHeight;

  docOverlayCanvas.width = containerW;
  docOverlayCanvas.height = containerH;

  const ctx = docOverlayCanvas.getContext('2d');
  ctx.clearRect(0, 0, containerW, containerH);

  const scale = Math.max(containerW / videoW, containerH / videoH);
  const offsetX = (containerW - videoW * scale) / 2;
  const offsetY = (containerH - videoH * scale) / 2;

  const mapped = pts.map(p => ({
    x: p.x * scale + offsetX,
    y: p.y * scale + offsetY
  }));

  // Polygon fill
  ctx.beginPath();
  ctx.moveTo(mapped[0].x, mapped[0].y);
  ctx.lineTo(mapped[1].x, mapped[1].y);
  ctx.lineTo(mapped[2].x, mapped[2].y);
  ctx.lineTo(mapped[3].x, mapped[3].y);
  ctx.closePath();
  ctx.fillStyle = autoShootEnabled && steadyFrames > 3 ? 'rgba(59, 130, 246, 0.28)' : 'rgba(34, 197, 94, 0.18)';
  ctx.fill();

  // Border line
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = autoShootEnabled && steadyFrames > 3 ? '#3b82f6' : '#22c55e';
  ctx.stroke();

  // Corner dots
  mapped.forEach((pt) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#15803d';
    ctx.stroke();
  });
}

// Perspective Warp only the document
function warpPerspectiveA4(sourceCanvas, corners, orientation) {
  if (!isOpenCvReady) return sourceCanvas.toDataURL('image/jpeg', 0.95);

  const src = cv.imread(sourceCanvas);

  let targetW, targetH;
  if (orientation === 'landscape') {
    targetW = 1754;
    targetH = 1240;
  } else {
    targetW = 1240;
    targetH = 1754;
  }

  const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
    corners[0].x, corners[0].y,
    corners[1].x, corners[1].y,
    corners[2].x, corners[2].y,
    corners[3].x, corners[3].y
  ]);

  const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    targetW, 0,
    targetW, targetH,
    0, targetH
  ]);

  const M = cv.getPerspectiveTransform(srcTri, dstTri);
  const dst = new cv.Mat();
  const dsize = new cv.Size(targetW, targetH);

  cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = targetW;
  outputCanvas.height = targetH;
  cv.imshow(outputCanvas, dst);

  src.delete();
  dst.delete();
  M.delete();
  srcTri.delete();
  dstTri.delete();

  return outputCanvas.toDataURL('image/jpeg', 0.95);
}

// --- Mobile Capture Action ---
btnCapture.addEventListener('click', () => {
  vibratePhone(50);
  if (!video.videoWidth || !video.videoHeight) return;

  const w = video.videoWidth;
  const h = video.videoHeight;
  captureCanvas.width = w;
  captureCanvas.height = h;

  const ctx = captureCanvas.getContext('2d');
  ctx.drawImage(video, 0, 0, w, h);

  const rawFullDataUrl = captureCanvas.toDataURL('image/jpeg', 0.95);
  let finalDataUrl;
  let didAutoCrop = false;

  let initialCorners = null;
  if (autoCropEnabled && latestDetectedCorners && isOpenCvReady) {
    try {
      finalDataUrl = warpPerspectiveA4(captureCanvas, latestDetectedCorners, detectedOrientation);
      initialCorners = JSON.parse(JSON.stringify(latestDetectedCorners));
      didAutoCrop = true;
    } catch (err) {
      finalDataUrl = rawFullDataUrl;
    }
  } else {
    finalDataUrl = rawFullDataUrl;
  }

  addPageToBatch(finalDataUrl, rawFullDataUrl, initialCorners);

  if (didAutoCrop) {
    showToast(`Đã cắt phẳng CamScanner`);
  } else {
    showToast(`Đã chụp toàn khung`);
  }

  // Flash animation
  const flash = document.createElement('div');
  flash.className = 'absolute inset-0 bg-white/70 pointer-events-none transition-opacity duration-150 z-40';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 100);
});

// File upload
fileUploadInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      addPageToBatch(dataUrl, dataUrl, null);
    };
    reader.readAsDataURL(file);
  });
  fileUploadInput.value = '';
});

// Add page
function addPageToBatch(dataUrl, rawUrl, corners) {
  const page = {
    id: 'page_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    rawFullDataUrl: rawUrl || dataUrl,
    corners: corners,
    originalDataUrl: dataUrl,
    processedDataUrl: dataUrl,
    rotation: 0,
    filter: 'magic' // Default CamScanner Magic Color!
  };

  // Run Magic Color filter by default like CamScanner
  processImageCanvas(page.originalDataUrl, { rotation: 0, filter: 'magic' }, (magicUrl) => {
    page.processedDataUrl = magicUrl;
    currentBatch.push(page);
    renderBatchThumbnails();
  });
}

function renderBatchThumbnails() {
  pagesThumbList.innerHTML = '';
  
  if (currentBatch.length === 0) {
    pagesThumbRow.classList.add('hidden');
    batchActionRow.classList.add('hidden');
    return;
  }

  pagesThumbRow.classList.remove('hidden');
  batchActionRow.classList.remove('hidden');
  saveBtnText.textContent = `Hoàn thành & Lưu (${currentBatch.length})`;

  currentBatch.forEach((page, index) => {
    const item = document.createElement('div');
    item.className = 'relative shrink-0 w-[56px] h-[72px] bg-slate-800 rounded-xl overflow-hidden border border-white/20 active:scale-95 transition shadow-lg cursor-pointer';
    item.innerHTML = `
      <img src="${page.processedDataUrl}" class="w-full h-full object-cover">
      <div class="absolute bottom-1 right-1 bg-black/80 text-[10px] px-1.5 py-0.5 rounded-full text-white font-bold font-mono">
        ${index + 1}
      </div>
    `;

    item.addEventListener('click', () => {
      vibratePhone(25);
      openEditModal(index);
    });

    pagesThumbList.appendChild(item);
  });

  pagesThumbRow.scrollTo({ left: pagesThumbRow.scrollWidth, behavior: 'smooth' });
}

btnClearCurrentBatch.addEventListener('click', () => {
  vibratePhone(30);
  if (confirm("Huỷ toàn bộ các trang vừa chụp?")) {
    currentBatch = [];
    renderBatchThumbnails();
  }
});

// --- Modal Edit, CamScanner Magic Color Filter & Tools ---
let tempEditState = null;

function openEditModal(index) {
  activeEditIndex = index;
  const page = currentBatch[index];
  tempEditState = {
    rotation: page.rotation || 0,
    filter: page.filter || 'magic'
  };

  updateFilterButtonUI(tempEditState.filter);
  updateEditModalPreview();
  editPageModal.classList.remove('hidden');
}

function updateFilterButtonUI(selected) {
  filterBtns.forEach(btn => {
    if (btn.dataset.filter === selected) {
      btn.className = 'btn-filter py-2 text-xs rounded-xl border border-blue-500 bg-blue-500/20 text-blue-300 font-bold flex flex-col items-center gap-0.5';
    } else {
      btn.className = 'btn-filter py-2 text-xs rounded-xl border border-slate-800 bg-slate-900 text-slate-400 font-medium flex flex-col items-center gap-0.5';
    }
  });
}

function updateEditModalPreview() {
  if (activeEditIndex === null) return;
  const page = currentBatch[activeEditIndex];
  processImageCanvas(page.originalDataUrl, tempEditState, (processedUrl) => {
    editImagePreview.src = processedUrl;
  });
}

/**
 * CamScanner Image Filters
 * - 'magic': Magic Color (Adaptive background whitening, deepens text & keeps red stamps vivid)
 * - 'scan-clean': Contrast boost & text sharpener
 * - 'bw': Clean 1-bit Black and White
 * - 'original': Raw unedited photo
 */
function processImageCanvas(dataUrl, state, callback) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const isRotated90 = (Math.abs(state.rotation) % 180 !== 0);
    const canvasW = isRotated90 ? img.naturalHeight : img.naturalWidth;
    const canvasH = isRotated90 ? img.naturalWidth : img.naturalHeight;

    canvas.width = canvasW;
    canvas.height = canvasH;

    ctx.save();
    ctx.translate(canvasW / 2, canvasH / 2);
    ctx.rotate((state.rotation * Math.PI) / 180);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    if (state.filter !== 'original') {
      const imgData = ctx.getImageData(0, 0, canvasW, canvasH);
      const d = imgData.data;
      const len = d.length;

      for (let i = 0; i < len; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;

        if (state.filter === 'magic') {
          // CamScanner Magic Color Algorithm:
          // Detect red/blue ink or stamps to keep them saturated, whiten paper shadow
          const isColorInk = (r > g + 25 && r > b + 25) || (b > r + 30 && b > g + 15);
          
          if (isColorInk) {
            // Keep stamps bright and punchy
            d[i] = Math.min(255, r * 1.25);
            d[i + 1] = Math.min(255, g * 0.95);
            d[i + 2] = Math.min(255, b * 0.95);
          } else {
            // Paper whitening + dark text enhancement
            if (gray > 135) {
              // Whitening gradient: push light gray/yellow paper to clean white #FFF
              const boost = Math.min(255, gray + (255 - gray) * 0.85);
              d[i] = d[i + 1] = d[i + 2] = boost;
            } else {
              // Darken text letters
              const dark = Math.max(0, gray * 0.7 - 10);
              d[i] = d[i + 1] = d[i + 2] = dark;
            }
          }
        } else if (state.filter === 'bw') {
          const val = gray > 135 ? 255 : 0;
          d[i] = d[i + 1] = d[i + 2] = val;
        } else if (state.filter === 'scan-clean') {
          const val = gray > 150 ? Math.min(255, gray * 1.35) : gray * 0.8;
          d[i] = d[i + 1] = d[i + 2] = val;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }

    callback(canvas.toDataURL('image/jpeg', 0.95));
  };
  img.src = dataUrl;
}

btnRotateLeft.addEventListener('click', () => {
  vibratePhone(20);
  tempEditState.rotation = (tempEditState.rotation - 90) % 360;
  updateEditModalPreview();
});

btnRotateRight.addEventListener('click', () => {
  vibratePhone(20);
  tempEditState.rotation = (tempEditState.rotation + 90) % 360;
  updateEditModalPreview();
});

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    vibratePhone(20);
    tempEditState.filter = btn.dataset.filter;
    updateFilterButtonUI(tempEditState.filter);
    updateEditModalPreview();
  });
});

btnApplyEdit.addEventListener('click', () => {
  vibratePhone(30);
  if (activeEditIndex === null) return;
  const page = currentBatch[activeEditIndex];
  Object.assign(page, tempEditState);
  page.processedDataUrl = editImagePreview.src;
  renderBatchThumbnails();
  editPageModal.classList.add('hidden');
  showToast("Đã lưu hiệu ứng trang");
});

btnCloseEditModal.addEventListener('click', () => {
  editPageModal.classList.add('hidden');
});

// =========================================================
// --- MANUAL 4-CORNER CROPPING WITH MAGNIFIER LOUPE ---
// =========================================================
let manualCropCorners = [];
let draggingCornerIndex = -1;
let manualCropImage = null;
let cropScale = 1;
let cropOffsetX = 0;
let cropOffsetY = 0;

btnReCrop.addEventListener('click', () => {
  vibratePhone(25);
  if (activeEditIndex === null) return;
  const page = currentBatch[activeEditIndex];
  openCropModal(page.rawFullDataUrl, page.corners);
});

function openCropModal(imageUrl, existingCorners) {
  manualCropImage = new Image();
  manualCropImage.onload = () => {
    initCropCanvas(existingCorners);
    cropModal.classList.remove('hidden');
  };
  manualCropImage.src = imageUrl;
}

function initCropCanvas(existingCorners) {
  const container = document.getElementById('cropContainer');
  const maxW = container.clientWidth - 20;
  const maxH = container.clientHeight - 20;

  const imgW = manualCropImage.naturalWidth;
  const imgH = manualCropImage.naturalHeight;

  cropScale = Math.min(maxW / imgW, maxH / imgH, 1);
  cropCanvas.width = imgW * cropScale;
  cropCanvas.height = imgH * cropScale;

  if (existingCorners && existingCorners.length === 4) {
    manualCropCorners = existingCorners.map(p => ({
      x: p.x * cropScale,
      y: p.y * cropScale
    }));
  } else {
    // Default 10% inset quad
    const marginX = cropCanvas.width * 0.08;
    const marginY = cropCanvas.height * 0.08;
    manualCropCorners = [
      { x: marginX, y: marginY },
      { x: cropCanvas.width - marginX, y: marginY },
      { x: cropCanvas.width - marginX, y: cropCanvas.height - marginY },
      { x: marginX, y: cropCanvas.height - marginY }
    ];
  }

  drawManualCropCanvas();
}

function drawManualCropCanvas() {
  const ctx = cropCanvas.getContext('2d');
  ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);

  // 1. Draw base photo
  ctx.drawImage(manualCropImage, 0, 0, cropCanvas.width, cropCanvas.height);

  // 2. Dim background outside quad
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);

  // 3. Clear crop area
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(manualCropCorners[0].x, manualCropCorners[0].y);
  ctx.lineTo(manualCropCorners[1].x, manualCropCorners[1].y);
  ctx.lineTo(manualCropCorners[2].x, manualCropCorners[2].y);
  ctx.lineTo(manualCropCorners[3].x, manualCropCorners[3].y);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(manualCropImage, 0, 0, cropCanvas.width, cropCanvas.height);
  ctx.restore();

  // 4. Vibrant border
  ctx.beginPath();
  ctx.moveTo(manualCropCorners[0].x, manualCropCorners[0].y);
  ctx.lineTo(manualCropCorners[1].x, manualCropCorners[1].y);
  ctx.lineTo(manualCropCorners[2].x, manualCropCorners[2].y);
  ctx.lineTo(manualCropCorners[3].x, manualCropCorners[3].y);
  ctx.closePath();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#3b82f6';
  ctx.stroke();

  // 5. Draw 4 Corner Handles
  manualCropCorners.forEach((pt, i) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 14, 0, 2 * Math.PI);
    ctx.fillStyle = i === draggingCornerIndex ? '#60a5fa' : '#ffffff';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#2563eb';
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#2563eb';
    ctx.fill();
  });
}

function updateMagnifier(touchX, touchY, imgPtX, imgPtY) {
  cropMagnifier.style.display = 'block';
  // Position above finger
  const magOffset = 70;
  cropMagnifier.style.left = `${touchX - 50}px`;
  cropMagnifier.style.top = `${touchY - magOffset - 50}px`;

  const magCtx = magnifierCanvas.getContext('2d');
  magCtx.clearRect(0, 0, 100, 100);

  const zoomFactor = 2.2;
  const srcSize = 100 / zoomFactor;
  const srcX = (imgPtX / cropScale) - srcSize / 2;
  const srcY = (imgPtY / cropScale) - srcSize / 2;

  magCtx.drawImage(
    manualCropImage,
    srcX, srcY, srcSize, srcSize,
    0, 0, 100, 100
  );

  // Crosshair
  magCtx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
  magCtx.lineWidth = 1.5;
  magCtx.beginPath();
  magCtx.moveTo(50, 0); magCtx.lineTo(50, 100);
  magCtx.moveTo(0, 50); magCtx.lineTo(100, 50);
  magCtx.stroke();
}

// Touch / Mouse Handlers for Crop Corners
function getCanvasCoordinates(e) {
  const rect = cropCanvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
    rawClientX: clientX,
    rawClientY: clientY
  };
}

function handleCropPointerDown(e) {
  const coords = getCanvasCoordinates(e);
  const touchRadius = 40; // finger tolerance

  draggingCornerIndex = -1;
  let minDistance = touchRadius;

  manualCropCorners.forEach((pt, i) => {
    const dist = Math.hypot(coords.x - pt.x, coords.y - pt.y);
    if (dist < minDistance) {
      minDistance = dist;
      draggingCornerIndex = i;
    }
  });

  if (draggingCornerIndex !== -1) {
    vibratePhone(15);
    updateMagnifier(coords.rawClientX, coords.rawClientY, manualCropCorners[draggingCornerIndex].x, manualCropCorners[draggingCornerIndex].y);
    drawManualCropCanvas();
    e.preventDefault();
  }
}

function handleCropPointerMove(e) {
  if (draggingCornerIndex === -1) return;
  e.preventDefault();
  const coords = getCanvasCoordinates(e);

  const clampedX = Math.max(0, Math.min(cropCanvas.width, coords.x));
  const clampedY = Math.max(0, Math.min(cropCanvas.height, coords.y));

  manualCropCorners[draggingCornerIndex] = { x: clampedX, y: clampedY };
  drawManualCropCanvas();
  updateMagnifier(coords.rawClientX, coords.rawClientY, clampedX, clampedY);
}

function handleCropPointerUp() {
  if (draggingCornerIndex !== -1) {
    draggingCornerIndex = -1;
    cropMagnifier.style.display = 'none';
    drawManualCropCanvas();
  }
}

cropCanvas.addEventListener('mousedown', handleCropPointerDown);
window.addEventListener('mousemove', handleCropPointerMove);
window.addEventListener('mouseup', handleCropPointerUp);

cropCanvas.addEventListener('touchstart', handleCropPointerDown, { passive: false });
window.addEventListener('touchmove', handleCropPointerMove, { passive: false });
window.addEventListener('touchend', handleCropPointerUp);

btnResetCorners.addEventListener('click', () => {
  vibratePhone(20);
  manualCropCorners = [
    { x: 0, y: 0 },
    { x: cropCanvas.width, y: 0 },
    { x: cropCanvas.width, y: cropCanvas.height },
    { x: 0, y: cropCanvas.height }
  ];
  drawManualCropCanvas();
});

btnCancelCrop.addEventListener('click', () => {
  cropModal.classList.add('hidden');
});

// Confirm manual crop & Warp Perspective
btnConfirmCrop.addEventListener('click', () => {
  vibratePhone(35);
  if (activeEditIndex === null || !manualCropImage) return;

  const originalScaleCorners = manualCropCorners.map(p => ({
    x: p.x / cropScale,
    y: p.y / cropScale
  }));

  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = manualCropImage.naturalWidth;
  fullCanvas.height = manualCropImage.naturalHeight;
  const fCtx = fullCanvas.getContext('2d');
  fCtx.drawImage(manualCropImage, 0, 0);

  const warpedUrl = warpPerspectiveA4(fullCanvas, originalScaleCorners, 'portrait');

  const page = currentBatch[activeEditIndex];
  page.corners = originalScaleCorners;
  page.originalDataUrl = warpedUrl;

  // Re-run filter on the new warped crop
  processImageCanvas(warpedUrl, tempEditState, (processedUrl) => {
    page.processedDataUrl = processedUrl;
    editImagePreview.src = processedUrl;
    renderBatchThumbnails();
    cropModal.classList.add('hidden');
    showToast("Đã cắt phẳng góc mới!");
  });
});

// =========================================================
// --- IN-BROWSER OCR ENGINE (Tesseract.js) ---
// =========================================================
btnRunOcr.addEventListener('click', async () => {
  vibratePhone(25);
  if (activeEditIndex === null) return;
  const page = currentBatch[activeEditIndex];

  ocrModal.classList.remove('hidden');
  ocrLoading.classList.remove('hidden');
  ocrResultText.value = '';
  ocrProgressStatus.textContent = "Đang nạp mô hình OCR...";

  try {
    const worker = await Tesseract.createWorker('vie+eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          ocrProgressStatus.textContent = `Đang nhận diện chữ: ${Math.round((m.progress || 0) * 100)}%`;
        } else {
          ocrProgressStatus.textContent = m.status || 'Đang xử lý...';
        }
      }
    });

    const ret = await worker.recognize(page.processedDataUrl);
    ocrResultText.value = ret.data.text.trim() || "(Không tìm thấy chữ trong ảnh này)";
    await worker.terminate();
    ocrLoading.classList.add('hidden');
    showToast("Trích xuất chữ thành công!");
  } catch (err) {
    ocrLoading.classList.add('hidden');
    ocrResultText.value = "Lỗi khi nhận diện văn bản: " + (err.message || err);
    showToast("Lỗi OCR");
  }
});

btnCloseOcrModal.addEventListener('click', () => {
  ocrModal.classList.add('hidden');
});

btnCopyOcrText.addEventListener('click', () => {
  vibratePhone(25);
  if (!ocrResultText.value) return;
  navigator.clipboard.writeText(ocrResultText.value).then(() => {
    showToast("Đã sao chép văn bản vào bộ nhớ tạm!");
  }).catch(() => {
    ocrResultText.select();
    document.execCommand('copy');
    showToast("Đã sao chép!");
  });
});

// --- Save Document ---
btnSaveDocument.addEventListener('click', async () => {
  vibratePhone(40);
  if (!currentBatch.length) return;

  const defaultName = `Doc_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}_${Date.now().toString().slice(-4)}`;
  const title = prompt("Đặt tên cho tài liệu:", defaultName);
  if (!title) return;

  const newDoc = {
    id: 'doc_' + Date.now(),
    title: title.trim(),
    createdAt: new Date().toISOString(),
    pageCount: currentBatch.length,
    pages: currentBatch.map(p => ({ dataUrl: p.processedDataUrl }))
  };

  try {
    await saveDocumentToDB(newDoc);
    showToast("Đã lưu vào kho tài liệu!");
    currentBatch = [];
    renderBatchThumbnails();
    refreshDocCount();
  } catch (err) {
    showToast("Lỗi khi lưu tài liệu");
  }
});

// --- Export PDF & Image on Mobile ---
function exportAsImages(doc) {
  doc.pages.forEach((page, i) => {
    const a = document.createElement('a');
    a.href = page.dataUrl;
    a.download = `${doc.title}_Trang_${i + 1}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
  showToast(`Đang tải về ${doc.pages.length} hình ảnh`);
}

async function exportAsPDF(doc) {
  showToast("Đang tạo file PDF chất lượng cao...");
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  for (let i = 0; i < doc.pages.length; i++) {
    const page = doc.pages[i];
    await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const isLandscape = img.naturalWidth > img.naturalHeight;
        if (i > 0) {
          pdf.addPage('a4', isLandscape ? 'landscape' : 'portrait');
        } else if (isLandscape) {
          pdf.deletePage(1);
          pdf.addPage('a4', 'landscape');
        }

        const cW = pdf.internal.pageSize.getWidth();
        const cH = pdf.internal.pageSize.getHeight();
        let rW = cW;
        let rH = (img.naturalHeight / img.naturalWidth) * cW;

        if (rH > cH) {
          rH = cH;
          rW = (img.naturalWidth / img.naturalHeight) * cH;
        }

        const posX = (cW - rW) / 2;
        const posY = (cH - rH) / 2;

        pdf.addImage(img, 'JPEG', posX, posY, rW, rH, undefined, 'FAST');
        resolve();
      };
      img.src = page.dataUrl;
    });
  }

  pdf.save(`${doc.title}.pdf`);
  showToast("Đã tải xong file PDF!");
}

// --- Documents Modal ---
async function refreshDocCount() {
  const docs = await getAllDocumentsFromDB();
  totalDocBadge.textContent = docs.length;
}

async function renderSavedDocs() {
  const docs = await getAllDocumentsFromDB();
  savedDocsContainer.innerHTML = '';

  if (!docs.length) {
    savedDocsContainer.innerHTML = `
      <div class="text-center py-12 text-slate-500">
        <i data-lucide="inbox" class="w-10 h-10 mx-auto mb-2 opacity-40"></i>
        <p class="text-xs">Chưa có tài liệu nào được lưu.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  docs.forEach((doc) => {
    const card = document.createElement('div');
    card.className = 'bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 flex items-center justify-between gap-3 shadow';

    const formattedDate = new Date(doc.createdAt).toLocaleDateString('vi-VN');
    const firstThumb = doc.pages[0]?.dataUrl || '';

    card.innerHTML = `
      <div class="flex items-center gap-3 overflow-hidden">
        <img src="${firstThumb}" class="w-12 h-16 object-cover rounded-lg bg-slate-900 border border-slate-700 shrink-0">
        <div class="overflow-hidden">
          <h3 class="text-xs font-bold text-white truncate">${doc.title}</h3>
          <p class="text-[11px] text-slate-400 mt-0.5">${doc.pages.length} trang • ${formattedDate}</p>
        </div>
      </div>

      <div class="flex items-center gap-1.5 shrink-0">
        <button class="btn-export-pdf px-2.5 py-1.5 rounded-xl bg-red-600/20 text-red-300 border border-red-500/30 text-[11px] font-bold active:scale-95 transition">
          PDF
        </button>
        <button class="btn-export-img px-2.5 py-1.5 rounded-xl bg-blue-600/20 text-blue-300 border border-blue-500/30 text-[11px] font-bold active:scale-95 transition">
          Ảnh
        </button>
        <button class="btn-del-doc p-2 text-slate-400 active:text-red-400" title="Xoá">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    `;

    card.querySelector('.btn-export-pdf').addEventListener('click', () => exportAsPDF(doc));
    card.querySelector('.btn-export-img').addEventListener('click', () => exportAsImages(doc));
    card.querySelector('.btn-del-doc').addEventListener('click', async () => {
      if (confirm(`Xoá tài liệu "${doc.title}"?`)) {
        await deleteDocumentFromDB(doc.id);
        renderSavedDocs();
        refreshDocCount();
      }
    });

    savedDocsContainer.appendChild(card);
  });

  lucide.createIcons();
}

btnOpenDocsModal.addEventListener('click', () => {
  vibratePhone(25);
  renderSavedDocs();
  docsModal.classList.remove('hidden');
});

btnCloseDocsModal.addEventListener('click', () => {
  docsModal.classList.add('hidden');
});

// Startup
window.addEventListener('DOMContentLoaded', () => {
  startCamera();
  refreshDocCount();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});
