/**
 * Бета: подбор авто (марка → модель → поколение → модификация) + ориентировочный расчёт.
 * Формула и курсы — те же, что на основном калькуляторе: calc-core.js,
 * api/calculation_config.php (активная схема из админки) и api/rates_snapshot.php.
 */

import { DEFAULT_CALCULATION_CONFIG, computeCalculation } from "../calc-core.js";
import { CATALOG, FUEL_LABELS } from "./catalog.js";

/** Примерные курсы на случай недоступности API (страница вне прода / локальный запуск). */
const FALLBACK_RATES = { usdMnt: 3600, jpyMnt: 24.5, rubPerEur: 95 };

const PLACEHOLDER_PHOTO =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">' +
      '<rect width="320" height="180" fill="#10151d"/>' +
      '<text x="160" y="95" fill="#4c5b73" font-family="sans-serif" font-size="14" text-anchor="middle">Фото скоро появится</text>' +
      "</svg>"
  );

const state = {
  make: null,
  model: null,
  gen: null,
  mod: null,
  year: null,
  config: DEFAULT_CALCULATION_CONFIG,
  rates: null,
  ratesLive: false,
};

const $ = (id) => document.getElementById(id);

function show(id, visible) {
  $(id).classList.toggle("is-hidden", !visible);
}

function formatRub(value) {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}

/* ---------- курсы и конфиг ---------- */

async function fetchJson(url) {
  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

async function loadConfigAndRates() {
  try {
    const data = await fetchJson(`../api/calculation_config.php?ts=${Date.now()}`);
    if (data && data.ok && data.config) state.config = data.config;
  } catch {
    /* нет админ-конфига — считаем по DEFAULT_CALCULATION_CONFIG */
  }

  try {
    const snap = await fetchJson(`../api/rates_snapshot.php?ts=${Date.now()}`);
    if (
      snap &&
      typeof snap.usdMnt === "number" &&
      typeof snap.jpyMnt === "number" &&
      typeof snap.rubPerEur === "number"
    ) {
      state.rates = { usdMnt: snap.usdMnt, jpyMnt: snap.jpyMnt, rubPerEur: snap.rubPerEur };
      state.ratesLive = true;
    }
  } catch {
    /* обработано ниже */
  }

  const line = $("rates-line");
  if (state.ratesLive) {
    const r = state.rates;
    line.textContent = `Курсы: $ ${r.usdMnt} ₮ · ¥ ${r.jpyMnt} ₮ · € ${r.rubPerEur} ₽`;
  } else {
    state.rates = { ...FALLBACK_RATES };
    line.textContent = "Не удалось получить актуальные курсы — расчёт по примерным значениям.";
    line.classList.add("rates-line--warn");
  }
}

/* ---------- каскад выбора ---------- */

function renderChips(containerId, items, selected, onPick) {
  const box = $(containerId);
  box.innerHTML = "";
  items.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip" + (item === selected ? " is-active" : "");
    btn.textContent = item;
    btn.addEventListener("click", () => onPick(item));
    box.appendChild(btn);
  });
}

function genYearsText(gen) {
  return `${gen.yearFrom} – ${gen.yearTo ?? "н.в."}`;
}

function renderGenerations() {
  const box = $("gen-grid");
  box.innerHTML = "";
  const model = state.model;
  if (!model) return;
  model.generations.forEach((gen) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "gen-card" + (gen === state.gen ? " is-active" : "");
    const img = document.createElement("img");
    img.loading = "lazy";
    img.alt = `${state.make.make} ${model.name} ${gen.code}`;
    img.src = gen.photo || PLACEHOLDER_PHOTO;
    img.addEventListener("error", () => {
      img.src = PLACEHOLDER_PHOTO;
    });
    const body = document.createElement("div");
    body.className = "gen-card__body";
    body.innerHTML =
      `<div class="gen-card__years">${genYearsText(gen)}, ${gen.code}</div>` +
      `<div class="gen-card__label">${gen.label}</div>`;
    card.append(img, body);
    card.addEventListener("click", () => pickGeneration(gen));
    box.appendChild(card);
  });
}

function renderMods() {
  const box = $("mod-list");
  box.innerHTML = "";
  const gen = state.gen;
  if (!gen) return;
  gen.mods.forEach((mod) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "mod-item" + (mod === state.mod ? " is-active" : "");
    item.innerHTML =
      `<span class="mod-item__name">${mod.name}</span>` +
      `<span class="mod-item__spec">${FUEL_LABELS[mod.fuel] || mod.fuel}</span>` +
      `<span class="mod-item__spec">${mod.gearbox}</span>` +
      `<span class="mod-item__spec">${mod.cc.toLocaleString("ru-RU")} см³</span>` +
      `<span class="mod-item__spec">${mod.hp} л.с.</span>` +
      `<span class="mod-item__spec">${mod.drive}</span>`;
    item.addEventListener("click", () => pickMod(mod));
    box.appendChild(item);
  });
}

function renderYears() {
  const select = $("year-select");
  select.innerHTML = "";
  const gen = state.gen;
  if (!gen) return;
  const nowYear = new Date().getFullYear();
  const to = Math.min(gen.yearTo ?? nowYear, nowYear);
  for (let y = to; y >= gen.yearFrom; y -= 1) {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = String(y);
    select.appendChild(opt);
  }
  state.year = Number(select.value);
  syncAgeFromYear();
}

function ageCategoryForYear(year) {
  const age = new Date().getFullYear() - year;
  if (age < 3) return "under3";
  if (age <= 5) return "3to5";
  return "over5";
}

function syncAgeFromYear() {
  if (!state.year) return;
  $("age-select").value = ageCategoryForYear(state.year);
}

/* ---------- обработчики шагов ---------- */

function pickMake(makeName) {
  state.make = CATALOG.find((m) => m.make === makeName) || null;
  state.model = null;
  state.gen = null;
  state.mod = null;
  renderChips("make-chips", CATALOG.map((m) => m.make), makeName, pickMake);
  renderChips(
    "model-chips",
    state.make ? state.make.models.map((m) => m.name) : [],
    null,
    pickModel
  );
  show("step-model", Boolean(state.make));
  show("step-gen", false);
  show("step-mod", false);
  show("step-price", false);
  show("step-result", false);
}

function pickModel(modelName) {
  state.model = state.make.models.find((m) => m.name === modelName) || null;
  state.gen = null;
  state.mod = null;
  renderChips(
    "model-chips",
    state.make.models.map((m) => m.name),
    modelName,
    pickModel
  );
  renderGenerations();
  show("step-gen", Boolean(state.model));
  show("step-mod", false);
  show("step-price", false);
  show("step-result", false);
}

function pickGeneration(gen) {
  state.gen = gen;
  state.mod = null;
  renderGenerations();
  renderMods();
  renderYears();
  show("step-mod", true);
  show("step-price", false);
  show("step-result", false);
}

function pickMod(mod) {
  state.mod = mod;
  renderMods();
  show("step-price", true);
  updateCalcButton();
}

function updateCalcButton() {
  const price = Number($("price-input").value);
  $("calc-btn").disabled = !(state.mod && Number.isFinite(price) && price > 0);
}

/* ---------- расчёт ---------- */

function pickedSummaryText() {
  const parts = [
    `${state.make.make} ${state.model.name}`,
    `${state.gen.code}, ${genYearsText(state.gen)}`,
    `${state.year} г.`,
    state.mod.name,
    FUEL_LABELS[state.mod.fuel] || state.mod.fuel,
    state.mod.gearbox,
    `${state.mod.cc.toLocaleString("ru-RU")} см³`,
    `${state.mod.hp} л.с.`,
  ];
  return parts.join(" · ");
}

function resultCard(kind, title, bank, customs, lab, grand) {
  const rows = [
    ["Оплата по инвойсу, ₽", formatRub(bank.totalRub)],
    ["Таможенные платежи, ₽", formatRub(customs.totalRub)],
    ["— сбор за оформление", formatRub(customs.clearanceFeeRub)],
    ["— пошлина", formatRub(customs.importDutyRub)],
    ["— утилизационный сбор", formatRub(customs.recyclingFeeRub)],
    ["ЭПТС и СБКТС, ₽", formatRub(lab)],
  ];
  const card = document.createElement("div");
  card.className = `result-card result-card--${kind}`;
  card.innerHTML =
    `<h3>${title}</h3><dl>` +
    rows
      .map(([dt, dd]) => `<div class="result-row"><dt>${dt}</dt><dd>${dd}</dd></div>`)
      .join("") +
    `<div class="result-row result-row--total"><dt>Итого под ключ</dt><dd>${formatRub(grand)}</dd></div>` +
    "</dl>";
  return card;
}

function calculate() {
  const price = Number($("price-input").value);
  if (!state.mod || !Number.isFinite(price) || price <= 0) return;

  const data = {
    usdMnt: state.rates.usdMnt,
    jpyMnt: state.rates.jpyMnt,
    rubPerEur: state.rates.rubPerEur,
    vehicleAge: $("age-select").value,
    engineType: state.mod.fuel,
    engineDisplacementCc: state.mod.cc,
    enginePowerHp: state.mod.hp,
    auctionYen: price,
    fobYen: Number($("fob-select").value),
  };

  const snap = computeCalculation(data, state.config);
  const o = snap.outputs;

  $("picked-summary").textContent = pickedSummaryText();
  const box = $("results");
  box.innerHTML = "";
  box.append(
    resultCard("train", "Train (ж/д контейнер)", o.bankTrain, o.customsTrain, o.labRub, o.grandTotalTrainRub),
    resultCard("track", "Track (автовоз)", o.bankTrack, o.customsTrack, o.labRub, o.grandTotalTrackRub)
  );
  show("step-result", true);
  $("step-result").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ---------- init ---------- */

function init() {
  renderChips("make-chips", CATALOG.map((m) => m.make), null, pickMake);
  $("year-select").addEventListener("change", () => {
    state.year = Number($("year-select").value);
    syncAgeFromYear();
  });
  $("price-input").addEventListener("input", updateCalcButton);
  $("calc-btn").addEventListener("click", calculate);
  loadConfigAndRates();
}

init();
