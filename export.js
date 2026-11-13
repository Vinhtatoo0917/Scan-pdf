// ========== XUẤT FILE ==========
const exportCanvas = document.getElementById('export-canvas');
const exportCtx = exportCanvas.getContext('2d');

let exportImage = null;

// ========== KHỞI TẠO ==========
function initExport(img) {
  exportImage = img;

  const maxW = Math.min(700, window.innerWidth - 60);
  const ratio = img.height / img.width;
  exportCanvas.width = maxW;
  exportCanvas.height = maxW * ratio;

  exportCtx.drawImage(img, 0, 0, exportCanvas.width, exportCanvas.height);
}

// ========== XUẤT PDF ==========
document.getElementById('export-pdf-btn').addEventListener('click', () => {
  if (!exportImage) return;

  try {
    const { jsPDF } = window.jspdf;

    // Tạo canvas full resolution để xuất
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = exportImage.naturalWidth || exportImage.width;
    fullCanvas.height = exportImage.naturalHeight || exportImage.height;
    const fullCtx = fullCanvas.getContext('2d');
    fullCtx.drawImage(exportImage, 0, 0);

    const imgData = fullCanvas.toDataURL('image/jpeg', 0.92);

    // Tính tỉ lệ trang PDF
    const imgW = fullCanvas.width;
    const imgH = fullCanvas.height;
    const isLandscape = imgW > imgH;

    const pdf = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'px',
      format: [imgW, imgH],
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH);
    pdf.save('webscanner_' + getTimestamp() + '.pdf');

    showToast('✅ Đã xuất PDF thành công!');
  } catch (err) {
    showToast('❌ Lỗi xuất PDF: ' + err.message);
  }
});

// ========== XUẤT JPG ==========
document.getElementById('export-jpg-btn').addEventListener('click', () => {
  if (!exportImage) return;

  try {
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = exportImage.naturalWidth || exportImage.width;
    fullCanvas.height = exportImage.naturalHeight || exportImage.height;
    fullCanvas.getContext('2d').drawImage(exportImage, 0, 0);

    const link = document.createElement('a');
    link.download = 'webscanner_' + getTimestamp() + '.jpg';
    link.href = fullCanvas.toDataURL('image/jpeg', 0.92);
    link.click();

    showToast('✅ Đã xuất JPG thành công!');
  } catch (err) {
    showToast('❌ Lỗi xuất JPG: ' + err.message);
  }
});

// ========== XUẤT PNG ==========
document.getElementById('export-png-btn').addEventListener('click', () => {
  if (!exportImage) return;

  try {
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = exportImage.naturalWidth || exportImage.width;
    fullCanvas.height = exportImage.naturalHeight || exportImage.height;
    fullCanvas.getContext('2d').drawImage(exportImage, 0, 0);

    const link = document.createElement('a');
    link.download = 'webscanner_' + getTimestamp() + '.png';
    link.href = fullCanvas.toDataURL('image/png');
    link.click();

    showToast('✅ Đã xuất PNG thành công!');
  } catch (err) {
    showToast('❌ Lỗi xuất PNG: ' + err.message);
  }
});

// ========== TOAST THÔNG BÁO ==========
function showToast(message) {
  // Xóa toast cũ nếu có
  const old = document.getElementById('toast');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: #2b6cb0;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    z-index: 9999;
    animation: fadeInUp 0.3s ease;
  `;

  // Thêm animation CSS
  if (!document.getElementById('toast-style')) {
    const style = document.createElement('style');
    style.id = 'toast-style';
    style.textContent = `
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateX(-50%) translateY(16px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ========== HELPER ==========
function getTimestamp() {
  const now = new Date();
  return now.getFullYear()
    + String(now.getMonth() + 1).padStart(2, '0')
    + String(now.getDate()).padStart(2, '0')
    + '_'
    + String(now.getHours()).padStart(2, '0')
    + String(now.getMinutes()).padStart(2, '0')
    + String(now.getSeconds()).padStart(2, '0');
}