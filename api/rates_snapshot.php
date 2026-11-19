<?php
declare(strict_types=1);

/**
 * Отдаёт последний снимок курсов, записанный cron-скриптом refresh_rates_cache.php.
 * Фронт может использовать один запрос вместо трёх; при устаревании — fallback на живые API.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/khan_rates_lib.php';

function json_fail(int $http, string $message): void
{
    http_response_code($http);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

$file = __DIR__ . '/cache/rates_snapshot.json';
if (!is_readable($file)) {
    json_fail(503, 'Снимок курсов ещё не создан (запустите api/refresh_rates_cache.php по cron)');
}

$raw = file_get_contents($file);
if ($raw === false || $raw === '') {
    json_fail(503, 'Не удалось прочитать снимок курсов');
}

$data = json_decode($raw, true);
if (!is_array($data)) {
    json_fail(503, 'Повреждённый снимок курсов');
}

$fetchedAt = isset($data['fetchedAt']) ? (string) $data['fetchedAt'] : '';
$ts = strtotime($fetchedAt);
$ageSec = ($ts !== false) ? max(0, time() - $ts) : null;

$khan = is_array($data['khan'] ?? null) ? $data['khan'] : [];
$atb = is_array($data['atb'] ?? null) ? $data['atb'] : [];
$cbr = is_array($data['cbr'] ?? null) ? $data['cbr'] : [];

$rubPerUsd = isset($atb['rubPerUsd']) && is_numeric($atb['rubPerUsd']) ? (float) $atb['rubPerUsd'] : null;
$rubPerYen = isset($atb['rubPerYen']) && is_numeric($atb['rubPerYen']) && (float) $atb['rubPerYen'] > 0
    ? (float) $atb['rubPerYen']
    : null;
$rubPerEur = isset($cbr['rubPerEur']) && is_numeric($cbr['rubPerEur']) ? (float) $cbr['rubPerEur'] : null;

/**
 * Источники, чьи значения перенесены из прошлого снимка (банк был недоступен).
 * Фронт показывает по ним честную дату, чтобы устаревший курс не выглядел свежим.
 */
$staleSources = [];
foreach (['khan' => $khan, 'atb' => $atb, 'cbr' => $cbr] as $srcKey => $block) {
    $isStale = ($block['_stale'] ?? false) === true || ($block['stale'] ?? false) === true;
    if ($isStale) {
        $staleSources[$srcKey] = (string) ($block['_staleSince'] ?? $block['staleSince'] ?? '');
    }
}

// Ручной курс тугрика из админки на сегодня главнее курса банка в снимке.
// Накладывается при чтении, поэтому действует сразу, не дожидаясь cron, и сам истекает назавтра.
$manualInfo = null;
$manual = manual_rates_active();
if ($manual !== null) {
    $khan = manual_rates_as_khan_payload($manual);
    $manualInfo = ['date' => $manual['date'], 'setAt' => $manual['setAt']];
}

$khanUsable = $manual !== null || khan_payload_is_current($khan, manual_rates_today());
$khanDate = $khan['date'] ?? null;
$khanStale = !$khanUsable && ($khanDate !== null || isset($staleSources['khan']));
if ($khanStale) {
    $staleSources['khan'] = $khanDate ?? $staleSources['khan'];
} else {
    unset($staleSources['khan']);
}
$usdMnt = $khanUsable ? khan_positive_rate($khan['usdMnt'] ?? null) : null;
$jpyMnt = $khanUsable ? khan_positive_rate($khan['jpyMnt'] ?? null) : null;
$yenPerUsd = $khanUsable ? khan_positive_rate($khan['yenPerUsd'] ?? null) : null;

$complete =
    $usdMnt !== null && $usdMnt > 0
    && $jpyMnt !== null && $jpyMnt > 0
    && $rubPerEur !== null && $rubPerEur > 0;

echo json_encode([
    'ok' => true,
    'complete' => $complete,
    'fetchedAt' => $fetchedAt,
    'ageSec' => $ageSec,
    'yenPerUsd' => $yenPerUsd,
    'usdMnt' => $usdMnt,
    'jpyMnt' => $jpyMnt,
    'rubPerUsd' => $rubPerUsd,
    'rubPerYen' => $rubPerYen,
    'rubPerEur' => $rubPerEur,
    'staleSources' => $staleSources,
    'khanSource' => $khan['source'] ?? (isset($khan['date']) ? 'Khan Bank' : null),
    'khanDate' => $khanDate,
    'khanStale' => $khanStale,
    'manual' => $manualInfo,
    'meta' => [
        'cacheFile' => basename($file),
        'sources' => [
            'khan' => $khanUsable,
            'atb' => ($atb['ok'] ?? false) === true,
            'cbr' => ($cbr['ok'] ?? false) === true,
        ],
    ],
], JSON_UNESCAPED_UNICODE);
