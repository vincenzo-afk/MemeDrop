/* ===================================================
   MEMEDROP — script.js
   Vanilla JS, fully functional meme generator
   =================================================== */

'use strict';

/* ---------- DOM References ---------- */
const memeGrid      = document.getElementById('memeGrid');
const searchInput   = document.getElementById('searchInput');
const searchClear   = document.getElementById('searchClear');
const loadMoreBtn   = document.getElementById('loadMoreBtn');
const themeToggle   = document.getElementById('themeToggle');
const themeIcon     = themeToggle.querySelector('.theme-icon');
const modalOverlay  = document.getElementById('modalOverlay');
const modalClose    = document.getElementById('modalClose');
const memeCanvas    = document.getElementById('memeCanvas');
const ctx           = memeCanvas.getContext('2d');
const topTextInput  = document.getElementById('topText');
const bottomTextInput = document.getElementById('bottomText');
const fontSizeInput = document.getElementById('fontSize');
const fontSizeVal   = document.getElementById('fontSizeVal');
const fontColorInput = document.getElementById('fontColor');
const imageUpload   = document.getElementById('imageUpload');
const fileNameSpan  = document.getElementById('fileName');
const downloadBtn   = document.getElementById('downloadBtn');
const copyBtn       = document.getElementById('copyBtn');
const toast         = document.getElementById('toast');
const errorMsg      = document.getElementById('errorMsg');
const emptyMsg      = document.getElementById('emptyMsg');
const retryBtn      = document.getElementById('retryBtn');
const tabBtns       = document.querySelectorAll('.tab-btn');

/* ---------- Global State ---------- */
let currentTab    = 'fresh';
let currentMemes  = [];   // Full loaded memes for current tab
let baseImage     = null; // Current HTMLImageElement for canvas
let toastTimer    = null;

/* ---------- Draggable Text State ---------- */
let textState = {
  top:    { x: 250, y: 50,  lines: [], fontSize: 36 },
  bottom: { x: 250, y: 450, lines: [], fontSize: 36 }
};
let isDragging   = false;
let dragTarget   = null; // 'top' or 'bottom'
let startMouseX  = 0;
let startMouseY  = 0;

/* =====================================================
   UTILITY — Time Ago
   ===================================================== */
function getTimeAgo(utcSeconds) {
  if (!utcSeconds) return null;
  const now  = Math.floor(Date.now() / 1000);
  const diff = now - utcSeconds;
  if (diff < 60)          return 'Just now';
  if (diff < 3600)        return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)       return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getBadgeClass(utcSeconds) {
  if (!utcSeconds) return 'badge-classic';
  const diff = Math.floor(Date.now() / 1000) - utcSeconds;
  if (diff < 3600)  return 'badge-fresh';
  if (diff < 86400) return 'badge-recent';
  return 'badge-old';
}

function getBadgeLabel(utcSeconds) {
  if (!utcSeconds) return 'Classic';
  const diff = Math.floor(Date.now() / 1000) - utcSeconds;
  if (diff < 3600)  return '🟢 Fresh';
  if (diff < 86400) return '🟡 Recent';
  return '⚫ Old';
}

/* =====================================================
   API — Fetch Functions
   ===================================================== */
async function fetchFreshMemes() {
  const res  = await fetch('https://meme-api.com/gimme/20');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.memes.map(m => ({
    title:    m.title,
    url:      m.url,
    postLink: m.postLink,
    ups:      m.ups,
    created:  m.created_utc || null,
    source:   'reddit',
  }));
}

async function fetchSubredditMemes(subreddit) {
  const res  = await fetch(`https://meme-api.com/gimme/${subreddit}/10`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.memes.map(m => ({
    title:    m.title,
    url:      m.url,
    postLink: m.postLink,
    ups:      m.ups,
    created:  m.created_utc || null,
    source:   'reddit',
  }));
}

async function fetchClassicMemes() {
  const res  = await fetch('https://api.imgflip.com/get_memes');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.data.memes.map(m => ({
    title:   m.name,
    url:     m.url,
    postLink: null,
    ups:     null,
    created: null,
    source:  'classic',
  }));
}

async function fetchForTab(tab) {
  switch (tab) {
    case 'fresh':      return fetchFreshMemes();
    case 'programmer': return fetchSubredditMemes('ProgrammerHumor');
    case 'dank':       return fetchSubredditMemes('dankmemes');
    case 'classic':    return fetchClassicMemes();
    default:           return fetchFreshMemes();
  }
}

/* =====================================================
   SKELETON LOADERS
   ===================================================== */
function showSkeletons() {
  memeGrid.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const sk = document.createElement('div');
    sk.className = 'skeleton-card';
    sk.innerHTML = `
      <div class="skeleton-img"></div>
      <div class="skeleton-info">
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
      </div>
    `;
    memeGrid.appendChild(sk);
  }
}

function hideSkeletons() {
  // Skeletons are replaced by renderMemeCards / error state
}

/* =====================================================
   CARD CREATION
   ===================================================== */
function createMemeCard(meme) {
  const card = document.createElement('div');
  card.className = 'meme-card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Edit meme: ${meme.title}`);

  const badgeClass = getBadgeClass(meme.created);
  const badgeLabel = getBadgeLabel(meme.created);

  card.innerHTML = `
    <div class="card-img-wrap">
      <img
        class="card-img"
        src="${escapeHtml(meme.url)}"
        alt="${escapeHtml(meme.title)}"
        loading="lazy"
        crossOrigin="anonymous"
      />
    </div>
    <div class="card-info">
      <span class="card-title">${escapeHtml(meme.title)}</span>
      <span class="badge ${badgeClass}">${badgeLabel}</span>
    </div>
  `;

  // Click handler — open editor
  const openEdit = () => openEditor(meme.url);
  card.addEventListener('click', openEdit);
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openEdit();
    }
  });

  // Handle broken images
  const img = card.querySelector('.card-img');
  img.addEventListener('error', () => {
    img.parentElement.innerHTML = `<div style="width:100%;aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;color:#555;font-size:32px;background:#111;">🖼️</div>`;
  });

  return card;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* =====================================================
   RENDERING
   ===================================================== */
function renderMemeCards(memesArray) {
  memeGrid.innerHTML = '';
  errorMsg.hidden = true;
  emptyMsg.hidden = true;

  if (!memesArray || memesArray.length === 0) {
    emptyMsg.hidden = false;
    return;
  }

  const frag = document.createDocumentFragment();
  memesArray.forEach(meme => frag.appendChild(createMemeCard(meme)));
  memeGrid.appendChild(frag);
}

function appendMemeCards(memesArray) {
  if (!memesArray || memesArray.length === 0) return;
  const frag = document.createDocumentFragment();
  memesArray.forEach(meme => frag.appendChild(createMemeCard(meme)));
  memeGrid.appendChild(frag);
}

function showError() {
  memeGrid.innerHTML = '';
  errorMsg.hidden = false;
  emptyMsg.hidden = true;
}

/* =====================================================
   SEARCH FILTERING
   ===================================================== */
function filterMemesBySearch(query) {
  if (!query || query.trim() === '') {
    renderMemeCards(currentMemes);
    return;
  }
  const q = query.trim().toLowerCase();
  const filtered = currentMemes.filter(m =>
    m.title && m.title.toLowerCase().includes(q)
  );
  if (filtered.length === 0) {
    memeGrid.innerHTML = '';
    emptyMsg.hidden = false;
  } else {
    emptyMsg.hidden = true;
    renderMemeCards(filtered);
  }
}

/* =====================================================
   TAB LOADING
   ===================================================== */
async function loadTab(tab) {
  currentTab = tab;
  searchInput.value = '';
  searchClear.classList.remove('visible');
  showSkeletons();
  errorMsg.hidden = true;
  emptyMsg.hidden = true;
  loadMoreBtn.disabled = false;

  try {
    const memes = await fetchForTab(tab);
    currentMemes = memes;
    renderMemeCards(currentMemes);
  } catch (err) {
    console.error('Failed to load memes:', err);
    showError();
  }
}

/* =====================================================
   CANVAS DRAWING
   ===================================================== */

/**
 * Wraps text to fit within maxWidth on the canvas.
 * Returns array of lines.
 */
function wrapText(text, maxWidth, fontSize) {
  const words = text.split(' ');
  const lines  = [];
  let current  = '';

  ctx.font = `900 ${fontSize}px Impact, 'Arial Narrow', sans-serif`;

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Using a proxy for external images to ensure CORS headers are present.
 * This prevents "tainted canvas" errors when downloading/copying.
 */
function getProxiedUrl(url) {
  if (!url) return url;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  // images.weserv.nl is a reliable, high-performance image proxy
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
}

function drawMemeText(text, id, fontSize, color) {
  if (!text.trim()) {
    textState[id].lines = [];
    return;
  }

  const canvasW  = memeCanvas.width;
  const padding  = 20;
  const maxWidth = canvasW - padding * 2;

  ctx.font        = `900 ${fontSize}px Impact, 'Arial Narrow', sans-serif`;
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';

  const lines     = wrapText(text.toUpperCase(), maxWidth, fontSize);
  const lineH     = fontSize * 1.15;
  
  textState[id].lines    = lines;
  textState[id].fontSize = fontSize;

  lines.forEach((line, i) => {
    const y = textState[id].y + (i - (lines.length - 1) / 2) * lineH;
    const x = textState[id].x;

    // Black stroke (outline)
    ctx.lineWidth   = Math.max(3, fontSize / 10);
    ctx.strokeStyle = '#000000';
    ctx.lineJoin    = 'round';
    ctx.strokeText(line, x, y);

    // Fill
    ctx.fillStyle = color;
    ctx.fillText(line, x, y);
  });
}

function drawMeme() {
  const canvasW = memeCanvas.width;
  const canvasH = memeCanvas.height;

  ctx.clearRect(0, 0, canvasW, canvasH);

  if (baseImage) {
    // Draw image cover-fit
    const imgW = baseImage.naturalWidth  || baseImage.width;
    const imgH = baseImage.naturalHeight || baseImage.height;
    const scale = Math.max(canvasW / imgW, canvasH / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const offsetX = (canvasW - drawW) / 2;
    const offsetY = (canvasH - drawH) / 2;
    ctx.drawImage(baseImage, offsetX, offsetY, drawW, drawH);
  } else {
    // Blank black background
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  const fontSize = parseInt(fontSizeInput.value, 10);
  const color    = fontColorInput.value;
  const topText  = topTextInput.value;
  const botText  = bottomTextInput.value;

  drawMemeText(topText, 'top', fontSize, color);
  drawMemeText(botText, 'bottom', fontSize, color);

  // Draw a subtle hint when dragging or hovering? 
  // (Optional: could add a focus border)
}

/* =====================================================
   EDITOR — Open / Close
   ===================================================== */
function loadImageToCanvas(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Use proxy for all external URLs to avoid CORS "Tainted Canvas" issues
    const proxiedUrl = getProxiedUrl(url);
    
    img.crossOrigin = 'anonymous';
    img.onload  = () => { baseImage = img; resolve(); };
    img.onerror = () => {
      // Fallback if proxy fails
      const img2 = new Image();
      img2.onload  = () => { baseImage = img2; resolve(); };
      img2.onerror = reject;
      img2.src = url;
    };
    img.src = proxiedUrl;
  });
}

async function openEditor(imageUrl) {
  // Reset inputs
  topTextInput.value    = '';
  bottomTextInput.value = '';
  fontSizeInput.value   = '36';
  fontSizeVal.textContent = '36';
  fontColorInput.value  = '#ffffff';
  imageUpload.value     = '';
  fileNameSpan.textContent = 'No file chosen';

  // Reset positions
  textState.top.x = 250;
  textState.top.y = 50;
  textState.bottom.x = 250;
  textState.bottom.y = 450;

  // Show modal first so canvas is visible
  modalOverlay.hidden = false;
  document.body.style.overflow = 'hidden';

  // Draw loading state
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, memeCanvas.width, memeCanvas.height);
  ctx.fillStyle = '#555555';
  ctx.font = '18px DM Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Loading image...', memeCanvas.width / 2, memeCanvas.height / 2);

  try {
    await loadImageToCanvas(imageUrl);
  } catch (e) {
    baseImage = null;
    console.warn('Could not load image for canvas:', e);
  }

  drawMeme();
}

function closeEditor() {
  modalOverlay.hidden = true;
  document.body.style.overflow = '';
  ctx.clearRect(0, 0, memeCanvas.width, memeCanvas.height);
  baseImage = null;
}

/* =====================================================
   DOWNLOAD & COPY
   ===================================================== */
function downloadMeme() {
  try {
    const dataUrl = memeCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `memedrop-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('✅ Downloaded!');
  } catch (e) {
    console.error('Download failed:', e);
    showToast('❌ Download failed (CORS). Try a different image.');
  }
}

async function copyMeme() {
  try {
    const blob = await new Promise(resolve => memeCanvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Canvas is empty');
    const item = new ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([item]);
    showToast('📋 Copied to clipboard!');
  } catch (e) {
    console.error('Copy failed:', e);
    showToast('❌ Copy failed. Try downloading instead.');
  }
}

/* =====================================================
   TOAST
   ===================================================== */
function showToast(message) {
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = setTimeout(() => {
    toast.classList.remove('visible');
  }, 2500);
}

/* =====================================================
   THEME TOGGLE
   ===================================================== */
function applyTheme(isLight) {
  if (isLight) {
    document.body.classList.add('light-mode');
    themeIcon.textContent = '🌙';
    themeToggle.title = 'Switch to Dark Mode';
  } else {
    document.body.classList.remove('light-mode');
    themeIcon.textContent = '☀️';
    themeToggle.title = 'Switch to Light Mode';
  }
}

function toggleTheme() {
  const isLight = !document.body.classList.contains('light-mode');
  applyTheme(isLight);
  localStorage.setItem('memedrop-theme', isLight ? 'light' : 'dark');
}

/* =====================================================
   EVENT LISTENERS
   ===================================================== */

// --- Theme Toggle ---
themeToggle.addEventListener('click', toggleTheme);

// --- Filter Tabs ---
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    loadTab(btn.dataset.tab);
  });
});

// --- Search ---
searchInput.addEventListener('input', () => {
  const q = searchInput.value;
  if (q.length > 0) {
    searchClear.classList.add('visible');
  } else {
    searchClear.classList.remove('visible');
  }
  filterMemesBySearch(q);
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.classList.remove('visible');
  filterMemesBySearch('');
  searchInput.focus();
});

// --- Load More ---
loadMoreBtn.addEventListener('click', async () => {
  loadMoreBtn.disabled = true;
  loadMoreBtn.innerHTML = '<span class="loading-spinner"></span> Loading...';

  try {
    const more = await fetchForTab(currentTab);
    // Deduplicate by URL
    const existingUrls = new Set(currentMemes.map(m => m.url));
    const fresh = more.filter(m => !existingUrls.has(m.url));
    if (fresh.length > 0) {
      currentMemes = [...currentMemes, ...fresh];
      appendMemeCards(fresh);
      // If search is active, re-filter
      if (searchInput.value.trim()) filterMemesBySearch(searchInput.value);
    } else {
      showToast('No new memes found. Try another tab!');
    }
  } catch (e) {
    console.error('Load more failed:', e);
    showToast('❌ Failed to load more.');
  }

  loadMoreBtn.innerHTML = 'Load More Memes';
  loadMoreBtn.disabled = false;
});

// --- Retry Button ---
retryBtn.addEventListener('click', () => loadTab(currentTab));

// --- Modal Close Button ---
modalClose.addEventListener('click', closeEditor);

// --- Click outside modal card to close ---
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeEditor();
});

// --- Canvas inputs ---
topTextInput.addEventListener('input', drawMeme);
bottomTextInput.addEventListener('input', drawMeme);

fontSizeInput.addEventListener('input', () => {
  fontSizeVal.textContent = fontSizeInput.value;
  drawMeme();
});

fontColorInput.addEventListener('input', drawMeme);

// --- File Upload ---
imageUpload.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  fileNameSpan.textContent = file.name.length > 28
    ? file.name.substring(0, 25) + '...'
    : file.name;

  const reader = new FileReader();
  reader.onload = evt => {
    const img = new Image();
    img.onload = () => {
      baseImage = img;
      drawMeme();
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
});

// --- Download & Copy ---
downloadBtn.addEventListener('click', downloadMeme);
copyBtn.addEventListener('click', copyMeme);

// --- Drag and Drop on Canvas ---
function getMousePos(e) {
  const rect = memeCanvas.getBoundingClientRect();
  const scaleX = memeCanvas.width / rect.width;
  const scaleY = memeCanvas.height / rect.height;
  
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function isMouseOverText(pos, id) {
  const state = textState[id];
  if (state.lines.length === 0) return false;

  const lineH = state.fontSize * 1.15;
  const totalH = state.lines.length * lineH;
  
  // Rough bounding box check
  const halfH = totalH / 2;
  const width = 400; // Assume a reasonable width for hit detection
  
  return (
    pos.x > state.x - width/2 &&
    pos.x < state.x + width/2 &&
    pos.y > state.y - halfH &&
    pos.y < state.y + halfH
  );
}

function handleMouseDown(e) {
  const pos = getMousePos(e);
  
  if (isMouseOverText(pos, 'top')) {
    isDragging = true;
    dragTarget = 'top';
  } else if (isMouseOverText(pos, 'bottom')) {
    isDragging = true;
    dragTarget = 'bottom';
  }

  if (isDragging) {
    startMouseX = pos.x;
    startMouseY = pos.y;
    memeCanvas.style.cursor = 'grabbing';
  }
}

function handleMouseMove(e) {
  const pos = getMousePos(e);

  if (isDragging) {
    const dx = pos.x - startMouseX;
    const dy = pos.y - startMouseY;
    
    textState[dragTarget].x += dx;
    textState[dragTarget].y += dy;
    
    startMouseX = pos.x;
    startMouseY = pos.y;
    
    drawMeme();
  } else {
    // Update cursor
    if (isMouseOverText(pos, 'top') || isMouseOverText(pos, 'bottom')) {
      memeCanvas.style.cursor = 'move';
    } else {
      memeCanvas.style.cursor = 'default';
    }
  }
}

function handleMouseUp() {
  isDragging = false;
  dragTarget = null;
  memeCanvas.style.cursor = 'default';
}

memeCanvas.addEventListener('mousedown', handleMouseDown);
window.addEventListener('mousemove', handleMouseMove);
window.addEventListener('mouseup', handleMouseUp);

// Touch support
memeCanvas.addEventListener('touchstart', e => {
  if (e.target === memeCanvas) e.preventDefault();
  handleMouseDown(e);
}, { passive: false });
window.addEventListener('touchmove', e => {
  if (isDragging) e.preventDefault();
  handleMouseMove(e);
}, { passive: false });
window.addEventListener('touchend', handleMouseUp);

// --- Keyboard Shortcuts ---
document.addEventListener('keydown', e => {
  // Escape closes modal
  if (e.key === 'Escape' && !modalOverlay.hidden) {
    closeEditor();
    return;
  }
  // D triggers download when modal is open (and not typing)
  if (e.key === 'd' || e.key === 'D') {
    const tag = document.activeElement.tagName.toLowerCase();
    if (!modalOverlay.hidden && tag !== 'input' && tag !== 'textarea') {
      e.preventDefault();
      downloadMeme();
    }
  }
});

/* =====================================================
   INIT
   ===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme
  const saved = localStorage.getItem('memedrop-theme');
  applyTheme(saved === 'light');

  // Load initial memes
  (async () => {
    showSkeletons();
    try {
      const memes = await fetchFreshMemes();
      currentMemes = memes;
      renderMemeCards(currentMemes);
    } catch (err) {
      console.error('Initial load failed:', err);
      showError();
    }
  })();
});