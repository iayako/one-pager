import { DEFAULT_CALCULATION_CONFIG, computeCalculation } from "./calc-core.js?v=2";

let currentConfig = structuredClone(DEFAULT_CALCULATION_CONFIG);
let currentUser = null;
const RATE_VARIABLE_KEYS = ["mntPerRub", "jpyMntRiskMarkup"];

const excelSample = {
  auctionYen: 2113000,
  fobYen: 90000,
  vehicleAge: "3to5",
  engineType: "gasoline",
  auctionName: "Excel sample",
  engineDisplacementCc: 2000,
  enginePowerHp: 150,
  usdMnt: 3577,
  jpyMnt: 22.51,
  rubPerEur: 84.0742,
};

function $(id) {
  return document.getElementById(id);
}

function setStatus(id, message, kind = "") {
  const el = $(id);
  if (!el) return;
  el.textContent = message || "";
  el.classList.remove("lead-form__status--ok", "lead-form__status--error");
  if (kind === "ok") el.classList.add("lead-form__status--ok");
  if (kind === "error") el.classList.add("lead-form__status--error");
}

async function api(path, options = {}) {
  const resp = await fetch(path, {
    cache: "no-store",
    credentials: "same-origin",
    ...options,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(options.headers || {}),
    },
  });
  const data = await resp.json().catch(() => null);
  if (!resp.ok || !data || data.ok !== true) {
    throw new Error(data && typeof data.error === "string" ? data.error : "Ошибка API");
  }
  return data;
}

function cloneConfig(config) {
  const cloned = JSON.parse(JSON.stringify(config || DEFAULT_CALCULATION_CONFIG));
  cloned.variables = cloned.variables || {};
  cloned.formulas = {
    ...(DEFAULT_CALCULATION_CONFIG.formulas || {}),
    ...(cloned.formulas || {}),
  };
  cloned.resultRows = {
    ...(DEFAULT_CALCULATION_CONFIG.resultRows || {}),
    ...(cloned.resultRows || {}),
  };
  return cloned;
}

function renderShell() {
  const authed = currentUser !== null;
  $("auth-panel").hidden = authed;
  $("admin-workspace").hidden = !authed;
  $("btn-logout").hidden = !authed;
}

function renderConfig() {
  $("config-name").value = currentConfig.name || "";
  const meta = currentConfig._meta || {};
  const version = currentConfig.versionId ? `#${currentConfig.versionId}` : "дефолт";
  $("config-meta").textContent = `Версия: ${version}. Статус: ${meta.status || "default"}.`;

  const vars = currentConfig.variables || {};
  renderVariableRows("rates-table", Object.entries(vars).filter(([key]) => RATE_VARIABLE_KEYS.includes(key)), {
    removable: false,
    lockedKey: true,
  });
  renderVariableRows("variables-table", Object.entries(vars).filter(([key]) => !RATE_VARIABLE_KEYS.includes(key)), {
    removable: true,
  });

  const formulasList = $("formulas-list");
  formulasList.innerHTML = "";
  Object.entries(currentConfig.formulas || {}).forEach(([key, formula]) => {
    const editorText = formulaToEditorText(formula);
    if (editorText.trim().startsWith("{")) return;
    const row = document.createElement("div");
    row.className = "admin-formula-row";
    const resultKey = resultKeyForFormula(key);
    const resultRow = resultKey ? currentConfig.resultRows?.[resultKey] || {} : null;
    const label = resultRow ? String(resultRow.label || defaultResultLabel(resultKey)) : "";
    const description = resultRow ? String(resultRow.description || "") : "";
    const cardTitle = label || friendlyFormulaName(key);
    row.innerHTML = `
      <div class="admin-formula-head">
        <div>
          <h3>${escapeHtml(cardTitle)}</h3>
          <p class="admin-muted">${escapeHtml(formulaHint(key))}</p>
        </div>
        <span class="admin-lock-badge">Базовая формула</span>
      </div>
      <label class="field admin-formula-main">
        <span class="field__label">Как считается</span>
        <textarea data-formula-body="${escapeAttr(key)}" spellcheck="false" placeholder="Например: japanMntTotal + trainDeliveryMnt">${escapeHtml(editorText)}</textarea>
      </label>
      ${resultKey ? `
        <label class="field">
          <span class="field__label">Название для пользователя</span>
          <input type="text" data-result-label="${escapeAttr(resultKey)}" value="${escapeAttr(label)}" />
        </label>
        <label class="field">
          <span class="field__label">Описание</span>
          <textarea data-result-description="${escapeAttr(resultKey)}">${escapeHtml(description)}</textarea>
        </label>
      ` : `<div class="admin-muted">Служебная формула, не выводится отдельной строкой результата.</div>`}
      <details class="admin-tech-details">
        <summary>Технические настройки</summary>
        <label class="field">
          <span class="field__label">Код формулы</span>
          <input type="text" data-formula-key="${escapeAttr(key)}" value="${escapeAttr(key)}" aria-label="Код формулы" />
        </label>
        <p class="admin-muted">Доступные значения: ${escapeHtml(availableRefsText())}</p>
      </details>
    `;
    formulasList.appendChild(row);
  });

  const shownResultKeys = new Set(
    Object.keys(currentConfig.formulas || {})
      .map((key) => resultKeyForFormula(key))
      .filter(Boolean)
  );
  Object.entries(currentConfig.resultRows || {}).forEach(([resultKey, item]) => {
    if (shownResultKeys.has(resultKey)) return;
    const row = document.createElement("div");
    row.className = "admin-formula-row admin-formula-row--system";
    const label = item && typeof item === "object" ? String(item.label || defaultResultLabel(resultKey)) : defaultResultLabel(resultKey);
    const description = item && typeof item === "object" ? String(item.description || "") : "";
    row.innerHTML = `
      <div class="admin-formula-head">
        <div>
          <h3>${escapeHtml(label)}</h3>
          <p class="admin-muted">Системная строка результата. Сумма считается кодом калькулятора.</p>
        </div>
        <span class="admin-lock-badge">Без формулы</span>
      </div>
      <label class="field">
        <span class="field__label">Название для пользователя</span>
        <input type="text" data-result-label="${escapeAttr(resultKey)}" value="${escapeAttr(label)}" />
      </label>
      <label class="field">
        <span class="field__label">Описание</span>
        <textarea data-result-description="${escapeAttr(resultKey)}">${escapeHtml(description)}</textarea>
      </label>
      <details class="admin-tech-details">
        <summary>Технические настройки</summary>
        <p class="admin-muted">Код строки результата: <code>${escapeHtml(resultKey)}</code></p>
      </details>
    `;
    formulasList.appendChild(row);
  });
}

function renderVariableRows(containerId, entries, options = {}) {
  const table = $(containerId);
  if (!table) return;
  table.innerHTML = "";
  entries.forEach(([key, item]) => {
    const row = document.createElement("div");
    row.className = "admin-var-row";
    const label = item && typeof item === "object" && "label" in item ? String(item.label || "") : key;
    const value = item && typeof item === "object" && "value" in item ? item.value : item;
    row.innerHTML = `
      <input type="text" data-var-key="${escapeAttr(key)}" value="${escapeAttr(key)}" aria-label="Ключ переменной" ${options.lockedKey ? "readonly" : ""} />
      <div>
        <input type="text" data-var-label="${key}" value="${escapeAttr(label)}" aria-label="Название ${escapeAttr(key)}" />
        <div class="admin-var-key">${escapeHtml(hintForVariable(key))}</div>
      </div>
      <input type="number" step="any" data-var-value="${key}" value="${escapeAttr(String(value ?? ""))}" aria-label="Значение ${escapeAttr(key)}" />
      ${options.removable ? `<button type="button" class="btn btn--ghost btn--sm admin-remove-btn" data-remove-var="${escapeAttr(key)}">×</button>` : `<span></span>`}
    `;
    table.appendChild(row);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function hintForVariable(key) {
  const hints = {
    mntPerRub: "Ручной утренний курс обменника: сколько тугриков за 1 рубль.",
    jpyMntRiskMarkup: "Надбавка к курсу JPY Khan Bank, сейчас 0.6.",
    agentFixedMnt: "Фиксированная комиссия посредника, добавляется перед переводом в рубли.",
    japanFixedMnt: "Дополнительные 15000 MNT из Excel.",
  };
  return hints[key] || "Можно менять и сохранять как черновик.";
}

function formulaHint(key) {
  const hints = {
    auctionCommissionYen: "Ступенчатая таблица Extra fee.",
    japanYenTotal: "Сумма японской части в йенах.",
    japanMntTotal: "Японская часть в тугриках.",
    invoiceRubTrain: "Рублёвый инвойс Train.",
    invoiceRubTrack: "Рублёвый инвойс Track.",
  };
  return hints[key] || "Результат можно использовать в других формулах.";
}

function friendlyFormulaName(key) {
  const names = {
    auctionCommissionYen: "Extra fee аукциона",
    japanYenTotal: "Японская часть в йенах",
    japanMntTotal: "Расходы по Японии",
    trainDeliveryUsd: "Доставка Train в долларах",
    trackDeliveryUsd: "Доставка Track в долларах",
    rubInvoiceMntEquivalent: "Таможенная очистка в тугриках",
    trainDeliveryMnt: "Расходы до Монголии Train",
    trackDeliveryMnt: "Расходы до Монголии Track",
    invoiceMntTrain: "Инвойс Train до комиссии",
    invoiceMntTrack: "Инвойс Track до комиссии",
    payableMntTrain: "Инвойс Train с комиссией",
    payableMntTrack: "Инвойс Track с комиссией",
    invoiceRubTrain: "Оплата Train в рублях",
    invoiceRubTrack: "Оплата Track в рублях",
    invoiceYenTrain: "Инвойс Train в йенах для таможни",
    invoiceYenTrack: "Инвойс Track в йенах для таможни",
  };
  return names[key] || key;
}

function availableRefsText() {
  const variableKeys = Object.keys(currentConfig.variables || {});
  const formulaKeys = Object.keys(currentConfig.formulas || {});
  return [...variableKeys, ...formulaKeys].join(", ");
}

function resultKeyForFormula(formulaKey) {
  const map = {
    japanMntTotal: "japanMntTotal",
    trainDeliveryMnt: "deliveryMnt",
    rubInvoiceMntEquivalent: "rubInvoiceMntEquivalent",
    invoiceMntTrain: "invoiceMnt",
    invoiceRubTrain: "invoiceRub",
  };
  return map[formulaKey] || "";
}

function defaultResultLabel(resultKey) {
  const item = DEFAULT_CALCULATION_CONFIG.resultRows?.[resultKey];
  return item && typeof item === "object" ? String(item.label || resultKey) : resultKey;
}

function formulaToEditorText(formula) {
  if (formula && typeof formula === "object" && formula.op === "expr") {
    return String(formula.expr || "");
  }
  const expression = blockToExpression(formula);
  return expression || JSON.stringify(formula || {}, null, 2);
}

function blockToExpression(node) {
  if (typeof node === "number") return String(node);
  if (typeof node === "string") return node;
  if (!node || typeof node !== "object") return "";
  if (Object.prototype.hasOwnProperty.call(node, "ref")) return String(node.ref);
  if (Object.prototype.hasOwnProperty.call(node, "value")) return String(node.value);
  const args = Array.isArray(node.args) ? node.args : [];
  if (node.op === "sum") return args.map((item) => blockToExpression(item)).filter(Boolean).join(" + ");
  if (node.op === "mul") return args.map((item) => wrapExpression(blockToExpression(item))).filter(Boolean).join(" * ");
  if (node.op === "div") return `${wrapExpression(blockToExpression(args[0]))} / ${wrapExpression(blockToExpression(args[1]))}`;
  if (node.op === "percent") return `${wrapExpression(blockToExpression(node.base ?? args[0]))} * ${wrapExpression(blockToExpression(node.rate ?? args[1]))} / 100`;
  return "";
}

function wrapExpression(expr) {
  const s = String(expr || "").trim();
  if (s === "") return "0";
  return /[+\-]/.test(s) ? `(${s})` : s;
}

function formulaFromEditorText(text) {
  const source = String(text || "").trim();
  if (source === "") throw new Error("Простая формула не может быть пустой");
  return { op: "expr", expr: source };
}

function assertIdentifier(value, label) {
  const key = String(value || "").trim();
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(key)) {
    throw new Error(`${label}: используйте латиницу, цифры и _, первый символ должен быть буквой.`);
  }
  return key;
}

function collectConfigFromForm() {
  const next = cloneConfig(currentConfig);
  next.name = String($("config-name").value || "").trim() || "Схема расчёта";
  next.variables = {};
  document.querySelectorAll(".admin-var-row").forEach((row) => {
    const keyEl = row.querySelector("[data-var-key]");
    const labelEl = row.querySelector("[data-var-label]");
    const valueEl = row.querySelector("[data-var-value]");
    if (!(keyEl instanceof HTMLInputElement) || !(valueEl instanceof HTMLInputElement)) return;
    const key = assertIdentifier(keyEl.value, "Ключ переменной");
    const label = labelEl instanceof HTMLInputElement && labelEl.value.trim() !== "" ? labelEl.value.trim() : key;
    const value = Number(valueEl.value);
    next.variables[key] = {
      label,
      value: Number.isFinite(value) ? value : 0,
    };
  });

  const preservedFormulas = {};
  Object.entries(currentConfig.formulas || {}).forEach(([key, formula]) => {
    if (!blockToExpression(formula) && !(formula && typeof formula === "object" && formula.op === "expr")) {
      preservedFormulas[key] = formula;
    }
  });
  next.formulas = { ...preservedFormulas };
  document.querySelectorAll(".admin-formula-row").forEach((row) => {
    const keyEl = row.querySelector("[data-formula-key]");
    const bodyEl = row.querySelector("[data-formula-body]");
    if (!(keyEl instanceof HTMLInputElement) || !(bodyEl instanceof HTMLTextAreaElement)) return;
    const key = assertIdentifier(keyEl.value, "Название формулы");
    next.formulas[key] = formulaFromEditorText(bodyEl.value);
  });

  next.resultRows = {};
  document.querySelectorAll("[data-result-label], [data-result-description]").forEach((el) => {
    const key =
      el.getAttribute("data-result-label") ||
      el.getAttribute("data-result-description") ||
      "";
    if (key && !next.resultRows[key]) {
      next.resultRows[key] = { label: defaultResultLabel(key), description: "" };
    }
  });
  document.querySelectorAll(".admin-formula-row").forEach((row) => {
    const labelEl = row.querySelector("[data-result-label]");
    const descEl = row.querySelector("[data-result-description]");
    const key =
      labelEl instanceof HTMLInputElement
        ? labelEl.getAttribute("data-result-label")
        : descEl instanceof HTMLTextAreaElement
          ? descEl.getAttribute("data-result-description")
          : "";
    if (!key) return;
    next.resultRows[key] = {
      label: labelEl instanceof HTMLInputElement ? labelEl.value.trim() || key : key,
      description: descEl instanceof HTMLTextAreaElement ? descEl.value.trim() : "",
    };
  });
  return next;
}

function previewConfig() {
  const config = collectConfigFromForm();
  const mntPerRub = Number(config.variables?.mntPerRub?.value);
  const sample = {
    ...excelSample,
    mntPerRub,
    rubPerYen: (Number(excelSample.jpyMnt) + Number(config.variables?.jpyMntRiskMarkup?.value || 0)) / mntPerRub,
  };
  const snap = computeCalculation(sample, config);
  const out = snap.outputs;
  $("preview-output").textContent = [
    `Схема: ${config.name}`,
    `JPY_MNT с риском: ${formatNum(out.jpyMnt)} ₮/¥`,
    `USD_MNT: ${formatNum(out.usdMnt)} ₮/$`,
    `MNT_RUB: ${formatNum(out.mntPerRub)} ₮/₽`,
    "",
    `Japan MNT: ${formatInt(out.japanMntTotal)} ₮`,
    `Train delivery MNT: ${formatInt(out.trainDeliveryMnt)} ₮`,
    `Track delivery MNT: ${formatInt(out.trackDeliveryMnt)} ₮`,
    `Invoice Train: ${formatInt(out.bankTrain.totalRub)} ₽`,
    `Invoice Track: ${formatInt(out.bankTrack.totalRub)} ₽`,
    `Grand Train: ${formatInt(out.grandTotalTrainRub)} ₽`,
    `Grand Track: ${formatInt(out.grandTotalTrackRub)} ₽`,
  ].join("\n");
  return config;
}

function formatInt(value) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function formatNum(value) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 4 }).format(Number(value) || 0);
}

async function loadSession() {
  try {
    const session = await api("./api/admin_session.php", { method: "GET", headers: {} });
    currentUser = session.authenticated ? session.user : null;
    renderShell();
    if (currentUser) {
      await loadConfig();
    }
  } catch (err) {
    currentUser = null;
    renderShell();
    setStatus("auth-status", err instanceof Error ? err.message : "Ошибка проверки сессии", "error");
  }
}

async function loadConfig() {
  const data = await api("./api/admin_config.php", { method: "GET", headers: {} });
  currentConfig = cloneConfig(data.config || DEFAULT_CALCULATION_CONFIG);
  renderConfig();
  previewConfig();
}

function wireAuthForms() {
  $("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    try {
      const data = await api("./api/admin_login.php", {
        method: "POST",
        body: JSON.stringify({
          username: fd.get("username"),
          password: fd.get("password"),
        }),
      });
      currentUser = data.user;
      setStatus("auth-status", "");
      renderShell();
      await loadConfig();
    } catch (err) {
      setStatus("auth-status", err instanceof Error ? err.message : "Ошибка входа", "error");
    }
  });

  $("setup-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    try {
      const data = await api("./api/admin_setup.php", {
        method: "POST",
        body: JSON.stringify({
          setupToken: fd.get("setupToken"),
          username: fd.get("username"),
          password: fd.get("password"),
        }),
      });
      currentUser = data.user;
      setStatus("auth-status", "");
      renderShell();
      await loadConfig();
    } catch (err) {
      setStatus("auth-status", err instanceof Error ? err.message : "Ошибка setup", "error");
    }
  });
}

function wireAdminActions() {
  $("btn-add-variable").addEventListener("click", () => {
    try {
      currentConfig = collectConfigFromForm();
      let i = 1;
      while (currentConfig.variables[`customVar${i}`]) i += 1;
      currentConfig.variables[`customVar${i}`] = {
        label: `Новая переменная ${i}`,
        value: 0,
      };
      renderConfig();
      setStatus("admin-status", "Переменная добавлена. Переименуйте ключ латиницей и задайте значение.", "ok");
    } catch (err) {
      setStatus("admin-status", err instanceof Error ? err.message : "Не удалось добавить переменную", "error");
    }
  });

  $("variables-table").addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const key = target.getAttribute("data-remove-var");
    if (!key) return;
    try {
      target.closest(".admin-var-row")?.remove();
      currentConfig = collectConfigFromForm();
      renderConfig();
      setStatus("admin-status", `Переменная ${key} удалена из черновика.`, "ok");
    } catch (err) {
      setStatus("admin-status", err instanceof Error ? err.message : "Не удалось удалить переменную", "error");
    }
  });

  $("btn-add-formula").addEventListener("click", () => {
    try {
      currentConfig = collectConfigFromForm();
      let i = 1;
      while (currentConfig.formulas[`customFormula${i}`]) i += 1;
      currentConfig.formulas[`customFormula${i}`] = { op: "expr", expr: "0" };
      renderConfig();
      setStatus("admin-status", "Формула добавлена. Задайте имя результата и выражение.", "ok");
    } catch (err) {
      setStatus("admin-status", err instanceof Error ? err.message : "Не удалось добавить формулу", "error");
    }
  });

  $("btn-preview").addEventListener("click", () => {
    try {
      previewConfig();
      setStatus("admin-status", "Проверка выполнена.", "ok");
    } catch (err) {
      setStatus("admin-status", err instanceof Error ? err.message : "Ошибка проверки", "error");
    }
  });

  $("btn-save").addEventListener("click", async () => {
    try {
      const config = previewConfig();
      const data = await api("./api/admin_config.php", {
        method: "POST",
        body: JSON.stringify({ config }),
      });
      currentConfig = cloneConfig(data.config);
      renderConfig();
      setStatus("admin-status", `Черновик сохранён: #${data.id}.`, "ok");
    } catch (err) {
      setStatus("admin-status", err instanceof Error ? err.message : "Ошибка сохранения", "error");
    }
  });

  $("btn-publish").addEventListener("click", async () => {
    try {
      if (!currentConfig.versionId) {
        throw new Error("Сначала сохраните черновик.");
      }
      const data = await api("./api/admin_publish_config.php", {
        method: "POST",
        body: JSON.stringify({ versionId: currentConfig.versionId }),
      });
      setStatus("admin-status", `Опубликована версия #${data.activeVersionId}.`, "ok");
      await loadConfig();
    } catch (err) {
      setStatus("admin-status", err instanceof Error ? err.message : "Ошибка публикации", "error");
    }
  });

  $("btn-logout").addEventListener("click", async () => {
    await api("./api/admin_logout.php", { method: "POST", body: "{}" }).catch(() => null);
    currentUser = null;
    renderShell();
  });
}

(function bootAdmin() {
  wireAuthForms();
  wireAdminActions();
  renderShell();
  loadSession();
})();
