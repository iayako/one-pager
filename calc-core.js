/**
 * Чистая логика калькулятора (без DOM).
 * Общая для браузера (app.js) и Node-тестов.
 */

/** Доп. комиссия аукциона от цены авто (¥), таблица из ТЗ */
export function auctionCommissionYen(auctionPrice) {
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
export function rubInvoiceToYen(rubAmount, rubPerUsd, yenPerUsd) {
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
export function invoiceRubWithBankFee(invoiceYen, rubPerYen) {
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
export function customsValueRubFromInvoice(invoiceYen, rubPerYen) {
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
export function customsClearanceFeeRub(customsValueRub) {
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
 * По ТЗ в коридорах сравнивается **стоимость автомобиля** (цена в ¥), а не полный инвойс:
 * `round(цена_авто_¥ × (₽/¥))` → «стоимость в рублях» → `/(₽/€)` = эквивалент в € для выбора строки и доли.
 */
export function importDutyUnder3Rub(auctionYen, rubPerYen, rubPerEur, engineCc) {
  const y = Number(auctionYen);
  const rpy = Number(rubPerYen);
  const eurRate = Number(rubPerEur);
  const cc = Number(engineCc);
  if (!Number.isFinite(y) || y <= 0) return 0;
  if (!Number.isFinite(rpy) || rpy <= 0) return 0;
  if (!Number.isFinite(eurRate) || eurRate <= 0) return 0;
  if (!Number.isFinite(cc) || cc <= 0) return 0;
  const vehicleValueRub = Math.round(y * rpy);
  const priceEur = vehicleValueRub / eurRate;
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
export function dutyEurPerCc35(engineCc) {
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
export function dutyEurPerCcOver5(engineCc) {
  const cc = Number(engineCc);
  if (!Number.isFinite(cc) || cc <= 0) return 0;
  if (cc <= 1000) return 3;
  if (cc <= 1500) return 3.2;
  if (cc <= 1800) return 3.5;
  if (cc <= 2300) return 4.8;
  if (cc <= 3000) return 5;
  return 5.7;
}

export function importDutyAgeRub(vehicleAge, data, engineCc) {
  if (vehicleAge === "under3") {
    return importDutyUnder3Rub(
      data.auctionYen,
      data.rubPerYen,
      data.rubPerEur,
      engineCc
    );
  }
  const eurRate = Number(data.rubPerEur);
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
 * Мощность вводится в **л.с.** (как в ТЗ). От возраста авто не зависит — один коэфф. 0,26.
 * Свыше 160 л.с. — оценка по нарастающей шкале (уточняйте у брокера).
 */
export function recyclingFeeRub(engineHp) {
  const hp = Number(engineHp);
  if (!Number.isFinite(hp) || hp <= 0) return 0;
  const coef = 0.26;
  if (hp <= 160) return Math.round(20000 * coef);
  const over = hp - 160;
  return Math.round(20000 * coef * (1 + (over / 160) ** 2 * 12));
}

/**
 * Таможенный платёж, пошлина и утилизационный сбор — разбивка и итог, ₽ — по ТЗ.
 * Зависит от инвойса ¥ (Train/Track дают разную таможенную стоимость и сбор за оформление).
 */
export function customsBlockBreakdown(data, invoiceYen) {
  const cv = customsValueRubFromInvoice(invoiceYen, data.rubPerYen);
  const fee = customsClearanceFeeRub(cv);
  const duty = importDutyAgeRub(
    data.vehicleAge,
    data,
    data.engineDisplacementCc
  );
  const recycling = recyclingFeeRub(data.enginePowerHp);
  return {
    customsValueRub: cv,
    clearanceFeeRub: fee,
    importDutyRub: duty,
    recyclingFeeRub: recycling,
    totalRub: fee + duty + recycling,
  };
}

export function customsBlockTotalRub(data, invoiceYen) {
  return customsBlockBreakdown(data, invoiceYen).totalRub;
}

export function japanYenTotal(auctionYen, fobYen, vanningYen, commissionYen) {
  return (
    Number(auctionYen) +
    Number(fobYen) +
    Number(vanningYen) +
    Number(commissionYen)
  );
}

export function usdToYen(usd, yenPerUsd) {
  const u = Number(usd);
  const y = Number(yenPerUsd);
  if (!Number.isFinite(u) || u < 0) return 0;
  if (!Number.isFinite(y) || y <= 0) return 0;
  return Math.round(u * y);
}

/**
 * @param {Record<string, unknown>} data — те же поля, что из readForm() в app.js
 */
export function computeCalculation(data) {
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
