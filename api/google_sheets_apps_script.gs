/**
 * Google Apps Script для приёма заявок с сайта в таблицу.
 *
 * Установка:
 *  1. Открыть Google-таблицу → Расширения → Apps Script.
 *  2. Вставить этот код, заменить SECRET на длинную случайную строку.
 *  3. Развернуть → Создать развёртывание → «Веб-приложение»:
 *       - Выполнять от имени: я;
 *       - У кого есть доступ: все.
 *  4. Скопировать URL вида https://script.google.com/macros/s/AKfy.../exec
 *     и вставить его в api/google_sheets_config.php как webhook_url,
 *     а тот же SECRET — как secret.
 *
 * При первом развёртывании Google попросит выдать разрешения — согласиться.
 */

// ВАЖНО: замените на длинную случайную строку и впишите её же в google_sheets_config.php.
var SECRET = 'PASTE_A_LONG_RANDOM_SECRET';

var SHEET_NAME = 'Заявки';

// [ключ из PHP, заголовок столбца] — порядок задаёт порядок колонок.
var COLUMNS = [
  ['createdAt', 'Дата/время (UTC)'],
  ['id', 'ID заявки'],
  ['name', 'Имя'],
  ['phone', 'Телефон'],
  ['contactMethod', 'Способ связи'],
  ['comment', 'Комментарий'],
  ['auctionPriceYen', 'Цена авто, ¥'],
  ['vehicleAge', 'Возраст'],
  ['engineType', 'Двигатель'],
  ['auctionName', 'Аукцион'],
  ['engineCc', 'Объём, см³'],
  ['engineHp', 'Мощность, л.с.'],
  ['grandTrain', 'Итог Train, ₽'],
  ['grandTrack', 'Итог Track, ₽'],
  ['calculationLogId', 'ID расчёта'],
  ['clientIp', 'IP'],
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000); // не даём двум заявкам писать одновременно

    var body = (e && e.postData && e.postData.contents)
      ? JSON.parse(e.postData.contents)
      : {};

    if (!body || body.secret !== SECRET) {
      return jsonOut({ ok: false, error: 'forbidden' });
    }

    var lead = body.lead || {};
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(COLUMNS.map(function (c) { return c[1]; }));
      sheet.setFrozenRows(1);
    }

    sheet.appendRow(COLUMNS.map(function (c) {
      var v = lead[c[0]];
      return (v === undefined || v === null) ? '' : v;
    }));

    return jsonOut({ ok: true });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
