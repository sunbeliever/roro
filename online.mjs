const HOUR = 60 * 60 * 1000;
const SHOW_SOURCE = 'https://www.tvmaze.com/';
const WEATHER_SOURCE = 'https://open-meteo.com/';
const moodGenres = {
  '想轻松': ['comedy', 'family', 'romance'],
  '想烧脑': ['mystery', 'crime', 'thriller'],
  '想冒险': ['action', 'adventure', 'fantasy', 'science-fiction']
};
const weatherDescriptions = {
  0: '晴', 1: '大部晴朗', 2: '多云', 3: '阴', 45: '雾', 48: '雾凇',
  51: '小毛毛雨', 53: '中毛毛雨', 55: '强毛毛雨', 56: '轻度冻毛毛雨', 57: '强冻毛毛雨',
  61: '小雨', 63: '中雨', 65: '大雨', 66: '轻度冻雨', 67: '强冻雨',
  71: '小雪', 73: '中雪', 75: '大雪', 77: '米雪',
  80: '小阵雨', 81: '中阵雨', 82: '强阵雨', 85: '小阵雪', 86: '大阵雪',
  95: '雷雨', 96: '雷雨伴小冰雹', 99: '雷雨伴大冰雹'
};

export function shanghaiDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const part = name => parts.find(item => item.type === name).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function requestContext(options) {
  const now = Number(typeof options.now === 'function' ? options.now() : Date.now());
  if (!Number.isFinite(now)) throw new Error('当前时间无效');
  let storage;
  try { storage = 'storage' in options ? options.storage : globalThis.localStorage; }
  catch { storage = null; }
  return {
    now, storage,
    fetchImpl: options.fetchImpl || globalThis.fetch,
    maxAge: Math.max(0, Math.min(HOUR, Number.isFinite(options.maxAgeMs) ? options.maxAgeMs : HOUR)),
    timeout: Math.max(1, Math.min(8000, Number.isFinite(options.timeoutMs) ? options.timeoutMs : 8000))
  };
}

async function requestJSON(url, context) {
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('实时请求超时，请稍后再试'));
    }, context.timeout);
  });
  try {
    return await Promise.race([deadline, (async () => {
      const response = await context.fetchImpl(url, { signal: controller.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!response.ok) throw new Error(`实时接口返回 HTTP ${response.status}`);
      const collected = response.headers?.get?.('x-roro-collected-at');
      context.collectedAt = collected ? Date.parse(collected) : context.now;
      if (!Number.isFinite(context.collectedAt) || context.collectedAt > context.now + 300000) throw new Error('数据采集时间无效');
      context.dataSource = collected ? 'feed' : 'live';
      context.feedExpiresAt = collected ? Date.parse(response.headers?.get?.('x-roro-expires-at') || '') : Infinity;
      if (collected && !Number.isFinite(context.feedExpiresAt)) context.feedExpiresAt = context.now;
      return await response.json();
    })()]);
  } finally { clearTimeout(timer); }
}

function saveCache(key, data, context) {
  try { context.storage?.setItem(key, JSON.stringify({ savedAt: context.now, expiresAt:Math.min(context.now+context.maxAge,context.feedExpiresAt ?? Infinity), data })); }
  catch { /* Storage can be blocked or full; the live result is still usable. */ }
}

function readCache(key, context, validate) {
  try {
    const cached = JSON.parse(context.storage?.getItem(key) || 'null');
    const age = context.now - cached?.savedAt;
    if (!Number.isFinite(cached?.savedAt) || age < 0 || age > context.maxAge || !validate(cached.data)) return null;
    if (cached.data.source === 'feed' && !Number.isFinite(cached.expiresAt)) return null;
    if (Number.isFinite(cached.expiresAt) && context.now > cached.expiresAt) return null;
    return { ...cached.data, source: 'cache' };
  } catch { return null; }
}

function httpsURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

function plainText(value) {
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—' };
  const strip = text => text.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<\/?[a-z][^>]*>/gi, ' ');
  return strip(strip(String(value ?? '')).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, entity) => {
    if (!entity.startsWith('#')) return entities[entity.toLowerCase()] ?? whole;
    const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '�';
  })).replace(/\s+/g, ' ').trim();
}

function normalizeShows(items, mood) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const show = item?.show || item?._embedded?.show;
    if (!show || !Number.isInteger(show.id) || show.id < 1 || seen.has(show.id) || !['Scripted', 'Animation'].includes(show.type)) continue;
    const genres = Array.isArray(show.genres) ? show.genres.map(value => String(value).toLowerCase()) : [];
    if (genres.some(genre => /\b(adult|erotica)\b/i.test(genre))) continue;
    const matches = Object.keys(moodGenres).filter(name => moodGenres[name].some(genre => genres.includes(genre)));
    if (mood !== '随缘' && !matches.includes(mood)) continue;
    const title = plainText(show.name);
    if (!title) continue;
    seen.add(show.id);
    result.push({
      id: show.id, title, description: plainText(show.summary),
      poster: httpsURL(show.image?.medium) || httpsURL(show.image?.original),
      url: httpsURL(show.url) || `${SHOW_SOURCE}shows/${show.id}`,
      mood: mood === '随缘' ? matches[0] || '随缘' : mood,
      rating: Number.isFinite(show.rating?.average) ? show.rating.average : null,
      language: plainText(show.language)
    });
  }
  return result;
}

function validShows(data) {
  return data?.sourceUrl === SHOW_SOURCE && Number.isFinite(Date.parse(data.updatedAt)) && Array.isArray(data.shows) && data.shows.every(show =>
    Number.isInteger(show.id) && typeof show.title === 'string' && typeof show.description === 'string' &&
    httpsURL(show.url) && (show.poster === '' || httpsURL(show.poster)) && typeof show.language === 'string');
}

export async function loadShows({ query = '', mood = '随缘', date } = {}, options = {}) {
  const context = requestContext(options);
  query = String(query).trim();
  date ??= shanghaiDate(new Date(context.now));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error('请选择有效日期');
  const key = `roro:online:v1:shows:${JSON.stringify([query, mood, date])}`;
  try {
    const url = new URL(query ? 'https://api.tvmaze.com/search/shows' : 'https://api.tvmaze.com/schedule/web');
    if (query) url.searchParams.set('q', query);
    else { url.searchParams.set('country', 'CN'); url.searchParams.set('date', date); }
    let items = await requestJSON(url.href, context);
    if (!Array.isArray(items)) throw new Error('剧集接口响应格式不完整');
    if (!query && !normalizeShows(items, mood).length) {
      url.searchParams.delete('country');
      items = await requestJSON(url.href, context);
      if (!Array.isArray(items)) throw new Error('剧集接口响应格式不完整');
    }
    const result = { shows: normalizeShows(items, mood), source: context.dataSource, updatedAt: new Date(context.collectedAt).toISOString(), sourceUrl: SHOW_SOURCE };
    saveCache(key, result, context);
    return result;
  } catch (error) {
    const cached = readCache(key, context, validShows);
    if (cached) return cached;
    throw error;
  }
}

function validWeather(data) {
  return Number.isFinite(data?.temperature) && Object.values(weatherDescriptions).includes(data.description) &&
    typeof data.time === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(data.time) && data.sourceUrl === WEATHER_SOURCE;
}

export async function loadWeather({ latitude, longitude }, options = {}) {
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) throw new Error('天气坐标无效');
  const context = requestContext(options);
  const key = `roro:online:v1:weather:${JSON.stringify([latitude, longitude, shanghaiDate(new Date(context.now))])}`;
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({ latitude, longitude, current: 'temperature_2m,weather_code', timezone: 'Asia/Shanghai' });
    const data = await requestJSON(url.href, context);
    const current = data?.current;
    const result = { temperature: current?.temperature_2m, description: weatherDescriptions[current?.weather_code], time: current?.time, source: context.dataSource, sourceUrl: WEATHER_SOURCE };
    if (!Number.isInteger(current?.weather_code) || !validWeather(result)) throw new Error('天气接口响应字段不完整或天气码未知');
    saveCache(key, result, context);
    return result;
  } catch (error) {
    const cached = readCache(key, context, validWeather);
    if (cached) return cached;
    throw error;
  }
}

// The public Chinese TV listing has no search endpoint contract. Search remains
// on TVmaze, while this feed explicitly represents titles ordered by time.
export async function loadChineseShows({ mood = '随缘' } = {}, options = {}) {
  const context = requestContext(options);
  const tag = { '随缘':'国产剧', '想轻松':'喜剧', '想烧脑':'悬疑', '想冒险':'科幻' }[mood] || '国产剧';
  const key = `roro:online:v1:chinese:${JSON.stringify([tag,shanghaiDate(new Date(context.now))])}`;
  try {
    const url = new URL('https://movie.douban.com/j/search_subjects');
    url.search = new URLSearchParams({type:'tv',tag,sort:'time',page_limit:'24',page_start:'0'});
    const data = await requestJSON(url.href,context);
    if (!Array.isArray(data?.subjects)) throw new Error('中文片单暂不可用');
    const seen = new Set();
    const shows = data.subjects.filter(show => {
      if (!/^\d+$/.test(String(show?.id)) || seen.has(String(show.id)) || !plainText(show.title) || !/^https:\/\/movie\.douban\.com\/subject\//.test(httpsURL(show.url))) return false;
      seen.add(String(show.id)); return true;
    }).map(show => {
      return { id:Number(show.id),title:plainText(show.title),description:'按时间排列的中文剧集条目。点开资料可以查看简介、演员和播出信息。',poster:httpsURL(show.cover),url:show.url,mood,rating:show.rate != null && String(show.rate).trim() !== '' && Number.isFinite(Number(show.rate)) ? Number(show.rate) : null,language:'中文片单' };
    });
    const result = {shows,source:context.dataSource,updatedAt:new Date(context.collectedAt).toISOString(),sourceUrl:'https://movie.douban.com/tv/'};
    saveCache(key,result,context);
    return result;
  } catch (error) {
    const cached = readCache(key,context,data => data?.sourceUrl === 'https://movie.douban.com/tv/' && Array.isArray(data.shows) && data.shows.every(show => httpsURL(show.url)));
    if (cached) return cached;
    throw error;
  }
}

// GitHub Pages has no server runtime. A scheduled job collects public data;
// visitors fetch those same-origin files with the collection time preserved.
export async function staticDataFetch(url, init = {}, {baseURL, fetchImpl = globalThis.fetch, now = Date.now()} = {}) {
  const remote = new URL(url);
  let name;
  if (remote.hostname === 'movie.douban.com' && remote.pathname === '/j/search_subjects') {
    name = {'国产剧':'tv-any','喜剧':'tv-light','悬疑':'tv-mystery','科幻':'tv-adventure'}[remote.searchParams.get('tag')];
  } else if (remote.hostname === 'api.open-meteo.com' && remote.pathname === '/v1/forecast') {
    const lat = Number(remote.searchParams.get('latitude')), lon = Number(remote.searchParams.get('longitude'));
    if (Number.isFinite(lat) && Number.isFinite(lon)) name = `weather-${lat.toFixed(2).replace('.','_')}-${lon.toFixed(2).replace('.','_')}`;
  } else if (remote.hostname === 'api.tvmaze.com' && remote.pathname === '/schedule/web') name = remote.searchParams.get('country') === 'CN' ? 'schedule-cn' : 'schedule-global';
  if (!name) return fetchImpl(url, init);
  const response = await fetchImpl(new URL(`data/${name}.json?v=${Math.floor(now / 1800000)}`, baseURL).href, init);
  if (!response.ok) return response;
  const snapshot = await response.json();
  const collected = Date.parse(snapshot?.collectedAt), age = now - collected;
  const maximumAge = name.startsWith('weather-') ? 3 * HOUR : 36 * HOUR;
  if (!Number.isFinite(age) || age < -300000 || age > maximumAge) throw new Error('线上数据尚未及时更新，请稍后再试');
  const original = new URL(snapshot.requestURL);
  if (original.origin !== remote.origin || original.pathname !== remote.pathname || [...remote.searchParams].some(([key,value]) => original.searchParams.get(key) !== value) || [...original.searchParams].some(([key,value]) => remote.searchParams.get(key) !== value)) throw new Error('线上数据与当前查询不匹配');
  return new Response(JSON.stringify(snapshot.body), {status:200,headers:{'Content-Type':'application/json','x-roro-collected-at':snapshot.collectedAt,'x-roro-expires-at':new Date(collected+maximumAge).toISOString()}});
}
