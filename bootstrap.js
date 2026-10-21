window.RORO_STATIC_HOST = true;
// Private data and the decryption key never belong in this public file.
(async () => {
  const status = text => { const node = document.getElementById('gift-message'); if (node) node.textContent = text; };
  if (!globalThis.crypto?.subtle) { status('这个浏览器暂时不支持安全解密。请通过 HTTPS 链接，用新版微信或系统浏览器打开。'); return; }
  let encodedKey;
  const incoming = new URLSearchParams(location.hash.slice(1)).get('gift');
  try { encodedKey = incoming || sessionStorage.getItem('roro-gift-key'); } catch { encodedKey = incoming; }
  if (!encodedKey) { status('这个链接缺少打开礼物的密钥。请使用收到的完整私人链接。'); return; }
  if (!/^[A-Za-z0-9_-]{43}$/.test(encodedKey)) { status('这个链接的密钥不完整。请重新打开收到的完整私人链接。'); return; }
  try {
    const bytes = Uint8Array.from(atob(encodedKey.replace(/-/g, '+').replace(/_/g, '/') + '='), char => char.charCodeAt(0));
    if (bytes.length !== 32) throw new Error('Invalid key');
    const key = await crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['decrypt']);
    const decrypt = async sealed => {
      const encrypted = new Uint8Array(sealed);
      if (encrypted.length < 28) throw new Error('Invalid resource');
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: encrypted.subarray(0, 12), tagLength: 128 }, key, encrypted.subarray(12));
    };
    const response = await fetch('./sealed/envelope.bin', { cache: 'no-store', credentials: 'same-origin', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error('Envelope unavailable');
    const envelope = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await decrypt(await response.arrayBuffer())));
    if (envelope.version !== 1 || typeof envelope.html !== 'string' || !envelope.content || !Array.isArray(envelope.album?.photos) || !envelope.files || !envelope.mime) throw new Error('Invalid envelope');
    try { sessionStorage.setItem('roro-gift-key', encodedKey); } catch { /* Opening remains possible when session storage is disabled. */ }
    const canonical = value => String(value).replace(/^(?:\.\/)+/, '').replace(/^\//, '');
    const isPrivate = value => canonical(value).startsWith('photos-private/');
    const promises = new Map(), urls = new Set();
    window.RORO_ALBUM = { ...envelope.album, content: envelope.content };
    window.RORO_HOSTED = true;
    window.RORO_MEDIA = value => isPrivate(value) ? `assets/heart.svg#sealed=${encodeURIComponent(canonical(value))}` : value;
    window.RORO_GET_MEDIA = value => {
      const privatePath = canonical(value);
      if (!isPrivate(value)) return Promise.resolve(value);
      if (promises.has(privatePath)) return promises.get(privatePath);
      const pending = (async () => {
        const sealed = envelope.files[privatePath], mime = envelope.mime[privatePath];
        if (typeof sealed !== 'string' || !/^sealed\/[a-f0-9]{64}\.bin$/.test(sealed) || typeof mime !== 'string') throw new Error('Unknown private resource');
        const result = await fetch(sealed, { cache: 'no-store', credentials: 'same-origin', referrerPolicy: 'no-referrer' });
        if (!result.ok) throw new Error('Private resource unavailable');
        const url = URL.createObjectURL(new Blob([await decrypt(await result.arrayBuffer())], { type: mime }));
        urls.add(url);
        return url;
      })();
      promises.set(privatePath, pending);
      pending.catch(() => { if (promises.get(privatePath) === pending) promises.delete(privatePath); });
      return pending;
    };
    const placeholderPath = value => {
      try { return new URLSearchParams(new URL(value, document.baseURI).hash.slice(1)).get('sealed'); }
      catch { return null; }
    };
    const hydrateAttribute = (element, attribute) => {
      const original = element.getAttribute(attribute);
      const path = placeholderPath(original);
      if (!path) return;
      window.RORO_GET_MEDIA(path).then(url => {
        if (element.isConnected && element.getAttribute(attribute) === original) element.setAttribute(attribute, url);
      }).catch(() => {
        if (element.isConnected && element.getAttribute(attribute) === original) { element.setAttribute(attribute, 'assets/heart.svg'); element.setAttribute('title', '这份媒体暂时没有打开，可以稍后刷新再试。'); }
      });
    };
    const hydrate = root => {
      if (root.nodeType !== 1) return;
      if (root.matches('img[src]')) hydrateAttribute(root, 'src');
      if (root.matches('video[poster]')) hydrateAttribute(root, 'poster');
      root.querySelectorAll('img[src],video[poster]').forEach(element => hydrateAttribute(element, element.tagName === 'IMG' ? 'src' : 'poster'));
    };
    const hydrateBackdrop = () => {
      const original = document.documentElement.style.getPropertyValue('--hero-backdrop');
      const value = /^url\(["']?(.*?)["']?\)$/.exec(original.trim())?.[1];
      const path = value && placeholderPath(value);
      if (path) window.RORO_GET_MEDIA(path).then(url => {
        if (document.documentElement.style.getPropertyValue('--hero-backdrop') === original) document.documentElement.style.setProperty('--hero-backdrop', `url("${url}")`);
      }).catch(() => {});
    };
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'attributes') { if (record.target === document.documentElement) hydrateBackdrop(); else hydrate(record.target); }
        else record.addedNodes.forEach(hydrate);
      }
    });
    const template = document.createElement('template');
    template.innerHTML = envelope.html;
    template.content.querySelectorAll('script').forEach(script => script.remove());
    template.content.querySelectorAll('img[src],video[poster]').forEach(element => {
      const attribute = element.tagName === 'IMG' ? 'src' : 'poster';
      element.setAttribute(attribute, window.RORO_MEDIA(element.getAttribute(attribute)));
    });
    document.body.replaceChildren(template.content);
    // Keep the complete gift link when navigating, even if tab storage is blocked.
    history.replaceState(null, '', `${location.pathname}${location.search}#gift=${encodedKey}`);
    document.addEventListener('click', event => {
      const anchor = event.target.closest?.('a[href^="#"]');
      const id = anchor?.getAttribute('href').slice(1);
      if (!['home', 'our-corner', 'little-things'].includes(id)) return;
      const section = document.getElementById(id);
      if (!section) return;
      event.preventDefault();
      if (section.tagName === 'DETAILS') section.open = true;
      section.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'poster'] });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    hydrate(document.body);
    window.addEventListener('pagehide', event => { if (!event.persisted) { observer.disconnect(); urls.forEach(url => URL.revokeObjectURL(url)); } });
    const app = document.createElement('script');
    app.type = 'module';
    app.src = './app.js';
    app.addEventListener('error', () => {
      const notice = document.createElement('p'); notice.setAttribute('role', 'status'); notice.textContent = '页面暂时没有完整打开，请刷新再试。'; document.body.append(notice);
    });
    document.body.append(app);
  } catch {
    status('暂时无法打开这份礼物。请检查网络，并使用收到的完整私人链接；密钥不匹配时不会显示私人内容。');
  }
})();
