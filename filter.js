// ========== CHỈNH SỬA ẢNH / FILTER ==========
const filterCanvas = document.getElementById('filter-canvas');
const filterCtx = filterCanvas.getContext('2d');

let filterImage = null;
let currentBrightness = 100;
let currentContrast = 100;
let currentSaturation = 100;

// ========== KHỞI TẠO ==========
function initFilter(img) {
  filterImage = img;

  const maxW = Math.min(700, window.innerWidth - 60);
  const ratio = img.height / img.width;
  filterCanvas.width = maxW;
  filterCanvas.height = maxW * ratio;

  // Reset giá trị
  currentBrightness = 100;
  currentContrast = 100;
  currentSaturation = 100;

  document.getElementById('brightness').value = 100;
  document.getElementById('contrast').value = 100;
  document.getElementById('saturation').value = 100;

  // Xóa active preset
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));

  applyFilter();
}

// ========== ÁP DỤNG FILTER ==========
function applyFilter() {
  filterCtx.clearRect(0, 0, filterCanvas.width, filterCanvas.height);

  // Áp dụng CSS filter lên canvas
  filterCtx.filter = `
    brightness(${currentBrightness}%)
    contrast(${currentContrast}%)
    saturate(${currentSaturation}%)
  `;

  filterCtx.drawImage(filterImage, 0, 0, filterCanvas.width, filterCanvas.height);
  filterCtx.filter = 'none';
}

// ========== THANH KÉO ==========
document.getElementById('brightness').addEventListener('input', (e) => {
  currentBrightness = e.target.value;
  clearPresetActive();
  applyFilter();
});

document.getElementById('contrast').addEventListener('input', (e) => {
  currentContrast = e.target.value;
  clearPresetActive();
  applyFilter();
});

document.getElementById('saturation').addEventListener('input', (e) => {
  currentSaturation = e.target.value;
  clearPresetActive();
  applyFilter();
});

// ========== PRESET ==========
const presets = {
  original: { brightness: 100, contrast: 100, saturation: 100 },
  document: { brightness: 110, contrast: 160, saturation: 20 },
  grayscale: { brightness: 100, contrast: 120, saturation: 0 },
  enhance:   { brightness: 105, contrast: 180, saturation: 10 },
};

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const preset = presets[btn.dataset.preset];
    if (!preset) return;

    currentBrightness = preset.brightness;
    currentContrast   = preset.contrast;
    currentSaturation = preset.saturation;

    document.getElementById('brightness').value = currentBrightness;
    document.getElementById('contrast').value   = currentContrast;
    document.getElementById('saturation').value = currentSaturation;

    clearPresetActive();
    btn.classList.add('active');
    applyFilter();
  });
});

function clearPresetActive() {
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
}

// ========== TIẾP THEO → OCR ==========
document.getElementById('apply-filter-btn').addEventListener('click', () => {
  // Lưu ảnh đã filter
  const outCanvas = document.createElement('canvas');
  outCanvas.width = filterCanvas.width;
  outCanvas.height = filterCanvas.height;
  const outCtx = outCanvas.getContext('2d');

  outCtx.filter = `
    brightness(${currentBrightness}%)
    contrast(${currentContrast}%)
    saturate(${currentSaturation}%)
  `;
  outCtx.drawImage(filterImage, 0, 0, filterCanvas.width, filterCanvas.height);
  outCtx.filter = 'none';

  const filteredImg = new Image();
  filteredImg.onload = () => {
    AppState.filteredImage = filteredImg;
    initOCR(filteredImg);
    showSection('ocr');
  };
  filteredImg.src = outCanvas.toDataURL('image/png');
});

// ========== QUAY LẠI ==========
document.getElementById('back-to-crop-btn').addEventListener('click', () => {
  showSection('crop');
});