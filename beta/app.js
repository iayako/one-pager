/**
 * Бета: подбор авто одной формой в стиле дром.ру
 * (марка → модель → поколение в модальном окне по фото → топливо/КПП/двигатель → расчёт).
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

const GEARBOX_LABELS = {
  CVT: "Вариатор",
  "e-CVT": "e-CVT (гибрид)",
  AT: "Автомат",
  "7DCT": "Робот (DCT)",
  MT: "Механика",
};

const state = {
  make: null,
  model: null,
  gen: null,
  mod: null,
  config: DEFAULT_CALCULATION_CONFIG,
  rates: null,
  ratesLive: false,
};

const $ = (id) => document.getElementById(id);

function formatRub(value) {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}

function setOptions(select, placeholder, items) {
  select.innerHTML = "";
  const first = document.createElement("option");
  first.value = "";
  first.textContent = placeholder;
  select.appendChild(first);
  items.forEach(({ value, label }) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    select.appendChild(opt);
  });
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

/* ---------- каскад формы ---------- */

function genYearsText(gen) {
  return `${gen.yearFrom} – ${gen.yearTo ?? "н.в."}`;
}

function setGenTriggerText() {
  const trigger = $("gen-trigger");
  const text = $("gen-trigger-text");
  if (state.gen) {
    text.textContent = `${genYearsText(state.gen)}, ${state.gen.code}`;
    trigger.classList.remove("is-placeholder");
  } else {
    text.textContent = "Поколение";
    trigger.classList.add("is-placeholder");
  }
}

function resetDownstreamOfModel() {
  state.gen = null;
  state.mod = null;
  setGenTriggerText();
  ["year-select", "fuel-select", "gearbox-select", "mod-select", "age-select", "price-input", "fob-select"].forEach(
    (id) => {
      $(id).disabled = true;
    }
  );
  setOptions($("year-select"), "Год", []);
  setOptions($("fuel-select"), "Любое", []);
  setOptions($("gearbox-select"), "Любая", []);
  setOptions($("mod-select"), "Выберите двигатель", []);
  $("step-result").classList.add("is-hidden");
  updateCalcButton();
}

function onMakeChange() {
  const makeName = $("make-select").value;
  state.make = CATALOG.find((m) => m.make === makeName) || null;
  state.model = null;
  const modelSelect = $("model-select");
  setOptions(
    modelSelect,
    "Модель",
    state.make ? state.make.models.map((m) => ({ value: m.name, label: m.name })) : []
  );
  modelSelect.disabled = !state.make;
  $("gen-trigger").disabled = true;
  resetDownstreamOfModel();
}

function onModelChange() {
  const modelName = $("model-select").value;
  state.model = state.make ? state.make.models.find((m) => m.name === modelName) || null : null;
  $("gen-trigger").disabled = !state.model;
  resetDownstreamOfModel();
  if (state.model) openGenModal();
}

function pickGeneration(gen) {
  state.gen = gen;
  state.mod = null;
  setGenTriggerText();
  closeGenModal();

  const nowYear = new Date().getFullYear();
  const to = Math.min(gen.yearTo ?? nowYear, nowYear);
  const years = [];
  for (let y = to; y >= gen.yearFrom; y -= 1) years.push({ value: String(y), label: String(y) });
  setOptions($("year-select"), "Год", years);
  $("year-select").value = years[0]?.value ?? "";
  syncAgeFromYear();

  const fuels = [...new Set(gen.mods.map((m) => m.fuel))];
  setOptions($("fuel-select"), "Любое", fuels.map((f) => ({ value: f, label: FUEL_LABELS[f] || f })));

  const boxes = [...new Set(gen.mods.map((m) => m.gearbox))];
  setOptions($("gearbox-select"), "Любая", boxes.map((g) => ({ value: g, label: GEARBOX_LABELS[g] || g })));

  ["year-select", "fuel-select", "gearbox-select", "mod-select", "age-select", "price-input", "fob-select"].forEach(
    (id) => {
      $(id).disabled = false;
    }
  );
  renderModOptions();
  updateCalcButton();
}

function renderModOptions() {
  const gen = state.gen;
  if (!gen) return;
  const fuel = $("fuel-select").value;
  const gearbox = $("gearbox-select").value;
  const items = gen.mods
    .map((mod, idx) => ({ mod, idx }))
    .filter(({ mod }) => (!fuel || mod.fuel === fuel) && (!gearbox || mod.gearbox === gearbox))
    .map(({ mod, idx }) => ({
      value: String(idx),
      label:
        `${mod.name} · ${mod.cc.toLocaleString("ru-RU")} см³ · ${mod.hp} л.с. · ` +
        `${FUEL_LABELS[mod.fuel] || mod.fuel} · ${GEARBOX_LABELS[mod.gearbox] || mod.gearbox} · ${mod.drive}`,
    }));
  const select = $("mod-select");
  const prev = state.mod ? String(gen.mods.indexOf(state.mod)) : "";
  setOptions(select, "Выберите двигатель", items);
  if (items.length === 1) {
    select.value = items[0].value;
  } else if (prev && items.some((i) => i.value === prev)) {
    select.value = prev;
  }
  onModChange();
}

function onModChange() {
  const idx = $("mod-select").value;
  state.mod = idx === "" ? null : state.gen?.mods[Number(idx)] ?? null;
  updateCalcButton();
}

function ageCategoryForYear(year) {
  const age = new Date().getFullYear() - year;
  if (age < 3) return "under3";
  if (age <= 5) return "3to5";
  return "over5";
}

function syncAgeFromYear() {
  const year = Number($("year-select").value);
  if (year) $("age-select").value = ageCategoryForYear(year);
}

function updateCalcButton() {
  const price = Number($("price-input").value);
  $("calc-btn").disabled = !(state.mod && Number.isFinite(price) && price > 0);
}

function resetAll() {
  $("make-select").value = "";
  $("price-input").value = "";
  $("fob-select").value = "90000";
  onMakeChange();
}

/* ---------- модальное окно поколений ---------- */

function openGenModal() {
  if (!state.model) return;
  $("gen-modal-title").textContent = `${state.make.make} ${state.model.name} — поколение`;
  const grid = $("gen-modal-grid");
  grid.innerHTML = "";
  state.model.generations.forEach((gen) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "gen-card" + (gen === state.gen ? " is-active" : "");
    const img = document.createElement("img");
    img.loading = "lazy";
    img.alt = `${state.make.make} ${state.model.name} ${gen.code}`;
    img.src = gen.photo || PLACEHOLDER_PHOTO;
    img.addEventListener("error", () => {
      img.src = PLACEHOLDER_PHOTO;
    });
    const overlay = document.createElement("div");
    overlay.className = "gen-card__overlay";
    overlay.innerHTML =
      `<div class="gen-card__years">${genYearsText(gen)}, ${gen.code}</div>` +
      `<div class="gen-card__label">${gen.label}</div>`;
    card.append(img, overlay);
    card.addEventListener("click", () => pickGeneration(gen));
    grid.appendChild(card);
  });
  $("gen-modal").classList.remove("is-hidden");
}

function closeGenModal() {
  $("gen-modal").classList.add("is-hidden");
}

/* ---------- расчёт ---------- */

function pickedSummaryText() {
  const parts = [
    `${state.make.make} ${state.model.name}`,
    `${state.gen.code}, ${genYearsText(state.gen)}`,
    `${$("year-select").value} г.`,
    state.mod.name,
    FUEL_LABELS[state.mod.fuel] || state.mod.fuel,
    GEARBOX_LABELS[state.mod.gearbox] || state.mod.gearbox,
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
  $("step-result").classList.remove("is-hidden");
  $("step-result").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ---------- init ---------- */

function init() {
  setOptions($("make-select"), "Марка", CATALOG.map((m) => ({ value: m.make, label: m.make })));

  $("make-select").addEventListener("change", onMakeChange);
  $("model-select").addEventListener("change", onModelChange);
  $("gen-trigger").addEventListener("click", openGenModal);
  $("gen-modal-close").addEventListener("click", closeGenModal);
  $("gen-modal-backdrop").addEventListener("click", closeGenModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeGenModal();
  });
  $("year-select").addEventListener("change", syncAgeFromYear);
  $("fuel-select").addEventListener("change", renderModOptions);
  $("gearbox-select").addEventListener("change", renderModOptions);
  $("mod-select").addEventListener("change", onModChange);
  $("price-input").addEventListener("input", updateCalcButton);
  $("calc-btn").addEventListener("click", calculate);
  $("reset-btn").addEventListener("click", resetAll);

  loadConfigAndRates();
}

init();
