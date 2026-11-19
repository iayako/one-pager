<?php
declare(strict_types=1);

require_once __DIR__ . '/manual_rates_lib.php';

const KHAN_DTA_USD = 'bank.khan.fx.usd.sell_noncash';
const KHAN_DTA_JPY = 'bank.khan.fx.jpy.sell_noncash';
const KHAN_DTA_URL = 'https://dta.mn/api/panel?codes=' . KHAN_DTA_USD . ',' . KHAN_DTA_JPY . '&limit=2';

function khan_date(mixed $value): ?DateTimeImmutable
{
    if (!is_string($value)) {
        return null;
    }
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value, new DateTimeZone(MANUAL_RATES_TZ));
    return $date !== false && $date->format('Y-m-d') === $value ? $date : null;
}

function khan_rate_date_is_current(mixed $value, string $today): bool
{
    $date = khan_date($value);
    $end = khan_date($today);
    if ($date === null || $end === null || $date > $end || $date->diff($end)->days > 5) {
        return false;
    }
    // Выходные не считаем. Допускаем один будний день без публикации, например праздник.
    $missedWeekdays = 0;
    for ($day = $date->modify('+1 day'); $day < $end; $day = $day->modify('+1 day')) {
        if ((int) $day->format('N') <= 5 && ++$missedWeekdays > 1) {
            return false;
        }
    }
    return true;
}

function khan_positive_rate(mixed $value): ?float
{
    return is_numeric($value) && is_finite((float) $value) && (float) $value > 0 ? (float) $value : null;
}

function khan_payload(string $source, string $date, mixed $usd, mixed $jpy, mixed $buy = null): ?array
{
    $usd = khan_positive_rate($usd);
    $jpy = khan_positive_rate($jpy);
    if ($usd === null || $jpy === null || round($usd, 2) <= 0 || round($jpy, 4) <= 0
        || !is_finite($usd / $jpy) || round($usd / $jpy, 4) <= 0) {
        return null;
    }
    $buy = khan_positive_rate($buy);
    return [
        'ok' => true,
        'source' => $source,
        'date' => $date,
        'stale' => false,
        'usdNonCashSellMnt' => round($usd, 2),
        'jpyNonCashBuyMnt' => $buy === null ? null : round($buy, 4),
        'jpyNonCashSellMnt' => round($jpy, 4),
        'usdMnt' => round($usd, 2),
        'jpyMnt' => round($jpy, 4),
        'yenPerUsd' => round($usd / $jpy, 4),
    ];
}

function khan_parse_bank(?string $body, string $requestedDate): ?array
{
    $rows = json_decode($body ?? '', true);
    if (!is_array($rows)) {
        return null;
    }
    $rates = [];
    foreach ($rows as $row) {
        $currency = $row['currency'] ?? null;
        if ($currency !== 'USD' && $currency !== 'JPY') {
            continue;
        }
        if (isset($rates[$currency])) {
            return null;
        }
        $rates[$currency] = $row;
    }
    // Текущий API банка возвращает таблицу для параметра date, без даты в строках.
    return khan_payload('Khan Bank', $requestedDate, $rates['USD']['sellRate'] ?? null,
        $rates['JPY']['sellRate'] ?? null, $rates['JPY']['buyRate'] ?? null);
}

function khan_parse_dta(?string $body, string $today): ?array
{
    $json = json_decode($body ?? '', true);
    if (!is_array($json['panel'] ?? null)) {
        return null;
    }
    $latest = [];
    foreach ($json['panel'] as $series) {
        $code = $series['code'] ?? null;
        if ($code !== KHAN_DTA_USD && $code !== KHAN_DTA_JPY) {
            continue;
        }
        if (isset($latest[$code]) || ($series['freshness'] ?? null) !== 'fresh'
            || !is_array($series['data'] ?? null) || $series['data'] === []) {
            return null;
        }
        $dates = [];
        foreach ($series['data'] as $row) {
            $date = $row[0] ?? null;
            if (!is_array($row) || khan_date($date) === null || isset($dates[$date])) {
                return null;
            }
            $dates[$date] = true;
            if (!isset($latest[$code]) || $date > $latest[$code][0]) {
                $latest[$code] = [$date, $row[1] ?? null];
            }
        }
    }
    $usd = $latest[KHAN_DTA_USD] ?? null;
    $jpy = $latest[KHAN_DTA_JPY] ?? null;
    if ($usd === null || $jpy === null || $usd[0] !== $jpy[0] || !khan_rate_date_is_current($usd[0], $today)) {
        return null;
    }
    return khan_payload('DTA.mn', $usd[0], $usd[1], $jpy[1]);
}

function khan_payload_is_current(array $rates, string $today): bool
{
    return ($rates['ok'] ?? false) === true
        && in_array($rates['source'] ?? null, ['Khan Bank', 'DTA.mn'], true)
        && ($rates['stale'] ?? null) === false
        && ($rates['_stale'] ?? false) !== true
        && khan_rate_date_is_current($rates['date'] ?? null, $today)
        && khan_positive_rate($rates['usdMnt'] ?? null) !== null
        && khan_positive_rate($rates['jpyMnt'] ?? null) !== null
        && khan_positive_rate($rates['yenPerUsd'] ?? null) !== null;
}

function khan_fetch_body(string $url): ?string
{
    $headers = [
        'Accept: application/json',
        'User-Agent: one-pager-calculator/1.0 (+https://uus-avto.ru)',
    ];
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT => 7,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_ENCODING => '',
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        $body = curl_exec($ch);
        return is_string($body) && curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200 ? $body : null;
    }
    $context = stream_context_create([
        'http' => ['timeout' => 7, 'follow_location' => 0, 'header' => implode("\r\n", $headers)],
        'ssl' => ['verify_peer' => true, 'verify_peer_name' => true],
    ]);
    $body = @file_get_contents($url, false, $context);
    return is_string($body) && preg_match('~^HTTP/\S+ 200\b~', $http_response_header[0] ?? '') ? $body : null;
}

function khan_fetch_rates(string $date, bool $allowDta, callable $fetch): ?array
{
    $bank = khan_parse_bank($fetch('https://www.khanbank.com/api/back/rates?date=' . $date), $date);
    if ($bank !== null || !$allowDta) {
        return $bank;
    }
    return khan_parse_dta($fetch(KHAN_DTA_URL), $date);
}

function khan_read_cache(string $file): array
{
    $body = is_readable($file) ? @file_get_contents($file) : false;
    $data = is_string($body) ? json_decode($body, true) : null;
    return is_array($data) ? $data : [];
}

function khan_write_cache(string $file, array $payload): void
{
    $tmp = $file . '.' . getmypid() . '.tmp';
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
    if ($json !== false && (@file_put_contents($tmp, $json) === false || !@rename($tmp, $file))) {
        @unlink($tmp);
    }
}

function khan_unavailable(array $last): array
{
    return [
        'ok' => false,
        'error' => 'Актуальные курсы Khan Bank недоступны',
        'source' => $last['source'] ?? (isset($last['date']) ? 'Khan Bank' : null),
        'date' => $last['date'] ?? null,
        'stale' => isset($last['date']),
        'staleSince' => $last['savedAt'] ?? null,
    ];
}

function khan_current_rates(string $today, string $dir, callable $fetch): array
{
    $lastFile = $dir . '/khan_last.json';
    if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
        return khan_unavailable(khan_read_cache($lastFile));
    }
    $lock = @fopen($dir . '/khan_refresh.lock', 'c');
    if ($lock === false) {
        return khan_unavailable(khan_read_cache($lastFile));
    }
    try {
        if (!flock($lock, LOCK_EX)) {
            return khan_unavailable(khan_read_cache($lastFile));
        }
        $attemptFile = $dir . '/khan_attempt.json';
        $attempt = khan_read_cache($attemptFile);
        $result = $attempt['result'] ?? [];
        $age = time() - (int) ($attempt['timestamp'] ?? 0);
        if (($attempt['date'] ?? null) === $today && is_array($result) && $age >= 0) {
            if (($result['ok'] ?? null) === false && $age < 300) {
                return $result;
            }
            if ($age < 900 && khan_payload_is_current($result, $today)) {
                return $result;
            }
        }
        $result = khan_fetch_rates($today, true, $fetch);
        if ($result === null) {
            $result = khan_unavailable(khan_read_cache($lastFile));
        } else {
            khan_write_cache($lastFile, $result + ['savedAt' => gmdate('c')]);
        }
        khan_write_cache($attemptFile, ['date' => $today, 'timestamp' => time(), 'result' => $result]);
        return $result;
    } finally {
        fclose($lock);
    }
}
