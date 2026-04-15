<?php
declare(strict_types=1);

/**
 * Курсы Khan Bank (как на /personal/currency-rate/): JSON api/back/rates.
 * Нужные для калькулятора поля: USD sellRate (бэлэн бус зарах), JPY buyRate (бэлэн бус авах).
 * GET ?date=YYYY-MM-DD — по Улан-Батору по умолчанию сегодня.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=300');

function json_fail(int $http, string $message): void
{
    http_response_code($http);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

$dateParam = isset($_GET['date']) ? trim((string) $_GET['date']) : '';

if ($dateParam !== '') {
    $dt = DateTimeImmutable::createFromFormat('Y-m-d', $dateParam);
    if ($dt === false || $dt->format('Y-m-d') !== $dateParam) {
        json_fail(400, 'Неверный формат date, ожидается YYYY-MM-DD');
    }
} else {
    $dt = new DateTimeImmutable('now', new DateTimeZone('Asia/Ulaanbaatar'));
    $dateParam = $dt->format('Y-m-d');
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

    foreach ($bins as $bin) {
        if ($bin !== 'curl' && !is_file($bin)) {
            continue;
        }

        $out = null;
        if (stripos($disabled, 'proc_open') === false && function_exists('proc_open')) {
            $cmd = [$bin, '-sS', '--connect-timeout', '12', '--max-time', '22', '-k', '-L', $url];
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
                . ' -sS --connect-timeout 12 --max-time 22 -k -L '
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

function fetch_khan_json(string $url): string
{
    if (function_exists('curl_init')) {
        $try = function (bool $insecure) use ($url): array {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_TIMEOUT => 20,
                CURLOPT_HTTPHEADER => [
                    'Accept: application/json',
                    'User-Agent: one-pager-calculator/1.0',
                ],
                CURLOPT_SSL_VERIFYPEER => !$insecure,
                CURLOPT_SSL_VERIFYHOST => $insecure ? 0 : 2,
            ]);
            $body = curl_exec($ch);
            $errno = curl_errno($ch);
            $err = curl_error($ch);
            $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            return [$body, $errno, $err, $code];
        };

        [$body, $errno, $err, $code] = $try(false);
        $sslFail = $errno !== 0 && ($body === false || $errno === 60
            || stripos($err, 'SSL') !== false
            || stripos($err, 'certificate') !== false);
        if ($sslFail) {
            [$body, $errno, $err, $code] = $try(true);
        }
        if ($errno !== 0 || $body === false) {
            json_fail(502, 'Не удалось запросить Khan Bank: ' . ($err !== '' ? $err : 'curl #' . $errno));
        }
        if ($code !== 200) {
            json_fail(502, 'Khan Bank вернул HTTP ' . $code);
        }
        return (string) $body;
    }

    $fallback = fetch_khan_via_system_curl($url);
    if ($fallback !== null) {
        return $fallback;
    }

    if (!extension_loaded('openssl')) {
        json_fail(502, 'Не удалось вызвать системный curl. В php.ini включите extension=openssl или extension=curl.');
    }

    if (!allow_url_fopen_enabled()) {
        json_fail(502, 'Включите allow_url_fopen=On в php.ini.');
    }

    $ctx = stream_context_create([
        'http' => ['timeout' => 20.0, 'header' => "Accept: application/json\r\nUser-Agent: one-pager-calculator/1.0\r\n"],
        'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
    ]);
    $body = @file_get_contents($url, false, $ctx);
    if ($body === false) {
        $again = fetch_khan_via_system_curl($url);
        if ($again !== null) {
            return $again;
        }
        json_fail(502, 'Не удалось запросить Khan Bank по HTTPS.');
    }
    return $body;
}

$raw = fetch_khan_json($url);
$data = json_decode($raw, true);
if (!is_array($data)) {
    json_fail(502, 'Khan Bank вернул не JSON');
}

$usdSell = null;
$jpyBuy = null;
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
    }
}

if ($usdSell === null || $jpyBuy === null || $usdSell <= 0 || $jpyBuy <= 0) {
    json_fail(502, 'В ответе Khan Bank нет USD/JPY');
}

$yenPerUsd = $usdSell / $jpyBuy;

echo json_encode([
    'ok' => true,
    'date' => $dateParam,
    'usdNonCashSellMnt' => round($usdSell, 2),
    'jpyNonCashBuyMnt' => round($jpyBuy, 4),
    'yenPerUsd' => round($yenPerUsd, 4),
], JSON_UNESCAPED_UNICODE);
