<?php
declare(strict_types=1);

/**
 * АТБ (atb.su) — курс USD→RUB для города «Улан-Удэ».
 *
 * Как на странице https://www.atb.su/services/exchange/:
 * - выбираем город (через Bitrix ajax action setCity)
 * - выбираем валюту USD (для конвертера это означает взять коэффициенты usd1/rub1)
 * - возвращаем значение, которое окажется в input[data-exchange-to-price] при from_price=1
 *
 * Ответ: { ok, cityId, cityName, from_price, to_price, rubPerUsd, meta }
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=300');

function json_fail(int $http, string $message, array $meta = []): void
{
    http_response_code($http);
    echo json_encode(['ok' => false, 'error' => $message, 'meta' => $meta], JSON_UNESCAPED_UNICODE);
    exit;
}

function normalize_number(string $s): ?float
{
    $t = trim($s);
    if ($t === '') {
        return null;
    }
    $t = str_replace([' ', "\u{00A0}"], '', $t);
    $t = str_replace(',', '.', $t);
    if (!preg_match('/^-?\d+(?:\.\d+)?$/', $t)) {
        return null;
    }
    $v = (float) $t;
    return is_finite($v) ? $v : null;
}

/**
 * CURL с cookie jar (обязательно для setCity).
 * На Windows без CA часто ломается SSL — пробуем ещё раз без валидации (публичные данные).
 */
function curl_request(string $method, string $url, array $headers, ?string $body, string $cookieJar): array
{
    if (!function_exists('curl_init')) {
        json_fail(502, 'Для парсинга АТБ нужен PHP с расширением curl (ext-curl).');
    }

    $try = function (bool $insecureSsl) use ($method, $url, $headers, $body, $cookieJar): array {
        $ch = curl_init($url);
        $opts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 25,
            CURLOPT_CONNECTTIMEOUT => 12,
            CURLOPT_SSL_VERIFYPEER => !$insecureSsl,
            CURLOPT_SSL_VERIFYHOST => $insecureSsl ? 0 : 2,
            CURLOPT_COOKIEJAR => $cookieJar,
            CURLOPT_COOKIEFILE => $cookieJar,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_USERAGENT => 'one-pager-calculator/1.0 (+atb parser)',
        ];

        if ($method !== 'GET') {
            $opts[CURLOPT_CUSTOMREQUEST] = $method;
            $opts[CURLOPT_POSTFIELDS] = $body ?? '';
        }

        curl_setopt_array($ch, $opts);
        $respBody = curl_exec($ch);
        $errno = curl_errno($ch);
        $err = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        // Начиная с PHP 8.0 curl_close() фактически no-op, а с 8.5 помечен deprecated,
        // поэтому не вызываем его, чтобы не получать предупреждения в вывод.
        return [$respBody, $errno, $err, $status, $insecureSsl];
    };

    [$respBody, $errno, $err, $status, $insecure] = $try(false);
    $sslFail = $errno !== 0 && ($respBody === false || $errno === 60
        || stripos($err, 'SSL') !== false
        || stripos($err, 'certificate') !== false);
    if ($sslFail) {
        [$respBody, $errno, $err, $status, $insecure] = $try(true);
    }

    if ($errno !== 0 || $respBody === false) {
        return [null, 0, 'curl error: ' . ($err !== '' ? $err : ('#' . $errno)) . ($insecure ? ' (insecure ssl)' : '')];
    }
    return [$respBody, $status, null];
}

function extract_bitrix_sessid(string $html): ?string
{
    if (preg_match("/'bitrix_sessid':'([a-f0-9]{32})'/i", $html, $m)) {
        return $m[1];
    }
    // резервный вариант (иногда встречается BX.message({..., 'bitrix_sessid':'...'})
    if (preg_match('/bitrix_sessid[\'"]\s*:\s*[\'"]([a-f0-9]{32})[\'"]/i', $html, $m2)) {
        return $m2[1];
    }
    return null;
}

function post_set_city(string $sessid, int $cityId, string $cookieJar): void
{
    $url = 'https://www.atb.su/bitrix/services/main/ajax.php?mode=ajax&c=dterra%3Acity&action=setCity';
    $body = http_build_query([
        'sessid' => $sessid,
        'cityId' => (string) $cityId,
    ], '', '&', PHP_QUERY_RFC3986);

    [$resp, $statusOr0, $err] = curl_request('POST', $url, [
        'Content-Type: application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With: XMLHttpRequest',
        'Accept: application/json, text/plain, */*',
    ], $body, $cookieJar);

    if ($resp === null) {
        json_fail(502, 'Не удалось вызвать setCity на atb.su', ['detail' => $err]);
    }
    if ((int) $statusOr0 !== 200) {
        json_fail(502, 'ATB setCity вернул HTTP ' . (int) $statusOr0, ['body' => mb_substr((string) $resp, 0, 3000)]);
    }

    $json = json_decode((string) $resp, true);
    if (!is_array($json) || ($json['status'] ?? '') !== 'success') {
        json_fail(502, 'Неожиданный ответ ATB setCity', ['body' => mb_substr((string) $resp, 0, 3000)]);
    }
    if (($json['data'] ?? null) !== true) {
        json_fail(502, 'ATB setCity не подтвердил смену города', ['response' => $json]);
    }
}

function find_city_id_by_suggest(string $sessid, string $query, string $expectedCityName, string $cookieJar): int
{
    $url = 'https://www.atb.su/bitrix/services/main/ajax.php?mode=ajax&c=dterra%3Acity&action=getSuggestions';
    $body = http_build_query([
        'sessid' => $sessid,
        'value' => $query,
    ], '', '&', PHP_QUERY_RFC3986);

    [$resp, $statusOr0, $err] = curl_request('POST', $url, [
        'Content-Type: application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With: XMLHttpRequest',
        'Accept: application/json, text/plain, */*',
    ], $body, $cookieJar);

    if ($resp === null) {
        json_fail(502, 'Не удалось вызвать getSuggestions на atb.su', ['detail' => $err]);
    }
    if ((int) $statusOr0 !== 200) {
        json_fail(502, 'ATB getSuggestions вернул HTTP ' . (int) $statusOr0, ['body' => mb_substr((string) $resp, 0, 3000)]);
    }

    $json = json_decode((string) $resp, true);
    if (!is_array($json) || ($json['status'] ?? '') !== 'success') {
        json_fail(502, 'Неожиданный ответ ATB getSuggestions', ['body' => mb_substr((string) $resp, 0, 3000)]);
    }
    $html = (string) (($json['data']['html'] ?? '') ?: '');
    if ($html === '') {
        json_fail(502, 'ATB getSuggestions не вернул HTML');
    }

    // Ищем ссылку select-city с нужным названием.
    $re = '/data-city-id="(\d+)"[^>]*>\s*' . preg_quote($expectedCityName, '/') . '\s*<\/a>/ui';
    if (preg_match($re, $html, $m)) {
        return (int) $m[1];
    }
    // Если точного совпадения нет — берём первый город из выдачи (на случай вариаций дефисов/пробелов),
    // но сообщаем в meta что это fallback.
    if (preg_match('/data-city-id="(\d+)"/', $html, $m2)) {
        return (int) $m2[1];
    }

    json_fail(502, 'Не удалось найти cityId в ответе getSuggestions', ['suggestHtml' => $html]);
}

function extract_hidden_rate(string $html, string $name): ?float
{
    $re = '/<input\b[^>]*\bname="' . preg_quote($name, '/') . '"[^>]*\bvalue="([^"]+)"[^>]*>/i';
    if (!preg_match($re, $html, $m)) {
        return null;
    }
    return normalize_number($m[1]);
}

$cityName = 'Улан-Удэ';

$cookieJar = tempnam(sys_get_temp_dir(), 'atb_cookie_');
if ($cookieJar === false) {
    json_fail(500, 'Не удалось создать временный cookie jar');
}

try {
    // 1) стартовая страница — чтобы получить sessid и базовые cookie
    [$html, $status, $err] = curl_request('GET', 'https://www.atb.su/services/exchange/', [
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    ], null, $cookieJar);

    if ($html === null) {
        json_fail(502, 'Не удалось загрузить страницу АТБ', ['detail' => $err]);
    }
    if ((int) $status !== 200) {
        json_fail(502, 'АТБ вернул HTTP ' . (int) $status, ['body' => mb_substr((string) $html, 0, 1200)]);
    }

    $sessid = extract_bitrix_sessid((string) $html);
    if ($sessid === null) {
        json_fail(502, 'Не найден bitrix_sessid на странице АТБ (возможно поменялась разметка)', [
            'body' => mb_substr((string) $html, 0, 2000),
        ]);
    }

    // 2) смена города (как при клике в шапке)
    $cityId = find_city_id_by_suggest($sessid, 'Улан', $cityName, $cookieJar);
    post_set_city($sessid, $cityId, $cookieJar);

    // 3) повторная загрузка обмена валюты уже в контексте города
    [$html2, $status2, $err2] = curl_request('GET', 'https://www.atb.su/services/exchange/?changecity=yes', [
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    ], null, $cookieJar);

    if ($html2 === null) {
        json_fail(502, 'Не удалось повторно загрузить страницу АТБ после смены города', ['detail' => $err2]);
    }
    if ((int) $status2 !== 200) {
        json_fail(502, 'АТБ (после смены города) вернул HTTP ' . (int) $status2, ['body' => mb_substr((string) $html2, 0, 1200)]);
    }

    // 4) достаём коэффициенты конвертера
    $usd1 = extract_hidden_rate((string) $html2, 'usd1');
    $rub1 = extract_hidden_rate((string) $html2, 'rub1');

    // rub1 обычно 1, но пусть будет как на странице
    if ($usd1 === null || $usd1 <= 0) {
        json_fail(502, 'Не найден коэффициент usd1 на странице АТБ (возможно поменялась разметка)');
    }
    if ($rub1 === null || $rub1 <= 0) {
        $rub1 = 1.0;
    }

    $fromPrice = 1.0;
    $toPrice = $usd1 * $fromPrice / $rub1;

    echo json_encode([
        'ok' => true,
        'cityId' => $cityId,
        'cityName' => $cityName,
        'from_price' => $fromPrice,
        'to_price' => round($toPrice, 6),
        'rubPerUsd' => round($toPrice, 6),
        'meta' => [
            'source' => 'https://www.atb.su/services/exchange/',
            'sessid' => $sessid,
        ],
    ], JSON_UNESCAPED_UNICODE);
} finally {
    @unlink($cookieJar);
}

