<?php
declare(strict_types=1);

/**
 * Курсы Khan Bank (как на /personal/currency-rate/): JSON api/back/rates.
 * Нужные для калькулятора поля:
 * - USD sellRate — колонка «зарах» на сайте Khan (банк продаёт USD);
 * - JPY sellRate — колонка «зарах» на сайте Khan (используется для ¥→₮ в калькуляторе).
 * GET ?date=YYYY-MM-DD — по Улан-Батору по умолчанию сегодня.
 *
 * 27.10.2026: Khan закрыл этот endpoint бот-защитой (Radware) — с IP сервера вместо JSON
 * приходит челлендж. Защиту банка не обходим: клиент представляется своим User-Agent.
 * Вместо этого при неудаче отдаём последний успешный ответ из api/cache/khan_last.json
 * с пометкой stale (HTTP 200) — лучше показать последний известный курс и честно подписать
 * его дату, чем оставить калькулятор без курсов вовсе.
 * Постоянное решение — легальный источник курса ₮ или ручной ввод в админке.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=300');

/** Сколько держим аварийный запас последнего удачного ответа. */
const KHAN_CACHE_MAX_AGE_SEC = 7 * 24 * 3600;

function khan_cache_file(): string
{
    return __DIR__ . '/cache/khan_last.json';
}

function json_out(array $payload, int $http = 200): void
{
    http_response_code($http);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Последний успешный ответ: аварийный запас, когда живой Khan недоступен. */
function khan_cache_read(): ?array
{
    $file = khan_cache_file();
    if (!is_readable($file)) {
        return null;
    }
    $raw = @file_get_contents($file);
    if (!is_string($raw) || $raw === '') {
        return null;
    }
    $data = json_decode($raw, true);
    if (!is_array($data) || ($data['ok'] ?? false) !== true) {
        return null;
    }
    $savedAt = isset($data['savedAt']) ? strtotime((string) $data['savedAt']) : false;
    if ($savedAt === false || (time() - $savedAt) > KHAN_CACHE_MAX_AGE_SEC) {
        return null;
    }
    $data['_savedAtTs'] = $savedAt;
    return $data;
}

function khan_cache_write(array $payload): void
{
    $file = khan_cache_file();
    $dir = dirname($file);
    if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
        return;
    }
    $payload['savedAt'] = (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('c');
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        return;
    }
    $tmp = $file . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, $json) === false) {
        return;
    }
    if (!@rename($tmp, $file)) {
        @unlink($tmp);
    }
}

/** Отдать аварийный запас, если он есть; иначе — ошибка с диагностикой. */
function khan_fail_with_cache(string $reason, array $diag = []): void
{
    $cached = khan_cache_read();
    if ($cached !== null) {
        $savedAt = (string) ($cached['savedAt'] ?? '');
        $savedTs = (int) ($cached['_savedAtTs'] ?? 0);
        unset($cached['_savedAtTs'], $cached['savedAt']);
        $cached['stale'] = true;
        $cached['staleSince'] = $savedAt;
        $cached['staleAgeSec'] = $savedTs > 0 ? max(0, time() - $savedTs) : null;
        $cached['staleReason'] = $reason;
        json_out($cached, 200);
    }
    $out = ['ok' => false, 'error' => $reason];
    if ($diag !== []) {
        $out['diag'] = $diag;
    }
    json_out($out, 502);
}

$dateParam = isset($_GET['date']) ? trim((string) $_GET['date']) : '';

if ($dateParam !== '') {
    $dt = DateTimeImmutable::createFromFormat('Y-m-d', $dateParam);
    if ($dt === false || $dt->format('Y-m-d') !== $dateParam) {
        json_out(['ok' => false, 'error' => 'Неверный формат date, ожидается YYYY-MM-DD'], 400);
    }
} else {
    $dt = new DateTimeImmutable('now', new DateTimeZone('Asia/Ulaanbaatar'));
    $dateParam = $dt->format('Y-m-d');
}

// Ручной курс из админки на свой день главнее банка (см. manual_rates_lib.php).
// refresh_rates_cache.php просит source=bank: в снимке хранится только курс банка,
// а ручной накладывается при чтении — так он вступает в силу сразу и сам истекает.
require_once __DIR__ . '/manual_rates_lib.php';
if (($_GET['source'] ?? '') !== 'bank') {
    $manual = manual_rates_active();
    if ($manual !== null && manual_rates_applies_to($dateParam)) {
        json_out(manual_rates_as_khan_payload($manual));
    }
}

$url = 'https://www.khanbank.com/api/back/rates?date=' . rawurlencode($dateParam);

function khan_json_looks_valid(string $s): bool
{
    $t = trim($s);
    if ($t === '' || ($t[0] !== '[' && $t[0] !== '{')) {
        return false;
    }
    return stripos($s, 'currency') !== false;
}

/** Представляемся своим именем: бот-защиту банка не обходим, см. заголовок файла. */
function khan_request_headers(): array
{
    return [
        'Accept: application/json',
        'User-Agent: one-pager-calculator/1.0 (+https://uus-avto.ru)',
    ];
}

function allow_url_fopen_enabled(): bool
{
    $v = strtolower((string) ini_get('allow_url_fopen'));
    return in_array($v, ['1', 'on', 'true'], true);
}

/**
 * Системный curl, если в PHP нет ext-curl / openssl (типично для Windows без CA).
 */
function fetch_khan_via_system_curl(string $url): ?string
{
    $bins = ['curl'];
    if (PHP_OS_FAMILY === 'Windows') {
        array_unshift($bins, 'C:\\Windows\\System32\\curl.exe');
        if (is_dir('C:\\msys64\\mingw64\\bin')) {
            array_unshift($bins, 'C:\\msys64\\mingw64\\bin\\curl.exe');
        }
    }

    $disabled = (string) ini_get('disable_functions');
    $ua = 'one-pager-calculator/1.0 (+https://uus-avto.ru)';

    foreach ($bins as $bin) {
        if ($bin !== 'curl' && !is_file($bin)) {
            continue;
        }

        $out = null;
        if (stripos($disabled, 'proc_open') === false && function_exists('proc_open')) {
            $cmd = [
                $bin, '-sS', '--compressed', '--connect-timeout', '12', '--max-time', '22', '-k', '-L',
                '-A', $ua,
                '-H', 'Accept: application/json',
                $url,
            ];
            $spec = [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
            $proc = @proc_open($cmd, $spec, $pipes, null, null);
            if ($proc !== false) {
                fclose($pipes[0]);
                $stdout = stream_get_contents($pipes[1]);
                $stderr = stream_get_contents($pipes[2]);
                fclose($pipes[1]);
                fclose($pipes[2]);
                proc_close($proc);
                if (is_string($stdout) && $stdout !== '') {
                    $out = $stdout;
                } elseif (is_string($stderr) && $stderr !== '' && khan_json_looks_valid($stderr)) {
                    $out = $stderr;
                }
            }
        }

        if ($out === null && stripos($disabled, 'shell_exec') === false && function_exists('shell_exec')) {
            $line = escapeshellarg($bin)
                . ' -sS --compressed --connect-timeout 12 --max-time 22 -k -L '
                . '-A ' . escapeshellarg($ua) . ' '
                . escapeshellarg($url)
                . ' 2>&1';
            $sh = shell_exec($line);
            if (is_string($sh) && $sh !== '') {
                $out = $sh;
            }
        }

        if ($out !== null && khan_json_looks_valid($out)) {
            return $out;
        }
    }

    return null;
}

/**
 * Тело ответа Khan или null; диагностика неудачи — в $diag (HTTP-код, content-type и начало
 * ответа: по ним видно, челлендж это бот-защиты или сетевая ошибка).
 */
function fetch_khan_body(string $url, array &$diag): ?string
{
    if (function_exists('curl_init')) {
        $try = function (bool $insecure) use ($url): array {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_TIMEOUT => 20,
                CURLOPT_CONNECTTIMEOUT => 12,
                CURLOPT_HTTPHEADER => khan_request_headers(),
                CURLOPT_ENCODING => '',
                CURLOPT_SSL_VERIFYPEER => !$insecure,
                CURLOPT_SSL_VERIFYHOST => $insecure ? 0 : 2,
            ]);
            $body = curl_exec($ch);
            $errno = curl_errno($ch);
            $err = (string) curl_error($ch);
            $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $ctype = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
            // Начиная с PHP 8.0 curl_close() no-op, в 8.5 помечен deprecated — не вызываем.
            return [$body, $errno, $err, $code, $ctype];
        };

        [$body, $errno, $err, $code, $ctype] = $try(false);
        $sslFail = $errno !== 0 && ($errno === 60
            || stripos($err, 'SSL') !== false
            || stripos($err, 'certificate') !== false);
        if ($sslFail) {
            [$body, $errno, $err, $code, $ctype] = $try(true);
        }

        if ($errno === 0 && is_string($body) && $code === 200 && khan_json_looks_valid($body)) {
            return $body;
        }

        $diag = [
            'httpCode' => $code,
            'contentType' => $ctype,
            'curlError' => $err !== '' ? $err : null,
            'bodyHead' => is_string($body) ? mb_substr(trim($body), 0, 180) : null,
        ];
    }

    $fallback = fetch_khan_via_system_curl($url);
    if ($fallback !== null) {
        return $fallback;
    }

    if (function_exists('curl_init')) {
        return null;
    }

    if (!extension_loaded('openssl')) {
        $diag['phpHint'] = 'Нет ext-curl и ext-openssl: включите extension=curl в php.ini.';
        return null;
    }
    if (!allow_url_fopen_enabled()) {
        $diag['phpHint'] = 'Включите allow_url_fopen=On в php.ini.';
        return null;
    }

    $ctx = stream_context_create([
        'http' => [
            'timeout' => 20.0,
            'header' => implode("\r\n", khan_request_headers()) . "\r\n",
        ],
        'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
    ]);
    $body = @file_get_contents($url, false, $ctx);
    return is_string($body) && khan_json_looks_valid($body) ? $body : null;
}

$diag = [];
$raw = fetch_khan_body($url, $diag);
if ($raw === null) {
    khan_fail_with_cache('Khan Bank не отдал JSON (бот-защита или сеть)', $diag);
}

$data = json_decode($raw, true);
if (!is_array($data)) {
    khan_fail_with_cache('Khan Bank вернул не JSON', $diag);
}

$usdSell = null;
$jpyBuy = null;
$jpySell = null;
foreach ($data as $row) {
    if (!is_array($row)) {
        continue;
    }
    $cur = $row['currency'] ?? '';
    if ($cur === 'USD') {
        $usdSell = isset($row['sellRate']) ? (float) $row['sellRate'] : null;
    }
    if ($cur === 'JPY') {
        $jpyBuy = isset($row['buyRate']) ? (float) $row['buyRate'] : null;
        $jpySell = isset($row['sellRate']) ? (float) $row['sellRate'] : null;
    }
}

if ($usdSell === null || $jpySell === null || $usdSell <= 0 || $jpySell <= 0) {
    khan_fail_with_cache('В ответе Khan Bank нет USD/JPY');
}

$yenPerUsd = $usdSell / $jpySell;

$result = [
    'ok' => true,
    'date' => $dateParam,
    'usdNonCashSellMnt' => round($usdSell, 2),
    'jpyNonCashBuyMnt' => $jpyBuy !== null ? round($jpyBuy, 4) : null,
    'jpyNonCashSellMnt' => round($jpySell, 4),
    'usdMnt' => round($usdSell, 2),
    'jpyMnt' => round($jpySell, 4),
    'yenPerUsd' => round($yenPerUsd, 4),
];

khan_cache_write($result);

echo json_encode($result, JSON_UNESCAPED_UNICODE);
