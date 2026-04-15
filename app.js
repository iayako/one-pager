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
    enginePowerKw: parseFloat(String(fd.get("enginePowerKw"))),
    auctionYen: parseFloat(fd.get("auctionYen")),
    fobYen: parseFloat(fd.get("fobYen")),
    vanningYen: parseFloat(fd.get("vanningYen")),
    usdTrain: parseFloat(fd.get("usdTrain")),
    usdTrack: parseFloat(fd.get("usdTrack")),
    rubInInvoice: parseFloat(fd.get("rubInInvoice")),
    customsTotalRub: parseFloat(fd.get("customsTotalRub")),
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
    toggle.textContent = theme === "dark" ? "Светлая тема" : "Тёмная тема";
  }
}

function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initial = saved || (systemDark ? "dark" : "light");
  applyTheme(initial);

  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;
  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
  });
}

function render(data) {
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

  const customs = Number.isFinite(data.customsTotalRub) ? data.customsTotalRub : 0;
  const lab = Number.isFinite(data.labRub) ? data.labRub : 0;
  const extra = customs + lab;

  const grandTrain = bankTrain.totalRub + extra;
  const grandTrack = bankTrack.totalRub + extra;

  document.getElementById("out-japan-yen").textContent = formatYen(japan);
  document.getElementById("out-japan-yen-t").textContent = formatYen(japan);
  document.getElementById("out-usd-train-yen").textContent = formatYen(usdTrainYen);
  document.getElementById("out-usd-track-yen").textContent = formatYen(usdTrackYen);
  document.getElementById("out-rub-invoice-train-yen").textContent = formatYen(rubYen);
  document.getElementById("out-rub-invoice-track-yen").textContent = formatYen(rubYen);
  document.getElementById("out-invoice-yen-train").textContent = formatYen(invoiceYenTrain);
  document.getElementById("out-invoice-yen-track").textContent = formatYen(invoiceYenTrack);
  document.getElementById("out-invoice-rub-train").textContent = formatRub(bankTrain.totalRub);
  document.getElementById("out-invoice-rub-track").textContent = formatRub(bankTrack.totalRub);
  document.getElementById("out-customs-train").textContent = formatRub(customs);
  document.getElementById("out-customs-track").textContent = formatRub(customs);
  document.getElementById("out-lab-train").textContent = formatRub(lab);
  document.getElementById("out-lab-track").textContent = formatRub(lab);
  document.getElementById("out-grand-train").textContent = formatRub(grandTrain);
  document.getElementById("out-grand-track").textContent = formatRub(grandTrack);
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
  const search = document.getElementById("auction-search");
  const list = document.getElementById("auction-list");
  if (!modal || !openBtn || !search || !list) return;

  openBtn.addEventListener("click", () => {
    renderAuctionOptions(search.value);
    modal.showModal();
    search.focus();
  });

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
    modal.close();
    updateProgressiveSteps();
  });
}

function fillExample() {
  document.getElementById("auction-yen").value = "1802000";
  document.getElementById("vehicle-age").value = "under3";
  document.getElementById("engine-type").value = "gasoline";
  document.getElementById("engine-cc").value = "2000";
  document.getElementById("engine-kw").value = "150";
  document.getElementById("engine-cc").setCustomValidity("");
  document.getElementById("engine-kw").setCustomValidity("");

  document.getElementById("yen-per-usd").value = "161.4";
  document.getElementById("rub-per-usd").value = "80.99";
  document.getElementById("rub-per-yen").value = "0.5299";
  document.getElementById("rub-per-eur").value = "91.0034";
  setSelectedAuction("Aucnet", 110000);
  document.getElementById("vanning-yen").value = "40000";
  document.getElementById("usd-train").value = "2040";
  document.getElementById("usd-track").value = "2340";
  document.getElementById("rub-in-invoice").value = "47800";
  document.getElementById("customs-total-rub").value = "506719";
  document.getElementById("lab-rub").value = "40000";
}

document.getElementById("calc-form").addEventListener("submit", (e) => {
  e.preventDefault();
  render(readForm());
  document.getElementById("results").classList.remove("results--hidden");
});

document.getElementById("btn-fill-example").addEventListener("click", () => {
  fillExample();
  updateProgressiveSteps();
  render(readForm());
  document.getElementById("results").classList.remove("results--hidden");
});

document.getElementById("calc-form").addEventListener("input", updateProgressiveSteps);
document.getElementById("calc-form").addEventListener("change", updateProgressiveSteps);

initTheme();
initAuctionPicker();
renderAuctionOptions();
updateProgressiveSteps();
