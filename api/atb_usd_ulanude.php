<?php
declare(strict_types=1);

/**
 * АТБ (atb.su) — курсы для города «Улан-Удэ».
 *
 * Основной источник:
 * блок "Курсы валют" -> вкладка "для денежных переводов" (currencyTab4):
 * - USD "покупка" -> ₽ за 1 $
 * - JPY "покупка" (обычно "за 100¥") -> ₽ за 1 ¥
 * - строка "Актуально на ..."
 *
 * Ответ: { ok, cityId, cityName, rubPerUsd, rubPerYen, asOfText, ... }
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

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

function can_use_proc_open(): bool
{
    $disabled = strtolower((string) ini_get('disable_functions'));
    return function_exists('proc_open') && stripos($disabled, 'proc_open') === false;
}

function can_use_shell_exec(): bool
{
    $disabled = strtolower((string) ini_get('disable_functions'));
    return function_exists('shell_exec') && stripos($disabled, 'shell_exec') === false;
}

function system_curl_bins(): array
{
    $bins = ['curl'];
    if (PHP_OS_FAMILY === 'Windows') {
        array_unshift($bins, 'C:\\Windows\\System32\\curl.exe');
        if (is_dir('C:\\msys64\\mingw64\\bin')) {
            array_unshift($bins, 'C:\\msys64\\mingw64\\bin\\curl.exe');
        }
    }
    return $bins;
}

function parse_curl_output_with_status(string $out): array
{
    if (preg_match('/\n__HTTP_STATUS__:(\d{3})\s*$/', $out, $m, PREG_OFFSET_CAPTURE)) {
        $status = (int) $m[1][0];
        $markPos = $m[0][1];
        $body = substr($out, 0, $markPos);
        return [$body, $status];
    }
    return [$out, 0];
}

function system_curl_request(string $method, string $url, array $headers, ?string $body, string $cookieJar): array
{
    $baseArgs = [
        '-sS',
        '-L',
        '-k',
        '--connect-timeout', '12',
        '--max-time', '25',
        '-A', 'one-pager-calculator/1.0 (+atb parser system curl)',
        '-c', $cookieJar,
        '-b', $cookieJar,
    ];

    foreach ($headers as $h) {
        $baseArgs[] = '-H';
        $baseArgs[] = $h;
    }

    if ($method !== 'GET') {
        $baseArgs[] = '-X';
        $baseArgs[] = $method;
        $baseArgs[] = '--data-raw';
        $baseArgs[] = $body ?? '';
    }

    $baseArgs[] = '-w';
    $baseArgs[] = "\n__HTTP_STATUS__:%{http_code}";
    $baseArgs[] = $url;

    foreach (system_curl_bins() as $bin) {
        if ($bin !== 'curl' && !is_file($bin)) {
            continue;
        }

        if (can_use_proc_open()) {
            $cmd = array_merge([$bin], $baseArgs);
            $spec = [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
            $proc = @proc_open($cmd, $spec, $pipes, null, null);
            if ($proc !== false) {
                fclose($pipes[0]);
                $stdout = (string) stream_get_contents($pipes[1]);
                $stderr = (string) stream_get_contents($pipes[2]);
                fclose($pipes[1]);
                fclose($pipes[2]);
                proc_close($proc);

                if ($stdout !== '') {
                    [$respBody, $status] = parse_curl_output_with_status($stdout);
                    if ($status > 0) {
                        return [$respBody, $status, null];
                    }
                }
                if ($stderr !== '') {
                    return [null, 0, 'system curl error: ' . $stderr];
                }
            }
        }

        if (can_use_shell_exec()) {
            $parts = [escapeshellarg($bin)];
            foreach ($baseArgs as $arg) {
                $parts[] = escapeshellarg($arg);
            }
            $line = implode(' ', $parts) . ' 2>&1';
            $out = shell_exec($line);
            if (is_string($out) && $out !== '') {
                [$respBody, $status] = parse_curl_output_with_status($out);
                if ($status > 0) {
                    return [$respBody, $status, null];
                }
            }
        }
    }

    return [null, 0, 'Не удалось выполнить системный curl (проверьте PATH и disable_functions).'];
}

/**
 * CURL с cookie jar (обязательно для setCity).
 * На Windows без CA часто ломается SSL — пробуем ещё раз без валидации (публичные данные).
 */
function curl_request(string $method, string $url, array $headers, ?string $body, string $cookieJar): array
{
    if (!function_exists('curl_init')) {
        return system_curl_request($method, $url, $headers, $body, $cookieJar);
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

function extract_number_from_text(string $text): ?float
{
    if (preg_match('/-?\d+(?:[.,]\d+)?/u', $text, $m)) {
        return normalize_number($m[0]);
    }
    return null;
}

function parse_buy_value_from_row(DOMXPath $xp, DOMElement $row): ?float
{
    // В таблице currencyTab4 первая ячейка с курсом после "валюта" — это "покупка".
    // Так надежнее, чем искать русское слово "покупка" (может ломаться из-за кодировок).
    $tdNodes = $xp->query(
        ".//div[contains(concat(' ', normalize-space(@class), ' '), ' currency-table__td ') and " .
        "not(contains(concat(' ', normalize-space(@class), ' '), ' currency-table__td--tr-name '))]",
        $row
    );
    if ($tdNodes === false) {
        return null;
    }

    $firstRateCell = $tdNodes->item(0);
    if (!($firstRateCell instanceof DOMElement)) {
        return null;
    }

    $headText = (string) $xp->evaluate("string(.//div[contains(concat(' ', normalize-space(@class), ' '), ' currency-table__head ')])", $firstRateCell);
    $fullText = (string) $xp->evaluate("string(.)", $firstRateCell);
    $fullText = preg_replace('/\s+/u', ' ', trim($fullText)) ?? '';
    if ($fullText === '') {
        return null;
    }

    // Убираем заголовок ячейки (buy/purchase) и берём первое число.
    $valueText = $fullText;
    if ($headText !== '') {
        $valueText = trim(str_replace($headText, '', $fullText));
    }

    $value = extract_number_from_text($valueText);
    if ($value !== null) {
        return $value;
    }

    return extract_number_from_text($fullText);
}

/**
 * Парсим блок "для денежных переводов" (currencyTab4):
 * - USD покупка -> ₽ за 1 $
 * - JPY покупка -> ₽ за N ¥ (обычно N=100), затем переводим в ₽ за 1 ¥
 * - "Актуально на ..." из footer.
 */
function extract_money_transfer_rates(string $html): array
{
    if (!class_exists('DOMDocument')) {
        return [null, null, null, null];
    }

    $dom = new DOMDocument();
    if (!@$dom->loadHTML($html)) {
        return [null, null, null, null];
    }

    $xp = new DOMXPath($dom);
    $tab4 = $xp->query(
        "//*[@id='currencyTab4' and contains(concat(' ', normalize-space(@class), ' '), ' currency-tabs__item ')][.//div[contains(concat(' ', normalize-space(@class), ' '), ' currency-table ')]]"
    )->item(0);
    if (!($tab4 instanceof DOMElement)) {
        // fallback на случай изменений классов: любой currencyTab4, внутри которого есть строки таблицы
        $tab4 = $xp->query("//*[@id='currencyTab4'][.//div[contains(concat(' ', normalize-space(@class), ' '), ' currency-table__tr ')]]")->item(0);
    }
    if (!($tab4 instanceof DOMElement)) {
        return [null, null, null, null];
    }

    $rubPerUsd = null;
    $rubPerYen = null;
    $jpyScale = null;

    $rows = $xp->query(".//div[contains(concat(' ', normalize-space(@class), ' '), ' currency-table__tr ')]", $tab4);
    if ($rows === false) {
        return [null, null, null, null];
    }

    foreach ($rows as $rowNode) {
        if (!($rowNode instanceof DOMElement)) {
            continue;
        }

        $codeRaw = (string) $xp->evaluate("string(.//div[contains(concat(' ', normalize-space(@class), ' '), ' currency-table__val ')])", $rowNode);
        $code = strtoupper(trim($codeRaw));
        if ($code === '') {
            continue;
        }

        $buy = parse_buy_value_from_row($xp, $rowNode);
        if ($buy === null || $buy <= 0) {
            continue;
        }

        if ($code === 'USD') {
            $rubPerUsd = $buy;
            continue;
        }

        if ($code === 'JPY') {
            $labelRaw = (string) $xp->evaluate("string(.//span[contains(concat(' ', normalize-space(@class), ' '), ' currency-table__label ')])", $rowNode);
            $label = trim($labelRaw);
            $scale = 1.0;
            if (preg_match('/за\s*(\d+)/ui', $label, $m)) {
                $scale = max(1.0, (float) $m[1]);
            }
            $jpyScale = $scale;
            $rubPerYen = $buy / $scale;
        }
    }

    $asOf = null;
    $footText = (string) $xp->evaluate("string((//*[contains(concat(' ', normalize-space(@class), ' '), ' currency-foot__text ')])[1])");
    $footText = trim(preg_replace('/\s+/u', ' ', $footText) ?? '');
    if ($footText !== '') {
        $asOf = $footText;
    }

    return [$rubPerUsd, $rubPerYen, $jpyScale, $asOf];
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

    // 4) достаём курсы из блока "для денежных переводов" (currencyTab4)
    [$rubPerUsd, $rubPerYen, $jpyScale, $asOfText] = extract_money_transfer_rates((string) $html2);

    // Fallback на старый источник (конвертер) оставляем как резерв,
    // если верстка таблицы временно поменялась.
    $source = 'currencyTab4';
    $fromPrice = 1.0;
    $toPrice = null;
    if ($rubPerUsd === null || $rubPerUsd <= 0) {
        $usd1 = extract_hidden_rate((string) $html2, 'usd1');
        $rub1 = extract_hidden_rate((string) $html2, 'rub1');
        if ($usd1 === null || $usd1 <= 0) {
            json_fail(502, 'Не найден курс USD в currencyTab4 и не найден коэффициент usd1 на странице АТБ');
        }
        if ($rub1 === null || $rub1 <= 0) {
            $rub1 = 1.0;
        }
        $toPrice = $usd1 * $fromPrice / $rub1;
        $rubPerUsd = $toPrice;
        $source = 'converter-hidden-inputs';
    } else {
        $toPrice = $rubPerUsd;
    }

    echo json_encode([
        'ok' => true,
        'cityId' => $cityId,
        'cityName' => $cityName,
        'from_price' => $fromPrice,
        'to_price' => round($toPrice, 6),
        'rubPerUsd' => round($rubPerUsd, 6),
        'rubPerYen' => ($rubPerYen !== null && $rubPerYen > 0) ? round($rubPerYen, 6) : null,
        'jpyScale' => ($jpyScale !== null && $jpyScale > 0) ? $jpyScale : null,
        'asOfText' => $asOfText,
        'meta' => [
            'source' => 'https://www.atb.su/services/exchange/',
            'sessid' => $sessid,
            'parsedFrom' => $source,
        ],
    ], JSON_UNESCAPED_UNICODE);
} finally {
    @unlink($cookieJar);
}

