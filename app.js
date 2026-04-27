/**
 * Калькулятор по ТЗ: инвойс ¥/₽, комиссия АТБ, итог с таможней и лабораторией.
 */

import { computeCalculation } from "./calc-core.js";

const THEME_STORAGE_KEY = "calculator-theme";
const AUCTION_OPTIONS = [
  { name: "Honda AA Tokyo", fobYen: 90000 },
  { name: "Honda Kansai", fobYen: 90000 },
  { name: "Honda Nagoya", fobYen: 90000 },
  { name: "LUM Nagoya N.", fobYen: 90000 },
  { name: "NPS Fukuoka N.", fobYen: 90000 },
  { name: "NPS Gifu", fobYen: 90000 },
  { name: "NPS Osaka", fobYen: 90000 },
  { name: "ORIX Fukuoka N.", fobYen: 90000 },
  { name: "ORIX Kobe", fobYen: 90000 },
  { name: "USS R-Nagoya", fobYen: 90000 },
  { name: "USS Yokohama", fobYen: 90000 },
  { name: "IAA Osaka", fobYen: 90000 },
  { name: "Bayauc", fobYen: 90000 },
  { name: "Isuzu Tokyo", fobYen: 90000 },
  { name: "JAA", fobYen: 90000 },
  { name: "LUM Tokyo N.", fobYen: 90000 },
  { name: "ORIX Atsugi N.", fobYen: 90000 },
  { name: "USS Fukuoka", fobYen: 90000 },
  { name: "USS Kobe", fobYen: 90000 },
  { name: "Isuzu Kyushu", fobYen: 90000 },
  { name: "JU Aichi", fobYen: 90000 },
  { name: "KCAA Fukuoka", fobYen: 90000 },
  { name: "LUM Kobe N.", fobYen: 90000 },
  { name: "USS Tokyo", fobYen: 90000 },
  { name: "ZERO Osaka", fobYen: 90000 },
  { name: "ZERO Shonan", fobYen: 90000 },
  { name: "ZIP Osaka", fobYen: 90000 },
  { name: "Arai AA Bayside", fobYen: 90000 },
  { name: "Isuzu Kobe", fobYen: 90000 },
  { name: "JU Chiba", fobYen: 90000 },
  { name: "JU Fukuoka", fobYen: 90000 },
  { name: "NAA Tokyo", fobYen: 90000 },
  { name: "USS Nagoya", fobYen: 90000 },
  { name: "USS Osaka", fobYen: 90000 },
  { name: "ZERO Chiba", fobYen: 90000 },
  { name: "ZERO Hakata", fobYen: 90000 },
  { name: "Honda AA Sendai", fobYen: 100000 },
  { name: "Honda Kyushu", fobYen: 100000 },
  { name: "JU Tokyo", fobYen: 100000 },
  { name: "Nissan Osaka", fobYen: 100000 },
  { name: "Arai AA Sendai", fobYen: 100000 },
  { name: "CAA Gifu", fobYen: 100000 },
  { name: "CAA Tokyo", fobYen: 100000 },
  { name: "JU Mie", fobYen: 100000 },
  { name: "JU Nagano", fobYen: 100000 },
  { name: "JU Saitama", fobYen: 100000 },
  { name: "JU Shizuoka", fobYen: 100000 },
  { name: "JU Yamaguchi", fobYen: 100000 },
  { name: "LUM Fukuoka", fobYen: 100000 },
  { name: "NAA Fukuoka", fobYen: 100000 },
  { name: "NPS Sendai N.", fobYen: 100000 },
  { name: "NPS Tochigi", fobYen: 100000 },
  { name: "ORIX Sendai", fobYen: 100000 },
  { name: "TAA Kinki", fobYen: 100000 },
  { name: "TAA Kyusyu", fobYen: 100000 },
  { name: "TAA Shikoku", fobYen: 100000 },
  { name: "KCAA Kyoto", fobYen: 100000 },
  { name: "CAA Chubu", fobYen: 100000 },
  { name: "Hero Members AA", fobYen: 100000 },
  { name: "JU Ibaraki", fobYen: 100000 },
  { name: "JU Ishikawa", fobYen: 100000 },
  { name: "JU Kumamoto", fobYen: 100000 },
  { name: "JU Nagasaki", fobYen: 100000 },
  { name: "JU Oita", fobYen: 100000 },
  { name: "KCAA M. Kyushu", fobYen: 100000 },
  { name: "LAA Shikoku", fobYen: 100000 },
  { name: "MIRIVE Saitama", fobYen: 100000 },
  { name: "USS Niigata", fobYen: 100000 },
  { name: "USS Tohoku", fobYen: 100000 },
  { name: "Arai AA Oyama", fobYen: 100000 },
  { name: "JU Fukushima", fobYen: 100000 },
  { name: "JU Gunma", fobYen: 100000 },
  { name: "JU Kanagawa", fobYen: 100000 },
  { name: "JU Toyama", fobYen: 100000 },
  { name: "NAA Nagoya", fobYen: 100000 },
  { name: "NAA Osaka", fobYen: 100000 },
  { name: "SAA Hamamatsu", fobYen: 100000 },
  { name: "TAA Chubu", fobYen: 100000 },
  { name: "TAA Kanto", fobYen: 100000 },
  { name: "TAA Tohoku", fobYen: 100000 },
  { name: "ZERO Chubu", fobYen: 100000 },
  { name: "USS Saitama", fobYen: 100000 },
  { name: "JU Miyagi", fobYen: 100000 },
  { name: "JU Niigata", fobYen: 100000 },
  { name: "JU Tochigi", fobYen: 100000 },
  { name: "KCAA Yamaguchi", fobYen: 100000 },
  { name: "LAA Okayama", fobYen: 100000 },
  { name: "MIRIVE Aichi", fobYen: 100000 },
  { name: "USS Hokuriko", fobYen: 100000 },
  { name: "ZERO Sendai", fobYen: 100000 },
  { name: "Arai Oyama VT", fobYen: 100000 },
  { name: "JU Gifu", fobYen: 100000 },
  { name: "JU Nara", fobYen: 100000 },
  { name: "JU Yamanashi", fobYen: 100000 },
  { name: "NAA Nagoya N.", fobYen: 100000 },
  { name: "TAA Hyogo", fobYen: 100000 },
  { name: "USS Gunma", fobYen: 100000 },
  { name: "USS Okayama", fobYen: 100000 },
  { name: "USS Shizuoka", fobYen: 100000 },
  { name: "Aucnet", fobYen: 110000 },
  { name: "Honda Hokkaido", fobYen: 110000 },
  { name: "AEP Nyusatsu", fobYen: 110000 },
  { name: "CAA Tohoku", fobYen: 110000 },
  { name: "JU Aomori", fobYen: 110000 },
  { name: "JU Fukui", fobYen: 110000 },
  { name: "NPS Tomakomai", fobYen: 110000 },
  { name: "SAA Sapporo", fobYen: 110000 },
  { name: "Sakura Nyusatsu", fobYen: 110000 },
  { name: "Sogo Internet", fobYen: 110000 },
  { name: "TAA Hiroshima", fobYen: 110000 },
  { name: "TAA South Kyusyu", fobYen: 110000 },
  { name: "JU Akita", fobYen: 110000 },
  { name: "Sogo Narita 1", fobYen: 110000 },
  { name: "USS Sapporo", fobYen: 110000 },
  { name: "JU Hiroshima", fobYen: 110000 },
  { name: "JU Miyazaki", fobYen: 110000 },
  { name: "LUM Hokkaido", fobYen: 110000 },
  { name: "Sogo Narita 2", fobYen: 110000 },
  { name: "TAA Hokkaido", fobYen: 110000 },
  { name: "JU Hokkaido", fobYen: 110000 },
  { name: "JU Shimane", fobYen: 110000 },
  { name: "Sogo Hakata", fobYen: 110000 },
  { name: "Sogo Narita 3", fobYen: 110000 },
  { name: "Sogo Tomakomai", fobYen: 110000 },
  { name: "ZERO Hokkaido", fobYen: 110000 },
  { name: "JU Yamagata", fobYen: 110000 },
  { name: "Yanase and Aucnet", fobYen: 110000 },
];

/**
 * Базовый URL этого файла (в момент первого синхронного запуска app.js).
 * В async-обработчиках document.currentScript уже null — без кэша resolveAppUrl ломается.
 */
const APP_SCRIPT_URL = (() => {
  const cs = document.currentScript;
  if (cs && cs.src) return cs.src;
  const byQuery = document.querySelector('script[src*="app.js"]');
  if (byQuery && byQuery.src) return byQuery.src;
  const scripts = document.getElementsByTagName("script");
  for (let i = scripts.length - 1; i >= 0; i--) {
    const src = scripts[i].src;
    if (src && /\/app\.js(\?|#|$)/i.test(src)) return src;
  }
  return window.location.href;
})();

let latestCalculationSnapshot = null;
let latestCalculationId = null;
let vehicleCatalog = [];

function formatYen(n) {
  return `${formatInt(n)} ¥`;
}

function formatRub(n) {
  return `${formatInt(n)} ₽`;
}

function formatInt(n) {
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString("ru-RU");
}

/** URL к PHP в той же папке, что и app.js (см. APP_SCRIPT_URL). */
function resolveAppUrl(relativePath) {
  return new URL(relativePath, APP_SCRIPT_URL).href;
}

function openAuctionDialog(modal) {
  if (modal && typeof modal.showModal === "function") {
    try {
      modal.showModal();
      return;
    } catch {
      /* старые WebKit и т.п. */
    }
  }
  if (modal) modal.setAttribute("open", "");
}

function closeAuctionDialog(modal) {
  if (modal && typeof modal.close === "function") {
    try {
      modal.close();
      return;
    } catch {
      /* noop */
    }
  }
  if (modal) modal.removeAttribute("open");
}

function readForm() {
  const form = document.getElementById("calc-form");
  const fd = new FormData(form);
  return {
    yenPerUsd: parseFloat(fd.get("yenPerUsd")),
    rubPerUsd: parseFloat(fd.get("rubPerUsd")),
    rubPerYen: parseFloat(fd.get("rubPerYen")),
    rubPerEur: parseFloat(fd.get("rubPerEur")),
    vehicleAge: String(fd.get("vehicleAge") || ""),
    engineType: String(fd.get("engineType") || ""),
    auctionName: String(fd.get("auctionName") || ""),
    engineDisplacementCc: parseFloat(String(fd.get("engineDisplacementCc"))),
    enginePowerHp: parseFloat(String(fd.get("enginePowerHp"))),
    auctionYen: parseFloat(fd.get("auctionYen")),
    fobYen: parseFloat(fd.get("fobYen")),
    vanningYen: parseFloat(fd.get("vanningYen")),
    usdTrain: parseFloat(fd.get("usdTrain")),
    usdTrack: parseFloat(fd.get("usdTrack")),
    rubInInvoice: parseFloat(fd.get("rubInInvoice")),
    labRub: parseFloat(fd.get("labRub")),
  };
}

function hasValue(el) {
  if (!el) return false;
  if (el.tagName === "SELECT") return el.value !== "";
  return el.value.trim() !== "";
}

function updateProgressiveSteps() {
  document.querySelectorAll(".progressive-step").forEach((step) => {
    const required = (step.dataset.requires || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const visible = required.every((id) => hasValue(document.getElementById(id)));
    step.classList.toggle("is-hidden", !visible);
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const toggle = document.getElementById("theme-toggle");
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
    /* приватный режим / блокировка storage — не валим весь скрипт */
  }
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initial = saved || (systemDark ? "dark" : "light");
  applyTheme(initial);

  const toggle = document.getElementById("theme-toggle");
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

/** ISO или Date → строка вида «24.04.2026, 00:32:40 UTC+3» (Europe/Moscow + смещение). */
function formatInstantRuWithTimeZone(isoOrDate) {
  const d =
    isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
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
      }).format(d);
    } catch {
      return d.toISOString();
    }
  }
}

function normalizeRateDateLabel(dateLabel) {
  const raw = String(dateLabel || "").trim();
  if (!raw || raw === "—") return "—";
  const stripped = raw.replace(/^актуально\s+на[:\s]*/i, "").trim();
  const candidate = stripped || raw;
  if (/^\d{4}-\d{2}-\d{2}T/.test(candidate)) {
    return formatInstantRuWithTimeZone(candidate);
  }
  return stripped || "—";
}

function setRateDateText(id, dateLabel) {
  const el = document.getElementById(id);
  if (el) el.textContent = `Актуален на: ${normalizeRateDateLabel(dateLabel)}`;
}

function formatRate(n, digits) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return "—";
  return v.toLocaleString("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function setRateText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateRatesUIFromInputs() {
  const yenPerUsd = Number(document.getElementById("yen-per-usd")?.value);
  const rubPerUsd = Number(document.getElementById("rub-per-usd")?.value);
  const rubPerYen = Number(document.getElementById("rub-per-yen")?.value);
  const rubPerEur = Number(document.getElementById("rub-per-eur")?.value);

  setRateText("rate-yen-per-usd", formatRate(yenPerUsd, 4));
  setRateText("rate-rub-per-usd", formatRate(rubPerUsd, 2));
  setRateText("rate-rub-per-yen", formatRate(rubPerYen, 6));
  setRateText("rate-rub-per-eur", formatRate(rubPerEur, 4));
}

function formatLocalDate(dt) {
  try {
    const d = dt instanceof Date ? dt : new Date(dt);
    return d.toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatLocalDateTime(dt) {
  try {
    const d = dt instanceof Date ? dt : new Date(dt);
    return d.toLocaleString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatIsoLocalDate(dt) {
  const d = dt instanceof Date ? dt : new Date(dt);
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function deriveRubPerYenIfPossible() {
  const yenPerUsdEl = document.getElementById("yen-per-usd");
  const rubPerUsdEl = document.getElementById("rub-per-usd");
  const rubPerYenEl = document.getElementById("rub-per-yen");
  if (!yenPerUsdEl || !rubPerUsdEl || !rubPerYenEl) return false;
  const yenPerUsd = Number(yenPerUsdEl.value);
  const rubPerUsd = Number(rubPerUsdEl.value);
  if (!Number.isFinite(yenPerUsd) || yenPerUsd <= 0) return false;
  if (!Number.isFinite(rubPerUsd) || rubPerUsd <= 0) return false;
  const rubPerYen = rubPerUsd / yenPerUsd;
  if (!Number.isFinite(rubPerYen) || rubPerYen <= 0) return false;
  rubPerYenEl.value = String(rubPerYen);
  return true;
}

/** Макс. возраст снимка из cron (api/rates_snapshot.php), сек.; дальше — запрос к живым API */
const RATES_SNAPSHOT_MAX_AGE_SEC = 7200;

/** Опрос курсов без перезагрузки страницы (чаще интервала cron — подхват нового снимка). */
const RATES_POLL_INTERVAL_MS = 90 * 1000;

let ratesRefreshInFlight = false;

/**
 * @param {{ resetDatePlaceholder?: boolean }} opts — при первой загрузке сбрасываем «Актуален на» в —; при опросе не трогаем.
 */
async function refreshRatesAuto(opts = {}) {
  const { resetDatePlaceholder = false } = opts;
  if (ratesRefreshInFlight) {
    return;
  }
  ratesRefreshInFlight = true;
  try {
  const now = new Date();
  const commonActualLabel = formatInstantRuWithTimeZone(now);
  const todayIso = formatIsoLocalDate(now);
  const dateSuffix = todayIso ? `?date=${encodeURIComponent(todayIso)}` : "";
  const requestNonce = `ts=${Date.now()}`;
  if (resetDatePlaceholder) {
    setRateDateText("rate-date-common", "—");
  }

  const inputYenPerUsd = document.getElementById("yen-per-usd");
  const inputRubPerUsd = document.getElementById("rub-per-usd");
  const inputRubPerYen = document.getElementById("rub-per-yen");
  const inputRubPerEur = document.getElementById("rub-per-eur");

  let usedSnapshot = false;
  try {
    const snapResp = await fetch(
      resolveAppUrl(`api/rates_snapshot.php?${requestNonce}`),
      { cache: "no-store" }
    );
    const snap = await snapResp.json().catch(() => null);
    const age = snap && typeof snap.ageSec === "number" ? snap.ageSec : Infinity;
    if (
      snap &&
      snap.ok &&
      snap.complete &&
      age <= RATES_SNAPSHOT_MAX_AGE_SEC &&
      typeof snap.yenPerUsd === "number" &&
      typeof snap.rubPerUsd === "number" &&
      typeof snap.rubPerEur === "number"
    ) {
      if (inputYenPerUsd) inputYenPerUsd.value = String(snap.yenPerUsd);
      if (inputRubPerUsd) inputRubPerUsd.value = String(snap.rubPerUsd);
      if (inputRubPerEur) inputRubPerEur.value = String(snap.rubPerEur);
      let atbHasRubPerYen = false;
      if (
        inputRubPerYen &&
        typeof snap.rubPerYen === "number" &&
        snap.rubPerYen > 0
      ) {
        inputRubPerYen.value = String(snap.rubPerYen);
        atbHasRubPerYen = true;
      }
      const derived = atbHasRubPerYen ? true : deriveRubPerYenIfPossible();
      const snapLabel =
        snap.fetchedAt && String(snap.fetchedAt).trim() !== ""
          ? formatInstantRuWithTimeZone(String(snap.fetchedAt).trim())
          : commonActualLabel;
      setRateDateText("rate-date-common", derived ? snapLabel : "—");
      updateProgressiveSteps();
      usedSnapshot = true;
    }
  } catch {
    /* fallback на живые API */
  }

  if (usedSnapshot) {
    updateRatesUIFromInputs();
    return;
  }

  const tasks = [
    fetch(resolveAppUrl(`api/khan_rates.php${dateSuffix}`), { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => ({ src: "Khan Bank", data }))
      .catch((e) => ({ src: "Khan Bank", error: e })),
    fetch(resolveAppUrl(`api/atb_usd_ulanude.php?${requestNonce}`), { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => ({ src: "АТБ", data }))
      .catch((e) => ({ src: "АТБ", error: e })),
    fetch(resolveAppUrl(`api/cbr_eur.php${dateSuffix}`), { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => ({ src: "ЦБ", data }))
      .catch((e) => ({ src: "ЦБ", error: e })),
  ];

  const results = await Promise.all(tasks);
  let atbHasRubPerYen = false;

  for (const r of results) {
    if (r && r.data && r.data.ok) {
      if (r.src === "Khan Bank" && inputYenPerUsd && typeof r.data.yenPerUsd === "number") {
        inputYenPerUsd.value = String(r.data.yenPerUsd);
      }
      if (r.src === "АТБ" && inputRubPerUsd && typeof r.data.rubPerUsd === "number") {
        inputRubPerUsd.value = String(r.data.rubPerUsd);
        if (inputRubPerYen && typeof r.data.rubPerYen === "number" && r.data.rubPerYen > 0) {
          inputRubPerYen.value = String(r.data.rubPerYen);
          atbHasRubPerYen = true;
        }
      }
      if (r.src === "ЦБ" && inputRubPerEur && typeof r.data.rubPerEur === "number") {
        inputRubPerEur.value = String(r.data.rubPerEur);
      }
    }
  }

  // ₽/¥: приоритетно берём из АТБ; если нет — выводим из ₽/$ и ¥/$.
  const derived = atbHasRubPerYen ? true : deriveRubPerYenIfPossible();
  if (!derived && inputRubPerYen) {
    // оставляем дефолт, но UI обновим
  }

  setRateDateText("rate-date-common", derived ? commonActualLabel : "—");

  updateRatesUIFromInputs();
  updateProgressiveSteps();
  } finally {
    ratesRefreshInFlight = false;
  }
}

function initRatesAuto() {
  refreshRatesAuto({ resetDatePlaceholder: true }).catch(() => {});
  window.setInterval(() => {
    if (document.visibilityState === "hidden") {
      return;
    }
    refreshRatesAuto({ resetDatePlaceholder: false }).catch(() => {});
  }, RATES_POLL_INTERVAL_MS);
}

async function persistCalculationSnapshot(snapshot) {
  latestCalculationSnapshot = snapshot;
  try {
    const resp = await fetch(resolveAppUrl("api/save_calculation.php"), {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(snapshot),
      cache: "no-store",
    });
    const data = await resp.json().catch(() => null);
    if (resp.ok && data && data.ok && Number.isFinite(Number(data.id))) {
      latestCalculationId = Number(data.id);
    }
  } catch {
    /* лог расчёта необязателен, не прерываем UX */
  }
}

function render(data) {
  const snap = computeCalculation(data);
  const o = snap.outputs;

  document.getElementById("out-japan-yen").textContent = formatYen(o.japanYenTotal);
  document.getElementById("out-japan-yen-t").textContent = formatYen(o.japanYenTotal);
  document.getElementById("out-usd-train-yen").textContent = formatYen(o.usdTrainYen);
  document.getElementById("out-usd-track-yen").textContent = formatYen(o.usdTrackYen);
  document.getElementById("out-rub-invoice-train-yen").textContent = formatYen(o.rubInvoiceYenEquivalent);
  document.getElementById("out-rub-invoice-track-yen").textContent = formatYen(o.rubInvoiceYenEquivalent);
  document.getElementById("out-invoice-yen-train").textContent = formatYen(o.invoiceYenTrain);
  document.getElementById("out-invoice-yen-track").textContent = formatYen(o.invoiceYenTrack);
  document.getElementById("out-invoice-rub-train").textContent = formatRub(o.bankTrain.totalRub);
  document.getElementById("out-invoice-rub-track").textContent = formatRub(o.bankTrack.totalRub);
  document.getElementById("out-customs-train").textContent = formatRub(o.customsTrain.totalRub);
  document.getElementById("out-customs-track").textContent = formatRub(o.customsTrack.totalRub);
  document.getElementById("out-lab-train").textContent = formatRub(o.labRub);
  document.getElementById("out-lab-track").textContent = formatRub(o.labRub);
  document.getElementById("out-grand-train").textContent = formatRub(o.grandTotalTrainRub);
  document.getElementById("out-grand-track").textContent = formatRub(o.grandTotalTrackRub);

  persistCalculationSnapshot({ inputs: snap.inputs, outputs: snap.outputs });
  const leadCard = document.getElementById("lead-card");
  if (leadCard) leadCard.classList.remove("lead-card--hidden");
  const leadSummary = document.getElementById("lead-summary");
  if (leadSummary) {
    leadSummary.textContent = `Итог по расчёту: Train ${formatRub(o.grandTotalTrainRub)} · Track ${formatRub(o.grandTotalTrackRub)}.`;
  }
}

function setSelectedAuction(name, fobYen) {
  const nameInput = document.getElementById("auction-name");
  const fobInput = document.getElementById("fob-yen");
  const fobDisplay = document.getElementById("auction-fob-display");
  if (!nameInput || !fobInput || !fobDisplay) return;
  nameInput.value = name;
  fobInput.value = String(fobYen);
  fobDisplay.textContent = `FOB: ${formatInt(fobYen)} ¥`;
}

function mapCatalogEngineTypeToForm(value) {
  const raw = String(value || "").toLowerCase();
  if (raw.includes("hybrid")) return "hybrid";
  if (raw.includes("gasoline")) return "gasoline";
  return "";
}

function mapVehicleAgeByYear(modelYear) {
  const year = Number(modelYear);
  if (!Number.isFinite(year) || year <= 0) return "";
  const nowYear = new Date().getFullYear();
  const age = nowYear - year;
  if (age < 3) return "under3";
  if (age <= 5) return "3to5";
  return "over5";
}

function updateVehiclePresetMeta(text) {
  const meta = document.getElementById("vehicle-preset-meta");
  if (meta) meta.textContent = text;
}

function applyVehiclePresetById(id) {
  const selected = vehicleCatalog.find((item) => String(item.id) === String(id));
  if (!selected) return;

  const vehicleAgeEl = document.getElementById("vehicle-age");
  const engineTypeEl = document.getElementById("engine-type");
  const engineCcEl = document.getElementById("engine-cc");
  const engineHpEl = document.getElementById("engine-hp");

  if (vehicleAgeEl instanceof HTMLSelectElement) {
    const ageCode = mapVehicleAgeByYear(selected.model_year);
    if (ageCode) vehicleAgeEl.value = ageCode;
  }

  if (engineTypeEl instanceof HTMLSelectElement) {
    const mappedType = mapCatalogEngineTypeToForm(selected.engine_type);
    if (mappedType) engineTypeEl.value = mappedType;
  }

  if (engineCcEl instanceof HTMLInputElement) {
    const displacementL = Number(selected.engine_displacement_l);
    if (Number.isFinite(displacementL) && displacementL > 0) {
      engineCcEl.value = String(Math.round(displacementL * 1000));
    }
  }

  if (engineHpEl instanceof HTMLInputElement) {
    const hp = Number(selected.engine_hp);
    if (Number.isFinite(hp) && hp > 0) {
      engineHpEl.value = String(Math.round(hp));
    }
  }

  const make = String(selected.make || "").trim();
  const model = String(selected.model || "").trim();
  const year = Number(selected.model_year);
  const yearLabel = Number.isFinite(year) && year > 0 ? year : "—";
  updateVehiclePresetMeta(`Выбрано: ${make} ${model}, ${yearLabel}. Параметры двигателя и возраст подставлены автоматически.`);
  updateProgressiveSteps();
}

function sortVehicleCatalog(items) {
  return [...items].sort((a, b) => {
    const aName = `${a.make || ""} ${a.model || ""} ${a.model_year || ""}`.toLowerCase();
    const bName = `${b.make || ""} ${b.model || ""} ${b.model_year || ""}`.toLowerCase();
    return aName.localeCompare(bName, "ru");
  });
}

function buildQuickVehicleDatalist(items) {
  const datalist = document.getElementById("vehicle-preset-list");
  if (!(datalist instanceof HTMLDataListElement)) return;
  datalist.innerHTML = "";
  items.forEach((item) => {
    const opt = document.createElement("option");
    const year = Number(item.model_year);
    const yearLabel = Number.isFinite(year) && year > 0 ? year : "—";
    opt.value = `${item.make} ${item.model} ${yearLabel}`;
    opt.dataset.id = String(item.id);
    datalist.appendChild(opt);
  });
}

function getAdvancedFilteredVehicles() {
  const makeValue = String(document.getElementById("vehicle-make-select")?.value || "");
  const modelValue = String(document.getElementById("vehicle-model-select")?.value || "");
  const yearValue = String(document.getElementById("vehicle-year-select")?.value || "");
  return vehicleCatalog.filter((item) => {
    if (makeValue && String(item.make) !== makeValue) return false;
    if (modelValue && String(item.model) !== modelValue) return false;
    if (yearValue && String(item.model_year) !== yearValue) return false;
    return true;
  });
}

function populateAdvancedSelectors(items) {
  const makeSelect = document.getElementById("vehicle-make-select");
  const modelSelect = document.getElementById("vehicle-model-select");
  const yearSelect = document.getElementById("vehicle-year-select");
  if (!(makeSelect instanceof HTMLSelectElement) || !(modelSelect instanceof HTMLSelectElement) || !(yearSelect instanceof HTMLSelectElement)) return;

  const makes = [...new Set(items.map((item) => String(item.make || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
  makeSelect.innerHTML = '<option value="">Все марки</option>';
  makes.forEach((make) => {
    makeSelect.innerHTML += `<option value="${make}">${make}</option>`;
  });

  const resetDependent = () => {
    const currentMake = makeSelect.value;
    const forMake = currentMake ? items.filter((item) => String(item.make) === currentMake) : items;
    const models = [...new Set(forMake.map((item) => String(item.model || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
    const years = [...new Set(forMake.map((item) => String(item.model_year || "")).filter(Boolean))].sort((a, b) => Number(b) - Number(a));

    modelSelect.innerHTML = '<option value="">Все модели</option>';
    models.forEach((model) => {
      modelSelect.innerHTML += `<option value="${model}">${model}</option>`;
    });

    yearSelect.innerHTML = '<option value="">Все годы</option>';
    years.forEach((year) => {
      yearSelect.innerHTML += `<option value="${year}">${year}</option>`;
    });
  };

  resetDependent();
  makeSelect.addEventListener("change", () => {
    resetDependent();
    renderAdvancedVehicleCards(getAdvancedFilteredVehicles());
  });
  modelSelect.addEventListener("change", () => renderAdvancedVehicleCards(getAdvancedFilteredVehicles()));
  yearSelect.addEventListener("change", () => renderAdvancedVehicleCards(getAdvancedFilteredVehicles()));
}

function renderAdvancedVehicleCards(items) {
  const cards = document.getElementById("vehicle-cards");
  if (!(cards instanceof HTMLDivElement)) return;
  cards.innerHTML = "";
  const list = sortVehicleCatalog(items).slice(0, 24);
  if (list.length === 0) {
    cards.innerHTML = '<p class="field__note">По выбранным фильтрам ничего не найдено.</p>';
    return;
  }
  list.forEach((item) => {
    const year = Number(item.model_year);
    const hp = Number(item.engine_hp);
    const title = `${item.make} ${item.model} (${Number.isFinite(year) ? year : "—"})`;
    const fallbackLabel = `${item.make} ${item.model}`.replace(/[&<>"']/g, " ");
    const fallbackSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#1a2740"/>
            <stop offset="100%" stop-color="#0f1728"/>
          </linearGradient>
        </defs>
        <rect width="640" height="360" fill="url(#g)"/>
        <text x="50%" y="45%" fill="#e8ecf4" font-size="28" text-anchor="middle" font-family="Arial, sans-serif">${fallbackLabel}</text>
        <text x="50%" y="58%" fill="#9fb1cc" font-size="18" text-anchor="middle" font-family="Arial, sans-serif">Фото недоступно</text>
      </svg>
    `.trim();
    const fallbackImage = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fallbackSvg)}`;
    const imageUrl =
      typeof item.image_url === "string" && item.image_url.trim() !== ""
        ? item.image_url.trim()
        : fallbackImage;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "vehicle-card";
    card.dataset.id = String(item.id);
    const img = document.createElement("img");
    img.className = "vehicle-card__media";
    img.src = imageUrl;
    img.alt = `${item.make} ${item.model}`;
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.addEventListener("error", () => {
      if (img.src !== fallbackImage) {
        img.src = fallbackImage;
      }
    });

    const body = document.createElement("div");
    body.className = "vehicle-card__body";

    const pTitle = document.createElement("p");
    pTitle.className = "vehicle-card__title";
    pTitle.textContent = title;

    const pMeta = document.createElement("p");
    pMeta.className = "vehicle-card__meta";
    pMeta.textContent = Number.isFinite(hp) && hp > 0 ? `${Math.round(hp)} л.с.` : "мощность не указана";

    body.appendChild(pTitle);
    body.appendChild(pMeta);
    card.appendChild(img);
    card.appendChild(body);
    card.addEventListener("click", () => applyVehiclePresetById(item.id));
    cards.appendChild(card);
  });
}

async function initVehiclePresetPicker() {
  const quickSearch = document.getElementById("vehicle-quick-search");
  const toggleAdvancedBtn = document.getElementById("btn-toggle-advanced-picker");
  const advancedWrap = document.getElementById("vehicle-advanced-picker");
  if (!(quickSearch instanceof HTMLInputElement) || !(toggleAdvancedBtn instanceof HTMLButtonElement) || !(advancedWrap instanceof HTMLDivElement)) return;

  try {
    const resp = await fetch(resolveAppUrl("api/vehicle_images.php"), { cache: "no-store" });
    const payload = await resp.json().catch(() => null);
    const items = payload && payload.ok && Array.isArray(payload.results) ? payload.results : [];
    vehicleCatalog = items;

    if (items.length === 0) {
      quickSearch.placeholder = "Список пока пуст (добавьте авто в БД)";
      updateVehiclePresetMeta("Список авто пуст. Сначала добавьте машины в базу, затем обновите страницу.");
      return;
    }

    buildQuickVehicleDatalist(items);
    populateAdvancedSelectors(items);
    renderAdvancedVehicleCards(items);
    updateVehiclePresetMeta(`Доступно автомобилей: ${items.length}. Выберите вариант для автозаполнения.`);
  } catch {
    quickSearch.placeholder = "Не удалось загрузить список авто";
    updateVehiclePresetMeta("Не удалось загрузить список авто. Проверьте api/vehicle_images.php.");
  }

  quickSearch.addEventListener("change", () => {
    const query = quickSearch.value.trim().toLowerCase();
    if (!query) {
      updateVehiclePresetMeta("Введите марку/модель или откройте расширенный выбор.");
      return;
    }
    const selected = vehicleCatalog.find((item) => {
      const label = `${item.make} ${item.model} ${item.model_year}`.toLowerCase();
      return label === query;
    });
    if (!selected) {
      updateVehiclePresetMeta("Точное совпадение не найдено. Попробуйте выбрать из подсказки или открыть расширенный выбор.");
      return;
    }
    applyVehiclePresetById(selected.id);
  });

  toggleAdvancedBtn.addEventListener("click", () => {
    advancedWrap.classList.toggle("is-hidden");
    toggleAdvancedBtn.textContent = advancedWrap.classList.contains("is-hidden")
      ? "Расширенный выбор"
      : "Скрыть расширенный";
  });
}

function renderAuctionOptions(filterText = "") {
  const list = document.getElementById("auction-list");
  if (!list) return;
  const q = filterText.trim().toLowerCase();
  const filtered = AUCTION_OPTIONS.filter((item) =>
    item.name.toLowerCase().includes(q)
  );

  list.innerHTML = "";
  filtered.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "auction-modal__item";
    btn.dataset.name = item.name;
    btn.dataset.fob = String(item.fobYen);
    btn.innerHTML = `<span>${item.name}</span><span class="auction-modal__fob">${formatInt(item.fobYen)} ¥</span>`;
    list.appendChild(btn);
  });

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "auction-modal__fob";
    empty.textContent = "Ничего не найдено";
    list.appendChild(empty);
  }
}

function initAuctionPicker() {
  const modal = document.getElementById("auction-modal");
  const openBtn = document.getElementById("btn-open-auction-modal");
  const closeBtn = document.getElementById("btn-close-auction-modal");
  const search = document.getElementById("auction-search");
  const list = document.getElementById("auction-list");
  if (!modal || !openBtn || !search || !list) return;

  openBtn.addEventListener("click", () => {
    renderAuctionOptions(search.value);
    openAuctionDialog(modal);
    search.focus();
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      closeAuctionDialog(modal);
    });
  }

  search.addEventListener("input", () => {
    renderAuctionOptions(search.value);
  });

  list.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const btn = target.closest(".auction-modal__item");
    if (!btn) return;
    const name = btn.getAttribute("data-name") || "";
    const fobYen = Number(btn.getAttribute("data-fob"));
    if (!name || !Number.isFinite(fobYen)) return;
    setSelectedAuction(name, fobYen);
    closeAuctionDialog(modal);
    updateProgressiveSteps();
  });
}

function isoDateToRu(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
  if (!m) return "";
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function setKhanYenNote(data) {
  const el = document.getElementById("khan-yen-note");
  if (!el) return;
  if (!data) {
    el.textContent = "Khan Bank: —";
    return;
  }
  const d = data.date || "—";
  const usd = data.usdNonCashSellMnt != null ? data.usdNonCashSellMnt : "—";
  const jpy = data.jpyNonCashBuyMnt != null ? data.jpyNonCashBuyMnt : "—";
  el.textContent = `Khan Bank на ${d}: USD ${usd} ₮ (бэлэн бус зарах), JPY ${jpy} ₮ (бэлэн бус авах) → ¥/$ ${data.yenPerUsd != null ? data.yenPerUsd : "—"}`;
}

function setCbrEurDateLine(data) {
  const el = document.getElementById("cbr-eur-date");
  if (!el) return;
  if (!data) {
    el.textContent = "Официальный курс ЦБ на дату: —";
    return;
  }
  const raw = data.cbrDate ? String(data.cbrDate).trim() : "";
  const fromIso = data.requestedDate ? isoDateToRu(data.requestedDate) : "";
  const label = raw || fromIso || "—";
  el.textContent = `Официальный курс ЦБ на дату: ${label}`;
}

function setLeadStatus(message, kind = "") {
  const el = document.getElementById("lead-status");
  if (!el) return;
  el.textContent = message || "";
  el.classList.remove("lead-form__status--ok", "lead-form__status--error");
  if (kind === "ok") el.classList.add("lead-form__status--ok");
  if (kind === "error") el.classList.add("lead-form__status--error");
}

/**
 * До 11 цифр в формате РФ: код страны 7.
 * 8… → 7…; набор «как с мобильного» (начинается с 9) → автоматически добавляется 7.
 */
function ruPhoneDigits(value) {
  let d = String(value || "").replace(/\D/g, "");
  if (d.startsWith("8")) {
    d = "7" + d.slice(1);
  }
  if (d.length >= 1 && !d.startsWith("7") && d.startsWith("9")) {
    d = "7" + d;
  }
  return d.slice(0, 11);
}

/** Отображение: +7 (XXX) XXX-XX-XX */
function formatRuPhoneDisplay(digits) {
  const d = ruPhoneDigits(digits);
  if (!d) {
    return "";
  }
  if (!d.startsWith("7")) {
    return "+" + d;
  }
  const rest = d.slice(1);
  let out = "+7";
  if (rest.length === 0) {
    return out;
  }
  out += " (";
  out += rest.slice(0, Math.min(3, rest.length));
  if (rest.length >= 3) {
    out += ")";
  }
  if (rest.length > 3) {
    out += " " + rest.slice(3, Math.min(6, rest.length));
  }
  if (rest.length > 6) {
    out += "-" + rest.slice(6, Math.min(8, rest.length));
  }
  if (rest.length > 8) {
    out += "-" + rest.slice(8, 10);
  }
  return out;
}

function isValidRuPhone11(digits) {
  return /^7\d{10}$/.test(digits);
}

function initLeadForm() {
  const form = document.getElementById("lead-form");
  if (!(form instanceof HTMLFormElement)) return;

  const submitBtn = document.getElementById("lead-submit");
  const phoneEl = document.getElementById("lead-phone");
  const consentEl = document.getElementById("lead-consent");
  const nameEl = document.getElementById("lead-name");
  const methodEl = document.getElementById("lead-contact-method");
  const commentEl = document.getElementById("lead-comment");

  if (phoneEl instanceof HTMLInputElement) {
    phoneEl.setAttribute("inputmode", "tel");
    phoneEl.setAttribute("autocomplete", "tel");

    phoneEl.addEventListener("input", () => {
      const formatted = formatRuPhoneDisplay(phoneEl.value);
      if (formatted !== phoneEl.value) {
        phoneEl.value = formatted;
      }
      phoneEl.classList.remove("lead-form__input--invalid");
    });

    phoneEl.addEventListener("blur", () => {
      const d = ruPhoneDigits(phoneEl.value);
      if (d.length > 0 && d.length < 11) {
        phoneEl.classList.add("lead-form__input--invalid");
      }
    });

    phoneEl.addEventListener("focus", () => {
      phoneEl.classList.remove("lead-form__input--invalid");
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!(phoneEl instanceof HTMLInputElement) || !(consentEl instanceof HTMLInputElement)) return;

    const digits = ruPhoneDigits(phoneEl.value);
    const phoneNorm = digits.length === 11 ? "+" + digits : "";

    if (!isValidRuPhone11(digits)) {
      setLeadStatus(
        "Введите российский номер полностью: +7 и 10 цифр (например +7 (900) 123-45-67).",
        "error"
      );
      phoneEl.classList.add("lead-form__input--invalid");
      phoneEl.focus();
      return;
    }
    if (!consentEl.checked) {
      setLeadStatus("Подтвердите согласие на обработку персональных данных.", "error");
      consentEl.focus();
      return;
    }

    const payload = {
      name: nameEl instanceof HTMLInputElement ? String(nameEl.value || "").trim() : "",
      phone: phoneNorm,
      contactMethod: methodEl instanceof HTMLSelectElement ? String(methodEl.value || "phone") : "phone",
      comment: commentEl instanceof HTMLInputElement ? String(commentEl.value || "").trim() : "",
      calculationLogId: latestCalculationId,
      calculationSnapshot: latestCalculationSnapshot,
    };

    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
    setLeadStatus("Отправляем заявку...");
    try {
      const resp = await fetch(resolveAppUrl("api/save_lead.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data || !data.ok) {
        const msg = data && typeof data.error === "string" ? data.error : "Не удалось отправить заявку.";
        setLeadStatus(msg, "error");
        return;
      }
      setLeadStatus("Заявка отправлена. Мы свяжемся с вами в ближайшее время.", "ok");
      form.reset();
      if (phoneEl instanceof HTMLInputElement) {
        phoneEl.classList.remove("lead-form__input--invalid");
      }
    } catch {
      setLeadStatus("Ошибка сети. Попробуйте ещё раз.", "error");
    } finally {
      if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
    }
  });
}

function wireFormListeners() {
  const form = document.getElementById("calc-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      render(readForm());
      const results = document.getElementById("results");
      if (results) results.classList.remove("results--hidden");
    });
    form.addEventListener("input", updateProgressiveSteps);
    form.addEventListener("change", updateProgressiveSteps);
  }
}

(function bootCalculator() {
  try {
    initTheme();
    initAuctionPicker();
    initVehiclePresetPicker().catch(() => {});
    initRatesAuto();
    renderAuctionOptions();
    updateProgressiveSteps();
    updateRatesUIFromInputs();
    initLeadForm();
    wireFormListeners();
  } catch (err) {
    console.error(err);
    const msg =
      err instanceof Error ? err.message : "Неизвестная ошибка";
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<div role="alert" style="margin:0;padding:12px 16px;background:#b91c1c;color:#fff;font:14px/1.4 system-ui,sans-serif;position:relative;z-index:99999;">Ошибка инициализации калькулятора: ${msg.replace(/</g, "&lt;")}. Откройте консоль (F12) или обновите страницу.</div>`
    );
  }
})();
