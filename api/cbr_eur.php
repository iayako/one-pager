<?php
declare(strict_types=1);

/**
 * Курс EUR → RUB по официальным данным ЦБ (ежедневный XML).
 * GET ?date=YYYY-MM-DD (опционально; по умолчанию сегодня по календарю ЦБ).
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
    $dt = new DateTimeImmutable('now', new DateTimeZone('Europe/Moscow'));
}

$dateReq = $dt->format('d/m/Y');
$url = 'https://www.cbr.ru/scripts/XML_daily.asp?date_req=' . rawurlencode($dateReq);

/**
 * Запрос URL через curl.exe в PATH (если в PHP отключены ext-curl и HTTPS-стримы).
 * -k отключает проверку SSL (как запасной путь в dev).
 */
function fetch_cbr_via_system_curl(string $url): ?string
{
    if (!function_exists('shell_exec')) {
        return null;
    }
    $disabled = ini_get('disable_functions');
    if (is_string($disabled) && stripos($disabled, 'shell_exec') !== false) {
        return null;
    }
    $cmd = 'curl -fsS --connect-timeout 8 --max-time 15 -k ' . escapeshellarg($url) . ' 2>&1';
    $out = shell_exec($cmd);
    if (!is_string($out) || $out === '') {
        return null;
    }
    if (stripos($out, 'ValCurs') !== false || stripos($out, '<?xml') !== false) {
        return $out;
    }
    return null;
}

function allow_url_fopen_enabled(): bool
{
    $v = strtolower((string) ini_get('allow_url_fopen'));
    return in_array($v, ['1', 'on', 'true'], true);
}

/**
 * Загрузка по HTTPS. На части установок Windows нет CA в PHP — тогда первая попытка падает по SSL;
 * повторяем без проверки сертификата (публичные курсы ЦБ, не секретные данные).
 */
function fetch_cbr_xml(string $url): array
{
    if (function_exists('curl_init')) {
        $opts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_HTTPHEADER => [
                'Accept: application/xml,text/xml,*/*',
                'User-Agent: one-pager-calculator/1.0',
            ],
        ];

        $try = function (bool $insecureSsl) use ($url, $opts): array {
            $ch = curl_init($url);
            $all = $opts + [
                CURLOPT_SSL_VERIFYPEER => !$insecureSsl,
                CURLOPT_SSL_VERIFYHOST => $insecureSsl ? 0 : 2,
            ];
            curl_setopt_array($ch, $all);
            $body = curl_exec($ch);
            $errno = curl_errno($ch);
            $errstr = curl_error($ch);
            $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            return [$body, $errno, $errstr, $status];
        };

        [$body, $errno, $errstr, $status] = $try(false);

        $sslFail = $errno !== 0 && ($body === false || $errno === 60
            || stripos($errstr, 'SSL') !== false
            || stripos($errstr, 'certificate') !== false);
        if ($sslFail) {
            [$body, $errno, $errstr, $status] = $try(true);
        }

        if ($errno !== 0 || $body === false) {
            $detail = $errstr !== '' ? $errstr : ('curl #' . $errno);
            json_fail(502, 'Не удалось получить данные ЦБ: ' . $detail);
        }
        if ($status !== 200) {
            json_fail(502, 'ЦБ вернул ответ HTTP ' . $status);
        }
        return [$body];
    }

    $fallback = fetch_cbr_via_system_curl($url);
    if ($fallback !== null) {
        return [$fallback];
    }

    if (!extension_loaded('openssl')) {
        json_fail(502, 'В PHP не включено расширение openssl (нужно для HTTPS). В php.ini раскомментируйте extension=openssl, либо включите extension=curl, либо установите Git for Windows (curl в PATH) и перезапустите сервер.');
    }

    if (!allow_url_fopen_enabled()) {
        json_fail(502, 'В php.ini выключено allow_url_fopen. Включите allow_url_fopen=On или установите расширение curl для PHP.');
    }

    $ctx = stream_context_create([
        'http' => [
            'timeout' => 15.0,
            'header' => "Accept: application/xml,text/xml,*/*\r\nUser-Agent: one-pager-calculator/1.0\r\n",
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
        ],
    ]);
    $body = @file_get_contents($url, false, $ctx);
    $err1 = $body === false && function_exists('error_get_last') ? error_get_last() : null;
    if ($body === false) {
        $ctx2 = stream_context_create([
            'http' => [
                'timeout' => 15.0,
                'header' => "Accept: application/xml,text/xml,*/*\r\nUser-Agent: one-pager-calculator/1.0\r\n",
            ],
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
            ],
        ]);
        $body = @file_get_contents($url, false, $ctx2);
    }
    if ($body === false) {
        $hint = '';
        if ($err1 !== null && isset($err1['message'])) {
            $hint = ' (' . $err1['message'] . ')';
        }
        $again = fetch_cbr_via_system_curl($url);
        if ($again !== null) {
            return [$again];
        }
        json_fail(502, 'Не удалось получить данные ЦБ по HTTPS' . $hint . '. Включите extension=curl в php.ini или положите curl.exe в PATH (например из Git for Windows).');
    }
    return [$body];
}

[$body] = fetch_cbr_xml($url);

$xml = @simplexml_load_string($body);
if ($xml === false) {
    json_fail(502, 'Не удалось разобрать ответ ЦБ');
}

$rubPerEur = null;
$nominal = 1;

foreach ($xml->Valute as $v) {
    if ((string) $v->CharCode === 'EUR') {
        $nominal = max(1, (int) $v->Nominal);
        $valueStr = str_replace(',', '.', (string) $v->Value);
        $rubPerEur = (float) $valueStr / $nominal;
        break;
    }
}

if ($rubPerEur === null || !is_finite($rubPerEur) || $rubPerEur <= 0) {
    json_fail(502, 'В курсах ЦБ на дату не найдена пара EUR');
}

$cbrDate = isset($xml['Date']) ? (string) $xml['Date'] : '';

echo json_encode([
    'ok' => true,
    'rubPerEur' => round($rubPerEur, 6),
    'currency' => 'EUR',
    'nominal' => $nominal,
    'cbrDate' => $cbrDate,
    'requestedDate' => $dt->format('Y-m-d'),
], JSON_UNESCAPED_UNICODE);
