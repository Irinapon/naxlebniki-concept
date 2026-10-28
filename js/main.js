(() => {
  'use strict';

  const CONFIG = Object.assign({ contentUrl: 'data/content.json', eventsApiUrl: null, allowStatePreview: false }, window.NAH_CONFIG);
  const IMG_DIR = 'assets/demo/review-photos/';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const desktop = window.matchMedia('(min-width: 768px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rub = (n) => `${Number(n).toLocaleString('ru-RU')} ₽`;
  const pad = (n) => String(n).padStart(2, '0');
  const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

  const LABEL_CLASS = { 'НЬЮ': 'label--new', 'ХОТ': 'label--hot' };
  const labelsHtml = (labels = []) => labels.length
    ? `<span class="labels">${labels.map((l) => `<span class="label ${LABEL_CLASS[l] || ''}">${esc(l)}</span>`).join('')}</span>`
    : '';

  // DEMO: вырезки из фото отзывов, по одной на сэндвич. Не соответствуют конкретным позициям.
  const CUTOUT_DIR = 'assets/demo/cutouts/';
  const SANDWICH_PHOTOS = {
    'sandwich-01': ['sw-1b', 1000, 675], // фото от клиента: мортаделла, фисташковый крем, яйцо
    'sandwich-02': ['sw-2c', 1000, 721], // фото от клиента: буженина
    'sandwich-03': ['sw-3c', 1000, 692], // фото от клиента: пастрами
    'sandwich-04': ['sw-4c', 1000, 708], // фото от клиента: креветки, том ям, шиитаке
    'sandwich-05': ['sw-5c', 1000, 766], // фото от клиента: шницель, чимичурри
    'sandwich-06': ['sw-6c', 1000, 719], // фото от клиента: тунец, яйцо
    'sandwich-07': ['sw-7c', 1000, 727] // фото от клиента: пеперони
  };

  /* ---------- data ---------- */

  async function loadContent() {
    const res = await fetch(CONFIG.contentUrl, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`content ${res.status}`);
    const data = await res.json();
    data.brand.addressShort = data.brand.address.replace(/,\s*Смоленск$/, '');
    return data;
  }

  /* ---------- bindings ---------- */

  function bind(data) {
    $$('[data-bind]').forEach((el) => {
      const v = get(data, el.dataset.bind);
      if (v) el.textContent = v;
    });
    $$('[data-href]').forEach((el) => {
      const v = get(data, el.dataset.href);
      if (v) el.href = v;
    });
    // Order CTA: iOS-ссылки нет, по решению брифа ведём на Android
    $$('[data-order]').forEach((el) => { el.href = data.links.androidApp; });

    const route = $('[data-render="route"]');
    if (route) {
      route.outerHTML = data.links.map
        ? `<a class="btn btn--outline" href="${esc(data.links.map)}" target="_blank" rel="noopener">ПОСТРОИТЬ МАРШРУТ <span aria-hidden="true">↗</span></a>`
        : ''; // кнопка маршрута появится, когда в данных будет проверенная ссылка на карты
    }
  }

  function injectJsonLd(data) {
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: 'Нахлебники',
      description: data.brand.tagline,
      servesCuisine: 'Сэндвичи',
      address: {
        '@type': 'PostalAddress',
        streetAddress: data.brand.addressShort,
        addressLocality: 'Смоленск',
        addressCountry: 'RU'
      },
      openingHoursSpecification: [{
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '12:00',
        closes: '23:00'
      }],
      sameAs: [data.links.vk]
      // TODO production: url, image (согласованное фото), hasMenu
    };
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(ld);
    document.head.appendChild(s);
  }

  /* ---------- sandwiches ---------- */

  function renderSandwiches(list) {
    const total = list.length;
    const img = (s, cls, lazy = true) => {
      const [name, w, h] = SANDWICH_PHOTOS[s.id] || [];
      return name
        ? `<img class="${cls}" src="${CUTOUT_DIR}${name}.webp" width="${w}" height="${h}" ${lazy ? 'loading="lazy" ' : ''}decoding="async" alt="">`
        : '';
    };

    $('[data-render="sandwiches"]').innerHTML = list.map((s, i) => `
      <li class="slide${i === 0 ? ' is-active' : ''}" id="${esc(s.id)}" aria-roledescription="слайд" aria-label="${i + 1} из ${total}: ${esc(s.name)}">
        <div class="slide__text">
          <p class="slide__num mono">${pad(i + 1)} / ${pad(total)}</p>
          ${s.labels && s.labels.length ? `<p class="slide__labels">${labelsHtml(s.labels)}</p>` : ''}
          <h3 class="slide__name display"><span class="worn">${esc(s.name)}</span></h3>
          <p class="slide__desc mono">${esc(s.description)}</p>
          <p class="slide__price"><span class="visually-hidden">Цена: </span>${rub(s.price)}<svg class="ring" aria-hidden="true" preserveAspectRatio="none"><use href="#i-ring"/></svg></p>
        </div>
        <figure class="slide__photo demo-photo">
          ${img(s, 'cutout', false)}
        </figure>
      </li>`).join('');

    $('[data-render="strip"]').innerHTML = list.map((s, i) => `
      <li class="strip__item">
        <a class="ticket" href="#${esc(s.id)}" data-slide="${i}">
          <span class="ticket__img">${img(s, 'cutout')}</span>
          <span class="ticket__name"><span class="worn">${esc(s.name)}</span></span>
          ${labelsHtml(s.labels)}
          <span class="ticket__price">${rub(s.price)}</span>
        </a>
      </li>`).join('');

    $('[data-rail-total]').textContent = total;
    initRail(total);
  }

  // Desktop: один сэндвич на экране, стрелки/клавиши переключают. Mobile: все семь списком.
  function initRail(total) {
    const rail = $('#rail');
    const slides = $$('.slide', rail);
    const prev = $('[data-rail="prev"]');
    const next = $('[data-rail="next"]');
    const current = $('[data-rail-current]');
    let index = 0;

    const update = () => {
      current.textContent = index + 1;
      prev.disabled = index === 0;
      next.disabled = index === total - 1;
      slides.forEach((el, i) => {
        const active = i === index;
        el.classList.toggle('is-active', active);
        const hidden = desktop.matches && !active;
        el.toggleAttribute('inert', hidden);
        el.setAttribute('aria-hidden', hidden ? 'true' : 'false');
      });
    };
    const go = (i) => { index = Math.max(0, Math.min(total - 1, i)); update(); };

    prev.addEventListener('click', () => go(index - 1));
    next.addEventListener('click', () => go(index + 1));
    rail.addEventListener('keydown', (e) => {
      if (!desktop.matches) return;
      const map = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: total - 1 };
      if (e.key in map) { e.preventDefault(); go(map[e.key]); }
    });

    // билеты в полосе переключают слайд на desktop, на mobile работают как якоря
    $$('[data-slide]').forEach((a) => a.addEventListener('click', (e) => {
      if (!desktop.matches) return;
      e.preventDefault();
      go(Number(a.dataset.slide));
      $('#sandwiches').scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
      rail.focus({ preventScroll: true });
    }));

    desktop.addEventListener('change', update);
    update();
  }

  /* ---------- combo ---------- */

  function renderCombo(combo, sandwiches) {
    const byId = Object.fromEntries(sandwiches.map((s, i) => [s.id, { ...s, n: i + 1 }]));
    const box = $('[data-render="combo"]');
    box.innerHTML = combo.availableFor.map((group, gi) => {
      const names = group.sandwichIds.map((id) => byId[id]).filter(Boolean);
      const sides = [...new Set(group.options.map((o) => o.side))];
      const drinks = [...new Set(group.options.map((o) => o.drink))];
      const price = (side, drink) => {
        const o = group.options.find((x) => x.side === side && x.drink === drink);
        return o ? rub(o.price) : '—';
      };
      const title = names.map((s) => `#${s.n} ${esc(s.name)}`).join(' / ');
      return `
        <div class="combo-card">
          <h3 class="display" id="combo-group-${gi}">${title}</h3>
          <table aria-labelledby="combo-group-${gi}">
            <thead><tr><th scope="col">гарнир</th>${drinks.map((d) => `<th scope="col">+ ${esc(d)}</th>`).join('')}</tr></thead>
            <tbody>${sides.map((side) => `<tr><th scope="row">${esc(side)}</th>${drinks.map((d) => `<td>${price(side, d)}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>`;
    }).join('');

    const toggle = $('.combo__toggle');
    const label = $('[data-label]', toggle);
    const set = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      box.hidden = !open;
      label.textContent = open ? 'СВЕРНУТЬ КОМБО' : 'СМОТРЕТЬ КОМБО';
    };
    toggle.addEventListener('click', () => set(box.hidden));
    set(desktop.matches); // desktop — открыто, mobile — закрыто
  }

  /* ---------- menu accordion ---------- */

  function renderMenu(sections) {
    const root = $('[data-render="menu"]');
    root.innerHTML = `<div class="acc">${sections.map((sec) => {
      const id = `menu-${sec.id === 'draft-beer' ? 'beer' : sec.id}`;
      return `
        <div class="acc__item" id="${id}">
          <h3 class="acc__head">
            <button class="acc__btn" type="button" id="${id}-btn" aria-expanded="false" aria-controls="${id}-panel">
              <span class="acc__name worn">${esc(sec.title)}</span>
              <span class="acc__count">${sec.items.length}&nbsp;поз.</span>
              <span class="acc__icon" aria-hidden="true">+</span>
            </button>
          </h3>
          <div class="acc__panel" id="${id}-panel" role="region" aria-labelledby="${id}-btn" hidden>
            <svg class="acc__rule" aria-hidden="true" preserveAspectRatio="none"><use href="#i-squiggle"/></svg>
            ${sec.note ? `<p class="acc__note mono">${esc(sec.note)}</p>` : ''}
            <ul>${sec.items.map(dishHtml).join('')}</ul>
          </div>
        </div>`;
    }).join('')}</div>`;

    const items = $$('.acc__item', root);
    const setOpen = (item, open) => {
      $('.acc__btn', item).setAttribute('aria-expanded', String(open));
      $('.acc__panel', item).hidden = !open;
    };
    items.forEach((item) => {
      $('.acc__btn', item).addEventListener('click', () => {
        const open = $('.acc__panel', item).hidden;
        // mobile: открыта одна категория
        if (open && !desktop.matches) items.forEach((other) => other !== item && setOpen(other, false));
        setOpen(item, open);
        if (open) history.replaceState(null, '', `#${item.id}`);
      });
    });

    const openFromHash = () => {
      const target = location.hash && document.getElementById(location.hash.slice(1));
      if (target && target.classList.contains('acc__item')) {
        if (!desktop.matches) items.forEach((it) => setOpen(it, false));
        setOpen(target, true);
        target.scrollIntoView({ block: 'start' });
        $('.acc__btn', target).focus({ preventScroll: true });
        return true;
      }
      return false;
    };
    if (!openFromHash()) setOpen(items[0], true);
    window.addEventListener('hashchange', openFromHash);
  }

  function dishHtml(d) {
    const meta = [d.unit && !d.priceText ? d.unit : null, d.flavours ? d.flavours.join(', ') : null].filter(Boolean).join(' · ');
    return `
      <li class="dish">
        <span class="dish__name">${esc(d.name)}${labelsHtml(d.labels)}</span>
        <span class="dish__price">${d.priceText ? esc(d.priceText).replace(/ ₽$/, ' ₽') : rub(d.price)}</span>
        ${meta || d.priceText ? `<span class="dish__meta">${esc(d.priceText ? d.unit : meta)}</span>` : ''}
      </li>`;
  }

  /* ---------- афиша ---------- */

  const EVENT_REQUIRED = ['id', 'status', 'title', 'date'];

  function isValidEvent(e) {
    return e && typeof e === 'object'
      && EVENT_REQUIRED.every((k) => typeof e[k] === 'string' && e[k])
      && /^\d{4}-\d{2}-\d{2}$/.test(e.date)
      && (!e.linkUrl || /^https?:\/\//.test(e.linkUrl))
      && (!e.imageUrl || /^https?:\/\//.test(e.imageUrl));
  }

  // Адаптер афиши: опубликованные, не прошедшие (или ongoing), по возрастанию даты
  async function getPublishedEvents(content) {
    let raw = content.events || [];
    if (CONFIG.eventsApiUrl) {
      const res = await fetch(CONFIG.eventsApiUrl, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`events ${res.status}`);
      const body = await res.json();
      raw = Array.isArray(body) ? body : body.events;
    }
    const today = new Date().toISOString().slice(0, 10);
    return (raw || [])
      .filter(isValidEvent)
      .filter((e) => e.status === 'published' && (e.date >= today || e.ongoing === true))
      .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  }

  // Глаз-коллаж (тот же ассет, что в финале): база + радужка, которая следит за курсором
  let eyeSeq = 0;
  function eyeSvg(extraClass = '') {
    const id = `eye-open-${++eyeSeq}`;
    return `
      <div class="eye ${extraClass}" data-eye aria-hidden="true">
        <svg viewBox="100 238 1066 760" focusable="false">
          <defs><clipPath id="${id}"><path d="M230,655 L300,568 L400,498 L520,456 L640,448 L760,458 L880,514 L980,598 L1060,690 L960,760 L820,795 L640,803 L480,790 L340,740Z"/></clipPath></defs>
          <image class="eye__base" href="assets/brand/eye-base.webp?v=3" width="1254" height="1254"/>
          <g clip-path="url(#${id})"><image class="final__iris" href="assets/brand/eye-iris.webp?v=3" x="375" y="372" width="456" height="456"/></g>
        </svg>
      </div>`;
  }

  const ASTERISK = '<svg class="doodle-star" viewBox="0 0 60 60" aria-hidden="true"><path d="M30 4v52M8 16l44 28M8 44l44-28" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>';
  const SMILE = '<svg class="poster__smile" aria-hidden="true"><use href="#i-smile"/></svg>';
  // демо: круглая стрелка переключает «пусто» ⇄ «пример события» прямо на месте
  const arrowSwitch = (to, label, glyph) =>
    `<button type="button" class="poster__round" data-afisha-go="${to}" aria-label="${esc(label)}">${glyph}</button>`;
  const hasSample = () => CONFIG.allowStatePreview && (CONFIG.sampleEvents || []).some(isValidEvent);
  const arrowLink = (href, label) => href
    ? `<a class="poster__round" href="${esc(href)}" target="_blank" rel="noopener" aria-label="${esc(label)} (откроется в новой вкладке)">→</a>`
    : '';

  function posterEmpty(vk, { demo = false } = {}) {
    return `
      <article class="poster poster--empty">
        <div class="poster__text">
          <p class="poster__title display"><span class="worn">ПОКА<br>ТИШИНА.</span></p>
          <div class="poster__side">
            <p class="poster__hand hand">Но это<br>ненадолго.<svg aria-hidden="true"><use href="#i-squiggle"/></svg></p>
            <a class="btn btn--line" href="${esc(vk)}" target="_blank" rel="noopener">СЛЕДИТЬ В VK <span aria-hidden="true">→</span><span class="visually-hidden"> (откроется в новой вкладке)</span></a>
          </div>
        </div>
        <div class="poster__collage" aria-hidden="true">
          <span class="scrap-lime scrap-lime--a"></span><span class="scrap-lime scrap-lime--b"></span>
          <img class="poster__photo poster__photo--wide" src="assets/demo/supplied/afisha-frame.webp" width="960" height="1000" alt="" loading="lazy">
          ${eyeSvg('poster__eye')}
          ${ASTERISK}
          <p class="tape-note tape-note--a hand">Хорошая музыка<br>всегда рядом ${SMILE}</p>
          <p class="tape-note tape-note--b hand">Нахлебники<br>= люди</p>
        </div>
        ${demo ? arrowSwitch('demo', 'Показать, как выглядит афиша с событием', '→') : arrowLink(vk, 'Афиша во ВКонтакте')}
      </article>`;
  }

  function posterEvent(e, { sample = false } = {}) {
    const [y, m, d] = e.date.split('-');
    const lines = (e.description || '').split('\n').filter(Boolean);
    return `
      <article class="poster poster--event">
        <div class="poster__text">
          <p class="poster__when display"><time datetime="${esc(e.date)}${e.time ? `T${esc(e.time)}` : ''}">${esc(d)}.${esc(m)}${e.time ? `<br>${esc(e.time)}` : ''}</time></p>
          <h3 class="poster__title poster__title--event display"><span class="worn">${esc(e.title)}</span></h3>
          ${lines.map((l, i) => `<p class="poster__line${i === lines.length - 1 ? ' poster__line--underline' : ''}">${esc(l)}</p>`).join('')}
          ${e.linkUrl ? `<a class="btn btn--line" href="${esc(e.linkUrl)}" target="_blank" rel="noopener">СМОТРЕТЬ <span aria-hidden="true">→</span><span class="visually-hidden"> ${esc(e.title)} (откроется в новой вкладке)</span></a>` : ''}
        </div>
        <div class="poster__collage" aria-hidden="true">
          <span class="scrap-lime scrap-lime--a"></span><span class="scrap-lime scrap-lime--c"></span>
          ${e.imageUrl
            ? `<img class="poster__photo poster__photo--right" src="${esc(e.imageUrl)}" alt="" loading="lazy">`
            : '<img class="poster__photo poster__photo--right" src="assets/demo/supplied/afisha-frame.webp" width="960" height="1000" alt="" loading="lazy">'}
          <svg class="vinyl" viewBox="0 0 400 400" aria-hidden="true">
            <circle cx="200" cy="200" r="198" fill="#0d0d0d"/>
            ${Array.from({ length: 26 }, (_, i) => `<circle cx="200" cy="200" r="${80 + i * 4.4}" fill="none" stroke="#1d1d1d" stroke-width="1.2"/>`).join('')}
            <path d="M200 200 L60 70 A198 198 0 0 1 120 30Z M200 200 L340 330 A198 198 0 0 1 280 370Z" fill="#fff" opacity=".07"/>
            <circle cx="200" cy="200" r="72" fill="var(--lime)"/>
            <text x="150" y="182" font-family="Caveat, cursive" font-size="30" font-weight="600" transform="rotate(-14 150 182)">Good food</text>
            <text x="160" y="250" font-family="Caveat, cursive" font-size="30" font-weight="600" transform="rotate(-14 160 250)">good music</text>
            <path d="M246 186v26M234 192l24 14M234 206l24-14" stroke="#0a0a0a" stroke-width="3.5" stroke-linecap="round"/>
            <circle cx="200" cy="200" r="6" fill="#0a0a0a"/>
          </svg>
          <p class="red-sticker">ВИНИЛ<br>СЭНДВИЧИ<br>НАШИ ЛЮДИ ${SMILE}</p>
          ${ASTERISK}
          <p class="poster__scribble hand">Еда<br>Музыка<br>Люди</p>
          <p class="tape-note tape-note--c hand">Нахлебники<br>Смоленск ♡</p>
        </div>
        ${sample ? arrowSwitch('empty', 'Назад: афиша без событий', '←') : arrowLink(e.linkUrl, `Подробнее: ${e.title}`)}
      </article>`;
  }

  async function renderAfisha(content, forced) {
    const feed = $('[data-render="afisha"]');
    const vk = content ? content.links.vk : 'https://vk.ru/nahlebnikishop';
    const params = new URLSearchParams(location.search);
    const preview = forced !== undefined ? forced : (CONFIG.allowStatePreview ? params.get('afisha') : null);
    const done = (html) => {
      feed.innerHTML = html;
      feed.setAttribute('aria-busy', 'false');
      initEyes(feed);
      $$('[data-afisha-go]', feed).forEach((btn) => btn.addEventListener('click', () => {
        const to = btn.dataset.afishaGo === 'demo' ? 'demo' : null;
        const url = new URL(location.href);
        if (to) url.searchParams.set('afisha', to); else url.searchParams.delete('afisha');
        history.replaceState(null, '', url);
        renderAfisha(content, to).then(() => { const next = $('[data-afisha-go]', feed); if (next) next.focus(); });
      }));
    };
    const error = () => done(`
      <div class="afisha-error">
        <p class="display"><span class="worn">АФИША НЕ ЗАГРУЗИЛАСЬ.</span></p>
        <p class="mono" style="margin-bottom:24px">Что происходит — смотри у нас в VK.</p>
        <a class="btn btn--line" href="${esc(vk)}" target="_blank" rel="noopener">СЛЕДИТЬ В VK <span aria-hidden="true">→</span></a>
      </div>`);

    if (preview === 'loading') return;
    if (preview === 'error' || !content) return error();
    if (preview === 'demo') {
      return done((CONFIG.sampleEvents || []).filter(isValidEvent).map((e) => posterEvent(e, { sample: true })).join(''));
    }

    try {
      const events = await getPublishedEvents(content);
      done(events.length ? events.map((e) => posterEvent(e)).join('') : posterEmpty(vk, { demo: hasSample() }));
    } catch (err) {
      console.warn('[afisha]', err.message);
      error();
    }
  }

  /* ---------- header & nav ---------- */

  function initHeader() {
    const header = $('#site-header');
    const hero = $('#top');
    new IntersectionObserver(([entry]) => {
      header.classList.toggle('is-stuck', !entry.isIntersecting);
    }, { rootMargin: `-${header.offsetHeight}px 0px 0px 0px` }).observe(hero);

    const toggle = $('.nav-toggle');
    const nav = $('#site-nav');
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    $$('a', nav).forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
    desktop.addEventListener('change', () => setOpen(false));
  }

  function initReveal() {
    if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
    const els = $$('.manifesto__title, .manifesto__body, .combo__title, .menu__title, .afisha__title, .place__title, .final__title, .footer__closing');
    els.forEach((el) => el.classList.add('reveal'));
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { threshold: 0.15 });
    els.forEach((el) => io.observe(el));
  }

  // Глаза (финал + афиша): радужка плавно смотрит в сторону курсора (или пальца)
  const eyes = [];
  function initEyes(root = document) {
    if (reducedMotion.matches) return;
    $$('[data-eye]', root).forEach((el) => {
      if (el.dataset.eyeReady) return;
      el.dataset.eyeReady = '1';
      eyes.push({ el, iris: $('.final__iris', el), x: 0, y: 0, tx: 0, ty: 0 });
    });
    for (let i = eyes.length - 1; i >= 0; i--) if (!eyes[i].el.isConnected) eyes.splice(i, 1);
  }
  let eyeRaf = null;
  function eyeTick() {
    let moving = false;
    eyes.forEach((e) => {
      e.x += (e.tx - e.x) * 0.14; e.y += (e.ty - e.y) * 0.14;
      e.iris.setAttribute('transform', `translate(${e.x.toFixed(1)} ${e.y.toFixed(1)})`);
      if (Math.abs(e.tx - e.x) + Math.abs(e.ty - e.y) > 0.3) moving = true;
    });
    eyeRaf = moving ? requestAnimationFrame(eyeTick) : null;
  }
  window.addEventListener('pointermove', (ev) => {
    if (!eyes.length) return;
    const MAX_X = 150, MAX_Y = 70; // ход радужки в единицах исходника (1254)
    eyes.forEach((e) => {
      const r = e.el.getBoundingClientRect();
      const dx = ev.clientX - (r.left + r.width / 2), dy = ev.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy) || 1, k = Math.min(1, dist / (r.width * 0.9));
      e.tx = (dx / dist) * MAX_X * k; e.ty = (dy / dist) * MAX_Y * k;
    });
    if (!eyeRaf) eyeRaf = requestAnimationFrame(eyeTick);
  }, { passive: true });

  function renderContentError() {
    const msg = '<p class="state-msg mono">Меню не загрузилось. Актуальное меню — в приложении и в VK.</p>';
    $('[data-render="sandwiches"]').innerHTML = `<li>${msg}</li>`;
    $('[data-render="menu"]').innerHTML = msg;
  }

  /* ---------- boot ---------- */

  initHeader();
  initReveal();
  initEyes();

  loadContent()
    .then((data) => {
      bind(data);
      injectJsonLd(data);
      renderSandwiches(data.sandwiches);
      renderCombo(data.combo, data.sandwiches);
      renderMenu(data.menuSections);
      renderAfisha(data);
    })
    .catch((err) => {
      console.warn('[content]', err.message);
      renderContentError();
      renderAfisha(null);
    });
})();
