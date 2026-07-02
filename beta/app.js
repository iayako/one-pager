/**
 * Бета: подбор авто одной формой в стиле дром.ру
 * (марка → модель → поколение в модальном окне по фото → топливо/КПП/двигатель → расчёт).
 * Формула, курсы, тема и оформление — те же, что на основном калькуляторе:
 * calc-core.js, api/calculation_config.php, api/rates_snapshot.php, ../styles.css.
 */

import { DEFAULT_CALCULATION_CONFIG, computeCalculation } from "../calc-core.js";
import { CATALOG, FUEL_LABELS } from "./catalog.js";

const THEME_STORAGE_KEY = "calculator-theme";

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
  ratesFetchedAt: null,
};

const $ = (id) => document.getElementById(id);

function formatRub(value) {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}

function formatRate(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return "—";
  return v.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** ISO или Date → строка вида «02.07.2026, 15:45:01 GMT+3» (Europe/Moscow), как на главной. */
function formatInstantRuWithTimeZone(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) {
    const s = String(isoOrDate || "").trim();
    return s || "—";
  }
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Moscow",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      timeZoneName: "shortOffset",
    }).format(d);
  } catch {
    return d.toLocaleString("ru-RU");
  }
}

function numericConfigVariable(config, key) {
  const vars = config && typeof config === "object" ? config.variables : null;
  const item = vars && typeof vars === "object" ? vars[key] : null;
  const raw = item && typeof item === "object" && "value" in item ? item.value : item;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
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

/* ---------- тема (как на главной, общий ключ localStorage) ---------- */

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const toggle = $("theme-toggle");
  if (toggle) {
    const icon =
      theme === "dark"
        ? `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3a1 1 0 0 1 1 1v1.2a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm0 16.8a1 1 0 0 1 1 1V22a1 1 0 1 1-2 0v-1.2a1 1 0 0 1 1-1ZM4 11a1 1 0 0 1 1 1 7 7 0 0 0 7 7 1 1 0 1 1 0 2A9 9 0 0 1 3 12a1 1 0 0 1 1-1Zm17-1a1 1 0 0 1 1 1 9 9 0 0 1-9 9 1 1 0 1 1 0-2 7 7 0 0 0 7-7 1 1 0 0 1 1-1ZM6.22 6.22a1 1 0 0 1 1.42 0l.85.85a1 1 0 1 1-1.42 1.42l-.85-.85a1 1 0 0 1 0-1.42Zm10.44 10.44a1 1 0 0 1 1.42 0l.85.85a1 1 0 0 1-1.42 1.42l-.85-.85a1 1 0 0 1 0-1.42ZM3 12a1 1 0 0 1 1-1h1.2a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm16.8 0a1 1 0 0 1 1-1H22a1 1 0 1 1 0 2h-1.2a1 1 0 0 1-1-1ZM6.22 17.78a1 1 0 0 1 0-1.42l.85-.85a1 1 0 1 1 1.42 1.42l-.85.85a1 1 0 0 1-1.42 0Zm10.44-10.44a1 1 0 0 1 0-1.42l.85-.85a1 1 0 0 1 1.42 1.42l-.85.85a1 1 0 0 1-1.42 0ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" fill="currentColor"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 13.7a8.2 8.2 0 0 1-10.7-10 1 1 0 0 0-1.35-1.18A10 10 0 1 0 22.18 15a1 1 0 0 0-1.18-1.3Z" fill="currentColor"/></svg>`;
    toggle.innerHTML = `${icon}<span class="sr-only">Переключить тему</span>`;
    toggle.setAttribute("aria-label", theme === "dark" ? "Светлая тема" : "Тёмная тема");
  }
}

function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    /* приватный режим / блокировка storage */
  }
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (systemDark ? "dark" : "light"));

  const toggle = $("theme-toggle");
  if (!toggle) return;
  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* noop */
    }
    applyTheme(next);
  });
}

/* ---------- курсы и конфиг ---------- */

async function fetchJson(url) {
  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

function renderRatesPanel() {
  const risk = numericConfigVariable(state.config, "jpyMntRiskMarkup") || 0;
  const mntPerRub = numericConfigVariable(state.config, "mntPerRub");
  const r = state.rates;

  $("rate-rub-per-usd").textContent = formatRate(r.usdMnt);
  $("rate-yen-per-usd").textContent = formatRate(r.jpyMnt + risk);
  $("rate-rub-per-yen").textContent = formatRate(mntPerRub);
  $("rate-rub-per-eur").textContent = formatRate(r.rubPerEur);

  const meta = $("rate-date-common");
  if (state.ratesLive) {
    meta.textContent = `Актуален на: ${
      state.ratesFetchedAt ? formatInstantRuWithTimeZone(state.ratesFetchedAt) : "—"
    }`;
    meta.classList.remove("rates-meta--warn");
  } else {
    meta.textContent = "Не удалось получить актуальные курсы — расчёт по примерным значениям.";
    meta.classList.add("rates-meta--warn");
  }
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
      state.ratesFetchedAt = typeof snap.fetchedAt === "string" ? snap.fetchedAt : null;
    }
  } catch {
    /* обработано ниже */
  }

  if (!state.ratesLive) state.rates = { ...FALLBACK_RATES };
  renderRatesPanel();
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
  $("step-result").classList.add("results--hidden");
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

/** Карточка результата в разметке основного калькулятора (стили ../styles.css). */
function resultCard(kind, badge, sub, bank, customs, lab, grand) {
  const rows = [
    ["Оплата по инвойсу, ₽", formatRub(bank.totalRub)],
    ["Таможенные платежи, ₽", formatRub(customs.totalRub)],
    ["— сбор за оформление", formatRub(customs.clearanceFeeRub)],
    ["— пошлина", formatRub(customs.importDutyRub)],
    ["— утилизационный сбор", formatRub(customs.recyclingFeeRub)],
    ["ЭПТС и СБКТС, ₽", formatRub(lab)],
  ];
  const card = document.createElement("article");
  card.className = `result-card result-card--${kind}`;
  card.innerHTML =
    `<header class="result-card__head">` +
    `<span class="result-card__badge">${badge}</span>` +
    `<p class="result-card__sub">${sub}</p>` +
    `</header>` +
    `<dl class="result-list">` +
    rows
      .map(([dt, dd]) => `<div class="result-row"><dt>${dt}</dt><dd>${dd}</dd></div>`)
      .join("") +
    `<div class="result-row result-row--accent result-row--total"><dt>Итоговая сумма, ₽</dt><dd>${formatRub(grand)}</dd></div>` +
    `</dl>`;
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
    resultCard(
      "train",
      "Train",
      "TRAINMOD · 25–45 дней с погрузки в контейнер",
      o.bankTrain,
      o.customsTrain,
      o.labRub,
      o.grandTotalTrainRub
    ),
    resultCard(
      "track",
      "Track",
      "TRACKMOD · до 25 дней с погрузки в контейнер",
      o.bankTrack,
      o.customsTrack,
      o.labRub,
      o.grandTotalTrackRub
    )
  );
  $("step-result").classList.remove("results--hidden");
  $("step-result").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ---------- init ---------- */

function init() {
  initTheme();
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
