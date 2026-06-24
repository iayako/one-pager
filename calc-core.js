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
 * Утилизационный сбор для физлиц (личное пользование). Мощность — в **л.с.**.
 * Базовая сумма до 160 л.с. зависит от возраста авто:
 *  - до 3 лет — **3 200 ₽**;
 *  - 3 года и старше — **5 200 ₽** (пример из ТЗ).
 * Свыше 160 л.с. — оценка по нарастающей шкале от базовой суммы (уточняйте у брокера).
 */
export function recyclingFeeRub(engineHp, vehicleAge) {
  const hp = Number(engineHp);
  if (!Number.isFinite(hp) || hp <= 0) return 0;
  const baseFee = vehicleAge === "under3" ? 3200 : 5200;
  if (hp <= 160) return baseFee;
  const over = hp - 160;
  return Math.round(baseFee * (1 + (over / 160) ** 2 * 12));
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
  const recycling = recyclingFeeRub(data.enginePowerHp, data.vehicleAge);
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

export const DEFAULT_CALCULATION_CONFIG = {
  id: "default-mnt-excel",
  versionId: null,
  name: "MNT расчёт по Excel",
  variables: {
    vanningYen: { label: "Vanning, ¥", value: 40000 },
    usdTrainContainer: { label: "Контейнер Train, $", value: 1200 },
    usdTrackContainer: { label: "Контейнер Track, $", value: 1200 },
    mongoliaDocsUsd: { label: "Документы в Монголии, $", value: 440 },
    borderSupportUsd: { label: "Сопровождение границы, $", value: 200 },
    trainCarrierUsd: { label: "Автовоз УБ - СБ, $", value: 200 },
    trackCarrierUsd: { label: "Автовоз Замын-Ууд - СБ, $", value: 500 },
    rubInInvoice: { label: "Таможенная очистка, ₽", value: 47800 },
    japanFixedMnt: { label: "Фиксированная комиссия к Японии, ₮", value: 15000 },
    agentFixedMnt: { label: "Комиссия посредника, ₮", value: 550000 },
    jpyMntRiskMarkup: { label: "Риск к курсу ¥/₮", value: 0.6 },
    mntPerRub: { label: "₮ за 1 ₽", value: 47.8 },
    labRub: { label: "Лаборатория, ₽", value: 40000 },
  },
  resultRows: {
    japanMntTotal: {
      label: "Расходы по Японии, ₮",
      description: "",
    },
    deliveryMnt: {
      label: "Расходы до Монголии, ₮",
      description: "",
    },
    rubInvoiceMntEquivalent: {
      label: "Таможенная очистка в инвойсе, ₮",
      description: "",
    },
    invoiceMnt: {
      label: "Инвойс до комиссии посредника, ₮",
      description: "",
    },
    invoiceRub: {
      label: "Оплата по инвойсу в рублях с комиссией посредника, ₽",
      description: "",
    },
    customs: {
      label: "Таможенный платёж, пошлина и утилизационный сбор, ₽",
      description: "",
    },
    lab: {
      label: "ЭПТС и СБКТС, ₽",
      description: "Гибридные авто обязательны к прохождению лаборатории в г. Кяхта.",
    },
    grandTotal: {
      label: "Итоговая сумма, ₽",
      description: "",
    },
  },
  formulas: {
    auctionCommissionYen: {
      op: "table",
      input: { ref: "auctionYen" },
      bands: [
        { max: 500000, value: 0 },
        { max: 1000000, value: 10000 },
        { max: 1500000, value: 20000 },
        { max: 2000000, value: 40000 },
        { max: 2500000, value: 60000 },
        { max: 3000000, value: 80000 },
        { max: 3500000, value: 100000 },
        { max: 4000000, value: 120000 },
        { max: 4500000, value: 140000 },
        { max: 5000000, value: 160000 },
      ],
      default: { op: "mul", args: [{ ref: "auctionYen" }, 0.05] },
      round: "nearest",
    },
    japanYenTotal: {
      op: "sum",
      args: [
        { ref: "auctionYen" },
        { ref: "fobYen" },
        { ref: "vanningYen" },
        { ref: "auctionCommissionYen" },
      ],
    },
    japanMntTotal: {
      op: "sum",
      args: [
        { op: "mul", args: [{ ref: "japanYenTotal" }, { ref: "jpyMnt" }] },
        { ref: "japanFixedMnt" },
      ],
    },
    trainDeliveryUsd: {
      op: "sum",
      args: [
        { ref: "usdTrainContainer" },
        { ref: "mongoliaDocsUsd" },
        { ref: "borderSupportUsd" },
        { ref: "trainCarrierUsd" },
      ],
    },
    trackDeliveryUsd: {
      op: "sum",
      args: [
        { ref: "usdTrackContainer" },
        { ref: "mongoliaDocsUsd" },
        { ref: "borderSupportUsd" },
        { ref: "trackCarrierUsd" },
      ],
    },
    rubInvoiceMntEquivalent: {
      op: "mul",
      args: [{ ref: "rubInInvoice" }, { ref: "mntPerRub" }],
    },
    trainDeliveryMnt: {
      op: "sum",
      args: [
        { op: "mul", args: [{ ref: "trainDeliveryUsd" }, { ref: "usdMnt" }] },
        { ref: "rubInvoiceMntEquivalent" },
      ],
    },
    trackDeliveryMnt: {
      op: "sum",
      args: [
        { op: "mul", args: [{ ref: "trackDeliveryUsd" }, { ref: "usdMnt" }] },
        { ref: "rubInvoiceMntEquivalent" },
      ],
    },
    invoiceMntTrain: {
      op: "sum",
      args: [{ ref: "japanMntTotal" }, { ref: "trainDeliveryMnt" }],
    },
    invoiceMntTrack: {
      op: "sum",
      args: [{ ref: "japanMntTotal" }, { ref: "trackDeliveryMnt" }],
    },
    payableMntTrain: {
      op: "sum",
      args: [{ ref: "invoiceMntTrain" }, { ref: "agentFixedMnt" }],
    },
    payableMntTrack: {
      op: "sum",
      args: [{ ref: "invoiceMntTrack" }, { ref: "agentFixedMnt" }],
    },
    invoiceRubTrain: {
      op: "div",
      args: [{ ref: "payableMntTrain" }, { ref: "mntPerRub" }],
    },
    invoiceRubTrack: {
      op: "div",
      args: [{ ref: "payableMntTrack" }, { ref: "mntPerRub" }],
    },
    invoiceYenTrain: {
      op: "div",
      args: [{ ref: "invoiceMntTrain" }, { ref: "jpyMnt" }],
    },
    invoiceYenTrack: {
      op: "div",
      args: [{ ref: "invoiceMntTrack" }, { ref: "jpyMnt" }],
    },
  },
};

function configVariables(config) {
  const vars = {};
  const source = config && typeof config === "object" ? config.variables : null;
  if (!source || typeof source !== "object") return vars;
  for (const [key, item] of Object.entries(source)) {
    const value = item && typeof item === "object" && "value" in item ? item.value : item;
    const n = Number(value);
    if (Number.isFinite(n)) vars[key] = n;
  }
  return vars;
}

function roundByMode(value, mode) {
  if (!Number.isFinite(value)) return 0;
  if (mode === "floor") return Math.floor(value + 1e-9);
  if (mode === "ceil") return Math.ceil(value - 1e-9);
  if (mode === "none") return value;
  return Math.round(value);
}

function tokenizeExpression(expr) {
  const tokens = [];
  const source = String(expr || "");
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/[()+\-*/]/.test(ch)) {
      tokens.push({ type: ch, value: ch });
      i += 1;
      continue;
    }
    if (/\d|\./.test(ch)) {
      let j = i + 1;
      while (j < source.length && /[\d.]/.test(source[j])) j += 1;
      tokens.push({ type: "number", value: Number(source.slice(i, j)) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < source.length && /[A-Za-z0-9_]/.test(source[j])) j += 1;
      tokens.push({ type: "ref", value: source.slice(i, j) });
      i = j;
      continue;
    }
    throw new Error(`Недопустимый символ в формуле: ${ch}`);
  }
  return tokens;
}

function evaluateExpression(expr, context, formulas, memo, stack) {
  const tokens = tokenizeExpression(expr);
  let pos = 0;

  function peek() {
    return tokens[pos] || null;
  }

  function consume(type) {
    const t = peek();
    if (!t || t.type !== type) return null;
    pos += 1;
    return t;
  }

  function factor() {
    if (consume("+")) return factor();
    if (consume("-")) return -factor();
    const n = consume("number");
    if (n) {
      if (!Number.isFinite(n.value)) throw new Error("Некорректное число в формуле");
      return n.value;
    }
    const ref = consume("ref");
    if (ref) return resolveFormulaRef(ref.value, context, formulas, memo, stack);
    if (consume("(")) {
      const v = expression();
      if (!consume(")")) throw new Error("Не закрыта скобка в формуле");
      return v;
    }
    throw new Error("Не удалось прочитать формулу");
  }

  function term() {
    let value = factor();
    while (true) {
      if (consume("*")) value *= factor();
      else if (consume("/")) {
        const d = factor();
        value = d !== 0 ? value / d : 0;
      } else break;
    }
    return value;
  }

  function expression() {
    let value = term();
    while (true) {
      if (consume("+")) value += term();
      else if (consume("-")) value -= term();
      else break;
    }
    return value;
  }

  const result = expression();
  if (pos !== tokens.length) throw new Error("Лишние символы в конце формулы");
  return result;
}

export function evaluateFormulaBlock(node, context, formulas = {}, memo = {}, stack = []) {
  if (typeof node === "number") return Number.isFinite(node) ? node : 0;
  if (typeof node === "string") return resolveFormulaRef(node, context, formulas, memo, stack);
  if (!node || typeof node !== "object") return 0;
  if (Object.prototype.hasOwnProperty.call(node, "value")) {
    const n = Number(node.value);
    return Number.isFinite(n) ? n : 0;
  }
  if (Object.prototype.hasOwnProperty.call(node, "ref")) {
    return resolveFormulaRef(String(node.ref), context, formulas, memo, stack);
  }

  const op = String(node.op || "");
  const args = Array.isArray(node.args) ? node.args : [];
  let result = 0;

  if (op === "sum") {
    result = args.reduce((acc, item) => acc + evaluateFormulaBlock(item, context, formulas, memo, stack), 0);
  } else if (op === "mul") {
    result = args.reduce((acc, item) => acc * evaluateFormulaBlock(item, context, formulas, memo, stack), 1);
  } else if (op === "div") {
    const numerator = evaluateFormulaBlock(args[0], context, formulas, memo, stack);
    const denominator = evaluateFormulaBlock(args[1], context, formulas, memo, stack);
    result = Number.isFinite(denominator) && denominator !== 0 ? numerator / denominator : 0;
  } else if (op === "percent") {
    result =
      evaluateFormulaBlock(node.base ?? args[0], context, formulas, memo, stack) *
      (evaluateFormulaBlock(node.rate ?? args[1], context, formulas, memo, stack) / 100);
  } else if (op === "max") {
    result = Math.max(...args.map((item) => evaluateFormulaBlock(item, context, formulas, memo, stack)));
  } else if (op === "min") {
    result = Math.min(...args.map((item) => evaluateFormulaBlock(item, context, formulas, memo, stack)));
  } else if (op === "round") {
    result = roundByMode(evaluateFormulaBlock(node.arg ?? args[0], context, formulas, memo, stack), node.mode);
  } else if (op === "table") {
    const input = evaluateFormulaBlock(node.input, context, formulas, memo, stack);
    const bands = Array.isArray(node.bands) ? node.bands : [];
    const matched = bands.find((band) => Number.isFinite(Number(band.max)) && input <= Number(band.max));
    if (matched) {
      result = evaluateFormulaBlock(matched.value, context, formulas, memo, stack);
    } else {
      result = evaluateFormulaBlock(node.default, context, formulas, memo, stack);
    }
  } else if (op === "expr") {
    result = evaluateExpression(node.expr, context, formulas, memo, stack);
  }

  return node.round ? roundByMode(result, node.round) : result;
}

function resolveFormulaRef(ref, context, formulas, memo, stack) {
  if (Object.prototype.hasOwnProperty.call(context, ref)) {
    const n = Number(context[ref]);
    return Number.isFinite(n) ? n : 0;
  }
  if (Object.prototype.hasOwnProperty.call(memo, ref)) {
    return memo[ref];
  }
  if (!Object.prototype.hasOwnProperty.call(formulas, ref)) {
    return 0;
  }
  if (stack.includes(ref)) {
    throw new Error(`Циклическая формула: ${[...stack, ref].join(" -> ")}`);
  }
  const value = evaluateFormulaBlock(formulas[ref], context, formulas, memo, [...stack, ref]);
  memo[ref] = value;
  context[ref] = value;
  return value;
}

export function evaluateCalculationConfig(data, config = DEFAULT_CALCULATION_CONFIG) {
  const vars = configVariables(config);
  const context = { ...vars, ...data };
  const usdMnt = Number(context.usdMnt);
  const yenPerUsd = Number(context.yenPerUsd);
  const rawJpyMnt = Number(context.jpyMnt);
  const jpyMntBase =
    Number.isFinite(rawJpyMnt) && rawJpyMnt > 0
      ? rawJpyMnt
      : Number.isFinite(usdMnt) && usdMnt > 0 && Number.isFinite(yenPerUsd) && yenPerUsd > 0
        ? usdMnt / yenPerUsd
        : 0;
  const risk = Number(context.jpyMntRiskMarkup);
  context.jpyMntBase = jpyMntBase;
  context.jpyMnt = jpyMntBase + (Number.isFinite(risk) ? risk : 0);
  context.mntPerRub = Number(context.mntPerRub);
  context.usdMnt = Number.isFinite(usdMnt) && usdMnt > 0 ? usdMnt : 0;
  context.rubPerYen =
    context.jpyMnt > 0 && context.mntPerRub > 0 ? context.jpyMnt / context.mntPerRub : Number(data.rubPerYen);
  context.rubPerUsd =
    context.usdMnt > 0 && context.mntPerRub > 0 ? context.usdMnt / context.mntPerRub : Number(data.rubPerUsd);
  context.yenPerUsd =
    context.usdMnt > 0 && context.jpyMnt > 0 ? context.usdMnt / context.jpyMnt : Number(data.yenPerUsd);

  const formulas = config && typeof config === "object" && config.formulas ? config.formulas : {};
  const memo = {};
  for (const key of Object.keys(formulas)) {
    resolveFormulaRef(key, context, formulas, memo, []);
  }
  return { context, values: memo };
}

/**
 * @param {Record<string, unknown>} data — те же поля, что из readForm() в app.js
 */
export function computeCalculation(data, config = DEFAULT_CALCULATION_CONFIG) {
  const evaluated = evaluateCalculationConfig(data, config);
  const v = evaluated.context;
  const commission = roundByMode(Number(v.auctionCommissionYen), "nearest");
  const japan = roundByMode(Number(v.japanYenTotal), "nearest");
  const rubYen = rubInvoiceToYen(v.rubInInvoice, v.rubPerUsd, v.yenPerUsd);
  const usdTrainYen = usdToYen(v.trainDeliveryUsd, v.yenPerUsd);
  const usdTrackYen = usdToYen(v.trackDeliveryUsd, v.yenPerUsd);
  const invoiceYenTrain = roundByMode(Number(v.invoiceYenTrain), "nearest");
  const invoiceYenTrack = roundByMode(Number(v.invoiceYenTrack), "nearest");
  const agentFeeRub =
    Number(v.agentFixedMnt) > 0 && Number(v.mntPerRub) > 0 ? Number(v.agentFixedMnt) / Number(v.mntPerRub) : 0;
  const bankTrain = {
    baseRub: roundByMode(Number(v.invoiceMntTrain) / Number(v.mntPerRub), "nearest"),
    feeRub: roundByMode(agentFeeRub, "nearest"),
    totalRub: roundByMode(Number(v.invoiceRubTrain), "nearest"),
  };
  const bankTrack = {
    baseRub: roundByMode(Number(v.invoiceMntTrack) / Number(v.mntPerRub), "nearest"),
    feeRub: roundByMode(agentFeeRub, "nearest"),
    totalRub: roundByMode(Number(v.invoiceRubTrack), "nearest"),
  };
  const customsData = { ...data, rubPerYen: v.rubPerYen };
  const customsTrain = customsBlockBreakdown(customsData, invoiceYenTrain);
  const customsTrack = customsBlockBreakdown(customsData, invoiceYenTrack);
  const lab = Number.isFinite(Number(v.labRub)) ? Number(v.labRub) : 0;
  const grandTrain = bankTrain.totalRub + customsTrain.totalRub + lab;
  const grandTrack = bankTrack.totalRub + customsTrack.totalRub + lab;

  return {
    config: {
      id: config?.id ?? null,
      versionId: config?.versionId ?? null,
      name: config?.name ?? null,
    },
    inputs: { ...data, rubPerYen: v.rubPerYen, rubPerUsd: v.rubPerUsd, yenPerUsd: v.yenPerUsd },
    outputs: {
      auctionCommissionYen: commission,
      japanYenTotal: japan,
      rubInvoiceYenEquivalent: rubYen,
      rubInvoiceMntEquivalent: roundByMode(Number(v.rubInvoiceMntEquivalent), "nearest"),
      usdTrainYen,
      usdTrackYen,
      invoiceYenTrain,
      invoiceYenTrack,
      jpyMnt: v.jpyMnt,
      usdMnt: v.usdMnt,
      mntPerRub: v.mntPerRub,
      japanMntTotal: roundByMode(Number(v.japanMntTotal), "nearest"),
      trainDeliveryMnt: roundByMode(Number(v.trainDeliveryMnt), "nearest"),
      trackDeliveryMnt: roundByMode(Number(v.trackDeliveryMnt), "nearest"),
      invoiceMntTrain: roundByMode(Number(v.invoiceMntTrain), "nearest"),
      invoiceMntTrack: roundByMode(Number(v.invoiceMntTrack), "nearest"),
      payableMntTrain: roundByMode(Number(v.payableMntTrain), "nearest"),
      payableMntTrack: roundByMode(Number(v.payableMntTrack), "nearest"),
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
