<?php
declare(strict_types=1);

/**
 * Обновляет локальный снимок курсов для api/rates_snapshot.php.
 * Запуск по cron (рекомендуется от имени пользователя веб-сервера):
 *
 *   sudo -u www-data php /var/www/one-pager/api/refresh_rates_cache.php https://uus-avto.ru
 *
 * Базовый URL — первый аргумент или переменная окружения RATES_BASE_URL.
 * На том же сервере можно передать https://uus-avto.ru или http://127.0.0.1
 * (если nginx отдаёт сайт на localhost с нужным Host).
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    fwrite(STDERR, "CLI only\n");
    exit(1);
}

$base = $argv[1] ?? getenv('RATES_BASE_URL') ?: '';
$base = rtrim(trim($base), '/');
if ($base === '') {
    fwrite(STDERR, "Usage: php refresh_rates_cache.php <BASE_URL>\nExample: php refresh_rates_cache.php https://uus-avto.ru\n");
    exit(1);
}

$moscowToday = (new DateTimeImmutable('now', new DateTimeZone('Europe/Moscow')))->format('Y-m-d');
$dateSuffix = '?date=' . rawurlencode($moscowToday);
$nonce = 'ts=' . (string) time();

$urls = [
    'khan' => $base . '/api/khan_rates.php' . $dateSuffix,
    'atb' => $base . '/api/atb_usd_ulanude.php?' . $nonce,
    'cbr' => $base . '/api/cbr_eur.php' . $dateSuffix,
];

function http_get_json(string $url): array
{
    if (!function_exists('curl_init')) {
        fwrite(STDERR, "PHP curl extension required\n");
        exit(1);
    }
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'User-Agent: one-pager-calculator/1.0 (+rates cache refresh)',
        ],
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    $body = curl_exec($ch);
    $errno = curl_errno($ch);
    $err = curl_error($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($errno !== 0 || $body === false) {
        return ['_error' => 'curl: ' . ($err !== '' ? $err : ('#' . $errno))];
    }
    if ($code < 200 || $code >= 300) {
        return ['_error' => 'HTTP ' . $code, '_body' => mb_substr((string) $body, 0, 500)];
    }
    $data = json_decode((string) $body, true);
    if (!is_array($data)) {
        return ['_error' => 'invalid JSON', '_body' => mb_substr((string) $body, 0, 500)];
    }
    return $data;
}

$payload = [
    'fetchedAt' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('c'),
    'baseUrl' => $base,
    'dateParam' => $moscowToday,
];

$okAll = true;
foreach ($urls as $key => $url) {
    $payload[$key] = http_get_json($url);
    if (isset($payload[$key]['_error']) || (($payload[$key]['ok'] ?? false) !== true)) {
        $okAll = false;
        fwrite(STDERR, "Failed: {$key} <- {$url}\n");
        if (isset($payload[$key]['error'])) {
            fwrite(STDERR, '  error: ' . $payload[$key]['error'] . "\n");
        }
        if (isset($payload[$key]['_error'])) {
            fwrite(STDERR, '  ' . $payload[$key]['_error'] . "\n");
        }
    }
}

if (!$okAll) {
    fwrite(STDERR, "Snapshot not written (one or more sources failed).\n");
    exit(1);
}

$dir = __DIR__ . '/cache';
if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
    fwrite(STDERR, "Cannot create cache directory: {$dir}\n");
    exit(1);
}

$file = $dir . '/rates_snapshot.json';
$tmp = $file . '.' . getmypid() . '.tmp';
$json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
if ($json === false) {
    fwrite(STDERR, "json_encode failed\n");
    exit(1);
}

if (file_put_contents($tmp, $json) === false) {
    fwrite(STDERR, "Cannot write {$tmp}\n");
    exit(1);
}

if (!@rename($tmp, $file)) {
    @unlink($tmp);
    fwrite(STDERR, "Cannot rename to {$file}\n");
    exit(1);
}

echo "OK wrote {$file}\n";
exit(0);
