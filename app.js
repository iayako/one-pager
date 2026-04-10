/**
 * Калькулятор по ТЗ: инвойс ¥/₽, комиссия АТБ, итог с таможней и лабораторией.
 */

const FOB_OPTIONS = [
  { value: 90000, label: "90 000 ¥" },
  { value: 95000, label: "95 000 ¥" },
  { value: 100000, label: "100 000 ¥" },
  { value: 105000, label: "105 000 ¥" },
  { value: 110000, label: "110 000 ¥" },
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

function render(data) {
  const commission = auctionCommissionYen(data.auctionYen);
  document.getElementById("commission-yen").textContent =
    commission > 0 ? formatInt(commission) : "0";

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
  document.getElementById("out-invoice-base-train").textContent = formatRub(bankTrain.baseRub);
  document.getElementById("out-invoice-fee-train").textContent = formatRub(bankTrain.feeRub);
  document.getElementById("out-invoice-rub-train").textContent = formatRub(bankTrain.totalRub);
  document.getElementById("out-invoice-base-track").textContent = formatRub(bankTrack.baseRub);
  document.getElementById("out-invoice-fee-track").textContent = formatRub(bankTrack.feeRub);
  document.getElementById("out-invoice-rub-track").textContent = formatRub(bankTrack.totalRub);
  document.getElementById("out-grand-train").textContent = formatRub(grandTrain);
  document.getElementById("out-grand-track").textContent = formatRub(grandTrack);
}

function fillExample() {
  document.getElementById("yen-per-usd").value = "161.4";
  document.getElementById("rub-per-usd").value = "80.99";
  document.getElementById("rub-per-yen").value = "0.5299";
  document.getElementById("rub-per-eur").value = "91.0034";
  document.getElementById("auction-yen").value = "1802000";
  document.getElementById("fob-yen").value = "110000";
  document.getElementById("vanning-yen").value = "40000";
  document.getElementById("usd-train").value = "2040";
  document.getElementById("usd-track").value = "2340";
  document.getElementById("rub-in-invoice").value = "47800";
  document.getElementById("customs-total-rub").value = "506719";
  document.getElementById("lab-rub").value = "40000";
}

function initFobSelect() {
  const sel = document.getElementById("fob-yen");
  sel.innerHTML = "";
  FOB_OPTIONS.forEach((opt) => {
    const o = document.createElement("option");
    o.value = String(opt.value);
    o.textContent = opt.label;
    sel.appendChild(o);
  });
  sel.value = "110000";
}

document.getElementById("calc-form").addEventListener("submit", (e) => {
  e.preventDefault();
  render(readForm());
});

document.getElementById("auction-yen").addEventListener("input", () => {
  const d = readForm();
  const c = auctionCommissionYen(d.auctionYen);
  document.getElementById("commission-yen").textContent =
    c > 0 ? formatInt(c) : "0";
});

document.getElementById("btn-fill-example").addEventListener("click", () => {
  fillExample();
  render(readForm());
});

initFobSelect();
fillExample();
render(readForm());
