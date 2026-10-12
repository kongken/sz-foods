// 将 sz-foods.xlsx 转换为 src/data/foods.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import XLSX from 'xlsx';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const input = resolve(root, 'sz-foods.xlsx');
const output = resolve(root, 'src/data/foods.json');

const wb = XLSX.read(readFileSync(input));

const AVOID_SHEET = '避雷！！！';
const SKIP_SHEETS = new Set(['智能表1']); // 与「龙岗区」重复的智能表视图

const str = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

/** 评分统一为 0-100;无法识别时返回 null */
function parseScore(raw) {
  const t = str(raw);
  if (!t) return null;
  if (/满分|满婚/.test(t)) return 100;
  const m = t.match(/\d+(?:\.\d+)?/);
  if (!m) return null;
  let n = parseFloat(m[0]);
  if (/^\d+(\.\d+)?\s*[-~到]\s*\d+/.test(t)) {
    const nums = t.match(/\d+(?:\.\d+)?/g).map(Number);
    n = (nums[0] + nums[1]) / 2;
  }
  if (n <= 5) n *= 20;
  else if (n <= 10) n *= 10;
  else if (n > 100) n = 100;
  return Math.round(n * 10) / 10;
}

/** 人均价格范围 */
function parsePrice(raw) {
  const t = str(raw);
  if (!t) return { priceText: '', priceMin: null, priceMax: null };
  const nums = (t.match(/\d+(?:\.\d+)?/g) || []).map(Number).filter((n) => n > 0 && n < 3000);
  if (!nums.length) return { priceText: t, priceMin: null, priceMax: null };
  return { priceText: t, priceMin: Math.min(...nums), priceMax: Math.max(...nums) };
}

const CATEGORIES = [
  ['火锅', /火锅|牛腩煲|煲仔|打边炉|涮/],
  ['烧烤烤肉', /烧烤|烤肉|烤串|烤鱼|串|烧鸡|烧鹅|烧腊|炭烤/],
  ['粉面粥饭', /粉|面|粥|饭|肠粉|馄饨|饺|包|煲仔/],
  ['咖啡甜品饮品', /咖啡|甜品|蛋糕|奶茶|糖水|冰|茶|巴斯克|面包|烘焙|豆花|饮/],
  ['日韩料理', /寿司|日式|日料|刺身|韩|拉面|居酒屋|鳗/],
  ['西餐', /西餐|牛排|披萨|pizza|汉堡|意面|沙拉|法/i],
  ['川湘黔菜', /川|湘|辣|麻|贵州|酸汤|重庆|钵钵/],
  ['粤菜潮汕', /粤|潮|顺德|早茶|茶餐厅|生腌|牛肉丸|煲汤/],
];
function categorize(name, dishes, note) {
  const text = `${name} ${dishes} ${note}`;
  const cats = CATEGORIES.filter(([, re]) => re.test(text)).map(([c]) => c);
  return cats.length ? cats.slice(0, 3) : ['其他'];
}

const restaurants = [];
const avoid = [];
const stats = {};

for (const sheetName of wb.SheetNames) {
  if (SKIP_SHEETS.has(sheetName)) continue;
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '', raw: true });
  const isAvoid = sheetName === AVOID_SHEET;
  let count = 0;
  rows.forEach((r, idx) => {
    const [name, address, dishes, price, score, note, ...rest] = r;
    const first = str(name);
    // 跳过表头与空行
    if (first === '店名' || (idx === 0 && /地址/.test(str(address)))) return;
    if (![name, address, dishes, price, score, note].some((c) => str(c) !== '')) return;

    // 第 7 列起为他人补充评价;纯数字列(票数等)忽略
    const extras = rest.map(str).filter((s) => s && !/^\d+(\.\d+)?$/.test(s));
    const base = {
      id: `${sheetName}-${idx + 1}`,
      name: first || '（未填店名）',
      district: sheetName,
      address: str(address),
      dishes: str(dishes),
      ...parsePrice(price),
    };

    if (isAvoid) {
      avoid.push({ ...base, reason: str(score), note: str(note), extras });
    } else {
      const ratingText = str(score);
      restaurants.push({
        ...base,
        score: parseScore(score),
        ratingText,
        note: str(note),
        extras,
        categories: categorize(base.name, base.dishes, str(note)),
      });
    }
    count++;
  });
  stats[sheetName] = count;
}

const districtOrder = wb.SheetNames.filter((n) => !SKIP_SHEETS.has(n) && n !== AVOID_SHEET);
const data = {
  generatedAt: new Date().toISOString(),
  districts: districtOrder.map((name) => ({ name, count: stats[name] })),
  categories: [...new Set(restaurants.flatMap((r) => r.categories))],
  restaurants,
  avoid,
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(data));
console.log(`✔ ${restaurants.length} 家推荐 + ${avoid.length} 家避雷 -> ${output}`);
console.log(stats);
