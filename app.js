const STORAGE_KEY = "mealLog";
const NUTRIENTS = [
  { key: "kcal", label: "kcal", digits: 0 },
  { key: "p", label: "たんぱく質g", digits: 1 },
  { key: "f", label: "脂質g", digits: 1 },
  { key: "c", label: "炭水化物g", digits: 1 },
  { key: "salt", label: "塩分g", digits: 1 },
];

const $ = (id) => document.getElementById(id);
let foods = [];
let aliases = {};
let units = { g: 1 };
let log = loadLog(); // { "2026-09-19": [{ id, name, qty, unit, g, kcal, p, f, c, salt }] }
let date = todayString();

function todayString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function shiftDate(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(y, m - 1, d + days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}

function loadLog() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveLog() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
}

// 「＜鳥肉類＞」の接頭辞を除き、全角スペースを半角にして読みやすくする
function displayName(name) {
  return name.replace(/^＜[^＞]*＞/, "").replace(/　/g, " ").trim();
}

// 「鶏むね」のような日常語を、成分表の表記に近い言葉へ展開する
function expandQuery(raw) {
  let q = raw;
  for (const key of Object.keys(aliases).sort((a, b) => b.length - a.length)) {
    if (q.includes(key)) q = q.split(key).join(` ${aliases[key].join(" ")} `);
  }
  return q;
}

function searchFoods(query) {
  const words = expandQuery(query).replace(/　/g, " ").split(" ").filter(Boolean);
  if (words.length === 0) return [];
  return foods
    .filter((food) => words.every((w) => food.searchText.includes(w)))
    .slice(0, 50);
}

function renderPick() {
  const results = searchFoods($("search").value);
  $("pick").replaceChildren(
    ...results.map((food) => {
      const opt = document.createElement("option");
      opt.value = food.id;
      opt.textContent = displayName(food.name);
      return opt;
    })
  );
}

function render() {
  $("date").value = date;
  const entries = log[date] || [];

  $("empty").hidden = entries.length > 0;
  $("entries").replaceChildren(
    ...entries.map((entry, index) => {
      const li = document.createElement("li");
      const main = document.createElement("div");
      main.className = "main";
      const name = document.createElement("div");
      name.className = "name";
      name.textContent = displayName(entry.name);
      const sub = document.createElement("div");
      sub.className = "sub";
      const qtyText = entry.unit === "g" ? `${entry.g}g` : `${entry.qty}${entry.unit}(${entry.g}g)`;
      sub.textContent = `${qtyText} ・ ${Math.round(entry.kcal)}kcal`;
      main.append(name, sub);
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "削除";
      del.addEventListener("click", () => {
        entries.splice(index, 1);
        if (entries.length === 0) delete log[date];
        saveLog();
        render();
      });
      li.append(main, del);
      return li;
    })
  );

  $("totals").replaceChildren(
    ...NUTRIENTS.map((n) => {
      const sum = entries.reduce((acc, e) => acc + e[n.key], 0);
      const box = document.createElement("div");
      const value = document.createElement("b");
      value.textContent = sum.toFixed(n.digits);
      const label = document.createElement("span");
      label.textContent = n.label;
      box.append(value, label);
      return box;
    })
  );
}

function addEntry() {
  const food = foods.find((f) => f.id === $("pick").value);
  const qty = parseFloat($("qty").value);
  const unit = $("unit").value;
  if (!food || !(qty > 0) || !(unit in units)) return;

  const grams = Math.round(qty * units[unit] * 10) / 10;
  // 追加した時点の栄養値を保存する(100gあたりの値 × 量 ÷ 100)
  const entry = { id: food.id, name: food.name, qty, unit, g: grams };
  for (const n of NUTRIENTS) entry[n.key] = (food[n.key] * grams) / 100;
  (log[date] ||= []).push(entry);
  saveLog();

  $("qty").value = "";
  render();
}

function setDate(newDate) {
  if (!newDate) return;
  date = newDate;
  render();
}

// ブラウザが古いファイルを覚えていても、最新版を取り直して再読み込みする(記録は消えない)
async function refreshApp() {
  const files = ["./", "index.html", "style.css", "app.js", "foods.json", "aliases.json", "units.json"];
  await Promise.all(files.map((f) => fetch(f, { cache: "reload" }).catch(() => {})));
  location.reload();
}

async function init() {
  $("refresh").addEventListener("click", refreshApp);
  $("search").addEventListener("input", renderPick);
  $("add").addEventListener("click", addEntry);
  $("prev").addEventListener("click", () => setDate(shiftDate(date, -1)));
  $("next").addEventListener("click", () => setDate(shiftDate(date, 1)));
  $("date").addEventListener("change", (e) => setDate(e.target.value));
  render();

  const [foodsRes, aliasesRes, unitsRes] = await Promise.all([
    fetch("foods.json"),
    fetch("aliases.json"),
    fetch("units.json"),
  ]);
  foods = await foodsRes.json();
  aliases = await aliasesRes.json();
  units = await unitsRes.json();
  for (const food of foods) food.searchText = displayName(food.name).replace(/ /g, "");

  $("unit").replaceChildren(
    ...Object.keys(units).map((u) => {
      const opt = document.createElement("option");
      opt.value = u;
      opt.textContent = u === "g" ? "g" : `${u}(${units[u]}g)`;
      return opt;
    })
  );
}

init();
