// ========== CẮT VIỀN TÀI LIỆU ==========
const cropCanvas = document.getElementById('crop-canvas');
const cropCtx = cropCanvas.getContext('2d');

let cropImage = null;
let isDragging = false;
let dragPointIndex = -1;

// 4 góc cắt (tọa độ trên canvas)
let cropPoints = [];

// Scale giữa ảnh gốc và canvas hiển thị
let scaleX = 1;
let scaleY = 1;

const POINT_RADIUS = 10;

// ========== KHỞI TẠO ==========
function initCrop(img) {
  cropImage = img;

  // Giới hạn kích thước canvas hiển thị
  const maxW = Math.min(700, window.innerWidth - 60);
  const ratio = img.height / img.width;
  cropCanvas.width = maxW;
  cropCanvas.height = maxW * ratio;

  scaleX = cropCanvas.width / img.width;
  scaleY = cropCanvas.height / img.height;

  // Mặc định 4 góc = toàn bộ ảnh (có padding nhỏ)
  const pad = 20;
  cropPoints = [
    { x: pad, y: pad },                                          // trên trái
    { x: cropCanvas.width - pad, y: pad },                       // trên phải
    { x: cropCanvas.width - pad, y: cropCanvas.height - pad },   // dưới phải
    { x: pad, y: cropCanvas.height - pad },                      // dưới trái
  ];

  drawCrop();
}

// ========== VẼ ==========
function drawCrop() {
  cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);

  // Vẽ ảnh nền
  cropCtx.drawImage(cropImage, 0, 0, cropCanvas.width, cropCanvas.height);

  // Làm tối vùng ngoài
  cropCtx.fillStyle = 'rgba(0,0,0,0.45)';
  cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);

  // Vẽ vùng cắt sáng
  cropCtx.save();
  cropCtx.beginPath();
  cropCtx.moveTo(cropPoints[0].x, cropPoints[0].y);
  cropPoints.forEach(p => cropCtx.lineTo(p.x, p.y));
  cropCtx.closePath();
  cropCtx.clip();
  cropCtx.drawImage(cropImage, 0, 0, cropCanvas.width, cropCanvas.height);
  cropCtx.restore();

  // Vẽ đường viền
  cropCtx.strokeStyle = '#63b3ed';
  cropCtx.lineWidth = 2;
  cropCtx.beginPath();
  cropCtx.moveTo(cropPoints[0].x, cropPoints[0].y);
  cropPoints.forEach(p => cropCtx.lineTo(p.x, p.y));
  cropCtx.closePath();
  cropCtx.stroke();

  // Vẽ 4 góc kéo
  cropPoints.forEach((p, i) => {
    cropCtx.beginPath();
    cropCtx.arc(p.x, p.y, POINT_RADIUS, 0, Math.PI * 2);
    cropCtx.fillStyle = i === dragPointIndex ? '#2b6cb0' : '#90cdf4';
    cropCtx.fill();
    cropCtx.strokeStyle = 'white';
    cropCtx.lineWidth = 2;
    cropCtx.stroke();
  });
}

// ========== KÉO THẢ ĐIỂM ==========
function getCanvasPos(e) {
  const rect = cropCanvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - rect.left) * (cropCanvas.width / rect.width),
    y: (clientY - rect.top) * (cropCanvas.height / rect.height),
  };
}

function findNearestPoint(pos) {
  for (let i = 0; i < cropPoints.length; i++) {
    const dx = cropPoints[i].x - pos.x;
    const dy = cropPoints[i].y - pos.y;
    if (Math.sqrt(dx * dx + dy * dy) < POINT_RADIUS * 2) return i;
  }
  return -1;
}

// Mouse
cropCanvas.addEventListener('mousedown', (e) => {
  const pos = getCanvasPos(e);
  dragPointIndex = findNearestPoint(pos);
  if (dragPointIndex !== -1) isDragging = true;
});

cropCanvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const pos = getCanvasPos(e);
  cropPoints[dragPointIndex].x = Math.max(0, Math.min(cropCanvas.width, pos.x));
  cropPoints[dragPointIndex].y = Math.max(0, Math.min(cropCanvas.height, pos.y));
  drawCrop();
});

cropCanvas.addEventListener('mouseup', () => {
  isDragging = false;
  dragPointIndex = -1;
  drawCrop();
});

// Touch
cropCanvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const pos = getCanvasPos(e);
  dragPointIndex = findNearestPoint(pos);
  if (dragPointIndex !== -1) isDragging = true;
}, { passive: false });

cropCanvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!isDragging) return;
  const pos = getCanvasPos(e);
  cropPoints[dragPointIndex].x = Math.max(0, Math.min(cropCanvas.width, pos.x));
  cropPoints[dragPointIndex].y = Math.max(0, Math.min(cropCanvas.height, pos.y));
  drawCrop();
}, { passive: false });

cropCanvas.addEventListener('touchend', () => {
  isDragging = false;
  dragPointIndex = -1;
  drawCrop();
});

// ========== XÁC NHẬN CẮT ==========
document.getElementById('apply-crop-btn').addEventListener('click', () => {
  // Chuyển tọa độ canvas → tọa độ ảnh gốc
  const realPoints = cropPoints.map(p => ({
    x: p.x / scaleX,
    y: p.y / scaleY,
  }));

  // Tính kích thước ảnh đầu ra
  const width = Math.max(
    dist(realPoints[0], realPoints[1]),
    dist(realPoints[3], realPoints[2])
  );
  const height = Math.max(
    dist(realPoints[0], realPoints[3]),
    dist(realPoints[1], realPoints[2])
  );

  // Perspective transform (dùng canvas transform đơn giản)
  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const outCtx = outCanvas.getContext('2d');

  // Vẽ ảnh đã được warp (transform đơn giản bằng clip + drawImage)
  outCtx.drawImage(
    cropImage,
    Math.min(...realPoints.map(p => p.x)),
    Math.min(...realPoints.map(p => p.y)),
    width, height,
    0, 0, width, height
  );

  // Lưu ảnh đã cắt
  const croppedImg = new Image();
  croppedImg.onload = () => {
    AppState.croppedImage = croppedImg;
    initFilter(croppedImg);
    showSection('filter');
  };
  croppedImg.src = outCanvas.toDataURL('image/png');
});

// ========== QUAY LẠI ==========
document.getElementById('reset-crop-btn').addEventListener('click', () => {
  showSection('upload');
});

// ========== HELPER ==========
function dist(a, b) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}