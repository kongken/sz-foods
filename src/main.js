import './style.css';
import data from './data/foods.json';

const PAGE = 60;
const $ = (id) => document.getElementById(id);

const state = {
  tab: 'good',
  q: '',
  sort: 'default',
  prices: new Set(),
  district: '',
  category: '',
  shown: PAGE,
};

const el = {
  summary: $('summary'),
  q: $('q'),
  sort: $('sort'),
  prices: $('prices'),
  districts: $('districts'),
  categories: $('categories'),
  count: $('count'),
  list: $('list'),
  more: $('more'),
  random: $('random'),
  reset: $('reset'),
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICONS = {
  pin: ['M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z', 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
  out: ['M7 17 17 7', 'M8 7h9v9'],
};
function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const d of ICONS[name]) {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', d);
    svg.append(p);
  }
  return svg;
}

// 每个区一种色相,像地铁线路色
const DISTRICT_HUE = {
  南山区: 262, 福田区: 25, 宝安区: 205, 龙华区: 150, 龙岗区: 65,
  罗湖区: 305, 盐田区: 180, 光明区: 95, 坪山区: 345, 大鹏新区: 235, 其他: 280,
};
const hue = (d) => DISTRICT_HUE[d] ?? 262;

function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}

const mapUrl = (r) =>
  `https://uri.amap.com/search?keyword=${encodeURIComponent(`${r.name === '（未填店名）' ? '' : r.name} ${r.address}`.trim())}&city=${encodeURIComponent('深圳')}`;

function items() {
  return state.tab === 'good' ? data.restaurants : data.avoid;
}

function filtered() {
  const q = state.q.trim().toLowerCase();
  const ranges = [...state.prices].map((v) => v.split('-').map(Number));
  let out = items().filter((r) => {
    if (state.district && r.district !== state.district) return false;
    if (state.category && !(r.categories || []).includes(state.category)) return false;
    if (ranges.length) {
      if (r.priceMin == null) return false;
      const avg = (r.priceMin + r.priceMax) / 2;
      if (!ranges.some(([lo, hi]) => avg >= lo && avg < hi)) return false;
    }
    if (q) {
      const hay = [r.name, r.address, r.dishes, r.note, r.reason, r.ratingText, ...(r.extras || [])]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const avg = (r) => (r.priceMin == null ? null : (r.priceMin + r.priceMax) / 2);
  const cmpNullLast = (a, b, dir) => (a == null ? 1 : b == null ? -1 : (a - b) * dir);
  if (state.sort === 'score' && state.tab === 'good') out = [...out].sort((a, b) => cmpNullLast(a.score, b.score, -1));
  else if (state.sort === 'priceAsc') out = [...out].sort((a, b) => cmpNullLast(avg(a), avg(b), 1));
  else if (state.sort === 'priceDesc') out = [...out].sort((a, b) => cmpNullLast(avg(a), avg(b), -1));
  return out;
}

function scoreLevel(s) {
  return s >= 95 ? 'top' : s >= 85 ? 'good' : 'ok';
}

function card(r) {
  const meta = h('div', { class: 'meta' },
    r.district && h('span', { class: 'badge district' }, h('i', { class: 'dot' }), r.district),
    r.priceText && h('span', { class: 'price', text: `人均 ${r.priceText}` }),
    ...(r.categories || []).map((c) => h('span', { class: 'badge cat', text: c })),
  );

  let rating = null;
  if (state.tab === 'good') {
    if (r.score != null) {
      rating = h('span', { class: `score ${scoreLevel(r.score)}`, title: `原始评分:${r.ratingText}` },
        h('b', { text: String(Math.round(r.score)) }), h('small', { text: '分' }));
    } else if (r.ratingText) {
      rating = h('span', { class: 'score text', text: r.ratingText });
    }
  } else {
    rating = h('span', { class: 'score avoid', text: '避雷' });
  }

  const rows = [];
  if (r.dishes) rows.push(h('p', {}, h('strong', { text: state.tab === 'good' ? '推荐菜 ' : '菜品 ' }), r.dishes));
  if (r.reason) rows.push(h('p', { class: 'reason' }, h('strong', { text: '避雷理由 ' }), r.reason));
  if (r.note) rows.push(h('p', { class: 'note' }, h('strong', { text: '备注 ' }), r.note));
  if (r.address) {
    rows.push(h('p', { class: 'addr' }, icon('pin'), h('span', { class: 'sr-only', text: '地址 ' }), h('span', { text: r.address }),
      h('a', { href: mapUrl(r), target: '_blank', rel: 'noopener noreferrer' }, '地图', icon('out'))));
  }
  if (r.extras && r.extras.length) {
    rows.push(h('details', {}, h('summary', { text: `更多评价 (${r.extras.length})` }),
      h('ul', {}, r.extras.map((e) => h('li', { text: e })))));
  }

  return h('article', { class: state.tab === 'avoid' ? 'card avoid' : 'card', id: r.id, style: `--dh:${hue(r.district)}` },
    h('header', {}, h('h2', { text: r.name }), rating),
    meta,
    ...rows,
  );
}

function render() {
  const list = filtered();
  const slice = list.slice(0, state.shown);
  el.list.replaceChildren(
    ...(slice.length ? slice.map(card) : [h('p', { class: 'empty', text: '没有符合条件的店,试试放宽筛选条件。' })]),
  );
  el.count.textContent = `共 ${list.length} 家${list.length > slice.length ? `,已显示 ${slice.length} 家` : ''}`;
  el.more.hidden = list.length <= slice.length;
  el.categories.hidden = state.tab !== 'good';
  el.sort.querySelector('[value="score"]').disabled = state.tab !== 'good';
  if (state.tab !== 'good' && state.sort === 'score') { state.sort = 'default'; el.sort.value = 'default'; }
  el.random.hidden = state.tab !== 'good';
}

function chips(container, name, values, key, allLabel) {
  const make = (value, label, count, dh) => {
    const id = `${name}-${value || 'all'}`;
    const input = h('input', { type: 'radio', name, id, value, checked: state[key] === value });
    input.addEventListener('change', () => { state[key] = value; state.shown = PAGE; render(); });
    return h('label', { class: 'chip', for: id }, input,
      h('span', {}, dh != null && h('i', { class: 'dot', style: `--dh:${dh}` }), count != null ? `${label} ${count}` : label));
  };
  container.append(make('', allLabel), ...values.map((v) => make(v.value, v.label, v.count, v.hue)));
}

const PRICE_RANGES = [
  { value: '0-30', label: '30 元以下' },
  { value: '30-60', label: '30–60 元' },
  { value: '60-100', label: '60–100 元' },
  { value: '100-200', label: '100–200 元' },
  { value: '200-99999', label: '200 元以上' },
];

function priceChips() {
  for (const { value, label } of PRICE_RANGES) {
    const id = `price-${value}`;
    const input = h('input', { type: 'checkbox', id, value });
    input.addEventListener('change', () => {
      if (input.checked) state.prices.add(value);
      else state.prices.delete(value);
      state.shown = PAGE;
      render();
    });
    el.prices.append(h('label', { class: 'chip', for: id }, input, h('span', { text: label })));
  }
}

// 区域标签的计数跟随当前标签页(推荐/避雷)
function districtChips() {
  const source = items();
  const counted = data.districts
    .map((d) => ({ value: d.name, label: d.name, count: source.filter((r) => r.district === d.name).length, hue: hue(d.name) }))
    .filter((d) => d.count > 0);
  if (state.district && !counted.some((d) => d.value === state.district)) state.district = '';
  el.districts.querySelectorAll('.chip').forEach((n) => n.remove());
  chips(el.districts, 'district', counted, 'district', '全部');
  el.districts.hidden = counted.length === 0;
}

function setup() {
  priceChips();
  districtChips();
  const catCounts = data.categories
    .map((c) => ({ value: c, label: c, count: data.restaurants.filter((r) => r.categories.includes(c)).length }))
    .sort((a, b) => (a.value === '其他') - (b.value === '其他') || b.count - a.count);
  chips(el.categories, 'category', catCounts, 'category', '全部');

  const stat = (n, label) => h('div', {}, h('dt', { text: label }), h('dd', { text: String(n) }));
  el.summary.replaceChildren(
    stat(data.restaurants.length, '家推荐'),
    stat(data.avoid.length, '家避雷'),
    stat(data.districts.filter((d) => d.count && d.name !== '其他').length, '个区'),
  );
  $('n-good').textContent = data.restaurants.length;
  $('n-avoid').textContent = data.avoid.length;

  let timer;
  el.q.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = el.q.value; state.shown = PAGE; render(); }, 120);
  });
  el.sort.addEventListener('change', () => { state.sort = el.sort.value; state.shown = PAGE; render(); });
  el.more.addEventListener('click', () => { state.shown += PAGE; render(); });
  el.reset.addEventListener('click', () => {
    Object.assign(state, { q: '', sort: 'default', prices: new Set(), district: '', category: '', shown: PAGE });
    el.q.value = ''; el.sort.value = 'default';
    document.querySelectorAll('#prices input').forEach((i) => { i.checked = false; });
    document.querySelectorAll('.chip input[value=""]').forEach((i) => { i.checked = true; });
    render();
  });
  el.random.addEventListener('click', () => {
    const list = filtered();
    if (!list.length) return;
    const pick = list[Math.floor(Math.random() * list.length)];
    state.shown = Math.max(state.shown, list.indexOf(pick) + 1);
    render();
    const node = document.getElementById(pick.id);
    node?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    document.querySelectorAll('.card.picked').forEach((c) => c.classList.remove('picked'));
    node?.classList.add('picked');
  });
  document.querySelectorAll('[data-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      state.tab = b.dataset.tab; state.shown = PAGE;
      districtChips();
      document.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
      render();
    }));
  render();
}

setup();
