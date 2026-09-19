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
let log = loadLog(); // { "2026-09-19": [{ id, name, g, kcal, p, f, c, salt }] }
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

function searchFoods(query) {
  const words = query.replace(/　/g, " ").split(" ").filter(Boolean);
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
      sub.textContent = `${entry.g}g ・ ${Math.round(entry.kcal)}kcal`;
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
  const grams = parseFloat($("grams").value);
  if (!food || !(grams > 0)) return;

  // 追加した時点の栄養値を保存する(100gあたりの値 × 量 ÷ 100)
  const entry = { id: food.id, name: food.name, g: grams };
  for (const n of NUTRIENTS) entry[n.key] = (food[n.key] * grams) / 100;
  (log[date] ||= []).push(entry);
  saveLog();

  $("grams").value = "";
  render();
}

function setDate(newDate) {
  if (!newDate) return;
  date = newDate;
  render();
}

// ブラウザが古いファイルを覚えていても、最新版を取り直して再読み込みする(記録は消えない)
async function refreshApp() {
  const files = ["./", "index.html", "style.css", "app.js", "foods.json"];
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

  const res = await fetch("foods.json");
  foods = await res.json();
  for (const food of foods) food.searchText = displayName(food.name).replace(/ /g, "");
}

init();
