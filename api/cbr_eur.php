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
        json_fail(502, 'Не удалось получить данные ЦБ (нет расширения curl и ошибка HTTPS)');
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
