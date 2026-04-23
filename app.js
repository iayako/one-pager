/**
 * Калькулятор по ТЗ: инвойс ¥/₽, комиссия АТБ, итог с таможней и лабораторией.
 */

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

/** Доп. комиссия аукциона от цены авто (¥), таблица из ТЗ */
function auctionCommissionYen(auctionPrice) {
  const p = Number(auctionPrice);
  if (!Number.isFinite(p) || p <= 0) return 0;
  if (p <= 500_000) return 0;
  if (p <= 1_000_000) return 10_000;
  if (p <= 1_500_000) return 20_000;
  if (p <= 2_000_000) return 40_000;
  if (p <= 2_500_000) return 60_000;
  if (p <= 3_000_000) return 80_000;
  if (p <= 3_500_000) return 100_000;
  if (p <= 4_000_000) return 120_000;
  if (p <= 4_500_000) return 140_000;
  if (p <= 5_000_000) return 160_000;
  return Math.round(p * 0.05);
}

/** ₽ в инвойсе → ¥ через $: (₽ / ₽/$) * ¥/$ */
function rubInvoiceToYen(rubAmount, rubPerUsd, yenPerUsd) {
  const r = Number(rubAmount);
  const rusd = Number(rubPerUsd);
  const yusd = Number(yenPerUsd);
  if (!Number.isFinite(r) || r <= 0) return 0;
  if (!Number.isFinite(rusd) || rusd <= 0) return 0;
  if (!Number.isFinite(yusd) || yusd <= 0) return 0;
  return Math.round((r / rusd) * yusd);
}

/**
 * Оплата в банк по инвойсу: сумма в ₽ по курсу ¥ + комиссия 1,5%, мин. 10 000 ₽
 * @returns {{ baseRub: number, feeRub: number, totalRub: number }}
 */
function invoiceRubWithBankFee(invoiceYen, rubPerYen) {
  const y = Number(invoiceYen);
  const rate = Number(rubPerYen);
  if (!Number.isFinite(y) || y <= 0) return { baseRub: 0, feeRub: 0, totalRub: 0 };
  if (!Number.isFinite(rate) || rate <= 0) return { baseRub: 0, feeRub: 0, totalRub: 0 };
  const baseRub = Math.round(y * rate);
  let feeRub = Math.floor(baseRub * 0.015 + 1e-9);
  if (feeRub < 10_000) feeRub = 10_000;
  return { baseRub, feeRub, totalRub: baseRub + feeRub };
}

/** Таможенная стоимость в ₽: инвойс ¥ × курс ₽/¥ (АТБ), по ТЗ */
function customsValueRubFromInvoice(invoiceYen, rubPerYen) {
  const y = Number(invoiceYen);
  const r = Number(rubPerYen);
  if (!Number.isFinite(y) || y <= 0) return 0;
  if (!Number.isFinite(r) || r <= 0) return 0;
  return Math.round(y * r);
}

/**
 * Таможенный сбор за оформление (постановление, диапазоны по таможенной стоимости в ₽).
 * Тексты ставок — из ТЗ (пример: 1 280 511 ₽ → 13 541 ₽).
 */
function customsClearanceFeeRub(customsValueRub) {
  const v = Number(customsValueRub);
  if (!Number.isFinite(v) || v <= 0) return 0;
  if (v <= 200_000) return 1231;
  if (v <= 450_000) return 2462;
  if (v <= 1_200_000) return 4924;
  if (v <= 2_700_000) return 13541;
  if (v <= 4_200_000) return 18465;
  if (v <= 5_500_000) return 21344;
  if (v <= 10_000_000) return 49240;
  return 73860;
}

/**
 * Пошлина: авто до 3 лет — % от стоимости в € и минимум €/см³ (ТЗ).
 * Стоимость в € = таможенная стоимость ₽ / курс € ЦБ.
 */
function importDutyUnder3Rub(customsValueRub, rubPerEur, engineCc) {
  const rub = Number(customsValueRub);
  const eurRate = Number(rubPerEur);
  const cc = Number(engineCc);
  if (!Number.isFinite(rub) || rub <= 0) return 0;
  if (!Number.isFinite(eurRate) || eurRate <= 0) return 0;
  if (!Number.isFinite(cc) || cc <= 0) return 0;
  const priceEur = rub / eurRate;
  let percent;
  let minEurPerCc;
  if (priceEur <= 8500) {
    percent = 0.54;
    minEurPerCc = 2.5;
  } else if (priceEur <= 16700) {
    percent = 0.48;
    minEurPerCc = 3.5;
  } else if (priceEur <= 42300) {
    percent = 0.48;
    minEurPerCc = 5.5;
  } else if (priceEur <= 84500) {
    percent = 0.48;
    minEurPerCc = 7.5;
  } else if (priceEur <= 169000) {
    percent = 0.48;
    minEurPerCc = 15;
  } else {
    percent = 0.48;
    minEurPerCc = 20;
  }
  const dutyEur = Math.max(percent * priceEur, minEurPerCc * cc);
  return Math.round(dutyEur * eurRate);
}

/** € за 1 см³ для авто 3–5 лет (ТЗ) */
function dutyEurPerCc35(engineCc) {
  const cc = Number(engineCc);
  if (!Number.isFinite(cc) || cc <= 0) return 0;
  if (cc <= 1000) return 1.5;
  if (cc <= 1500) return 1.7;
  if (cc <= 1800) return 2.5;
  if (cc <= 2300) return 2.7;
  if (cc <= 3000) return 3;
  return 3.6;
}

/** € за 1 см³ для авто старше 5 лет (ТЗ) */
function dutyEurPerCcOver5(engineCc) {
  const cc = Number(engineCc);
  if (!Number.isFinite(cc) || cc <= 0) return 0;
  if (cc <= 1000) return 3;
  if (cc <= 1500) return 3.2;
  if (cc <= 1800) return 3.5;
  if (cc <= 2300) return 4.8;
  if (cc <= 3000) return 5;
  return 5.7;
}

function importDutyAgeRub(vehicleAge, customsValueRub, rubPerEur, engineCc) {
  if (vehicleAge === "under3") {
    return importDutyUnder3Rub(customsValueRub, rubPerEur, engineCc);
  }
  const eurRate = Number(rubPerEur);
  const cc = Number(engineCc);
  if (!Number.isFinite(eurRate) || eurRate <= 0) return 0;
  if (!Number.isFinite(cc) || cc <= 0) return 0;
  let eurPerCc = 0;
  if (vehicleAge === "3to5") eurPerCc = dutyEurPerCc35(cc);
  else if (vehicleAge === "over5") eurPerCc = dutyEurPerCcOver5(cc);
  else return 0;
  return Math.round(cc * eurPerCc * eurRate);
}

/**
 * Утилизационный сбор (ТЗ: пример 20 000 × 0,26 при мощности до 160 л.с.).
 * Мощность вводится в **л.с.** (как в ТЗ).
 * Для физлиц: младше 3 лет — коэфф. 0,17; от 3 лет — 0,26 (практика льготы для импорта).
 * Свыше 160 л.с. — оценка по нарастающей шкале (уточняйте у брокера).
 */
function recyclingFeeRub(vehicleAge, engineHp) {
  const hp = Number(engineHp);
  if (!Number.isFinite(hp) || hp <= 0) return 0;
  const coefUnder160 = vehicleAge === "under3" ? 0.17 : 0.26;
  if (hp <= 160) return Math.round(20000 * coefUnder160);
  const over = hp - 160;
  return Math.round(20000 * coefUnder160 * (1 + (over / 160) ** 2 * 12));
}

/**
 * Таможенный платёж, пошлина и утилизационный сбор — разбивка и итог, ₽ — по ТЗ.
 * Зависит от инвойса ¥ (Train/Track дают разную таможенную стоимость и сбор за оформление).
 */
function customsBlockBreakdown(data, invoiceYen) {
  const cv = customsValueRubFromInvoice(invoiceYen, data.rubPerYen);
  const fee = customsClearanceFeeRub(cv);
  const duty = importDutyAgeRub(
    data.vehicleAge,
    cv,
    data.rubPerEur,
    data.engineDisplacementCc
  );
  const recycling = recyclingFeeRub(data.vehicleAge, data.enginePowerHp);
  return {
    customsValueRub: cv,
    clearanceFeeRub: fee,
    importDutyRub: duty,
    recyclingFeeRub: recycling,
    totalRub: fee + duty + recycling,
  };
}

function customsBlockTotalRub(data, invoiceYen) {
  return customsBlockBreakdown(data, invoiceYen).totalRub;
}

function japanYenTotal(auctionYen, fobYen, vanningYen, commissionYen) {
  return (
    Number(auctionYen) +
    Number(fobYen) +
    Number(vanningYen) +
    Number(commissionYen)
  );
}

function usdToYen(usd, yenPerUsd) {
  const u = Number(usd);
  const y = Number(yenPerUsd);
  if (!Number.isFinite(u) || u < 0) return 0;
  if (!Number.isFinite(y) || y <= 0) return 0;
  return Math.round(u * y);
}

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

function setRateDateText(id, dateLabel) {
  const el = document.getElementById(id);
  if (el) el.textContent = `Актуален на: ${dateLabel || "—"}`;
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

async function initRatesAuto() {
  const now = new Date();
  const nowDate = formatLocalDate(now) || "—";
  setRateDateText("rate-date-rub-per-usd", "—");
  setRateDateText("rate-date-yen-per-usd", "—");
  setRateDateText("rate-date-rub-per-yen", "—");
  setRateDateText("rate-date-rub-per-eur", "—");

  const inputYenPerUsd = document.getElementById("yen-per-usd");
  const inputRubPerUsd = document.getElementById("rub-per-usd");
  const inputRubPerYen = document.getElementById("rub-per-yen");
  const inputRubPerEur = document.getElementById("rub-per-eur");

  const tasks = [
    fetch(resolveAppUrl("api/khan_rates.php"), { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => ({ src: "Khan Bank", data }))
      .catch((e) => ({ src: "Khan Bank", error: e })),
    fetch(resolveAppUrl("api/atb_usd_ulanude.php"), { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => ({ src: "АТБ", data }))
      .catch((e) => ({ src: "АТБ", error: e })),
    fetch(resolveAppUrl("api/cbr_eur.php"), { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => ({ src: "ЦБ", data }))
      .catch((e) => ({ src: "ЦБ", error: e })),
  ];

  const results = await Promise.all(tasks);
  let khanDateLabel = "";
  let atbDateLabel = "";
  let cbrDateLabel = "";
  let atbHasRubPerYen = false;

  for (const r of results) {
    if (r && r.data && r.data.ok) {
      if (r.src === "Khan Bank" && inputYenPerUsd && typeof r.data.yenPerUsd === "number") {
        inputYenPerUsd.value = String(r.data.yenPerUsd);
        const khanDateRu = r.data.date ? isoDateToRu(r.data.date) : "";
        if (khanDateRu) {
          khanDateLabel = khanDateRu;
        }
      }
      if (r.src === "АТБ" && inputRubPerUsd && typeof r.data.rubPerUsd === "number") {
        inputRubPerUsd.value = String(r.data.rubPerUsd);
        if (inputRubPerYen && typeof r.data.rubPerYen === "number" && r.data.rubPerYen > 0) {
          inputRubPerYen.value = String(r.data.rubPerYen);
          atbHasRubPerYen = true;
        }
        const asOf = String(r.data.asOfText || "").trim();
        atbDateLabel = asOf || nowDate;
      }
      if (r.src === "ЦБ" && inputRubPerEur && typeof r.data.rubPerEur === "number") {
        inputRubPerEur.value = String(r.data.rubPerEur);
        const cbrDateRu = r.data.requestedDate ? isoDateToRu(r.data.requestedDate) : "";
        if (cbrDateRu) {
          cbrDateLabel = cbrDateRu;
        }
      }
    }
  }

  // ₽/¥: приоритетно берём из АТБ; если нет — выводим из ₽/$ и ¥/$.
  const derived = atbHasRubPerYen ? true : deriveRubPerYenIfPossible();
  if (!derived && inputRubPerYen) {
    // оставляем дефолт, но UI обновим
  }

  setRateDateText("rate-date-yen-per-usd", khanDateLabel || "—");
  setRateDateText("rate-date-rub-per-usd", atbDateLabel || "—");
  setRateDateText("rate-date-rub-per-eur", cbrDateLabel || "—");
  setRateDateText(
    "rate-date-rub-per-yen",
    derived ? (atbHasRubPerYen ? (atbDateLabel || nowDate) : (khanDateLabel || atbDateLabel || nowDate)) : "—"
  );

  updateRatesUIFromInputs();
  updateProgressiveSteps();
}

function computeCalculation(data) {
  const commission = auctionCommissionYen(data.auctionYen);
  const japan = japanYenTotal(
    data.auctionYen,
    data.fobYen,
    data.vanningYen,
    commission
  );
  const rubYen = rubInvoiceToYen(
    data.rubInInvoice,
    data.rubPerUsd,
    data.yenPerUsd
  );
  const usdTrainYen = usdToYen(data.usdTrain, data.yenPerUsd);
  const usdTrackYen = usdToYen(data.usdTrack, data.yenPerUsd);
  const invoiceYenTrain = japan + usdTrainYen + rubYen;
  const invoiceYenTrack = japan + usdTrackYen + rubYen;
  const bankTrain = invoiceRubWithBankFee(invoiceYenTrain, data.rubPerYen);
  const bankTrack = invoiceRubWithBankFee(invoiceYenTrack, data.rubPerYen);
  const customsTrain = customsBlockBreakdown(data, invoiceYenTrain);
  const customsTrack = customsBlockBreakdown(data, invoiceYenTrack);
  const lab = Number.isFinite(data.labRub) ? data.labRub : 0;
  const grandTrain = bankTrain.totalRub + customsTrain.totalRub + lab;
  const grandTrack = bankTrack.totalRub + customsTrack.totalRub + lab;

  return {
    inputs: { ...data },
    outputs: {
      auctionCommissionYen: commission,
      japanYenTotal: japan,
      rubInvoiceYenEquivalent: rubYen,
      usdTrainYen,
      usdTrackYen,
      invoiceYenTrain,
      invoiceYenTrack,
      bankTrain,
      bankTrack,
      customsTrain,
      customsTrack,
      labRub: lab,
      grandTotalTrainRub: grandTrain,
      grandTotalTrackRub: grandTrack,
    },
  };
}

function persistCalculationSnapshot(snapshot) {
  fetch(resolveAppUrl("api/save_calculation.php"), {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(snapshot),
    cache: "no-store",
  }).catch(() => {});
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
    initRatesAuto();
    renderAuctionOptions();
    updateProgressiveSteps();
    wireFormListeners();
    updateRatesUIFromInputs();
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
