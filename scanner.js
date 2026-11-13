// ========== TRẠNG THÁI TOÀN CỤC ==========
const AppState = {
  originalImage: null,     // ImageData gốc
  croppedImage: null,      // Sau khi cắt
  filteredImage: null,     // Sau khi chỉnh filter
};

// ========== CÁC SECTION ==========
const sections = {
  upload: document.getElementById('upload-section'),
  crop: document.getElementById('crop-section'),
  filter: document.getElementById('filter-section'),
  ocr: document.getElementById('ocr-section'),
  export: document.getElementById('export-section'),
};

function showSection(name) {
  Object.values(sections).forEach(s => s.hidden = true);
  sections[name].hidden = false;
}

// ========== UPLOAD FILE ==========
const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) loadImageFile(file);
});

// Kéo thả ảnh
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.style.background = '#bee3f8';
});

dropZone.addEventListener('dragleave', () => {
  dropZone.style.background = '';
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.style.background = '';
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    loadImageFile(file);
  }
});

// Đọc file ảnh
function loadImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      AppState.originalImage = img;
      initCrop(img);
      showSection('crop');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ========== CAMERA ==========
const cameraBtn = document.getElementById('camera-btn');
const captureBtn = document.getElementById('capture-btn');
const cameraPreview = document.getElementById('camera-preview');
let cameraStream = null;

cameraBtn.addEventListener('click', async () => {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    cameraPreview.srcObject = cameraStream;
    cameraPreview.hidden = false;
    captureBtn.hidden = false;
    cameraBtn.textContent = '❌ Tắt camera';
    cameraBtn.onclick = stopCamera;
  } catch (err) {
    alert('Không thể mở camera: ' + err.message);
  }
});

captureBtn.addEventListener('click', () => {
  const canvas = document.createElement('canvas');
  canvas.width = cameraPreview.videoWidth;
  canvas.height = cameraPreview.videoHeight;
  canvas.getContext('2d').drawImage(cameraPreview, 0, 0);

  const img = new Image();
  img.onload = () => {
    AppState.originalImage = img;
    stopCamera();
    initCrop(img);
    showSection('crop');
  };
  img.src = canvas.toDataURL('image/png');
});

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  cameraPreview.hidden = true;
  captureBtn.hidden = true;
  cameraBtn.textContent = '📷 Mở Camera';
  cameraBtn.onclick = null;
  // Gắn lại event gốc
  cameraBtn.addEventListener('click', async () => {
    location.reload(); // reload để reset hoàn toàn
  });
}

// ========== NÚT QUÉT LẠI ==========
document.getElementById('scan-again-btn').addEventListener('click', () => {
  AppState.originalImage = null;
  AppState.croppedImage = null;
  AppState.filteredImage = null;
  fileInput.value = '';
  showSection('upload');
});