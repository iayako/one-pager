<?php
declare(strict_types=1);

/**
 * Отдаёт последний снимок курсов, записанный cron-скриптом refresh_rates_cache.php.
 * Фронт может использовать один запрос вместо трёх; при устаревании — fallback на живые API.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=60');

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

$yenPerUsd = isset($khan['yenPerUsd']) && is_numeric($khan['yenPerUsd']) ? (float) $khan['yenPerUsd'] : null;
$rubPerUsd = isset($atb['rubPerUsd']) && is_numeric($atb['rubPerUsd']) ? (float) $atb['rubPerUsd'] : null;
$rubPerYen = isset($atb['rubPerYen']) && is_numeric($atb['rubPerYen']) && (float) $atb['rubPerYen'] > 0
    ? (float) $atb['rubPerYen']
    : null;
$rubPerEur = isset($cbr['rubPerEur']) && is_numeric($cbr['rubPerEur']) ? (float) $cbr['rubPerEur'] : null;

$complete =
    $yenPerUsd !== null && $yenPerUsd > 0
    && $rubPerUsd !== null && $rubPerUsd > 0
    && $rubPerEur !== null && $rubPerEur > 0;

echo json_encode([
    'ok' => true,
    'complete' => $complete,
    'fetchedAt' => $fetchedAt,
    'ageSec' => $ageSec,
    'yenPerUsd' => $yenPerUsd,
    'rubPerUsd' => $rubPerUsd,
    'rubPerYen' => $rubPerYen,
    'rubPerEur' => $rubPerEur,
    'meta' => [
        'cacheFile' => basename($file),
        'sources' => [
            'khan' => ($khan['ok'] ?? false) === true,
            'atb' => ($atb['ok'] ?? false) === true,
            'cbr' => ($cbr['ok'] ?? false) === true,
        ],
    ],
], JSON_UNESCAPED_UNICODE);
