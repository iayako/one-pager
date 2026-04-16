<?php
declare(strict_types=1);

/**
 * Курс EUR → RUB по официальным данным ЦБ (ежедневный XML).
 * GET ?date=YYYY-MM-DD — курс на указанную дату.
 * Без date — тот же набор, что на странице «Официальные курсы» (XML без date_req = актуальная таблица).
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

// Без date_req ЦБ отдаёт ту же таблицу, что на https://www.cbr.ru/currency_base/daily/
// С date_req=«сегодня по календарю» можно получить вчерашний курс после публикации новой таблицы.
if ($dateParam === '') {
    $url = 'https://www.cbr.ru/scripts/XML_daily.asp';
} else {
    $dateReq = $dt->format('d/m/Y');
    $url = 'https://www.cbr.ru/scripts/XML_daily.asp?date_req=' . rawurlencode($dateReq);
}

function cbr_xml_looks_valid(string $s): bool
{
    return stripos($s, 'ValCurs') !== false || stripos($s, 'CharCode') !== false;
}

/**
 * Запрос через curl.exe (если в PHP нет ext-curl / openssl для HTTPS).
 * На Windows shell_exec('curl …') часто не находит бинарник или коверкает URL — используем
 * явный путь к System32\curl.exe и proc_open с аргументами без escapeshellarg для URL.
 */
function fetch_cbr_via_system_curl(string $url): ?string
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
            $cmd = [$bin, '-sS', '--connect-timeout', '8', '--max-time', '15', '-k', '-L', $url];
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
                } elseif (is_string($stderr) && $stderr !== '' && cbr_xml_looks_valid($stderr)) {
                    $out = $stderr;
                }
            }
        }

        if ($out === null && stripos($disabled, 'shell_exec') === false && function_exists('shell_exec')) {
            $line = escapeshellarg($bin)
                . ' -sS --connect-timeout 8 --max-time 15 -k -L '
                . escapeshellarg($url)
                . ' 2>&1';
            $sh = shell_exec($line);
            if (is_string($sh) && $sh !== '') {
                $out = $sh;
            }
        }

        if ($out !== null && cbr_xml_looks_valid($out)) {
            return $out;
        }
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
            // Начиная с PHP 8.0 curl_close() no-op, в 8.5 помечен deprecated.
            // Не вызываем, чтобы предупреждения не попадали в JSON-ответ.
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
        json_fail(502, 'Не удалось вызвать системный curl (proc_open/shell_exec) и в PHP выключено openssl. В php.ini включите extension=openssl или extension=curl, либо снимите proc_open/shell_exec с disable_functions.');
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

$requestedDate = $dateParam !== '' ? $dt->format('Y-m-d') : '';
if ($requestedDate === '' && $cbrDate !== '') {
    $parsed = DateTimeImmutable::createFromFormat('d.m.Y', $cbrDate);
    if ($parsed !== false) {
        $requestedDate = $parsed->format('Y-m-d');
    }
}
if ($requestedDate === '') {
    $requestedDate = $dt->format('Y-m-d');
}

echo json_encode([
    'ok' => true,
    'rubPerEur' => round($rubPerEur, 6),
    'currency' => 'EUR',
    'nominal' => $nominal,
    'cbrDate' => $cbrDate,
    'requestedDate' => $requestedDate,
], JSON_UNESCAPED_UNICODE);
