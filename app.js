// Initialize Lucide icons
lucide.createIcons();

// ===== State =====
const state = {
  images: [],
  exportQueue: [],
  selectedId: null,
  globalWidth: 1200,
  globalHeight: 800,
  lockAspectRatio: true,
  format: 'webp',
  quality: 0.85,
  resizeMode: 'dimensions',
  scale: 50
};

// ===== DOM References =====
const DOM = {
  fileInput: document.getElementById('file-input'),
  dropZone: document.getElementById('drop-zone'),
  imageGrid: document.getElementById('image-grid'),
  clearBtn: document.getElementById('clear-images-btn'),
  previewEmpty: document.getElementById('preview-panel-empty'),
  previewActive: document.getElementById('preview-panel-active'),
  mainPreviewImg: document.getElementById('main-preview-img'),
  inputW: document.getElementById('input-w'),
  inputH: document.getElementById('input-h'),
  toggleRatio: document.getElementById('toggle-ratio'),
  modeDim: document.getElementById('mode-dim'),
  modeScale: document.getElementById('mode-scale'),
  dimSettings: document.getElementById('dim-settings'),
  scaleSettings: document.getElementById('scale-settings'),
  inputScale: document.getElementById('input-scale'),
  scaleVal: document.getElementById('scale-val'),
  inputQ: document.getElementById('input-q'),
  qVal: document.getElementById('q-val'),
  qSettings: document.getElementById('q-settings'),
  fmtBtns: document.querySelectorAll('.fmt-btn'),
  addQueueBtn: document.getElementById('add-queue-btn'),
  addQueueAllBtn: document.getElementById('add-queue-all-btn'),
  queueSection: document.getElementById('queue-section'),
  queueGrid: document.getElementById('queue-grid'),
  queueCount: document.getElementById('queue-count'),
  dlAllBtn: document.getElementById('download-all-btn'),
  previewW: document.getElementById('preview-w'),
  previewH: document.getElementById('preview-h'),
  previewSize: document.getElementById('preview-size'),
  previewUnit: document.getElementById('preview-unit'),
  previewFormat: document.getElementById('preview-format'),
  previewQ: document.getElementById('preview-q'),
  inputPrefix: document.getElementById('input-prefix'),
  inputSuffix: document.getElementById('input-suffix'),
  namePreviewText: document.getElementById('name-preview-text'),
};

// ===== Utilities =====
function formatBytes(bytes) {
  if (!bytes) return ['0', 'B'];
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return [(bytes / Math.pow(k, i)).toFixed(2), sizes[i]];
}

function resizeImageBlob(file, width, height, format, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => resolve(blob), `image/${format === 'jpeg' ? 'jpeg' : format}`, quality);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// ===== Live Preview =====
async function updateLivePreview() {
  if (!state.selectedId) return;
  const imgData = state.images.find(img => img.id === state.selectedId);
  if (!imgData || !imgData.w) return;

  let tw = state.globalWidth;
  let th = state.globalHeight;

  if (state.resizeMode === 'scale') {
    tw = Math.round(imgData.w * (state.scale / 100));
    th = Math.round(imgData.h * (state.scale / 100));
  } else if (state.lockAspectRatio) {
    th = Math.round(tw * (imgData.h / imgData.w));
  }

  DOM.previewW.textContent = tw;
  DOM.previewH.textContent = th;
  DOM.previewFormat.textContent = state.format;

  if (state.format !== 'png') {
    DOM.previewQ.textContent = `Q:${Math.round(state.quality * 100)}%`;
    DOM.previewQ.style.display = 'block';
  } else {
    DOM.previewQ.style.display = 'none';
  }

  try {
    const blob = await resizeImageBlob(imgData.file, tw, th, state.format, state.quality);
    const [size, unit] = formatBytes(blob.size);
    DOM.previewSize.textContent = size;
    DOM.previewUnit.textContent = unit;
  } catch (e) {
    console.error(e);
  }
  updateNamePreview();
}

let previewTimeout;
function triggerPreviewUpdate() {
  clearTimeout(previewTimeout);
  previewTimeout = setTimeout(updateLivePreview, 150);
}

// ===== Render Images =====
function renderImages() {
  if (state.images.length === 0) {
    DOM.dropZone.classList.remove('hidden');
    DOM.imageGrid.classList.add('hidden');
    DOM.clearBtn.classList.add('hidden');
    DOM.previewEmpty.classList.remove('hidden');
    DOM.previewActive.classList.add('hidden');
    DOM.addQueueBtn.disabled = true;
    DOM.addQueueBtn.className = 'btn-add-queue disabled';
    DOM.addQueueAllBtn.disabled = true;
    DOM.addQueueAllBtn.className = 'btn-add-queue-all disabled';
    return;
  }

  DOM.dropZone.classList.add('hidden');
  DOM.imageGrid.classList.remove('hidden');
  DOM.clearBtn.classList.remove('hidden');

  DOM.imageGrid.innerHTML = '';
  state.images.forEach(img => {
    const isSelected = img.id === state.selectedId;
    const btn = document.createElement('button');
    btn.className = `image-thumb${isSelected ? ' selected' : ''}`;
    btn.onclick = () => { state.selectedId = img.id; renderImages(); triggerPreviewUpdate(); };

    btn.innerHTML = `
      <img src="${img.url}" class="thumb-img" alt="" />
      <div class="thumb-delete">
        <i data-lucide="x" class="icon-xs"></i>
      </div>
      ${isSelected ? '<div class="thumb-selected-border"></div>' : ''}
    `;

    btn.querySelector('.thumb-delete').onclick = (e) => {
      e.stopPropagation();
      state.images = state.images.filter(i => i.id !== img.id);
      if (state.selectedId === img.id) state.selectedId = state.images[0]?.id || null;
      renderImages();
      triggerPreviewUpdate();
    };

    DOM.imageGrid.appendChild(btn);
  });

  const addBtn = document.createElement('button');
  addBtn.onclick = () => DOM.fileInput.click();
  addBtn.className = 'add-thumb-btn';
  addBtn.innerHTML = `<i data-lucide="upload" class="icon-sm"></i><span>追加</span>`;
  DOM.imageGrid.appendChild(addBtn);

  if (state.selectedId) {
    DOM.previewEmpty.classList.add('hidden');
    DOM.previewActive.classList.remove('hidden');
    
    const imgData = state.images.find(i => i.id === state.selectedId);
    DOM.mainPreviewImg.src = imgData.url;

    // 画像が選ばれた瞬間に、入力欄の数値をその画像の元の実寸サイズ（実際の幅・高さ）に自動更新
    if (imgData && imgData.w) {
      state.globalWidth = imgData.w;
      state.globalHeight = imgData.h;
      DOM.inputW.value = imgData.w;
      DOM.inputH.value = imgData.h;
    }

    DOM.addQueueBtn.disabled = false;
    DOM.addQueueBtn.className = 'btn-add-queue enabled';
    DOM.addQueueAllBtn.disabled = false;
    DOM.addQueueAllBtn.className = 'btn-add-queue-all enabled';
    updateNamePreview();
  }
  lucide.createIcons();
}

// ===== Render Queue =====
function renderQueue() {
  if (state.exportQueue.length === 0) {
    DOM.queueSection.classList.add('hidden');
    return;
  }
  DOM.queueSection.classList.remove('hidden');
  DOM.queueCount.textContent = state.exportQueue.length;
  DOM.queueGrid.innerHTML = '';

  state.exportQueue.forEach((item, idx) => {
    const srcImg = state.images.find(i => i.id === item.srcId);
    const div = document.createElement('div');
    div.className = 'queue-item';
    div.innerHTML = `
      <button class="queue-remove">
        <i data-lucide="x" class="icon-xs"></i>
      </button>
      <div class="queue-thumb">
        <img src="${srcImg ? srcImg.url : ''}" alt="" />
      </div>
      <div class="queue-info">
        <div class="queue-info-top">
          <span class="queue-num">#${idx + 1}</span>
          <p class="queue-name">${item.name}</p>
        </div>
        <div class="queue-meta">
          <div class="queue-meta-item">
            <i data-lucide="maximize-2" class="icon-xs" style="color:var(--slate-300)"></i>
            <span>${item.tw}×${item.th}</span>
          </div>
          <div class="queue-meta-item">
            <div class="queue-dot"></div>
            <span class="queue-fmt">${item.fmt}</span>
          </div>
        </div>
        <button class="queue-dl-single">
          <i data-lucide="download" class="icon-xs"></i>
          この画像をダウンロード
        </button>
      </div>
    `;

    div.querySelector('.queue-remove').onclick = () => {
      state.exportQueue = state.exportQueue.filter(q => q.id !== item.id);
      renderQueue();
    };

    div.querySelector('.queue-dl-single').onclick = async () => {
      if (!srcImg) return;
      const blob = await resizeImageBlob(srcImg.file, item.tw, item.th, item.fmt, item.q);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = item.fmt === 'jpeg' ? 'jpg' : item.fmt;
      a.download = `${item.name}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    };

    DOM.queueGrid.appendChild(div);
  });
  lucide.createIcons();
}

// ===== File Input & Drag/Drop =====
DOM.fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
  files.forEach(file => {
    const id = Math.random().toString(36).substr(2, 9);
    const url = URL.createObjectURL(file);
    const imgObj = { id, file, url, name: file.name };
    state.images.push(imgObj);

    const img = new Image();
    img.onload = () => {
      imgObj.w = img.width;
      imgObj.h = img.height;
      if (!state.selectedId) {
        state.selectedId = id;
        renderImages();
        triggerPreviewUpdate();
      }
    };
    img.src = url;
  });
  if (files.length > 0) renderImages();
  DOM.fileInput.value = '';
});

DOM.dropZone.addEventListener('click', () => DOM.fileInput.click());
DOM.dropZone.addEventListener('dragover', (e) => e.preventDefault());
DOM.dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer.files) {
    DOM.fileInput.files = e.dataTransfer.files;
    DOM.fileInput.dispatchEvent(new Event('change'));
  }
});

DOM.clearBtn.addEventListener('click', () => {
  state.images = [];
  state.exportQueue = [];
  state.selectedId = null;
  renderImages();
  renderQueue();
});

// ===== Mode Switching =====
DOM.modeDim.onclick = () => {
  state.resizeMode = 'dimensions';
  DOM.modeDim.className = 'mode-btn active';
  DOM.modeScale.className = 'mode-btn';
  DOM.dimSettings.classList.remove('hidden');
  DOM.scaleSettings.classList.add('hidden');
  triggerPreviewUpdate();
};

DOM.modeScale.onclick = () => {
  state.resizeMode = 'scale';
  DOM.modeScale.className = 'mode-btn active';
  DOM.modeDim.className = 'mode-btn';
  DOM.scaleSettings.classList.remove('hidden');
  DOM.dimSettings.classList.add('hidden');
  triggerPreviewUpdate();
};

// ===== Aspect Ratio Toggle =====
DOM.toggleRatio.onclick = () => {
  state.lockAspectRatio = !state.lockAspectRatio;
  DOM.toggleRatio.className = `toggle-btn${state.lockAspectRatio ? ' active' : ''}`;
  DOM.toggleRatio.textContent = state.lockAspectRatio ? '固定' : '解除';

  DOM.inputH.disabled = false;
  DOM.inputH.placeholder = '';
  DOM.inputH.className = 'input-number';

  if (state.lockAspectRatio && state.selectedId) {
    const imgData = state.images.find(img => img.id === state.selectedId);
    if (imgData && imgData.w) {
      const h = Math.round(state.globalWidth * (imgData.h / imgData.w));
      state.globalHeight = h;
      DOM.inputH.value = h;
    }
  }
  triggerPreviewUpdate();
};

// ===== Input Listeners =====
DOM.inputW.oninput = (e) => {
  const w = parseInt(e.target.value) || 0;
  state.globalWidth = w;
  if (state.lockAspectRatio && state.selectedId) {
    const imgData = state.images.find(img => img.id === state.selectedId);
    if (imgData && imgData.w) {
      const h = Math.round(w * (imgData.h / imgData.w));
      state.globalHeight = h;
      DOM.inputH.value = h;
    }
  }
  triggerPreviewUpdate();
};

DOM.inputH.oninput = (e) => {
  const h = parseInt(e.target.value) || 0;
  state.globalHeight = h;
  if (state.lockAspectRatio && state.selectedId) {
    const imgData = state.images.find(img => img.id === state.selectedId);
    if (imgData && imgData.w) {
      const w = Math.round(h * (imgData.w / imgData.h));
      state.globalWidth = w;
      DOM.inputW.value = w;
    }
  }
  triggerPreviewUpdate();
};
DOM.inputScale.oninput = (e) => { state.scale = parseInt(e.target.value); DOM.scaleVal.textContent = state.scale; triggerPreviewUpdate(); };

// ===== Format Buttons =====
DOM.fmtBtns.forEach(btn => {
  btn.onclick = () => {
    state.format = btn.dataset.fmt;
    DOM.fmtBtns.forEach(b => b.className = 'fmt-btn');
    btn.className = 'fmt-btn active';
    DOM.qSettings.style.display = state.format === 'png' ? 'none' : 'block';
    triggerPreviewUpdate();
  };
});

// ===== Quality =====
DOM.inputQ.oninput = (e) => { state.quality = parseFloat(e.target.value); DOM.qVal.textContent = Math.round(state.quality * 100) + '%'; triggerPreviewUpdate(); };

// ===== Add to Queue =====
DOM.addQueueBtn.onclick = () => {
  const imgData = state.images.find(img => img.id === state.selectedId);
  if (!imgData) return;

  let tw = state.globalWidth;
  let th = state.globalHeight;

  if (state.resizeMode === 'scale') {
    tw = Math.round(imgData.w * (state.scale / 100));
    th = Math.round(imgData.h * (state.scale / 100));
  } else if (state.lockAspectRatio) {
    th = Math.round(tw * (imgData.h / imgData.w));
  }

  const prefix = DOM.inputPrefix.value.trim();
  const suffix = DOM.inputSuffix.value.trim();
  const originalName = imgData.name;
  const dotIndex = originalName.lastIndexOf('.');
  const baseName = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;
  const formattedName = `${prefix}${baseName}${suffix}`;

  state.exportQueue.push({
    id: Math.random().toString(36).substr(2, 9),
    srcId: imgData.id,
    name: formattedName,
    tw, th, fmt: state.format, q: state.quality
  });
  renderQueue();
};

// ===== Download All =====
DOM.dlAllBtn.onclick = async () => {
  if (state.exportQueue.length === 0) return;

  const origText = DOM.dlAllBtn.innerHTML;
  DOM.dlAllBtn.innerHTML = '<i data-lucide="refresh-cw" class="icon-sm animate-spin"></i><span>処理中...</span>';
  lucide.createIcons();

  const zip = new JSZip();
  const names = {};

  for (const item of state.exportQueue) {
    const srcImg = state.images.find(img => img.id === item.srcId);
    if (srcImg) {
      const blob = await resizeImageBlob(srcImg.file, item.tw, item.th, item.fmt, item.q);
      const baseName = item.name;
      names[baseName] = (names[baseName] || 0) + 1;
      const ext = item.fmt === 'jpeg' ? 'jpg' : item.fmt;
      const fileName = names[baseName] > 1 ? `${baseName}-${names[baseName]}.${ext}` : `${baseName}.${ext}`;
      zip.file(fileName, blob);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ImageResize_Export_${new Date().getTime()}.zip`;
  a.click();
  URL.revokeObjectURL(url);

  state.exportQueue = [];
  renderQueue();
  DOM.dlAllBtn.innerHTML = origText;
  lucide.createIcons();

  document.getElementById('success-toast').classList.remove('hidden');
  setTimeout(() => document.getElementById('success-toast').classList.add('hidden'), 5000);

  confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#000000', '#444444', '#888888'] });
};

// ===== Naming Rule Preview =====
function updateNamePreview() {
  const selectedImg = state.images.find(img => img.id === state.selectedId);
  if (!selectedImg || !DOM.namePreviewText) {
    if (DOM.namePreviewText) DOM.namePreviewText.textContent = '-';
    return;
  }
  const originalName = selectedImg.name;
  const dotIndex = originalName.lastIndexOf('.');
  const baseName = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;
  
  const prefix = DOM.inputPrefix.value;
  const suffix = DOM.inputSuffix.value;
  
  const ext = state.format === 'jpeg' ? 'jpg' : state.format;
  DOM.namePreviewText.textContent = `${prefix}${baseName}${suffix}.${ext}`;
}

DOM.inputPrefix.oninput = () => updateNamePreview();
DOM.inputSuffix.oninput = () => updateNamePreview();

// ===== Bulk Add to Queue =====
DOM.addQueueAllBtn.onclick = () => {
  if (state.images.length === 0) return;

  const prefix = DOM.inputPrefix.value.trim();
  const suffix = DOM.inputSuffix.value.trim();

  state.images.forEach(imgData => {
    let tw = state.globalWidth;
    let th = state.globalHeight;

    if (state.resizeMode === 'scale') {
      tw = Math.round(imgData.w * (state.scale / 100));
      th = Math.round(imgData.h * (state.scale / 100));
    } else if (state.lockAspectRatio) {
      th = Math.round(tw * (imgData.h / imgData.w));
    }

    const originalName = imgData.name;
    const dotIndex = originalName.lastIndexOf('.');
    const baseName = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;
    const formattedName = `${prefix}${baseName}${suffix}`;

    state.exportQueue.push({
      id: Math.random().toString(36).substr(2, 9),
      srcId: imgData.id,
      name: formattedName,
      tw, th, fmt: state.format, q: state.quality
    });
  });

  renderQueue();
};
