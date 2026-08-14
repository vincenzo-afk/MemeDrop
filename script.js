'use strict';

/* MemeDrop — Dark Editorial Collage. Keep discovery tactile, actions warm, and controls fast to scan. */

const $ = id => document.getElementById(id);
const memeGrid = $('memeGrid');
const searchInput = $('searchInput');
const searchClear = $('searchClear');
const themeToggle = $('themeToggle');
const themeIcon = themeToggle.querySelector('.theme-icon');
const modalOverlay = $('modalOverlay');
const modalClose = $('modalClose');
const memeCanvas = $('memeCanvas');
const canvasWrap = $('canvasWrap');
const ctx = memeCanvas.getContext('2d');
const topTextInput = $('topText');
const bottomTextInput = $('bottomText');
const fontSizeInput = $('fontSize');
const fontSizeVal = $('fontSizeVal');
const fontColorInput = $('fontColor');
const imageUpload = $('imageUpload');
const fileNameSpan = $('fileName');
const downloadBtn = $('downloadBtn');
const copyBtn = $('copyBtn');
const saveGalleryBtn = $('saveGalleryBtn');
const toast = $('toast');
const errorMsg = $('errorMsg');
const emptyMsg = $('emptyMsg');
const retryBtn = $('retryBtn');
const tabBtns = document.querySelectorAll('.tab-btn');
const counterVal = $('counterVal');
const memeCounter = $('memeCounter');
const gifBadge = $('gifBadge');
const storyBadge = $('storyBadge');
const styleOutlineBtn = $('styleOutline');
const styleShadowBtn = $('styleShadow');
const filterPills = $('filterPills');
const stickerRow = $('stickerRow');
const clearStickersBtn = $('clearStickers');
const chainBtn = $('chainBtn');
const clearChainBtn = $('clearChainBtn');
const chainImageUrl = $('chainImageUrl');
const shareBtn = $('shareBtn');
const embedBtn = $('embedBtn');
const gallerySection = $('gallerySection');
const galleryEmpty = $('galleryEmpty');
const galleryGrid = $('galleryGrid');
const subredditInput = $('subredditInput');
const subredditLoadBtn = $('subredditLoadBtn');
const keywordHeatmap = $('keywordHeatmap');
const clearTagBtn = $('clearTagBtn');
const activeFilterRow = $('activeFilterRow');
const activeTagLabel = $('activeTagLabel');
const infiniteScrollSentinel = $('infiniteScrollSentinel');
const infiniteScrollLabel = $('infiniteScrollLabel');
const shareXBtn = $('shareXBtn');
const shareWhatsAppBtn = $('shareWhatsAppBtn');
const shareRedditBtn = $('shareRedditBtn');
const nativeShareBtn = $('nativeShareBtn');
const storyExportBtn = $('storyExportBtn');
const embedOverlay = $('embedOverlay');
const embedClose = $('embedClose');
const embedType = $('embedType');
const embedCode = $('embedCode');
const copyEmbedBtn = $('copyEmbedBtn');

let currentTab = 'fresh';
let currentMemes = [];
let baseImage = null;
let chainImage = null;
let currentImageUrl = '';
let currentMemeTitle = 'MemeDrop meme';
let toastTimer = null;
let sessionCount = 0;
let textShadow = false;
let activeFilter = 'none';
let activeTag = '';
let stickers = [];
let isLoadingMore = false;
let hasMore = true;
let storyMode = false;
let gifPlayer = null;
let gifFrameTimer = null;

let textState = {
  top: { x: 250, y: 44, lines: [], fontSize: 36 },
  bottom: { x: 250, y: 456, lines: [], fontSize: 36 },
};

let isDragging = false;
let dragTarget = null;
let startMouseX = 0;
let startMouseY = 0;

const STOP_WORDS = new Set('a an and are as at be by for from has have i in is it me my of on or our so that the their this to was we with you your vs meme memes just not no its im its own oc today when what who why how very more less all new one two this'.split(' '));
const TAG_ALIASES = {
  programmerhumor: ['code', 'programming', 'developer'],
  gaming: ['gaming', 'games'],
  wholesome: ['wholesome', 'feelgood'],
  shitposting: ['shitpost', 'chaos'],
  animemes: ['anime', 'animemes'],
  dankmemes: ['dank', 'absurd'],
  me_irl: ['relatable'],
};
const TAG_CACHE_KEY = 'memedrop-tag-cache-v1';
const GALLERY_KEY = 'memedrop-gallery';

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getProxiedUrl(url) {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2800);
}

function bumpCounter() {
  sessionCount += 1;
  counterVal.textContent = String(sessionCount);
  memeCounter.classList.remove('bump');
  void memeCounter.offsetWidth;
  memeCounter.classList.add('bump');
}

function getBadgeClass(utcSeconds) {
  if (!utcSeconds) return 'badge-classic';
  const diff = Math.floor(Date.now() / 1000) - utcSeconds;
  return diff < 3600 ? 'badge-fresh' : diff < 86400 ? 'badge-recent' : 'badge-old';
}

function getBadgeLabel(utcSeconds) {
  if (!utcSeconds) return 'Classic';
  const diff = Math.floor(Date.now() / 1000) - utcSeconds;
  return diff < 3600 ? '🟢 Fresh' : diff < 86400 ? '🟡 Recent' : '⚫ Old';
}

function extractTags(title, subreddit = '', flair = '') {
  const rawWords = `${title || ''} ${flair || ''}`.toLowerCase().replace(/[^a-z0-9_ ]/g, ' ').split(/\s+/);
  const tags = new Set();
  rawWords.forEach(word => {
    if (word.length >= 3 && !STOP_WORDS.has(word)) tags.add(word);
  });
  const sub = subreddit.toLowerCase();
  tags.add(sub);
  (TAG_ALIASES[sub] || []).forEach(tag => tags.add(tag));
  return [...tags].slice(0, 18);
}

function readTagCache() {
  try { return JSON.parse(localStorage.getItem(TAG_CACHE_KEY)) || {}; } catch { return {}; }
}

function cacheMemeTags(memes) {
  const cache = readTagCache();
  memes.forEach(meme => { if (meme.url) cache[meme.url] = meme.tags || []; });
  const entries = Object.entries(cache).slice(-300);
  localStorage.setItem(TAG_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
}

function mapMeme(m) {
  const title = m.title || 'Meme';
  const subreddit = m.subreddit || '';
  const cachedTags = readTagCache()[m.url] || [];
  return {
    title,
    url: m.url,
    postLink: m.postLink || null,
    ups: m.ups || 0,
    created: m.created_utc || null,
    source: 'reddit',
    subreddit,
    author: m.author || '',
    flair: m.flair || m.link_flair_text || '',
    tags: [...new Set([...cachedTags, ...extractTags(title, subreddit, m.flair || m.link_flair_text || '')])].slice(0, 24),
  };
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchFreshMemes() { return (await fetchJson('https://meme-api.com/gimme/20')).memes.map(mapMeme); }
async function fetchTrendingMemes() { return (await fetchJson('https://meme-api.com/gimme/40')).memes.map(mapMeme).sort((a, b) => b.ups - a.ups); }
async function fetchSubredditMemes(subreddit) {
  const safeSubreddit = subreddit.trim().replace(/^r\//i, '').replace(/[^a-zA-Z0-9_]+/g, '');
  if (!safeSubreddit) throw new Error('Enter a subreddit');
  return (await fetchJson(`https://meme-api.com/gimme/${encodeURIComponent(safeSubreddit)}/20`)).memes.map(mapMeme);
}
async function fetchClassicMemes() {
  const data = await fetchJson('https://api.imgflip.com/get_memes');
  return data.data.memes.map(m => ({ title: m.name, url: m.url, postLink: null, ups: null, created: null, source: 'classic', subreddit: 'imgflip', tags: extractTags(m.name, 'imgflip') }));
}
async function fetchForTab(tab) {
  switch (tab) {
    case 'fresh': return fetchFreshMemes();
    case 'trending': return fetchTrendingMemes();
    case 'programmer': return fetchSubredditMemes('ProgrammerHumor');
    case 'gaming': return fetchSubredditMemes('gaming');
    case 'wholesome': return fetchSubredditMemes('wholesomememes');
    case 'shitpost': return fetchSubredditMemes('shitposting');
    case 'anime': return fetchSubredditMemes('animemes');
    case 'dank': return fetchSubredditMemes('dankmemes');
    case 'classic': return fetchClassicMemes();
    case 'custom': return fetchSubredditMemes(subredditInput.value);
    default: return fetchFreshMemes();
  }
}

function showSkeletons() {
  memeGrid.innerHTML = '';
  for (let i = 0; i < 6; i += 1) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-card';
    skeleton.innerHTML = '<div class="skeleton-img"></div><div class="skeleton-info"><div class="skeleton-line"></div><div class="skeleton-line"></div></div>';
    memeGrid.appendChild(skeleton);
  }
}

function createMemeCard(meme) {
  const card = document.createElement('div');
  card.className = 'meme-card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  const title = meme.title || 'Meme';
  const imageUrl = getProxiedUrl(meme.url);
  const isGif = /\.gif(?:\?|$)/i.test(meme.url || '');
  card.setAttribute('aria-label', `Edit meme: ${title}`);
  const visibleTags = (meme.tags || []).filter(tag => tag !== meme.subreddit?.toLowerCase()).slice(0, 3);
  card.innerHTML = `
    <div class="card-img-wrap">
      <img class="card-img" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" loading="lazy" />
      ${isGif ? '<span class="card-gif-badge">GIF</span>' : ''}
    </div>
    <div class="card-info">
      <span class="card-title">${escapeHtml(title)}</span>
      <div class="card-subline"><span>${meme.subreddit ? `r/${escapeHtml(meme.subreddit)}` : 'MemeDrop'}</span><span class="badge ${getBadgeClass(meme.created)}">${getBadgeLabel(meme.created)}</span></div>
      <div class="card-tags">${visibleTags.map(tag => `<button class="card-tag" type="button" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>`).join('')}</div>
    </div>`;
  const openEdit = () => openEditor(meme.url, meme.title);
  card.addEventListener('click', e => { if (!e.target.closest('.card-tag')) openEdit(); });
  card.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.card-tag')) { e.preventDefault(); openEdit(); } });
  card.querySelectorAll('.card-tag').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); setActiveTag(btn.dataset.tag); }));
  const img = card.querySelector('.card-img');
  img.addEventListener('error', () => { img.parentElement.innerHTML = '<div class="image-fallback">🖼️</div>'; });
  return card;
}

function renderMemeCards(memes) {
  memeGrid.innerHTML = '';
  errorMsg.hidden = true;
  emptyMsg.hidden = true;
  if (!memes?.length) { emptyMsg.hidden = false; return; }
  const fragment = document.createDocumentFragment();
  memes.forEach(meme => fragment.appendChild(createMemeCard(meme)));
  memeGrid.appendChild(fragment);
}

function appendMemeCards(memes) {
  if (!memes?.length) return;
  const fragment = document.createDocumentFragment();
  memes.forEach(meme => fragment.appendChild(createMemeCard(meme)));
  memeGrid.appendChild(fragment);
}

function getVisibleMemes() {
  const query = searchInput.value.trim().toLowerCase();
  return currentMemes.filter(meme => {
    const matchesSearch = !query || meme.title.toLowerCase().includes(query) || (meme.tags || []).some(tag => tag.includes(query));
    const matchesTag = !activeTag || (meme.tags || []).includes(activeTag);
    return matchesSearch && matchesTag;
  });
}

function filterMemes() {
  const visible = getVisibleMemes();
  renderMemeCards(visible);
  searchClear.classList.toggle('visible', Boolean(searchInput.value));
}

function renderHeatmap() {
  const counts = new Map();
  currentMemes.forEach(meme => {
    const titleWords = extractTags(meme.title, '').filter(tag => tag.length > 2 && !tag.includes('_'));
    titleWords.forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1));
  });
  const items = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 24);
  if (!items.length) { keywordHeatmap.innerHTML = '<span class="heatmap-placeholder">Waiting for more title signal…</span>'; return; }
  const max = items[0][1];
  keywordHeatmap.innerHTML = items.map(([tag, count], index) => {
    const intensity = Math.max(1, Math.ceil((count / max) * 5));
    return `<button type="button" class="heat-word heat-${intensity} ${activeTag === tag ? 'active' : ''}" data-tag="${escapeHtml(tag)}" style="--word-order:${index}"><span>#${escapeHtml(tag)}</span><small>${count}</small></button>`;
  }).join('');
  keywordHeatmap.querySelectorAll('.heat-word').forEach(btn => btn.addEventListener('click', () => setActiveTag(btn.dataset.tag)));
}

function setActiveTag(tag) {
  activeTag = activeTag === tag ? '' : tag;
  activeFilterRow.hidden = !activeTag;
  clearTagBtn.hidden = !activeTag;
  activeTagLabel.textContent = activeTag ? `#${activeTag}` : '';
  renderHeatmap();
  filterMemes();
}

function setDiscoveryVisibility(isGallery) {
  document.querySelector('.discovery-panel').hidden = isGallery;
  memeGrid.hidden = isGallery;
  gallerySection.hidden = !isGallery;
  infiniteScrollSentinel.hidden = isGallery;
}

async function loadTab(tab) {
  currentTab = tab;
  activeTag = '';
  activeFilterRow.hidden = true;
  clearTagBtn.hidden = true;
  searchInput.value = '';
  errorMsg.hidden = true;
  emptyMsg.hidden = true;
  hasMore = true;
  setDiscoveryVisibility(tab === 'gallery');
  if (tab === 'gallery') { renderGallery(); return; }
  showSkeletons();
  try {
    currentMemes = await fetchForTab(tab);
    cacheMemeTags(currentMemes);
    renderMemeCards(currentMemes);
    renderHeatmap();
  } catch (error) {
    console.error('Failed to load memes:', error);
    memeGrid.innerHTML = '';
    errorMsg.hidden = false;
    hasMore = false;
  }
}

async function loadMoreMemes() {
  if (isLoadingMore || !hasMore || currentTab === 'gallery') return;
  isLoadingMore = true;
  infiniteScrollLabel.textContent = 'Loading the next drop…';
  try {
    const existing = new Set(currentMemes.map(meme => meme.url));
    let fresh = [];
    for (let attempt = 0; attempt < 2 && fresh.length === 0; attempt += 1) {
      const more = await fetchForTab(currentTab);
      fresh = more.filter(meme => !existing.has(meme.url));
    }
    if (!fresh.length) {
      hasMore = false;
      infiniteScrollLabel.textContent = 'You caught the whole drop for now';
      return;
    }
    currentMemes = [...currentMemes, ...fresh];
    cacheMemeTags(fresh);
    appendMemeCards(getVisibleMemes().filter(meme => fresh.some(item => item.url === meme.url)));
    renderHeatmap();
    infiniteScrollLabel.textContent = 'Scroll for more drops';
  } catch (error) {
    console.warn('Infinite scroll failed:', error);
    infiniteScrollLabel.textContent = 'Could not load more — keep scrolling to retry';
  } finally {
    isLoadingMore = false;
  }
}

function wrapText(text, maxWidth, fontSize) {
  const lines = [];
  let current = '';
  ctx.font = `900 ${fontSize}px Impact, 'Arial Narrow', sans-serif`;
  text.split(' ').forEach(word => {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) { lines.push(current); current = word; } else current = test;
  });
  if (current) lines.push(current);
  return lines;
}

function drawMemeText(text, id, fontSize, color) {
  if (!text.trim()) { textState[id].lines = []; return; }
  const maxWidth = memeCanvas.width - 40;
  ctx.font = `900 ${fontSize}px Impact, 'Arial Narrow', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = wrapText(text.toUpperCase(), maxWidth, fontSize);
  const lineH = fontSize * 1.15;
  textState[id].lines = lines;
  textState[id].fontSize = fontSize;
  lines.forEach((line, i) => {
    const x = textState[id].x;
    const y = textState[id].y + (i - (lines.length - 1) / 2) * lineH;
    if (textShadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 8; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3;
      ctx.fillStyle = color; ctx.fillText(line, x, y);
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    } else {
      ctx.lineWidth = Math.max(3, fontSize / 10); ctx.strokeStyle = '#000'; ctx.lineJoin = 'round'; ctx.strokeText(line, x, y); ctx.fillStyle = color; ctx.fillText(line, x, y);
    }
  });
}

function drawStickers() {
  stickers.forEach(sticker => { ctx.font = `${sticker.size}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(sticker.emoji, sticker.x, sticker.y); });
}

function drawMeme() {
  const W = memeCanvas.width;
  const H = memeCanvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.filter = activeFilter !== 'none' ? activeFilter : 'none';
  const imageSource = gifPlayer?.get_canvas?.() || baseImage;
  if (chainImage && baseImage && !storyMode) {
    drawImageContain(baseImage, 0, 0, W, H / 2);
    drawImageContain(chainImage, 0, H / 2, W, H / 2);
  } else if (imageSource) drawImageContain(imageSource, 0, 0, W, H);
  else { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H); }
  ctx.filter = 'none';
  const fontSize = Number(fontSizeInput.value);
  drawMemeText(topTextInput.value, 'top', fontSize, fontColorInput.value);
  drawMemeText(bottomTextInput.value, 'bottom', fontSize, fontColorInput.value);
  drawStickers();
}

function drawImageContain(image, dx, dy, dw, dh) {
  const iw = image.naturalWidth || image.videoWidth || image.width;
  const ih = image.naturalHeight || image.videoHeight || image.height;
  if (!iw || !ih) return;
  const scale = Math.min(dw / iw, dh / ih);
  const sw = iw * scale; const sh = ih * scale;
  const ox = dx + (dw - sw) / 2; const oy = dy + (dh - sh) / 2;
  ctx.fillStyle = '#111'; ctx.fillRect(dx, dy, dw, dh); ctx.drawImage(image, ox, oy, sw, sh);
}

function loadImg(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = getProxiedUrl(url);
  });
}

function stopGifPlayback() {
  if (gifFrameTimer) clearInterval(gifFrameTimer);
  gifFrameTimer = null;
  gifPlayer = null;
  const hiddenGif = $('gif-source');
  if (hiddenGif) hiddenGif.remove();
}

function setupGifPlayback(url) {
  stopGifPlayback();
  if (!/\.gif(?:\?|$)/i.test(url || '')) return;
  gifBadge.hidden = false;
  if (typeof window.SuperGif !== 'function') return;
  const image = document.createElement('img');
  image.id = 'gif-source'; image.alt = ''; image.src = getProxiedUrl(url); image.hidden = true;
  canvasWrap.appendChild(image);
  try {
    gifPlayer = new window.SuperGif({ gif: image, auto_play: true, loop_mode: true });
    gifPlayer.load(() => {
      gifFrameTimer = setInterval(drawMeme, 80);
      drawMeme();
    });
  } catch (error) { console.warn('GIF playback unavailable, using first frame:', error); }
}

function resizeCanvasForMode(nextStoryMode) {
  storyMode = nextStoryMode;
  memeCanvas.width = storyMode ? 540 : 500;
  memeCanvas.height = storyMode ? 960 : 500;
  textState.top = { x: memeCanvas.width / 2, y: storyMode ? 90 : 44, lines: [], fontSize: 36 };
  textState.bottom = { x: memeCanvas.width / 2, y: storyMode ? memeCanvas.height - 90 : memeCanvas.height - 44, lines: [], fontSize: 36 };
  storyBadge.hidden = !storyMode;
  drawMeme();
}

async function openEditor(imageUrl, title = 'MemeDrop meme') {
  stopGifPlayback();
  storyMode = false;
  resizeCanvasForMode(false);
  currentImageUrl = imageUrl || '';
  currentMemeTitle = title;
  topTextInput.value = ''; bottomTextInput.value = ''; fontSizeInput.value = '36'; fontSizeVal.textContent = '36'; fontColorInput.value = '#fff';
  imageUpload.value = ''; fileNameSpan.textContent = 'No file chosen'; chainImage = null; stickers = []; activeFilter = 'none'; textShadow = false;
  styleOutlineBtn.classList.add('active'); styleShadowBtn.classList.remove('active');
  document.querySelectorAll('.filter-pill').forEach(pill => pill.classList.toggle('active', pill.dataset.filter === 'none'));
  clearChainBtn.hidden = true; chainImageUrl.value = '';
  gifBadge.hidden = !/\.gif(?:\?|$)/i.test(imageUrl || '');
  modalOverlay.hidden = false; document.body.style.overflow = 'hidden';
  ctx.fillStyle = '#111'; ctx.fillRect(0, 0, memeCanvas.width, memeCanvas.height);
  ctx.fillStyle = '#777'; ctx.font = '18px DM Sans, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Loading image…', memeCanvas.width / 2, memeCanvas.height / 2);
  try { baseImage = await loadImg(imageUrl); } catch (error) { baseImage = null; showToast('Could not load this image cleanly.'); }
  setupGifPlayback(imageUrl);
  drawMeme();
  const params = new URLSearchParams(location.search);
  if (params.get('img') === imageUrl) { topTextInput.value = params.get('top') || ''; bottomTextInput.value = params.get('bot') || ''; drawMeme(); }
  syncShareMeta();
}

function closeEditor() {
  modalOverlay.hidden = true; document.body.style.overflow = ''; stopGifPlayback(); ctx.clearRect(0, 0, memeCanvas.width, memeCanvas.height); baseImage = null; chainImage = null; stickers = [];
}

function getShareUrl() {
  const params = new URLSearchParams({ img: currentImageUrl, top: topTextInput.value, bot: bottomTextInput.value, og: '1' });
  return `${location.origin}${location.pathname}?${params.toString()}`;
}

function getOgPreviewUrl() {
  // Static-safe fallback: deployments with a serverless OG renderer can replace this URL
  // with their renderer route; the source image keeps embeds valid on GitHub Pages/static hosts.
  return currentImageUrl;
}

function setMeta(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.setAttribute('content', value);
}

function syncShareMeta() {
  if (!currentImageUrl) return;
  const title = topTextInput.value || bottomTextInput.value ? `${topTextInput.value} ${bottomTextInput.value}`.trim() : currentMemeTitle;
  const shareUrl = getShareUrl();
  const previewUrl = location.protocol === 'file:' ? currentImageUrl : getOgPreviewUrl();
  document.title = `${title} — MemeDrop`;
  setMeta('meta[property="og:title"]', title);
  setMeta('meta[property="og:image"]', previewUrl);
  setMeta('meta[property="og:url"]', shareUrl);
  setMeta('meta[name="twitter:title"]', title);
  setMeta('meta[name="twitter:image"]', previewUrl);
}

function openIntent(url) { window.open(url, '_blank', 'noopener,noreferrer,width=720,height=640'); }

function shareToNetwork(network) {
  const shareUrl = getShareUrl();
  const text = `${currentMemeTitle} — made with MemeDrop`;
  const routes = {
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${shareUrl}`)}`,
    reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(text)}`,
  };
  syncShareMeta();
  openIntent(routes[network]);
}

async function nativeShare() {
  const shareUrl = getShareUrl();
  if (navigator.share) { try { await navigator.share({ title: currentMemeTitle, text: 'Made with MemeDrop', url: shareUrl }); return; } catch (error) { if (error.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(shareUrl); showToast('Share URL copied — paste it anywhere.'); } catch { prompt('Copy this shareable URL:', shareUrl); }
}

function downloadBlob(blob, name) {
  const objectUrl = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = objectUrl; anchor.download = name; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function downloadMeme() {
  memeCanvas.toBlob(blob => { if (!blob) return showToast('Download failed. Try another image.'); downloadBlob(blob, `memedrop-${Date.now()}.png`); showToast('Downloaded!'); bumpCounter(); }, 'image/png');
}

async function copyMeme() {
  try { const blob = await new Promise(resolve => memeCanvas.toBlob(resolve, 'image/png')); await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); showToast('Copied to clipboard!'); bumpCounter(); } catch { showToast('Copy failed. Try downloading instead.'); }
}

function exportStory() {
  resizeCanvasForMode(true);
  memeCanvas.toBlob(blob => { if (!blob) return showToast('Story export failed.'); downloadBlob(blob, `memedrop-story-${Date.now()}.png`); showToast('9:16 Story exported!'); bumpCounter(); }, 'image/png');
}

function buildEmbedCode() {
  const shareUrl = getShareUrl();
  const previewUrl = getOgPreviewUrl();
  const title = escapeHtml(currentMemeTitle);
  return embedType.value === 'iframe'
    ? `<iframe src="${escapeHtml(shareUrl)}" title="${title} — MemeDrop" width="100%" height="720" loading="lazy" style="border:0;border-radius:16px;overflow:hidden"></iframe>`
    : `<a href="${escapeHtml(shareUrl)}" target="_blank" rel="noopener"><img src="${escapeHtml(previewUrl)}" alt="${title}" loading="lazy" style="display:block;max-width:100%;height:auto;border-radius:12px" /></a>`;
}

function openEmbed() { embedCode.value = buildEmbedCode(); embedOverlay.hidden = false; }

function getGallery() { try { return JSON.parse(localStorage.getItem(GALLERY_KEY)) || []; } catch { return []; } }
function saveGallery(items) { localStorage.setItem(GALLERY_KEY, JSON.stringify(items)); }
function saveToGallery() {
  try { const items = getGallery(); items.unshift({ id: Date.now(), dataUrl: memeCanvas.toDataURL('image/png') }); if (items.length > 30) items.length = 30; saveGallery(items); showToast('Saved to gallery!'); bumpCounter(); } catch { showToast('Save failed. CORS may block this image.'); }
}
function renderGallery() {
  const items = getGallery(); galleryGrid.innerHTML = ''; galleryEmpty.hidden = items.length > 0; if (!items.length) return;
  items.forEach(item => { const card = document.createElement('div'); card.className = 'gallery-card'; card.innerHTML = `<img src="${item.dataUrl}" alt="Saved meme" loading="lazy" /><div class="gallery-card-actions"><button class="gallery-action-btn" data-action="dl" data-id="${item.id}">⬇️ Download</button><button class="gallery-action-btn del" data-action="del" data-id="${item.id}">🗑 Delete</button></div>`; galleryGrid.appendChild(card); });
}

function getCanvasPos(event) {
  const rect = memeCanvas.getBoundingClientRect(); const scaleX = memeCanvas.width / rect.width; const scaleY = memeCanvas.height / rect.height; const source = event.touches ? event.touches[0] : event; return { x: (source.clientX - rect.left) * scaleX, y: (source.clientY - rect.top) * scaleY };
}
function hitTestText(pos, id) { const state = textState[id]; if (!state.lines.length) return false; const lineH = state.fontSize * 1.15; const halfH = state.lines.length * lineH / 2; return pos.x > state.x - 240 && pos.x < state.x + 240 && pos.y > state.y - halfH && pos.y < state.y + halfH; }
function hitTestSticker(pos, index) { const sticker = stickers[index]; const half = sticker.size / 2; return pos.x > sticker.x - half && pos.x < sticker.x + half && pos.y > sticker.y - half && pos.y < sticker.y + half; }
function handleDragStart(event) { const pos = getCanvasPos(event); for (let i = stickers.length - 1; i >= 0; i -= 1) if (hitTestSticker(pos, i)) { isDragging = true; dragTarget = i; startMouseX = pos.x; startMouseY = pos.y; return; } if (hitTestText(pos, 'top')) dragTarget = 'top'; else if (hitTestText(pos, 'bottom')) dragTarget = 'bottom'; else return; isDragging = true; startMouseX = pos.x; startMouseY = pos.y; }
function handleDragMove(event) { if (!isDragging) return; const pos = getCanvasPos(event); const dx = pos.x - startMouseX; const dy = pos.y - startMouseY; if (typeof dragTarget === 'number') { stickers[dragTarget].x += dx; stickers[dragTarget].y += dy; } else { textState[dragTarget].x += dx; textState[dragTarget].y += dy; } startMouseX = pos.x; startMouseY = pos.y; drawMeme(); }
function handleDragEnd() { isDragging = false; dragTarget = null; }

/* UI wiring */
themeToggle.addEventListener('click', () => { const light = !document.body.classList.contains('light-mode'); document.body.classList.toggle('light-mode', light); themeIcon.textContent = light ? '🌙' : '☀️'; localStorage.setItem('memedrop-theme', light ? 'light' : 'dark'); });
tabBtns.forEach(btn => btn.addEventListener('click', () => { tabBtns.forEach(item => { item.classList.remove('active'); item.setAttribute('aria-selected', 'false'); }); btn.classList.add('active'); btn.setAttribute('aria-selected', 'true'); loadTab(btn.dataset.tab); }));
searchInput.addEventListener('input', filterMemes);
searchClear.addEventListener('click', () => { searchInput.value = ''; filterMemes(); searchInput.focus(); });
clearTagBtn.addEventListener('click', () => setActiveTag(''));
subredditLoadBtn.addEventListener('click', () => { const name = subredditInput.value.trim(); if (!name) return showToast('Type a subreddit first.'); loadTab('custom'); });
subredditInput.addEventListener('keydown', event => { if (event.key === 'Enter') subredditLoadBtn.click(); });
modalClose.addEventListener('click', closeEditor);
modalOverlay.addEventListener('click', event => { if (event.target === modalOverlay) closeEditor(); });
retryBtn.addEventListener('click', () => loadTab(currentTab));
topTextInput.addEventListener('input', () => { drawMeme(); syncShareMeta(); });
bottomTextInput.addEventListener('input', () => { drawMeme(); syncShareMeta(); });
fontSizeInput.addEventListener('input', () => { fontSizeVal.textContent = fontSizeInput.value; drawMeme(); });
fontColorInput.addEventListener('input', drawMeme);
styleOutlineBtn.addEventListener('click', () => { textShadow = false; styleOutlineBtn.classList.add('active'); styleShadowBtn.classList.remove('active'); drawMeme(); });
styleShadowBtn.addEventListener('click', () => { textShadow = true; styleShadowBtn.classList.add('active'); styleOutlineBtn.classList.remove('active'); drawMeme(); });
filterPills.addEventListener('click', event => { const pill = event.target.closest('.filter-pill'); if (!pill) return; document.querySelectorAll('.filter-pill').forEach(item => item.classList.remove('active')); pill.classList.add('active'); activeFilter = pill.dataset.filter; drawMeme(); });
stickerRow.addEventListener('click', event => { const btn = event.target.closest('.sticker-btn'); if (!btn || btn.id === 'clearStickers') return; stickers.push({ emoji: btn.dataset.sticker, x: memeCanvas.width / 2 + (Math.random() - 0.5) * 100, y: memeCanvas.height / 2 + (Math.random() - 0.5) * 100, size: 60 }); drawMeme(); showToast(`${btn.dataset.sticker} sticker added — drag it anywhere!`); });
clearStickersBtn.addEventListener('click', () => { stickers = []; drawMeme(); showToast('Stickers cleared.'); });
chainBtn.addEventListener('click', async () => { if (!chainImageUrl.value.trim()) return showToast('Paste a second image URL first.'); chainBtn.textContent = '⏳ Loading…'; try { chainImage = await loadImg(chainImageUrl.value.trim()); clearChainBtn.hidden = false; drawMeme(); showToast('Second panel added!'); } catch { showToast('Could not load that image URL.'); } chainBtn.textContent = '🔗 Add Second Panel'; });
clearChainBtn.addEventListener('click', () => { chainImage = null; clearChainBtn.hidden = true; chainImageUrl.value = ''; drawMeme(); showToast('Second panel removed.'); });
shareBtn.addEventListener('click', async () => { const url = getShareUrl(); syncShareMeta(); try { await navigator.clipboard.writeText(url); showToast('Share URL copied!'); } catch { prompt('Copy this shareable URL:', url); } });
embedBtn.addEventListener('click', openEmbed);
embedClose.addEventListener('click', () => { embedOverlay.hidden = true; });
embedOverlay.addEventListener('click', event => { if (event.target === embedOverlay) embedOverlay.hidden = true; });
embedType.addEventListener('change', () => { embedCode.value = buildEmbedCode(); });
copyEmbedBtn.addEventListener('click', async () => { try { await navigator.clipboard.writeText(embedCode.value); showToast('Embed code copied!'); } catch { embedCode.select(); document.execCommand('copy'); showToast('Embed code copied!'); } });
shareXBtn.addEventListener('click', () => shareToNetwork('x'));
shareWhatsAppBtn.addEventListener('click', () => shareToNetwork('whatsapp'));
shareRedditBtn.addEventListener('click', () => shareToNetwork('reddit'));
nativeShareBtn.addEventListener('click', nativeShare);
storyExportBtn.addEventListener('click', exportStory);
downloadBtn.addEventListener('click', downloadMeme);
copyBtn.addEventListener('click', copyMeme);
saveGalleryBtn.addEventListener('click', saveToGallery);
imageUpload.addEventListener('change', event => { const file = event.target.files?.[0]; if (!file) return; fileNameSpan.textContent = file.name.length > 28 ? `${file.name.slice(0, 25)}…` : file.name; const reader = new FileReader(); reader.onload = loadEvent => { const source = loadEvent.target.result; const image = new Image(); image.onload = () => { baseImage = image; currentImageUrl = source; gifBadge.hidden = !file.type.includes('gif'); setupGifPlayback(source); drawMeme(); }; image.src = source; }; reader.readAsDataURL(file); });
galleryGrid.addEventListener('click', event => { const button = event.target.closest('.gallery-action-btn'); if (!button) return; const item = getGallery().find(entry => entry.id === Number(button.dataset.id)); if (!item) return; if (button.dataset.action === 'dl') { const anchor = document.createElement('a'); anchor.href = item.dataUrl; anchor.download = `memedrop-gallery-${item.id}.png`; anchor.click(); } else { saveGallery(getGallery().filter(entry => entry.id !== item.id)); renderGallery(); showToast('Deleted from gallery.'); } });
memeCanvas.addEventListener('mousedown', handleDragStart); window.addEventListener('mousemove', handleDragMove); window.addEventListener('mouseup', handleDragEnd); memeCanvas.addEventListener('touchstart', event => { event.preventDefault(); handleDragStart(event); }, { passive: false }); window.addEventListener('touchmove', event => { if (isDragging) event.preventDefault(); handleDragMove(event); }, { passive: false }); window.addEventListener('touchend', handleDragEnd);
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modalOverlay.hidden) closeEditor(); if ((event.key === 'd' || event.key === 'D') && !modalOverlay.hidden && !['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) { event.preventDefault(); downloadMeme(); } });

const observer = new IntersectionObserver(entries => { if (entries[0].isIntersecting) loadMoreMemes(); }, { rootMargin: '500px 0px' });
observer.observe(infiniteScrollSentinel);

document.addEventListener('DOMContentLoaded', async () => {
  const light = localStorage.getItem('memedrop-theme') === 'light'; document.body.classList.toggle('light-mode', light); themeIcon.textContent = light ? '🌙' : '☀️';
  const params = new URLSearchParams(location.search); const imageParam = params.get('img');
  if (imageParam) openEditor(imageParam, 'Shared MemeDrop meme');
  await loadTab('fresh');
});
