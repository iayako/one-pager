/**
 * Калькулятор по ТЗ: инвойс ¥/₽, комиссия АТБ, итог с таможней и лабораторией.
 */

import { DEFAULT_CALCULATION_CONFIG, computeCalculation } from "./calc-core.js?v=4";

const THEME_STORAGE_KEY = "calculator-theme";
/** Аукцион → FOB, ¥. Список и стоимости от клиента (сентябрь 2026), сгруппированы по портам. */
const AUCTION_OPTIONS = [
  // Порт Yokohama
  { name: "ARAI ACE", fobYen: 86000, port: "Yokohama" },
  { name: "ARAI BAYSIDE / NODA", fobYen: 70000, port: "Yokohama" },
  { name: "ARAI BAYSIDE UKISHIMA", fobYen: 72000, port: "Yokohama" },
  { name: "ARAI BAYSIDE HOKKAIDO TOMAKOMAI", fobYen: 89000, port: "Yokohama" },
  { name: "ARAI BAYSIDE SENDAI", fobYen: 80000, port: "Yokohama" },
  { name: "ARAI OYAMA VANTORA", fobYen: 76000, port: "Yokohama" },
  { name: "ARAI BAYSIDE SAYAMA", fobYen: 77000, port: "Yokohama" },
  { name: "CAA TOHOKU", fobYen: 93000, port: "Yokohama" },
  { name: "CAA TOKYO", fobYen: 70000, port: "Yokohama" },
  { name: "HERO", fobYen: 76000, port: "Yokohama" },
  { name: "HONDA HOKKAIDO", fobYen: 93000, port: "Yokohama" },
  { name: "HONDA SENDAI", fobYen: 80000, port: "Yokohama" },
  { name: "HONDA TOKYO / MIZUHO / OGAWA", fobYen: 78000, port: "Yokohama" },
  { name: "HONDA TOKYO GOTENBA", fobYen: 80000, port: "Yokohama" },
  { name: "HONDA TOKYO NIIGATA", fobYen: 80000, port: "Yokohama" },
  { name: "HONDA TOKYO SENDAI", fobYen: 81000, port: "Yokohama" },
  { name: "ISUZU TOKYO (MAKUHARI)", fobYen: 80000, port: "Yokohama" },
  { name: "JAA TOKYO", fobYen: 70000, port: "Yokohama" },
  { name: "JU AKITA", fobYen: 89000, port: "Yokohama" },
  { name: "JU AOMORI", fobYen: 103000, port: "Yokohama" },
  { name: "JU CHIBA", fobYen: 71000, port: "Yokohama" },
  { name: "JU CHIBA SODEGAURA", fobYen: 79000, port: "Yokohama" },
  { name: "JU FUKUSHIMA", fobYen: 90000, port: "Yokohama" },
  { name: "JU GUNMA", fobYen: 76000, port: "Yokohama" },
  { name: "JU HOKKAIDO", fobYen: 93000, port: "Yokohama" },
  { name: "JU HOKKAIDO HAKODATE", fobYen: 98000, port: "Yokohama" },
  { name: "JU HOKKAIDO KITAMI", fobYen: 98000, port: "Yokohama" },
  { name: "JU HOKKAIDO KUSHIRO", fobYen: 98000, port: "Yokohama" },
  { name: "JU HOKKAIDO OBIHIRO", fobYen: 103000, port: "Yokohama" },
  { name: "JU HOKKAIDO / ASAHIKAWA", fobYen: 98000, port: "Yokohama" },
  { name: "JU IBARAKI", fobYen: 76000, port: "Yokohama" },
  { name: "JU KANAGAWA", fobYen: 77000, port: "Yokohama" },
  { name: "JU MIYAGI", fobYen: 80000, port: "Yokohama" },
  { name: "JU NAGANO", fobYen: 82000, port: "Yokohama" },
  { name: "JU NIIGATA", fobYen: 80000, port: "Yokohama" },
  { name: "JU SAITAMA", fobYen: 72000, port: "Yokohama" },
  { name: "JU SAPPORO MURORAN TOMAKOMAI", fobYen: 89000, port: "Yokohama" },
  { name: "JU TOCHIGI", fobYen: 80000, port: "Yokohama" },
  { name: "JU TOKYO", fobYen: 70000, port: "Yokohama" },
  { name: "JU TOYAMA", fobYen: 75000, port: "Yokohama" },
  { name: "JU YAMAGATA", fobYen: 86000, port: "Yokohama" },
  { name: "JU YAMANASHI", fobYen: 80000, port: "Yokohama" },
  { name: "LUM HOKKAIDO", fobYen: 89000, port: "Yokohama" },
  { name: "LUM HOKKAIDO TOMAKOMAI", fobYen: 93000, port: "Yokohama" },
  { name: "LUM TOKYO / NODA", fobYen: 81000, port: "Yokohama" },
  { name: "LUM TOKYO CHIBA", fobYen: 81000, port: "Yokohama" },
  { name: "LUM TOKYO CHIGASAKI", fobYen: 81000, port: "Yokohama" },
  { name: "LUM TOKYO NASU", fobYen: 80000, port: "Yokohama" },
  { name: "LUM TOKYO SENDAI", fobYen: 81000, port: "Yokohama" },
  { name: "LUM TOKYO TOCHIGI", fobYen: 77000, port: "Yokohama" },
  { name: "MIRIVE SAITAMA", fobYen: 74000, port: "Yokohama" },
  { name: "NAA TOKYO", fobYen: 70000, port: "Yokohama" },
  { name: "NAA TOKYO MORIOKA", fobYen: 95000, port: "Yokohama" },
  { name: "NAA TOKYO NYUUSATSUKAI", fobYen: 76000, port: "Yokohama" },
  { name: "NAA TOKYO SAKURA", fobYen: 77000, port: "Yokohama" },
  { name: "NAA TOKYO TOHOKU", fobYen: 81000, port: "Yokohama" },
  { name: "NISSAN PLAZASOL GIFU (NPS)", fobYen: 77000, port: "Yokohama" },
  { name: "NISSAN PLAZASOL SENDAI (NPS)", fobYen: 81000, port: "Yokohama" },
  { name: "NISSAN PLAZASOL TOKYO (NPS)", fobYen: 74000, port: "Yokohama" },
  { name: "NISSAN PLAZASOL TOKYO CHIBA (NPS)", fobYen: 74000, port: "Yokohama" },
  { name: "NISSAN PLAZASOL TOKYO OYAMA / TOCHIGI", fobYen: 77000, port: "Yokohama" },
  { name: "NISSAN PLAZASOL TOKYO TOMAKOMAI (NPS)", fobYen: 89000, port: "Yokohama" },
  { name: "ORIX ATSUGI", fobYen: 73000, port: "Yokohama" },
  { name: "ORIX ATSUGI KISARAZU", fobYen: 74000, port: "Yokohama" },
  { name: "ORIX ATSUGI OYAMA", fobYen: 76000, port: "Yokohama" },
  { name: "ORIX ATSUGI TSUCHIURA", fobYen: 74000, port: "Yokohama" },
  { name: "ORIX NAGOYA OYAMA", fobYen: 77000, port: "Yokohama" },
  { name: "ORIX SENDAI", fobYen: 80000, port: "Yokohama" },
  { name: "SAA SAPPORO", fobYen: 93000, port: "Yokohama" },
  { name: "TAA HOKKAIDO", fobYen: 93000, port: "Yokohama" },
  { name: "TAA KANTO", fobYen: 71000, port: "Yokohama" },
  { name: "TAA KANTO HIDAKA", fobYen: 78000, port: "Yokohama" },
  { name: "TAA KANTO KITA KANTO", fobYen: 77000, port: "Yokohama" },
  { name: "TAA KANTO TAMA", fobYen: 78000, port: "Yokohama" },
  { name: "TAA KANTO IBARAKI", fobYen: 77000, port: "Yokohama" },
  { name: "TAA KANTO SAITAMA", fobYen: 75000, port: "Yokohama" },
  { name: "TAA TOHOKU", fobYen: 80000, port: "Yokohama" },
  { name: "TAA TOHOKU SENDAI", fobYen: 81000, port: "Yokohama" },
  { name: "TAA TOHOKU MIYAGI", fobYen: 86000, port: "Yokohama" },
  { name: "TAA YOKOHAMA", fobYen: 70000, port: "Yokohama" },
  { name: "TAA YOKOHAMA ATSUGI", fobYen: 80000, port: "Yokohama" },
  { name: "USS GUNMA", fobYen: 76000, port: "Yokohama" },
  { name: "USS NIIGATA", fobYen: 80000, port: "Yokohama" },
  { name: "USS SAITAMA", fobYen: 74000, port: "Yokohama" },
  { name: "USS SAPPORO", fobYen: 90000, port: "Yokohama" },
  { name: "USS TOHOKU", fobYen: 80000, port: "Yokohama" },
  { name: "USS TOKYO", fobYen: 71000, port: "Yokohama" },
  { name: "USS YOKOHAMA", fobYen: 67000, port: "Yokohama" },
  { name: "YANASE&AUCNET", fobYen: 111000, port: "Yokohama" },
  { name: "ZERO CAR SELECTION CHIBA", fobYen: 77000, port: "Yokohama" },
  { name: "ZERO CAR SELECTION CHIBA (NIIGATA)", fobYen: 86000, port: "Yokohama" },
  { name: "ZERO CAR SELECTION HOKKAIDO", fobYen: 96000, port: "Yokohama" },
  { name: "ZERO CAR SELECTION SENDAI", fobYen: 80000, port: "Yokohama" },
  { name: "ZERO CAR SELECTION SENDAI MORIOKA", fobYen: 93000, port: "Yokohama" },
  { name: "ZERO CAR SELECTION SENDAI NIIGATA", fobYen: 80000, port: "Yokohama" },
  { name: "ZERO CAR SELECTION SHONAN", fobYen: 75000, port: "Yokohama" },
  { name: "ZIP TOKYO", fobYen: 73000, port: "Yokohama" },
  // Порт Osaka
  { name: "ARAI BAYSIDE KANSAI", fobYen: 81500, port: "Osaka" },
  { name: "BAY AUC", fobYen: 81000, port: "Osaka" },
  { name: "HAA KOBE", fobYen: 78000, port: "Osaka" },
  { name: "HAA KOBE USS SHIKOKU", fobYen: 102000, port: "Osaka" },
  { name: "HONDA KANSAI", fobYen: 78000, port: "Osaka" },
  { name: "IAA OSAKA", fobYen: 81000, port: "Osaka" },
  { name: "ISUZU KOBE", fobYen: 78000, port: "Osaka" },
  { name: "JU HIROSHIMA", fobYen: 95000, port: "Osaka" },
  { name: "JU MIE", fobYen: 80000, port: "Osaka" },
  { name: "JU NARA", fobYen: 86000, port: "Osaka" },
  { name: "JU SHIMANE", fobYen: 104000, port: "Osaka" },
  { name: "KCAA KYOTO", fobYen: 87000, port: "Osaka" },
  { name: "LAA OKAYAMA", fobYen: 88000, port: "Osaka" },
  { name: "LAA OKAYAMA TOTTORI", fobYen: 105000, port: "Osaka" },
  { name: "LAA SHIKOKU", fobYen: 102000, port: "Osaka" },
  { name: "LUM KOBE", fobYen: 78000, port: "Osaka" },
  { name: "LUM KOBE HIROSHIMA", fobYen: 94000, port: "Osaka" },
  { name: "MIRIVE OSAKA (HANATEN OSAKA)", fobYen: 81000, port: "Osaka" },
  { name: "NAA HIROSHIMA", fobYen: 95000, port: "Osaka" },
  { name: "NAA OSAKA", fobYen: 81500, port: "Osaka" },
  { name: "NISSAN PLAZASOL OSAKA (NPS)", fobYen: 81500, port: "Osaka" },
  { name: "NOAA", fobYen: 81500, port: "Osaka" },
  { name: "ORIX KOBE", fobYen: 78000, port: "Osaka" },
  { name: "TAA HIROSHIMA", fobYen: 93000, port: "Osaka" },
  { name: "TAA HYOUGO (LAA KANSAI)", fobYen: 78000, port: "Osaka" },
  { name: "TAA KINKI", fobYen: 81000, port: "Osaka" },
  { name: "TAA KINKI KYOTO", fobYen: 87000, port: "Osaka" },
  { name: "TAA KINKI SHIGA", fobYen: 88500, port: "Osaka" },
  { name: "TAA SHIKOKU", fobYen: 104000, port: "Osaka" },
  { name: "TAA SHIKOKU EHIME", fobYen: 95000, port: "Osaka" },
  { name: "USS KOBE", fobYen: 78000, port: "Osaka" },
  { name: "USS OKAYAMA", fobYen: 87000, port: "Osaka" },
  { name: "USS OKAYAMA SHIKOKU", fobYen: 104000, port: "Osaka" },
  { name: "USS OSAKA", fobYen: 81000, port: "Osaka" },
  { name: "ZERO CAR SELECTION OSAKA", fobYen: 81500, port: "Osaka" },
  { name: "ZERO CAR SELECTION OSAKA HIROSHIMA", fobYen: 85000, port: "Osaka" },
  { name: "ZIP OSAKA", fobYen: 78000, port: "Osaka" },
  // Порт Nagoya
  { name: "CAA CHUBU", fobYen: 70000, port: "Nagoya" },
  { name: "CAA GIFU", fobYen: 70000, port: "Nagoya" },
  { name: "HONDA NAGOYA", fobYen: 71000, port: "Nagoya" },
  { name: "JU AICHI", fobYen: 70000, port: "Nagoya" },
  { name: "JU FUKUI", fobYen: 77000, port: "Nagoya" },
  { name: "JU GIFU", fobYen: 70000, port: "Nagoya" },
  { name: "JU GIFU (TAKAYAMA)", fobYen: 70000, port: "Nagoya" },
  { name: "JU ISHIKAWA", fobYen: 74000, port: "Nagoya" },
  { name: "JU SHIZUOKA", fobYen: 75000, port: "Nagoya" },
  { name: "LUM NAGOYA", fobYen: 73000, port: "Nagoya" },
  { name: "LUM NAGOYA KANAZAWA", fobYen: 75000, port: "Nagoya" },
  { name: "LUM NAGOYA OOGAKI", fobYen: 75000, port: "Nagoya" },
  { name: "MIRIVE AICHI", fobYen: 74000, port: "Nagoya" },
  { name: "NAA NAGOYA", fobYen: 71000, port: "Nagoya" },
  { name: "NAA NAGOYA NYUUSATSUKAI", fobYen: 74000, port: "Nagoya" },
  { name: "ORIX KOBE NAGOYA", fobYen: 73000, port: "Nagoya" },
  { name: "ORIX NAGOYA", fobYen: 70000, port: "Nagoya" },
  { name: "SAA HAMAMATSU", fobYen: 75000, port: "Nagoya" },
  { name: "TAA CHUBU", fobYen: 71000, port: "Nagoya" },
  { name: "TAA CHUBU AICHI", fobYen: 78000, port: "Nagoya" },
  { name: "TAA CHUBU HOKURIKU", fobYen: 77000, port: "Nagoya" },
  { name: "TAA CHUBU SHIZUOKA", fobYen: 77000, port: "Nagoya" },
  { name: "USS HOKURIKU", fobYen: 74000, port: "Nagoya" },
  { name: "USS NAGOYA", fobYen: 70000, port: "Nagoya" },
  { name: "USS R NAGOYA", fobYen: 70000, port: "Nagoya" },
  { name: "USS SHIZUOKA", fobYen: 77000, port: "Nagoya" },
  { name: "ZERO CAR SELECTION CHUBU", fobYen: 76000, port: "Nagoya" },
  // Порт Hakata
  { name: "ARAI BAYSIDE OKINAWA", fobYen: 98000, port: "Hakata" },
  { name: "HONDA KYUSHU", fobYen: 71000, port: "Hakata" },
  { name: "ISUZU KYUSHU", fobYen: 83000, port: "Hakata" },
  { name: "JU FUKUOKA", fobYen: 73000, port: "Hakata" },
  { name: "JU FUKUOKA KAGOSHIMA", fobYen: 83000, port: "Hakata" },
  { name: "JU KUMAMOTO", fobYen: 73000, port: "Hakata" },
  { name: "JU MIYAZAKI", fobYen: 83000, port: "Hakata" },
  { name: "JU NAGASAKI", fobYen: 87000, port: "Hakata" },
  { name: "JU OITA", fobYen: 80000, port: "Hakata" },
  { name: "JU OKINAWA", fobYen: 98000, port: "Hakata" },
  { name: "JU YAMAGUCHI", fobYen: 77000, port: "Hakata" },
  { name: "KCAA FUKUOKA", fobYen: 71000, port: "Hakata" },
  { name: "KCAA MINAMIKYUSHU", fobYen: 80000, port: "Hakata" },
  { name: "KCAA YAMAGUCHI", fobYen: 77000, port: "Hakata" },
  { name: "LUM FUKUOKA / KITAKYUSHU", fobYen: 74000, port: "Hakata" },
  { name: "LUM FUKUOKA OKINAWA", fobYen: 98000, port: "Hakata" },
  { name: "NAA FUKUOKA", fobYen: 73000, port: "Hakata" },
  { name: "NISSAN PLAZASOL FUKUOKA (NPS)", fobYen: 70000, port: "Hakata" },
  { name: "ORIX FUKUOKA", fobYen: 73000, port: "Hakata" },
  { name: "ORIX FUKUOKA OKINAWA", fobYen: 98000, port: "Hakata" },
  { name: "TAA KYUSHU", fobYen: 70000, port: "Hakata" },
  { name: "TAA MINAMIKYUSHU", fobYen: 80000, port: "Hakata" },
  { name: "TAA MINAMIKYUSHU KAGOSHIMA", fobYen: 85000, port: "Hakata" },
  { name: "USS FUKUOKA", fobYen: 73000, port: "Hakata" },
  { name: "USS FUKUOKA KAGOSHIMA", fobYen: 80000, port: "Hakata" },
  { name: "USS KYUSHU", fobYen: 71000, port: "Hakata" },
  { name: "USS KYUSHU KAGOSHIMA", fobYen: 78000, port: "Hakata" },
  { name: "ZERO CAR SELECTION HAKATA", fobYen: 74000, port: "Hakata" },
  { name: "ZERO CAR SELECTION HAKATA KAGOSHIMA", fobYen: 80000, port: "Hakata" },
  { name: "ZERO CAR SELECTION HAKATA KUMAMOTO", fobYen: 73000, port: "Hakata" },
  { name: "ZERO CAR SELECTION OSAKA TOKUSHIMA", fobYen: 86000, port: "Hakata" },
  // Прочее (Satelite)
  { name: "LUM TOKYO OKINAWA", fobYen: 98000, port: "Satelite" },
  { name: "TAA YOKOHAMA OKINAWA", fobYen: 98000, port: "Satelite" },
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
let currentCalculationConfig = DEFAULT_CALCULATION_CONFIG;

function formatYen(n) {
  return `${formatInt(n)} ¥`;
}

function formatMnt(n) {
  return `${formatInt(n)} ₮`;
}

function formatRub(n) {
  return `${formatInt(n)} ₽`;
}

function formatInt(n) {
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString("ru-RU");
}

function parseFormNumber(value) {
  const normalized = String(value ?? "")
    .replace(/[\s\u00a0\u202f]+/g, "")
    .replace(",", ".");
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : NaN;
}

function formatIntegerInputValue(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits === "") return "";
  return Number(digits).toLocaleString("ru-RU", { maximumFractionDigits: 0 });
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
    yenPerUsd: parseFormNumber(fd.get("yenPerUsd")),
    rubPerUsd: parseFormNumber(fd.get("rubPerUsd")),
    rubPerYen: parseFormNumber(fd.get("rubPerYen")),
    rubPerEur: parseFormNumber(fd.get("rubPerEur")),
    usdMnt: parseFormNumber(fd.get("usdMnt")),
    jpyMnt: parseFormNumber(fd.get("jpyMnt")),
    mntPerRub: parseFormNumber(fd.get("mntPerRub")),
    vehicleAge: String(fd.get("vehicleAge") || ""),
    engineType: String(fd.get("engineType") || ""),
    auctionName: String(fd.get("auctionName") || ""),
    engineDisplacementCc: parseFormNumber(fd.get("engineDisplacementCc")),
    enginePowerHp: parseFormNumber(fd.get("enginePowerHp")),
    auctionYen: parseFormNumber(fd.get("auctionYen")),
    fobYen: parseFormNumber(fd.get("fobYen")),
    vanningYen: parseFormNumber(fd.get("vanningYen")),
    usdTrain: parseFormNumber(fd.get("usdTrain")),
    usdTrack: parseFormNumber(fd.get("usdTrack")),
    rubInInvoice: parseFormNumber(fd.get("rubInInvoice")),
    labRub: parseFormNumber(fd.get("labRub")),
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

function numericConfigVariable(config, key) {
  const vars = config && typeof config === "object" ? config.variables : null;
  const item = vars && typeof vars === "object" ? vars[key] : null;
  const raw = item && typeof item === "object" && "value" in item ? item.value : item;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function setHiddenValue(id, value) {
  const el = document.getElementById(id);
  if (el instanceof HTMLInputElement && value !== null && value !== undefined && Number.isFinite(Number(value))) {
    el.value = String(value);
  }
}

function applyCalculationConfig(config) {
  currentCalculationConfig = config && typeof config === "object" ? config : DEFAULT_CALCULATION_CONFIG;
  setHiddenValue("vanning-yen", numericConfigVariable(currentCalculationConfig, "vanningYen"));
  setHiddenValue("rub-in-invoice", numericConfigVariable(currentCalculationConfig, "rubInInvoice"));
  setHiddenValue("lab-rub", numericConfigVariable(currentCalculationConfig, "labRub"));
  setHiddenValue("mnt-per-rub", numericConfigVariable(currentCalculationConfig, "mntPerRub"));
  applyResultRowLabels(currentCalculationConfig);
  updateRatesUIFromInputs();
  updateProgressiveSteps();
}

function applyResultRowLabels(config) {
  const rows = config && typeof config === "object" && config.resultRows ? config.resultRows : {};
  const map = {
    japanMntTotal: ["out-japan-yen", "out-japan-yen-t"],
    deliveryMnt: ["out-usd-train-yen", "out-usd-track-yen"],
    rubInvoiceMntEquivalent: ["out-rub-invoice-train-yen", "out-rub-invoice-track-yen"],
    invoiceMnt: ["out-invoice-yen-train", "out-invoice-yen-track"],
    invoiceRub: ["out-invoice-rub-train", "out-invoice-rub-track"],
    customs: ["out-customs-train", "out-customs-track"],
    lab: ["out-lab-train", "out-lab-track"],
    grandTotal: ["out-grand-train", "out-grand-track"],
  };
  Object.entries(map).forEach(([key, valueIds]) => {
    const item = rows[key];
    if (!item || typeof item !== "object") return;
    const label = String(item.label || "").trim();
    const description = String(item.description || "").trim();
    valueIds.forEach((id) => {
      const dd = document.getElementById(id);
      const row = dd?.closest(".result-row");
      const dt = row?.querySelector("dt");
      if (!dt || !label) return;
      dt.textContent = label;
      if (description) {
        const note = document.createElement("span");
        note.className = "result-row__note";
        note.textContent = description;
        dt.appendChild(note);
      }
    });
  });
}

async function loadCalculationConfig() {
  const resp = await fetch(resolveAppUrl(`api/calculation_config.php?ts=${Date.now()}`), {
    cache: "no-store",
  });
  const data = await resp.json().catch(() => null);
  if (!resp.ok || !data || !data.ok || !data.config) {
    throw new Error(data && typeof data.error === "string" ? data.error : "Не удалось загрузить схему расчёта");
  }
  applyCalculationConfig(data.config);
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

function formatRate(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return "—";
  return v.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
  const usdMnt = Number(document.getElementById("usd-mnt")?.value);
  const jpyMntRaw = Number(document.getElementById("jpy-mnt")?.value);
  const mntPerRub = Number(document.getElementById("mnt-per-rub")?.value);
  const risk = numericConfigVariable(currentCalculationConfig, "jpyMntRiskMarkup") || 0;
  const jpyMnt = Number.isFinite(jpyMntRaw) && jpyMntRaw > 0 ? jpyMntRaw + risk : NaN;

  setRateText("rate-yen-per-usd", formatRate(jpyMnt));
  setRateText("rate-rub-per-usd", formatRate(usdMnt));
  setRateText("rate-rub-per-yen", formatRate(mntPerRub));
  setRateText("rate-rub-per-eur", formatRate(rubPerEur));
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
  const usdMntEl = document.getElementById("usd-mnt");
  const jpyMntEl = document.getElementById("jpy-mnt");
  const mntPerRubEl = document.getElementById("mnt-per-rub");
  if (!yenPerUsdEl || !rubPerUsdEl || !rubPerYenEl) return false;
  const usdMnt = Number(usdMntEl?.value);
  const jpyMntBase = Number(jpyMntEl?.value);
  const mntPerRub = Number(mntPerRubEl?.value);
  const risk = numericConfigVariable(currentCalculationConfig, "jpyMntRiskMarkup") || 0;
  if (
    Number.isFinite(usdMnt) &&
    usdMnt > 0 &&
    Number.isFinite(jpyMntBase) &&
    jpyMntBase > 0 &&
    Number.isFinite(mntPerRub) &&
    mntPerRub > 0
  ) {
    const jpyMnt = jpyMntBase + risk;
    yenPerUsdEl.value = String(usdMnt / jpyMnt);
    rubPerUsdEl.value = String(usdMnt / mntPerRub);
    rubPerYenEl.value = String(jpyMnt / mntPerRub);
    return true;
  }
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
  const inputUsdMnt = document.getElementById("usd-mnt");
  const inputJpyMnt = document.getElementById("jpy-mnt");

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
      typeof snap.usdMnt === "number" &&
      typeof snap.jpyMnt === "number" &&
      typeof snap.rubPerEur === "number"
    ) {
      if (inputUsdMnt) inputUsdMnt.value = String(snap.usdMnt);
      if (inputJpyMnt) inputJpyMnt.value = String(snap.jpyMnt);
      if (inputYenPerUsd && typeof snap.yenPerUsd === "number") inputYenPerUsd.value = String(snap.yenPerUsd);
      if (inputRubPerUsd && typeof snap.rubPerUsd === "number") inputRubPerUsd.value = String(snap.rubPerUsd);
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
      const derived = deriveRubPerYenIfPossible() || atbHasRubPerYen;
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
      if (r.src === "Khan Bank" && inputUsdMnt && typeof r.data.usdMnt === "number") {
        inputUsdMnt.value = String(r.data.usdMnt);
      }
      if (r.src === "Khan Bank" && inputJpyMnt && typeof r.data.jpyMnt === "number") {
        inputJpyMnt.value = String(r.data.jpyMnt);
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
  const derived = deriveRubPerYenIfPossible() || atbHasRubPerYen;
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
  const snap = computeCalculation(data, currentCalculationConfig);
  const o = snap.outputs;

  document.getElementById("out-japan-yen").textContent = formatMnt(o.japanMntTotal);
  document.getElementById("out-japan-yen-t").textContent = formatMnt(o.japanMntTotal);
  document.getElementById("out-usd-train-yen").textContent = formatMnt(o.trainDeliveryMnt);
  document.getElementById("out-usd-track-yen").textContent = formatMnt(o.trackDeliveryMnt);
  document.getElementById("out-rub-invoice-train-yen").textContent = formatMnt(o.rubInvoiceMntEquivalent);
  document.getElementById("out-rub-invoice-track-yen").textContent = formatMnt(o.rubInvoiceMntEquivalent);
  document.getElementById("out-invoice-yen-train").textContent = formatMnt(o.payableMntTrain);
  document.getElementById("out-invoice-yen-track").textContent = formatMnt(o.payableMntTrack);
  document.getElementById("out-invoice-rub-train").textContent = formatRub(o.bankTrain.totalRub);
  document.getElementById("out-invoice-rub-track").textContent = formatRub(o.bankTrack.totalRub);
  document.getElementById("out-customs-train").textContent = formatRub(o.customsTrain.totalRub);
  document.getElementById("out-customs-track").textContent = formatRub(o.customsTrack.totalRub);
  document.getElementById("out-lab-train").textContent = formatRub(o.labRub);
  document.getElementById("out-lab-track").textContent = formatRub(o.labRub);
  document.getElementById("out-grand-train").textContent = formatRub(o.grandTotalTrainRub);
  document.getElementById("out-grand-track").textContent = formatRub(o.grandTotalTrackRub);

  persistCalculationSnapshot({ config: snap.config, inputs: snap.inputs, outputs: snap.outputs });
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
  const auctionInput = document.getElementById("auction-name");
  const closeBtn = document.getElementById("btn-close-auction-modal");
  const search = document.getElementById("auction-search");
  const list = document.getElementById("auction-list");
  if (!modal || !auctionInput || !search || !list) return;

  const openPicker = () => {
    renderAuctionOptions(search.value);
    auctionInput.setAttribute("aria-expanded", "true");
    openAuctionDialog(modal);
    search.focus();
  };

  const closePicker = () => {
    auctionInput.setAttribute("aria-expanded", "false");
    closeAuctionDialog(modal);
  };

  auctionInput.addEventListener("click", openPicker);
  auctionInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openPicker();
  });
  modal.addEventListener("close", () => {
    auctionInput.setAttribute("aria-expanded", "false");
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      closePicker();
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
    closePicker();
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
  const jpy = data.jpyNonCashSellMnt != null ? data.jpyNonCashSellMnt : "—";
  const risk = numericConfigVariable(currentCalculationConfig, "jpyMntRiskMarkup") || 0;
  const jpyWithRisk = Number(data.jpyMnt);
  const jpyLabel = Number.isFinite(jpyWithRisk) ? formatRate(jpyWithRisk + risk) : "—";
  el.textContent = `Khan Bank на ${d}: USD ${usd} ₮, JPY ${jpy} ₮ + риск ${risk} = ${jpyLabel} ₮/¥`;
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

function initAuctionPriceFormatting() {
  const input = document.getElementById("auction-yen");
  if (!(input instanceof HTMLInputElement)) return;

  input.addEventListener("input", () => {
    const formatted = formatIntegerInputValue(input.value);
    if (formatted !== input.value) {
      input.value = formatted;
    }
  });

  input.addEventListener("blur", () => {
    input.value = formatIntegerInputValue(input.value);
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

(async function bootCalculator() {
  try {
    initTheme();
    await loadCalculationConfig();
    initAuctionPicker();
    initRatesAuto();
    renderAuctionOptions();
    updateProgressiveSteps();
    updateRatesUIFromInputs();
    initAuctionPriceFormatting();
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
