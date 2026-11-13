// ========== NHẬN DẠNG CHỮ (OCR) ==========
const ocrPreviewCanvas = document.getElementById('ocr-preview-canvas');
const ocrPreviewCtx = ocrPreviewCanvas.getContext('2d');
const ocrResult = document.getElementById('ocr-result');
const ocrLoading = document.getElementById('ocr-loading');
const ocrActions = document.getElementById('ocr-actions');

let ocrImage = null;

// ========== KHỞI TẠO ==========
function initOCR(img) {
  ocrImage = img;

  const maxW = Math.min(700, window.innerWidth - 60);
  const ratio = img.height / img.width;
  ocrPreviewCanvas.width = maxW;
  ocrPreviewCanvas.height = maxW * ratio;

  ocrPreviewCtx.drawImage(img, 0, 0, ocrPreviewCanvas.width, ocrPreviewCanvas.height);

  // Reset
  ocrResult.hidden = true;
  ocrResult.value = '';
  ocrActions.hidden = true;
  ocrLoading.hidden = true;
}

// ========== CHẠY OCR ==========
document.getElementById('run-ocr-btn').addEventListener('click', async () => {
  if (!ocrImage) return;

  ocrLoading.hidden = false;
  ocrResult.hidden = true;
  ocrActions.hidden = true;
  document.getElementById('run-ocr-btn').disabled = true;

  try {
    const worker = await Tesseract.createWorker('vie+eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const percent = Math.round(m.progress * 100);
          ocrLoading.querySelector('p').textContent = `Đang nhận dạng... ${percent}%`;
        }
      }
    });

    // Lấy ảnh từ canvas dưới dạng blob
    const imageData = ocrPreviewCanvas.toDataURL('image/png');

    const result = await worker.recognize(imageData);
    await worker.terminate();

    const text = result.data.text.trim();

    ocrResult.value = text || '(Không nhận dạng được chữ nào)';
    ocrResult.hidden = false;
    ocrActions.hidden = false;

  } catch (err) {
    ocrResult.value = 'Lỗi nhận dạng: ' + err.message;
    ocrResult.hidden = false;
  } finally {
    ocrLoading.hidden = true;
    document.getElementById('run-ocr-btn').disabled = false;
  }
});

// ========== SAO CHÉP CHỮ ==========
document.getElementById('copy-text-btn').addEventListener('click', () => {
  if (!ocrResult.value) return;

  navigator.clipboard.writeText(ocrResult.value)
    .then(() => {
      const btn = document.getElementById('copy-text-btn');
      const original = btn.textContent;
      btn.textContent = '✅ Đã sao chép!';
      setTimeout(() => btn.textContent = original, 2000);
    })
    .catch(() => {
      // Fallback nếu clipboard API không hoạt động
      ocrResult.select();
      document.execCommand('copy');
    });
});

// ========== TIẾP THEO → XUẤT FILE ==========
document.getElementById('go-export-btn').addEventListener('click', () => {
  initExport(AppState.filteredImage);
  showSection('export');
});