<?php
declare(strict_types=1);

/**
 * Обновляет локальный снимок курсов для api/rates_snapshot.php.
 * Запуск по cron (от пользователя www-data):
 *
 *   sudo -u www-data php /var/www/one-pager/api/refresh_rates_cache.php https://uus-avto.ru
 *
 * Лог cron лучше писать в каталог сайта (www-data может не иметь прав на /var/log/):
 *
 *   Пример строки crontab (каждые 15 минут — поле минут 0,15,30,45):
 *   0,15,30,45 * * * * /usr/bin/php .../refresh_rates_cache.php https://uus-avto.ru >> .../api/cache/cron.log 2>&1
 *
 * Базовый URL — первый аргумент или переменная окружения RATES_BASE_URL.
 * На том же сервере можно передать https://uus-avto.ru или http://127.0.0.1
 * (если nginx отдаёт сайт на localhost с нужным Host).
 *
 * Права на каталог кэша (иначе «Permission denied» при записи *.tmp / rates_snapshot.json):
 *   После деплоя вызывается scripts/fix-cache-perms.sh без sudo; пользователь деплоя должен быть в группе www-data:
 *   sudo usermod -aG www-data deploy
 *   Либо один раз вручную: sudo chown www-data:www-data .../api/cache && sudo chmod 775 ...
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

$dir = __DIR__ . '/cache';
if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
    fwrite(STDERR, "Cannot create cache directory: {$dir}\n");
    exit(1);
}

$file = $dir . '/rates_snapshot.json';

/**
 * Прошлый снимок: данные упавшего источника переносим из него, иначе один недоступный банк
 * морозил весь снимок и рабочие источники тоже переставали обновляться (инцидент 27.10.2026).
 */
$previous = [];
if (is_readable($file)) {
    $prevRaw = @file_get_contents($file);
    $prevData = is_string($prevRaw) ? json_decode($prevRaw, true) : null;
    if (is_array($prevData)) {
        $previous = $prevData;
    }
}

$okAll = true;
$reused = [];
foreach ($urls as $key => $url) {
    $fresh = http_get_json($url);
    $freshOk = !isset($fresh['_error']) && (($fresh['ok'] ?? false) === true);
    if ($freshOk) {
        $payload[$key] = $fresh;
        continue;
    }

    $okAll = false;
    fwrite(STDERR, "Failed: {$key} <- {$url}\n");
    if (isset($fresh['error'])) {
        fwrite(STDERR, '  error: ' . $fresh['error'] . "\n");
    }
    if (isset($fresh['_error'])) {
        fwrite(STDERR, '  ' . $fresh['_error'] . "\n");
    }

    $prev = is_array($previous[$key] ?? null) ? $previous[$key] : null;
    if ($prev !== null && ($prev['ok'] ?? false) === true) {
        $prev['_stale'] = true;
        $prev['_staleSince'] = (string) ($prev['_staleSince'] ?? $previous['fetchedAt'] ?? '');
        $prev['_staleReason'] = (string) ($fresh['error'] ?? $fresh['_error'] ?? 'источник недоступен');
        $payload[$key] = $prev;
        $reused[] = $key;
        fwrite(STDERR, "  reused previous values ({$prev['_staleSince']})\n");
    } else {
        $payload[$key] = $fresh;
    }
}

if ($reused !== []) {
    $payload['staleSources'] = $reused;
}
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
