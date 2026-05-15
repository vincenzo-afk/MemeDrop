'use strict';

/* =====================================================
   DOM REFERENCES
   ===================================================== */
const memeGrid        = document.getElementById('memeGrid');
const searchInput     = document.getElementById('searchInput');
const searchClear     = document.getElementById('searchClear');
const loadMoreBtn     = document.getElementById('loadMoreBtn');
const loadMoreWrap    = document.getElementById('loadMoreWrap');
const themeToggle     = document.getElementById('themeToggle');
const themeIcon       = themeToggle.querySelector('.theme-icon');
const modalOverlay    = document.getElementById('modalOverlay');
const modalClose      = document.getElementById('modalClose');
const memeCanvas      = document.getElementById('memeCanvas');
const ctx             = memeCanvas.getContext('2d');
const topTextInput    = document.getElementById('topText');
const bottomTextInput = document.getElementById('bottomText');
const fontSizeInput   = document.getElementById('fontSize');
const fontSizeVal     = document.getElementById('fontSizeVal');
const fontColorInput  = document.getElementById('fontColor');
const imageUpload     = document.getElementById('imageUpload');
const fileNameSpan    = document.getElementById('fileName');
const downloadBtn     = document.getElementById('downloadBtn');
const copyBtn         = document.getElementById('copyBtn');
const saveGalleryBtn  = document.getElementById('saveGalleryBtn');
const toast           = document.getElementById('toast');
const errorMsg        = document.getElementById('errorMsg');
const emptyMsg        = document.getElementById('emptyMsg');
const retryBtn        = document.getElementById('retryBtn');
const tabBtns         = document.querySelectorAll('.tab-btn');
const counterVal      = document.getElementById('counterVal');
const memeCounter     = document.getElementById('memeCounter');
const gifBadge        = document.getElementById('gifBadge');
const styleOutlineBtn = document.getElementById('styleOutline');
const styleShadowBtn  = document.getElementById('styleShadow');
const filterPills     = document.getElementById('filterPills');
const stickerRow      = document.getElementById('stickerRow');
const clearStickersBtn= document.getElementById('clearStickers');
const chainBtn        = document.getElementById('chainBtn');
const clearChainBtn   = document.getElementById('clearChainBtn');
const chainImageUrl   = document.getElementById('chainImageUrl');
const shareBtn        = document.getElementById('shareBtn');
const gallerySection  = document.getElementById('gallerySection');
const galleryEmpty    = document.getElementById('galleryEmpty');
const galleryGrid     = document.getElementById('galleryGrid');

/* =====================================================
   GLOBAL STATE
   ===================================================== */
let currentTab    = 'fresh';
let currentMemes  = [];
let baseImage     = null;
let chainImage    = null;   // second panel image
let toastTimer    = null;
let sessionCount  = 0;
let textShadow    = false;  // false = outline, true = drop-shadow
let activeFilter  = 'none';
let stickers      = [];     // [{emoji, x, y, size}]
let currentImageUrl = '';

/* Draggable items: text labels + stickers share one system */
let isDragging  = false;
let dragTarget  = null; // 'top' | 'bottom' | sticker index number
let startMouseX = 0;
let startMouseY = 0;

let textState = {
  top:    { x: 250, y: 44,  lines: [], fontSize: 36 },
  bottom: { x: 250, y: 456, lines: [], fontSize: 36 },
};

/* =====================================================
   UTILITIES
   ===================================================== */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getProxiedUrl(url) {
  if (!url) return url;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
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

function showToast(message) {
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2800);
}

function bumpCounter() {
  sessionCount++;
  counterVal.textContent = sessionCount;
  memeCounter.classList.remove('bump');
  void memeCounter.offsetWidth; // reflow to restart animation
  memeCounter.classList.add('bump');
}

/* =====================================================
   API — FETCH
   ===================================================== */
function mapMeme(m) {
  return {
    title:     m.title,
    url:       m.url,
    postLink:  m.postLink || null,
    ups:       m.ups      || 0,
    created:   m.created_utc || null,
    source:    'reddit',
    subreddit: m.subreddit || '',
    author:    m.author   || '',
  };
}

async function fetchFreshMemes() {
  const res  = await fetch('https://meme-api.com/gimme/20');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.memes.map(mapMeme);
}

async function fetchTrendingMemes() {
  const res  = await fetch('https://meme-api.com/gimme/40');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.memes.map(mapMeme).sort((a, b) => b.ups - a.ups);
}

async function fetchSubredditMemes(subreddit) {
  const res  = await fetch(`https://meme-api.com/gimme/${subreddit}/20`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.memes.map(mapMeme);
}

async function fetchClassicMemes() {
  const res  = await fetch('https://api.imgflip.com/get_memes');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.data.memes.map(m => ({
    title: m.name, url: m.url, postLink: null, ups: null, created: null, source: 'classic',
  }));
}

async function fetchForTab(tab) {
  switch (tab) {
    case 'fresh':      return fetchFreshMemes();
    case 'trending':   return fetchTrendingMemes();
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
    sk.innerHTML = `<div class="skeleton-img"></div><div class="skeleton-info"><div class="skeleton-line"></div><div class="skeleton-line"></div></div>`;
    memeGrid.appendChild(sk);
  }
}

/* =====================================================
   CARD CREATION
   ===================================================== */

/**
 * Turns a raw Reddit title into something readable.
 * If the title is just the subreddit slug (e.g. "me_irl", "ProgrammerHumor")
 * we convert the slug to Title Case words instead.
 */
function formatMemeTitle(title, subreddit) {
  if (!title) return 'Meme';

  // Normalise: strip underscores, lowercase for comparison
  const slugify = s => (s || '').toLowerCase().replace(/[_\s]/g, '');
  const isGeneric =
    slugify(title) === slugify(subreddit) || // title === subreddit slug
    title.trim().length < 4;                 // absurdly short

  if (!isGeneric) return title;

  // Convert subreddit CamelCase / underscore_slug → "Title Case Words"
  const base = (subreddit || title);
  return base
    .replace(/_/g, ' ')                        // underscores → spaces
    .replace(/([a-z])([A-Z])/g, '$1 $2')       // camelCase → spaces
    .replace(/\b\w/g, c => c.toUpperCase())    // Title Case
    .trim() || 'Meme';
}

function createMemeCard(meme) {
  const card = document.createElement('div');
  card.className = 'meme-card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Edit meme: ${meme.title}`);

  const badgeClass   = getBadgeClass(meme.created);
  const badgeLabel   = getBadgeLabel(meme.created);
  const displayTitle = formatMemeTitle(meme.title, meme.subreddit);
  const proxiedThumb = getProxiedUrl(meme.url);
  const isGif        = meme.url && meme.url.toLowerCase().endsWith('.gif');

  card.innerHTML = `
    <div class="card-img-wrap">
      <img class="card-img" src="${escapeHtml(proxiedThumb)}" alt="${escapeHtml(displayTitle)}" loading="lazy" />
      ${isGif ? '<span style="position:absolute;top:8px;left:8px;background:rgba(255,69,0,.9);color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;">GIF</span>' : ''}
    </div>
    <div class="card-info">
      <span class="card-title">${escapeHtml(displayTitle)}</span>
      <span class="badge ${badgeClass}">${badgeLabel}</span>
    </div>
  `;

  const openEdit = () => openEditor(meme.url);
  card.addEventListener('click', openEdit);
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEdit(); } });

  const img = card.querySelector('.card-img');
  img.addEventListener('error', () => {
    img.parentElement.innerHTML = `<div style="width:100%;aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;color:#555;font-size:32px;background:#111;">🖼️</div>`;
  });

  return card;
}

/* =====================================================
   RENDERING
   ===================================================== */
function renderMemeCards(arr) {
  memeGrid.innerHTML = '';
  errorMsg.hidden = true;
  emptyMsg.hidden = true;
  if (!arr || arr.length === 0) { emptyMsg.hidden = false; return; }
  const frag = document.createDocumentFragment();
  arr.forEach(m => frag.appendChild(createMemeCard(m)));
  memeGrid.appendChild(frag);
}

function appendMemeCards(arr) {
  if (!arr || arr.length === 0) return;
  const frag = document.createDocumentFragment();
  arr.forEach(m => frag.appendChild(createMemeCard(m)));
  memeGrid.appendChild(frag);
}

function showError() {
  memeGrid.innerHTML = '';
  errorMsg.hidden = false;
  emptyMsg.hidden = true;
}

function filterMemesBySearch(query) {
  if (!query.trim()) { renderMemeCards(currentMemes); return; }
  const q = query.trim().toLowerCase();
  const filtered = currentMemes.filter(m => m.title && m.title.toLowerCase().includes(q));
  if (filtered.length === 0) { memeGrid.innerHTML = ''; emptyMsg.hidden = false; }
  else { emptyMsg.hidden = true; renderMemeCards(filtered); }
}

/* =====================================================
   TAB LOADING
   ===================================================== */
async function loadTab(tab) {
  currentTab = tab;
  searchInput.value = '';
  searchClear.classList.remove('visible');
  errorMsg.hidden = true;
  emptyMsg.hidden = true;
  loadMoreBtn.disabled = false;

  const isGallery = tab === 'gallery';
  memeGrid.hidden          = isGallery;
  gallerySection.hidden    = !isGallery;
  loadMoreWrap.hidden      = isGallery;

  if (isGallery) { renderGallery(); return; }

  showSkeletons();
  try {
    currentMemes = await fetchForTab(tab);
    renderMemeCards(currentMemes);
  } catch (err) {
    console.error('Failed to load memes:', err);
    showError();
  }
}

/* =====================================================
   CANVAS — IMAGE FILTER
   ===================================================== */
function applyCanvasFilter(filterStr) {
  // We redraw the image with CSS-like filter using globalCompositeOperation tricks.
  // For simplicity we store filter and draw at drawMeme time using ctx.filter.
  activeFilter = filterStr;
  drawMeme();
}

/* =====================================================
   CANVAS — DRAWING
   ===================================================== */
function wrapText(text, maxWidth, fontSize) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
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

function drawMemeText(text, id, fontSize, color) {
  if (!text.trim()) { textState[id].lines = []; return; }

  const canvasW  = memeCanvas.width;
  const padding  = 20;
  const maxWidth = canvasW - padding * 2;

  ctx.font         = `900 ${fontSize}px Impact, 'Arial Narrow', sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  const lines  = wrapText(text.toUpperCase(), maxWidth, fontSize);
  const lineH  = fontSize * 1.15;
  textState[id].lines    = lines;
  textState[id].fontSize = fontSize;

  lines.forEach((line, i) => {
    const x = textState[id].x;
    const y = textState[id].y + (i - (lines.length - 1) / 2) * lineH;

    if (textShadow) {
      ctx.shadowColor   = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur    = 8;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
      ctx.fillStyle = color;
      ctx.fillText(line, x, y);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur  = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } else {
      ctx.lineWidth   = Math.max(3, fontSize / 10);
      ctx.strokeStyle = '#000000';
      ctx.lineJoin    = 'round';
      ctx.strokeText(line, x, y);
      ctx.fillStyle = color;
      ctx.fillText(line, x, y);
    }
  });
}

function drawStickers() {
  stickers.forEach(s => {
    ctx.font = `${s.size}px serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.emoji, s.x, s.y);
  });
}

function drawMeme() {
  const W = memeCanvas.width;
  const H = memeCanvas.height;
  ctx.clearRect(0, 0, W, H);

  // Apply image filter
  ctx.filter = (activeFilter && activeFilter !== 'none') ? activeFilter : 'none';

  if (chainImage && baseImage) {
    // Two-panel: stack vertically
    const halfH = H / 2;
    drawImageContain(baseImage, 0, 0, W, halfH);
    drawImageContain(chainImage, 0, halfH, W, halfH);
  } else if (baseImage) {
    drawImageContain(baseImage, 0, 0, W, H);
  } else {
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, W, H);
  }

  ctx.filter = 'none';

  const fontSize = parseInt(fontSizeInput.value, 10);
  const color    = fontColorInput.value;
  drawMemeText(topTextInput.value, 'top', fontSize, color);
  drawMemeText(bottomTextInput.value, 'bottom', fontSize, color);
  drawStickers();
}

function drawImageContain(img, dx, dy, dw, dh) {
  const iw = img.naturalWidth  || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale  = Math.min(dw / iw, dh / ih);
  const sw     = iw * scale;
  const sh     = ih * scale;
  const ox     = dx + (dw - sw) / 2;
  const oy     = dy + (dh - sh) / 2;
  ctx.fillStyle = '#111';
  ctx.fillRect(dx, dy, dw, dh);
  ctx.drawImage(img, ox, oy, sw, sh);
}

/* =====================================================
   LOAD IMAGE TO CANVAS
   ===================================================== */
function loadImg(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => {
      const img2 = new Image();
      img2.onload  = () => resolve(img2);
      img2.onerror = reject;
      img2.src = url;
    };
    img.src = getProxiedUrl(url);
  });
}

/* =====================================================
   EDITOR — OPEN / CLOSE
   ===================================================== */
async function openEditor(imageUrl) {
  currentImageUrl = imageUrl;
  // Reset
  topTextInput.value      = '';
  bottomTextInput.value   = '';
  fontSizeInput.value     = '36';
  fontSizeVal.textContent = '36';
  fontColorInput.value    = '#ffffff';
  imageUpload.value       = '';
  fileNameSpan.textContent = 'No file chosen';
  chainImage    = null;
  stickers      = [];
  activeFilter  = 'none';
  textShadow    = false;
  styleOutlineBtn.classList.add('active');
  styleShadowBtn.classList.remove('active');
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.toggle('active', p.dataset.filter === 'none'));
  clearChainBtn.hidden  = true;
  chainImageUrl.value   = '';

  textState.top    = { x: 250, y: 44,  lines: [], fontSize: 36 };
  textState.bottom = { x: 250, y: 456, lines: [], fontSize: 36 };

  const isGif = imageUrl && imageUrl.toLowerCase().endsWith('.gif');
  gifBadge.hidden = !isGif;

  modalOverlay.hidden = false;
  document.body.style.overflow = 'hidden';

  // Loading state
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, memeCanvas.width, memeCanvas.height);
  ctx.fillStyle = '#555555';
  ctx.font = '18px DM Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Loading image...', memeCanvas.width / 2, memeCanvas.height / 2);

  try {
    baseImage = await loadImg(imageUrl);
  } catch (e) {
    baseImage = null;
    console.warn('Could not load image:', e);
  }

  drawMeme();

  // Check URL params to pre-fill text (shareable link)
  const params = new URLSearchParams(window.location.search);
  if (params.get('img') === imageUrl) {
    topTextInput.value    = params.get('top') || '';
    bottomTextInput.value = params.get('bot') || '';
    drawMeme();
  }
}

function closeEditor() {
  modalOverlay.hidden = true;
  document.body.style.overflow = '';
  ctx.clearRect(0, 0, memeCanvas.width, memeCanvas.height);
  baseImage   = null;
  chainImage  = null;
  stickers    = [];
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
    bumpCounter();
  } catch (e) {
    console.error('Download failed:', e);
    showToast('❌ Download failed. Try another image.');
  }
}

async function copyMeme() {
  try {
    const blob = await new Promise(r => memeCanvas.toBlob(r, 'image/png'));
    if (!blob) throw new Error('Canvas empty');
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    showToast('📋 Copied to clipboard!');
    bumpCounter();
  } catch (e) {
    console.error('Copy failed:', e);
    showToast('❌ Copy failed. Try downloading instead.');
  }
}

/* =====================================================
   SAVE TO GALLERY
   ===================================================== */
const GALLERY_KEY = 'memedrop-gallery';

function getGallery() {
  try { return JSON.parse(localStorage.getItem(GALLERY_KEY)) || []; }
  catch { return []; }
}

function saveGallery(arr) {
  localStorage.setItem(GALLERY_KEY, JSON.stringify(arr));
}

function saveToGallery() {
  try {
    const dataUrl = memeCanvas.toDataURL('image/png');
    const gallery = getGallery();
    gallery.unshift({ id: Date.now(), dataUrl });
    if (gallery.length > 30) gallery.length = 30; // cap at 30
    saveGallery(gallery);
    showToast('💾 Saved to gallery!');
    bumpCounter();
  } catch (e) {
    console.error('Save failed:', e);
    showToast('❌ Save failed. CORS issue with image.');
  }
}

function renderGallery() {
  const gallery = getGallery();
  galleryGrid.innerHTML = '';
  if (gallery.length === 0) {
    galleryEmpty.hidden = false;
    return;
  }
  galleryEmpty.hidden = true;
  gallery.forEach(item => {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.innerHTML = `
      <img src="${item.dataUrl}" alt="Saved meme" loading="lazy" />
      <div class="gallery-card-actions">
        <button class="gallery-action-btn" data-action="dl" data-id="${item.id}">⬇️ Download</button>
        <button class="gallery-action-btn del" data-action="del" data-id="${item.id}">🗑 Delete</button>
      </div>
    `;
    galleryGrid.appendChild(card);
  });
}

galleryGrid.addEventListener('click', e => {
  const btn = e.target.closest('.gallery-action-btn');
  if (!btn) return;
  const id      = Number(btn.dataset.id);
  const gallery = getGallery();
  const item    = gallery.find(g => g.id === id);
  if (!item) return;

  if (btn.dataset.action === 'dl') {
    const a = document.createElement('a');
    a.href = item.dataUrl;
    a.download = `memedrop-gallery-${id}.png`;
    a.click();
  } else if (btn.dataset.action === 'del') {
    const updated = gallery.filter(g => g.id !== id);
    saveGallery(updated);
    renderGallery();
    showToast('🗑 Deleted from gallery.');
  }
});

/* =====================================================
   DRAGGABLE — CANVAS (text + stickers)
   ===================================================== */
function getCanvasPos(e) {
  const rect   = memeCanvas.getBoundingClientRect();
  const scaleX = memeCanvas.width  / rect.width;
  const scaleY = memeCanvas.height / rect.height;
  const src    = e.touches ? e.touches[0] : e;
  return {
    x: (src.clientX - rect.left) * scaleX,
    y: (src.clientY - rect.top)  * scaleY,
  };
}

function hitTestText(pos, id) {
  const s = textState[id];
  if (!s.lines.length) return false;
  const lineH = s.fontSize * 1.15;
  const halfH = (s.lines.length * lineH) / 2;
  return pos.x > s.x - 240 && pos.x < s.x + 240 &&
         pos.y > s.y - halfH && pos.y < s.y + halfH;
}

function hitTestSticker(pos, idx) {
  const s    = stickers[idx];
  const half = s.size / 2;
  return pos.x > s.x - half && pos.x < s.x + half &&
         pos.y > s.y - half && pos.y < s.y + half;
}

function handleDragStart(e) {
  const pos = getCanvasPos(e);
  // Stickers checked first (on top)
  for (let i = stickers.length - 1; i >= 0; i--) {
    if (hitTestSticker(pos, i)) {
      isDragging = true; dragTarget = i;
      startMouseX = pos.x; startMouseY = pos.y;
      memeCanvas.style.cursor = 'grabbing';
      return;
    }
  }
  if (hitTestText(pos, 'top')) {
    isDragging = true; dragTarget = 'top';
  } else if (hitTestText(pos, 'bottom')) {
    isDragging = true; dragTarget = 'bottom';
  }
  if (isDragging) {
    startMouseX = pos.x; startMouseY = pos.y;
    memeCanvas.style.cursor = 'grabbing';
  }
}

function handleDragMove(e) {
  const pos = getCanvasPos(e);
  if (isDragging) {
    const dx = pos.x - startMouseX;
    const dy = pos.y - startMouseY;
    if (typeof dragTarget === 'number') {
      stickers[dragTarget].x += dx;
      stickers[dragTarget].y += dy;
    } else {
      textState[dragTarget].x += dx;
      textState[dragTarget].y += dy;
    }
    startMouseX = pos.x; startMouseY = pos.y;
    drawMeme();
  } else {
    const overText = hitTestText(pos, 'top') || hitTestText(pos, 'bottom');
    const overSticker = stickers.some((_, i) => hitTestSticker(pos, i));
    memeCanvas.style.cursor = (overText || overSticker) ? 'move' : 'default';
  }
}

function handleDragEnd() {
  isDragging = false;
  dragTarget = null;
  memeCanvas.style.cursor = 'default';
}

memeCanvas.addEventListener('mousedown', handleDragStart);
window.addEventListener('mousemove', handleDragMove);
window.addEventListener('mouseup', handleDragEnd);

memeCanvas.addEventListener('touchstart', e => {
  if (e.target === memeCanvas) e.preventDefault();
  handleDragStart(e);
}, { passive: false });
window.addEventListener('touchmove', e => {
  if (isDragging) e.preventDefault();
  handleDragMove(e);
}, { passive: false });
window.addEventListener('touchend', handleDragEnd);

/* =====================================================
   STICKERS
   ===================================================== */
stickerRow.addEventListener('click', e => {
  const btn = e.target.closest('.sticker-btn');
  if (!btn || btn.id === 'clearStickers') return;
  const emoji = btn.dataset.sticker;
  const size  = 60;
  // Place near center with slight random offset
  stickers.push({
    emoji,
    x: memeCanvas.width  / 2 + (Math.random() - 0.5) * 100,
    y: memeCanvas.height / 2 + (Math.random() - 0.5) * 100,
    size,
  });
  drawMeme();
  showToast(`${emoji} sticker added — drag it anywhere!`);
});

clearStickersBtn.addEventListener('click', () => {
  stickers = [];
  drawMeme();
  showToast('🧹 Stickers cleared.');
});

/* =====================================================
   TEXT STYLE TOGGLE
   ===================================================== */
styleOutlineBtn.addEventListener('click', () => {
  textShadow = false;
  styleOutlineBtn.classList.add('active');
  styleShadowBtn.classList.remove('active');
  drawMeme();
});

styleShadowBtn.addEventListener('click', () => {
  textShadow = true;
  styleShadowBtn.classList.add('active');
  styleOutlineBtn.classList.remove('active');
  drawMeme();
});

/* =====================================================
   IMAGE FILTERS
   ===================================================== */
filterPills.addEventListener('click', e => {
  const pill = e.target.closest('.filter-pill');
  if (!pill) return;
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  pill.classList.add('active');
  applyCanvasFilter(pill.dataset.filter);
});

/* =====================================================
   MEME CHAIN — TWO PANEL
   ===================================================== */
chainBtn.addEventListener('click', async () => {
  const url = chainImageUrl.value.trim();
  if (!url) { showToast('⚠️ Paste an image URL in the field below first.'); return; }
  chainBtn.textContent = '⏳ Loading...';
  try {
    chainImage = await loadImg(url);
    // Expand canvas height for two-panel
    memeCanvas.height = 1000;
    textState.bottom.y = 950;
    clearChainBtn.hidden = false;
    drawMeme();
    showToast('🔗 Second panel added!');
  } catch (e) {
    showToast('❌ Could not load that image URL.');
    chainImage = null;
  }
  chainBtn.textContent = '🔗 Add Second Panel';
});

clearChainBtn.addEventListener('click', () => {
  chainImage = null;
  memeCanvas.height = 500;
  textState.bottom.y = 456;
  clearChainBtn.hidden = true;
  chainImageUrl.value = '';
  drawMeme();
  showToast('✂️ Second panel removed.');
});

/* =====================================================
   SHAREABLE URL
   ===================================================== */
shareBtn.addEventListener('click', () => {
  const params = new URLSearchParams({
    img: currentImageUrl,
    top: topTextInput.value,
    bot: bottomTextInput.value,
  });
  const url = `${location.origin}${location.pathname}?${params.toString()}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast('🔗 Share URL copied!');
  }).catch(() => {
    prompt('Copy this shareable URL:', url);
  });
});

/* =====================================================
   THEME TOGGLE
   ===================================================== */
function applyTheme(isLight) {
  document.body.classList.toggle('light-mode', isLight);
  themeIcon.textContent = isLight ? '🌙' : '☀️';
  themeToggle.title     = isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode';
}

themeToggle.addEventListener('click', () => {
  const isLight = !document.body.classList.contains('light-mode');
  applyTheme(isLight);
  localStorage.setItem('memedrop-theme', isLight ? 'light' : 'dark');
});

/* =====================================================
   FILTER TABS
   ===================================================== */
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    loadTab(btn.dataset.tab);
  });
});

/* =====================================================
   SEARCH
   ===================================================== */
searchInput.addEventListener('input', () => {
  const q = searchInput.value;
  searchClear.classList.toggle('visible', q.length > 0);
  filterMemesBySearch(q);
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.classList.remove('visible');
  filterMemesBySearch('');
  searchInput.focus();
});

/* =====================================================
   LOAD MORE
   ===================================================== */
loadMoreBtn.addEventListener('click', async () => {
  loadMoreBtn.disabled = true;
  loadMoreBtn.innerHTML = '<span class="loading-spinner"></span> Loading...';
  try {
    const more = await fetchForTab(currentTab);
    const existing = new Set(currentMemes.map(m => m.url));
    const fresh = more.filter(m => !existing.has(m.url));
    if (fresh.length > 0) {
      currentMemes = [...currentMemes, ...fresh];
      appendMemeCards(fresh);
      if (searchInput.value.trim()) filterMemesBySearch(searchInput.value);
    } else {
      showToast('No new memes found. Try another tab!');
    }
  } catch (e) {
    showToast('❌ Failed to load more.');
  }
  loadMoreBtn.innerHTML = 'Load More Memes';
  loadMoreBtn.disabled  = false;
});

/* =====================================================
   MODAL CLOSE
   ===================================================== */
modalClose.addEventListener('click', closeEditor);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeEditor(); });
retryBtn.addEventListener('click', () => loadTab(currentTab));

/* =====================================================
   CANVAS INPUTS
   ===================================================== */
topTextInput.addEventListener('input', drawMeme);
bottomTextInput.addEventListener('input', drawMeme);
fontSizeInput.addEventListener('input', () => { fontSizeVal.textContent = fontSizeInput.value; drawMeme(); });
fontColorInput.addEventListener('input', drawMeme);

/* =====================================================
   FILE UPLOAD
   ===================================================== */
imageUpload.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  fileNameSpan.textContent = file.name.length > 28 ? file.name.substring(0, 25) + '...' : file.name;
  const reader = new FileReader();
  reader.onload = evt => {
    const img = new Image();
    img.onload = () => { baseImage = img; drawMeme(); };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
});

/* =====================================================
   DOWNLOAD / COPY / SAVE
   ===================================================== */
downloadBtn.addEventListener('click', downloadMeme);
copyBtn.addEventListener('click', copyMeme);
saveGalleryBtn.addEventListener('click', saveToGallery);

/* =====================================================
   KEYBOARD SHORTCUTS
   ===================================================== */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modalOverlay.hidden) { closeEditor(); return; }
  if ((e.key === 'd' || e.key === 'D') && !modalOverlay.hidden) {
    if (!['input','textarea'].includes(document.activeElement.tagName.toLowerCase())) {
      e.preventDefault(); downloadMeme();
    }
  }
});

/* =====================================================
   INIT
   ===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(localStorage.getItem('memedrop-theme') === 'light');

  // Check if launched from a shareable URL
  const params = new URLSearchParams(window.location.search);
  const imgParam = params.get('img');

  (async () => {
    showSkeletons();
    try {
      currentMemes = await fetchFreshMemes();
      renderMemeCards(currentMemes);
      // Auto-open editor if share URL detected
      if (imgParam) openEditor(imgParam);
    } catch (err) {
      console.error('Initial load failed:', err);
      showError();
    }
  })();
});