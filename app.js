import { renderFitness, disposeFitness } from './fitness-ui.js';
import { loadShows, loadChineseShows, loadWeather, shanghaiDate, staticDataFetch } from './online.mjs';
import { content } from './assets/content.js';
import { catalog } from './assets/catalog.js';
import { createPairs, flipCard, settlePair, pickPairPhotos } from './core.mjs';

const $ = selector => document.querySelector(selector);
const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const media = path => window.RORO_MEDIA ? window.RORO_MEDIA(path) : path;
async function onlineFetch(url, options) {
  if (window.RORO_STATIC_HOST) return staticDataFetch(url, options, {baseURL:document.baseURI});
  const remote = new URL(url);
  if (!window.RORO_PORTABLE && /^https?:$/.test(location.protocol)) {
    const route = remote.hostname === 'api.tvmaze.com' ? `api/tvmaze${remote.pathname}` : remote.hostname === 'api.open-meteo.com' ? 'api/weather/forecast' : remote.hostname === 'movie.douban.com' ? 'api/chinese/shows' : null;
    if (route) {
      const local = new URL(route + remote.search, document.baseURI);
      const response = await fetch(local, { ...options, credentials: 'same-origin' });
      if (![404,403,405].includes(response.status)) return response;
    }
  }
  return fetch(url, options);
}
let memories = content.memories;
let photos = content.memories.map((m, i) => ({ ...m, id: String(i), thumb: m.photo, category: '故事预览' }));
let videos = [];
let memoryIndex = 0;
let category = '全部';
let visibleCount = 16;
let lightboxItems = [];
let lightboxIndex = 0;
let pairGame, pairPhotos = [], pairTimer;
let tvMood = '随缘', lastShow = '', tvQuery = '', tvRequest = 0, tvList = [], tvSource = '', tvUpdated = '', tvNote = '';
let weatherRequest = 0;
const weatherCache = new Map();
const cityCoordinates = [{latitude:29.60,longitude:103.48},{latitude:29.55,longitude:103.77},{latitude:31.88,longitude:120.56},{latitude:31.30,longitude:120.59},{latitude:31.23,longitude:121.47}];
let sceneryCity = 0, sceneryIndex = 0;
let objectURLs = [];
const dialog = $('#activity-dialog');
const body = $('#dialog-body');
const photoDialog = $('#photo-dialog');

function renderMemories() {
  memoryIndex = Math.min(memoryIndex, memories.length - 1);
  const memory = memories[memoryIndex];
  $('#featured-image').src = media(memory.photo);
  $('#featured-image').alt = memory.title;
  $('#memory-date').textContent = memory.date || '我们的小日子';
  $('#memory-name').textContent = memory.title;
  $('#memory-note').textContent = memory.note;
  $('#featured-photo-note').textContent = memory.photoNote || '把这一刻，留久一点。';
  $('#memory-counter').textContent = `${memoryIndex + 1} / ${memories.length}`;
  $('#sample-note').hidden = !memory.demo;
  $('#film-strip').innerHTML = memories.map((m, i) => `<button class="film-thumb ${i === memoryIndex ? 'active' : ''}" data-memory="${i}" aria-label="${escape(m.title)}" aria-pressed="${i === memoryIndex}"><img src="${escape(media(m.thumb || m.photo))}" alt="" loading="lazy"></button>`).join('');
}

function moveMemory(delta) { memoryIndex = (memoryIndex + delta + memories.length) % memories.length; renderMemories(); }
$('#memory-prev').addEventListener('click', () => moveMemory(-1));
$('#memory-next').addEventListener('click', () => moveMemory(1));
$('#film-strip').addEventListener('click', event => { const button = event.target.closest('[data-memory]'); if (button) { memoryIndex = Number(button.dataset.memory); renderMemories(); } });
$('#featured-open').addEventListener('click', () => openPhotos(memories, memoryIndex));

function filteredPhotos() { return category === '全部' ? photos : photos.filter(photo => photo.category === category); }
function renderAlbum() {
  const categories = ['全部', ...new Set(photos.map(photo => photo.category))];
  $('#album-filters').innerHTML = categories.map(name => `<button class="filter-chip ${category === name ? 'active' : ''}" data-category="${escape(name)}" aria-pressed="${category === name}">${escape(name)}</button>`).join('');
  const selection = filteredPhotos();
  $('#photo-grid').innerHTML = selection.slice(0, visibleCount).map((photo, i) => `<button class="album-photo" data-photo="${i}" aria-label="放大：${escape(photo.title)}"><img src="${escape(media(photo.thumb || photo.photo))}" alt="${escape(photo.title)}" loading="lazy" decoding="async" ${photo.width && photo.height ? `width="${photo.width}" height="${photo.height}"` : ''}><span>${escape(photo.shortTitle || photo.category)}</span></button>`).join('');
  $('#load-more').hidden = visibleCount >= selection.length;
  $('#album-status').textContent = selection.length ? `收藏了 ${selection.length} 个瞬间，慢慢翻，不着急。` : '这里还空着，可以随时放进喜欢的照片。';
}
$('#album-filters').addEventListener('click', event => { const button = event.target.closest('[data-category]'); if (button) { category = button.dataset.category; visibleCount = 16; renderAlbum(); } });
$('#load-more').addEventListener('click', () => { visibleCount += 16; renderAlbum(); });
$('#photo-grid').addEventListener('click', event => { const button = event.target.closest('[data-photo]'); if (button) openPhotos(filteredPhotos(), Number(button.dataset.photo)); });

function openPhotos(items, index = 0) {
  lightboxItems = items;
  lightboxIndex = index;
  updateLightbox();
  if (!photoDialog.open) photoDialog.showModal();
}
function updateLightbox() {
  const photo = lightboxItems[lightboxIndex];
  $('#lightbox-image').src = media(photo.photo);
  $('#lightbox-image').alt = photo.title || '我们的照片';
  $('#lightbox-label').textContent = `${lightboxIndex + 1} / ${lightboxItems.length}`;
  $('#lightbox-caption').textContent = photo.title || '想把这一刻，好好收藏。';
  photoDialog.classList.toggle('reading-mode', photo.kind === 'letter');
  photoDialog.scrollTop = 0;
}
function movePhoto(delta) { lightboxIndex = (lightboxIndex + delta + lightboxItems.length) % lightboxItems.length; updateLightbox(); }
$('#lightbox-prev').addEventListener('click', () => movePhoto(-1));
$('#lightbox-next').addEventListener('click', () => movePhoto(1));
$('#lightbox-close').addEventListener('click', () => photoDialog.close());
photoDialog.addEventListener('keydown', event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); movePhoto(event.key === 'ArrowLeft' ? -1 : 1); } });
function addSwipe(element, move) {
  let start = null;
  element.addEventListener('pointerdown', event => { if (event.pointerType !== 'mouse') start = { x: event.clientX, y: event.clientY }; });
  element.addEventListener('pointerup', event => { if (start) { const dx = event.clientX - start.x, dy = event.clientY - start.y; if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx > 0 ? -1 : 1); start = null; } });
  element.addEventListener('pointercancel', () => { start = null; });
}
addSwipe($('#lightbox-image'), movePhoto);
addSwipe($('#featured-image'), moveMemory);

function openActivity(name) {
  clearTimeout(pairTimer); disposeFitness(); tvRequest++; weatherRequest++;
  body.querySelectorAll('video').forEach(video => video.pause());
  body.dataset.activity = name;
  body.replaceChildren();
  const titles = { letter: '雪宝，有几句话想认真说。', tv: '今天，想看点什么？', scenery: '去看点好看的。', pairs: '照片碰碰对', workout: '今天，舒服地动一动。' };
  $('#dialog-title').textContent = titles[name] || '我们的小天地';
  if (name === 'letter') body.innerHTML = `<div class="letter">${content.letter.map(p => `<p>${escape(p)}</p>`).join('')}<div class="signature">${escape(content.signature)}</div><button class="primary-button" id="letter-continue">把信收好，去玩一会儿</button></div>`;
  if (name === 'tv') { tvMood = '随缘'; tvQuery = ''; renderTV(); }
  if (name === 'scenery') { sceneryCity = 0; sceneryIndex = 0; renderScenery(); }
  if (name === 'pairs') startPairs();
  if (name === 'workout') renderFitness(body);
  if (!dialog.open) dialog.showModal();
}
document.addEventListener('click', event => { const trigger = event.target.closest('[data-action]'); if (trigger) openActivity(trigger.dataset.action); });
$('[data-close]').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => { clearTimeout(pairTimer); disposeFitness(); tvRequest++; weatherRequest++; body.querySelectorAll('video').forEach(video => video.pause()); });
for (const modal of [dialog, photoDialog]) modal.addEventListener('click', event => { if (event.target !== modal) return; const r = modal.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) modal.close(); });

const queryAliases = { '三体':'Three-Body', '庆余年':'Joy of Life', '去有风的地方':'Meet Yourself', '漫长的季节':'The Long Season', '怪奇物语':'Stranger Things', '银魂':'Gintama', '大明风华':'Ming Dynasty' };
const displayNames = { 'Stranger Things':'怪奇物语', 'Meet Yourself':'去有风的地方', 'The Long Season':'漫长的季节', 'Joy of Life':'庆余年', 'Gintama':'银魂' };
async function renderTV() {
  const request = ++tvRequest;
  body.innerHTML = `<p class="dialog-intro">从今天更新的剧里挑一部，或者搜搜你想看的名字。</p><form id="show-search" class="show-search"><label class="sr-only" for="show-query">想看什么剧</label><input id="show-query" type="search" placeholder="搜剧名，中文或英文都可以试试" value="${escape(tvQuery)}" maxlength="100"><button class="secondary-button" type="submit">搜一搜</button></form><div class="filter-row">${['随缘','想轻松','想烧脑','想冒险'].map(mood => `<button class="filter-chip ${mood === tvMood ? 'active' : ''}" data-mood="${mood}" aria-pressed="${mood === tvMood}">${mood}</button>`).join('')}</div><p id="tv-connection" class="connection-status" role="status">正在联网找片单，稍等一下…</p><div id="tv-choice"></div><div class="tv-actions"><button class="secondary-button" id="another-show" hidden>再换一部</button><button class="text-button" id="refresh-shows">重新联网更新</button><button class="text-button" id="today-shows">看今天上新</button></div><p class="source-credit">在线剧集数据：<a href="https://www.tvmaze.com/" target="_blank" rel="noopener noreferrer">TVmaze</a>（<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA</a>）。并非所有剧集都有中文资料。</p>`;
  try {
    let result;
    if (!tvQuery && tvMood === '随缘') { try { result = await loadChineseShows({mood:tvMood},{fetchImpl:onlineFetch}); } catch { /* Try the independent streaming data source below. */ } }
    if (!result) result = await loadShows({ query: queryAliases[tvQuery] || tvQuery, mood: tvMood, date: shanghaiDate() }, { fetchImpl: onlineFetch });
    if (request !== tvRequest || body.dataset.activity !== 'tv') return;
    tvList = result.shows; tvSource = result.source; tvUpdated = result.updatedAt;
    tvNote = result.source === 'cache' ? '这次没连上，先看上次取到的片单。' : result.source === 'feed' ? '已联网读取定时采集的片单，以标注的采集时间为准。' : tvQuery ? '已联网找到相关剧集。' : result.sourceUrl.includes('douban') ? '已联网读取按时间排列的最新中文片单。' : '已联网读取今天更新的流媒体剧集。';
    const credit = body.querySelector('.source-credit');
    if (credit && result.sourceUrl.includes('douban')) credit.innerHTML = '中文片单来源：<a href="https://movie.douban.com/tv/" target="_blank" rel="noopener noreferrer">豆瓣公开剧集列表</a>。按条目时间排列，播出情况以剧集资料为准。';
    paintTVChoice();
  } catch {
    if (request !== tvRequest || body.dataset.activity !== 'tv') return;
    tvList = []; tvSource = 'unavailable'; tvUpdated = '';
    tvNote = '这次没连上在线片单。点击重新联网更新，或稍后再来看看。';
    paintTVChoice();
  }
}
function paintTVChoice() {
  if (!$('#tv-choice')) return;
  const pool = tvList.filter(show => show.title !== lastShow);
  const choices = pool.length ? pool : tvList;
  const show = choices[Math.floor(Math.random() * choices.length)];
  $('#another-show').hidden = !show || tvList.length < 2;
  $('#tv-connection').textContent = tvNote + (tvUpdated ? ` 更新于 ${new Date(tvUpdated).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}。` : '');
  if (!show) { $('#tv-choice').innerHTML = '<p class="empty-state">这次没找到合适的。试试换个心情，或搜一下剧的英文原名。</p>'; return; }
  lastShow = show.title;
  const title = displayNames[show.title] || show.title;
  const poster = show.poster ? `<img src="${escape(media(show.poster))}" alt="${escape(title)}海报" width="155" height="220">` : `<div class="poster-placeholder">${escape(title)}</div>`;
  $('#tv-choice').innerHTML = `<div class="tv-result">${poster}<div><p class="small-date">${escape(show.mood || tvMood)}${show.language ? ` / ${escape(show.language)}` : ''}</p><h3>${escape(title)}</h3><p>${escape((show.description || '这部剧的简介还没更新，可以点开资料看看。').slice(0,450))}</p>${show.rating != null ? `<p class="small-date">观众评分 ${escape(show.rating)} / 10</p>` : ''}${show.url ? `<a class="secondary-button" href="${escape(show.url)}" target="_blank" rel="noopener noreferrer">看看剧集资料</a>` : ''}</div></div>`;
}
body.addEventListener('submit', event => { if (event.target.id === 'show-search') { event.preventDefault(); tvQuery = $('#show-query').value.trim(); renderTV(); } });
async function updateWeather() {
  const request = ++weatherRequest, cityIndex = sceneryCity;
  const cached = weatherCache.get(cityIndex);
  try {
    const weather = cached && Date.now() - cached.saved < 300000 ? cached.weather : await loadWeather(cityCoordinates[cityIndex], { fetchImpl: onlineFetch });
    if (request !== weatherRequest || body.dataset.activity !== 'scenery') return;
    weatherCache.set(cityIndex,{weather,saved:Date.now()});
    $('#weather-status').textContent = `${catalog.scenery[cityIndex].name} ${weather.temperature}°C · ${weather.description} · ${weather.source === 'cache' ? '上次数据 ' : '数据时间 '}${weather.time.replace('T',' ')}（当地城市参考）`;
  } catch {
    if (request === weatherRequest && $('#weather-status') && body.dataset.activity === 'scenery') $('#weather-status').textContent = '这次没取到当地天气，照片可以照常看。稍后点“更新天气”再试。';
  }
}
function renderScenery() {
  const city = catalog.scenery[sceneryCity];
  body.innerHTML = `<p class="dialog-intro">看看远处的风景，按自己的心情选一站。</p><div class="filter-row">${catalog.scenery.map((place, i) => `<button class="filter-chip ${i === sceneryCity ? 'active' : ''}" data-city="${i}" aria-pressed="${i === sceneryCity}">${escape(place.name)}</button>`).join('')}</div><p class="scenery-description">${escape(city.description)}</p><p class="connection-status" id="weather-status" role="status">正在联网看看当地天气…</p><p class="source-credit"><button class="text-button" id="refresh-weather">更新天气</button> · 天气数据 <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a></p><img class="scenery-photo" id="scenery-image" src="${escape(media(city.photos[sceneryIndex]))}" alt="${escape(city.name)}风景，第 ${sceneryIndex + 1} 张"><div class="gallery-controls"><button class="round-button" data-scenery-step="-1" aria-label="上一张风景">←</button><span class="muted">${sceneryIndex + 1} / ${city.photos.length}</span><button class="round-button" data-scenery-step="1" aria-label="下一张风景">→</button><button class="secondary-button" id="zoom-scenery">放大看</button></div>`;
  updateWeather();
  addSwipe($('#scenery-image'), step => { sceneryIndex = (sceneryIndex + step + city.photos.length) % city.photos.length; renderScenery(); });
}

function startPairs() {
  clearTimeout(pairTimer);
  pairPhotos = pickPairPhotos(photos);
  pairGame = createPairs(pairPhotos.map(photo => photo.id));
  body.innerHTML = `<p class="dialog-intro">翻开两张照片，找到相同的照片。慢一点也没关系。</p><p class="game-status" id="pair-status" aria-live="polite">找到 ${pairPhotos.length} 对照片，这一局就完成啦。</p><div class="game-board pairs-board">${pairGame.cards.map((card, i) => { const photo = pairPhotos.find(p => p.id === card.pairId); return `<button class="pair-card" data-card="${escape(card.id)}" aria-label="翻开第 ${i + 1} 张照片" aria-pressed="false"><span class="card-back" aria-hidden="true">♡</span><img src="${escape(media(photo.thumb || photo.photo))}" alt="" aria-hidden="true"></button>`; }).join('')}</div><div class="game-won" id="pair-won" hidden>全部配对成功！这一局完成得很棒。♡</div><div class="game-actions"><button class="secondary-button" id="reset-pairs">再玩一次</button></div>`;
}
function paintPairs() {
  body.querySelectorAll('[data-card]').forEach((button, i) => { const id = button.dataset.card, card = pairGame.cards.find(c => c.id === id), matched = pairGame.matched.includes(id), revealed = matched || pairGame.open.includes(id), identity = `照片 ${pairPhotos.findIndex(p => p.id === card.pairId) + 1}`; button.classList.toggle('matched', matched); button.classList.toggle('revealed', revealed); button.disabled = matched; button.setAttribute('aria-pressed', String(revealed)); button.setAttribute('aria-label', matched ? `${identity}，已配对` : revealed ? `${identity}，已翻开` : `翻开第 ${i + 1} 张照片`); });
  $('#pair-status').textContent = `已经找到 ${pairGame.matched.length / 2} / ${pairPhotos.length} 对 · 翻牌 ${pairGame.moves} 次`;
  $('#pair-won').hidden = !pairGame.complete;
}
function playPair(id) {
  const previous = pairGame;
  pairGame = flipCard(pairGame, id);
  if (previous === pairGame) return;
  paintPairs();
  if (pairGame.locked) pairTimer = setTimeout(() => { pairGame = settlePair(pairGame); paintPairs(); }, 850);
}
body.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.id === 'letter-continue') { dialog.close(); $('#little-things').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
  if (button.id === 'another-show') paintTVChoice();
  if (button.id === 'refresh-shows') renderTV();
  if (button.id === 'today-shows') { tvQuery = ''; renderTV(); }
  if (button.id === 'zoom-scenery') { const city=catalog.scenery[sceneryCity]; openPhotos(city.photos.map(photo=>({photo,title:city.name+'的风景'})),sceneryIndex); }
  if (button.id === 'refresh-weather') { weatherCache.delete(sceneryCity); updateWeather(); }
  if (button.dataset.mood) { tvMood = button.dataset.mood; renderTV(); }
  if (button.dataset.city !== undefined) { sceneryCity = Number(button.dataset.city); sceneryIndex = 0; renderScenery(); }
  if (button.dataset.sceneryStep) { const count = catalog.scenery[sceneryCity].photos.length; sceneryIndex = (sceneryIndex + Number(button.dataset.sceneryStep) + count) % count; renderScenery(); }
  if (button.dataset.card) playPair(button.dataset.card);
  if (button.id === 'reset-pairs') startPairs();
});

function renderVideos() {
  $('#cinema').hidden = !videos.length;
  $('#video-grid').innerHTML = videos.map((video, i) => `<button class="video-card" data-video="${i}" aria-label="播放：${escape(video.title)}"><div class="video-cover"><img src="${escape(media(video.poster))}" alt="${escape(video.title)}" loading="lazy"><span class="play-icon" aria-hidden="true">▷</span></div><strong>${escape(video.title)}</strong><small>${escape(video.note || '想听你，再说一遍。')}</small></button>`).join('');
}
$('#video-grid').addEventListener('click', async event => {
  const button = event.target.closest('[data-video]');
  if (!button) return;
  const video = videos[Number(button.dataset.video)];
  if (!video) return;
  clearTimeout(pairTimer);
  $('#dialog-title').textContent = video.title;
  const asynchronous = typeof window.RORO_GET_MEDIA === 'function';
  body.innerHTML = `<video class="memory-video" controls playsinline preload="metadata" poster="${escape(media(video.poster))}"><source${asynchronous ? '' : ` src="${escape(media(video.src))}"`} type="video/mp4">这个浏览器暂时无法播放视频。</video><p class="dialog-intro" style="margin-top:12px">${escape(video.note || '把这一刻，留久一点。')}</p>`;
  if (!dialog.open) dialog.showModal();
  if (!asynchronous) return;
  const player = body.querySelector('video');
  const status = document.createElement('p');
  status.className = 'connection-status'; status.setAttribute('role', 'status'); status.textContent = '正在打开这段视频…'; body.append(status);
  try {
    const url = await window.RORO_GET_MEDIA(video.src);
    if (!dialog.open || !player.isConnected || body.querySelector('video') !== player) return;
    player.querySelector('source').src = url;
    player.load();
    status.textContent = '已打开，点播放即可观看。';
  } catch {
    if (dialog.open && player.isConnected) status.textContent = '这段视频暂时没有打开，可以关掉后再试一次。';
  }
});

function updateHero(front, back) {
  if (front) { $('#hero-front').src = media(front.photo); document.documentElement.style.setProperty('--hero-backdrop', `url("${media(front.thumb || front.photo)}")`); $('#hero-front').alt = front.title || '我们的一张合照'; }
  if (back) { $('#hero-back').src = media(back.photo); $('#hero-back').alt = back.title || '想收藏的你'; }
}
async function loadPersonalAlbum() {
  try {
    let album = window.RORO_ALBUM;
    if (!album) { const response = await fetch('./photos-private/manifest.json', { cache: 'no-store' }); if (!response.ok) return; album = await response.json(); }
    if (!Array.isArray(album.photos) || !album.photos.length) return;
    photos = album.photos;
    memories = album.featured?.length ? album.featured : photos.slice(0, 6);
    videos = album.videos || [];
    updateHero(photos.find(photo => photo.id === album.hero?.front) || photos[0], photos.find(photo => photo.id === album.hero?.back) || photos[1]);
    renderLetters(album.letters || []);
    renderMemories(); renderAlbum(); renderVideos();
  } catch { /* The public template remains usable without local private media. */ }
}
function renderLetters(ids) {
  const letters = ids.map(id => photos.find(photo => photo.id === id)).filter(Boolean);
  $('#letter-shelf').hidden = !letters.length;
  $('#letter-shelf').innerHTML = `<div><h3>当时写下的日记和消息。</h3><p>当时的日记和长消息，都可以自愿打开。</p></div><div class="letter-buttons">${letters.map((photo, index) => `<button class="secondary-button" data-read-letter="${escape(photo.id)}">${index === 0 ? '开心日记（雪宝）' : `那时候写下的话 · ${index}`}</button>`).join('')}</div>`;
}
$('#letter-shelf').addEventListener('click', event => { const button = event.target.closest('[data-read-letter]'); if (button) { const letters = photos.filter(photo => photo.kind === 'letter'); openPhotos(letters, letters.findIndex(photo => photo.id === button.dataset.readLetter)); } });
document.querySelectorAll('a[href="#our-corner"]').forEach(link => link.addEventListener('click', () => { $('#our-corner').open = true; }));
function toggleStudio() { $('#studio').hidden = location.hash !== '#studio'; }
window.addEventListener('hashchange', toggleStudio);
toggleStudio();
$('#photo-picker').addEventListener('change', event => {
  const files = [...event.target.files].filter(file => /^image\/(jpeg|png|webp|avif)$/.test(file.type)).slice(0, 60);
  if (!files.length) { $('#import-status').textContent = '还没有选到照片，可以选择 JPG、PNG、WebP 或 AVIF 图片。'; return; }
  photoDialog.close(); dialog.close();
  for (const url of objectURLs) URL.revokeObjectURL(url);
  objectURLs = files.map(file => URL.createObjectURL(file));
  photos = objectURLs.map((photo, i) => ({ id: `local-${i}`, photo, thumb: photo, category: '刚刚放入的回忆', title: '照片里的你，真的很好看。' }));
  memories = photos.slice(0, 8).map((photo, i) => ({ ...photo, date: '我们的片段', note: '不必是特别的日子。只要有你，就想记下来。', title: i ? '普通的一天，也值得收藏。' : '最喜欢的画面里，有你。' }));
  memoryIndex = 0; category = '全部'; visibleCount = 16;
  updateHero(photos[0], photos[1] || photos[0]);
  renderMemories(); renderAlbum();
  $('#import-status').textContent = `已换入 ${photos.length} 张照片。只在当前页面预览，没有上传。`;
});
document.addEventListener('error', event => {
  if (event.target instanceof HTMLImageElement && !event.target.dataset.failed) { event.target.dataset.failed = 'true'; event.target.src = media('assets/heart.svg'); event.target.style.objectFit = 'contain'; }
}, true);
renderMemories(); renderAlbum(); renderVideos();
loadPersonalAlbum();
