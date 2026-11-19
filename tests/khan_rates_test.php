<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../api/khan_rates_lib.php';

function check(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$today = '2026-11-19';
$dta = file_get_contents(__DIR__ . '/fixtures/dta-khan-panel.json');
$fixture = json_decode($dta, true, 512, JSON_THROW_ON_ERROR);
$bank = '[{"currency":"USD","sellRate":3606,"cashSellRate":3624},'
    . '{"currency":"JPY","sellRate":23.23,"buyRate":22.03,"cashSellRate":23.34}]';
$captcha = '<html><title>Captcha Verify</title></html>';

$rates = khan_parse_dta($dta, $today);
check($rates['source'] === 'DTA.mn' && $rates['date'] === '2026-11-18', 'DTA source and observation date');
check($rates['usdMnt'] === 3606.0 && $rates['jpyMnt'] === 22.79, 'Expected non-cash sell rates');
check($rates['jpyNonCashBuyMnt'] === null && $rates['stale'] === false, 'DTA supplies only sell rates');
check($rates['yenPerUsd'] === round(3606 / 22.79, 4), 'Existing cross-rate formula');

$reversed = $fixture;
$reversed['panel'][0]['data'] = array_reverse($reversed['panel'][0]['data']);
check(khan_parse_dta(json_encode($reversed), $today) === $rates, 'DTA row order is irrelevant');

$missingJpy = $fixture;
array_pop($missingJpy['panel']);
$otherBank = $fixture;
$otherBank['panel'][1]['code'] = 'bank.tdb.fx.jpy.sell_noncash';
$mismatchedDates = $fixture;
array_pop($mismatchedDates['panel'][1]['data']);
$zero = $fixture;
$zero['panel'][1]['data'][1][1] = 0;
$negative = $fixture;
$negative['panel'][1]['data'][1][1] = -22.79;
$stale = $fixture;
$stale['panel'][0]['freshness'] = 'stale';
$invalidDate = $fixture;
$invalidDate['panel'][0]['data'][1][0] = '2026-11-31';
foreach ([$missingJpy, $otherBank, $mismatchedDates, $zero, $negative, $stale, $invalidDate] as $invalid) {
    check(khan_parse_dta(json_encode($invalid), $today) === null, 'Reject invalid panel data');
}
foreach ([null, '<html>', '{malformed', '{"panel":false}'] as $invalid) {
    check(khan_parse_dta($invalid, $today) === null, 'Reject missing or invalid DTA JSON');
}
check(khan_parse_dta($dta, '2026-11-17') === null, 'Reject future observations');
check(khan_parse_dta($dta, '2026-11-25') === null, 'Reject outdated observations');
check(khan_rate_date_is_current('2026-11-20', '2026-11-23'), 'Carry Friday through weekend');
check(khan_rate_date_is_current('2026-11-20', '2026-11-24'), 'Allow one bank closure after weekend');
check(!khan_rate_date_is_current('2026-11-20', '2026-11-25'), 'Expire after two missed weekdays');
check(!khan_rate_date_is_current('2026-11-19', '2026-11-25'), 'Absolute freshness limit');
check(!khan_payload_is_current(array_replace($rates, ['stale' => true]), $today), 'Reject stale endpoint payload');
check(!khan_payload_is_current($rates + ['_stale' => true], $today), 'Reject carried snapshot quotes');

$selected = khan_fetch_rates($today, true, static function (string $url) use ($bank): string {
    check($url !== KHAN_DTA_URL, 'Valid bank response skips DTA');
    return $bank;
});
check($selected['source'] === 'Khan Bank' && $selected['jpyMnt'] === 23.23, 'Direct bank uses sellRate');
check(khan_fetch_rates($today, false, static fn() => $captcha) === null, 'Historical lookups do not use daily DTA');

$dir = sys_get_temp_dir() . '/khan-rates-test-' . bin2hex(random_bytes(8));
$calls = [];
$fetch = static function (string $url) use (&$calls, $dta, $captcha): string {
    $calls[] = $url;
    return $url === KHAN_DTA_URL ? $dta : $captcha;
};
try {
    check(khan_current_rates($today, $dir, $fetch) === $rates, 'CAPTCHA falls back to DTA');
    check(khan_current_rates($today, $dir, $fetch) == $rates && count($calls) === 2, 'Serve subsequent views from cache');
    $outage = static function (string $url) use (&$calls): ?string {
        $calls[] = $url;
        return null;
    };
    $failure = khan_current_rates('2026-11-23', $dir, $outage);
    check($failure['ok'] === false && $failure['stale'] === true && !isset($failure['usdMnt']), 'Outage never supplies expired quotes');
    check(khan_current_rates('2026-11-23', $dir, $outage) === $failure && count($calls) === 4, 'Outage is throttled');

    foreach (['rates_snapshot.php', 'khan_rates_lib.php', 'manual_rates_lib.php'] as $script) {
        copy(__DIR__ . '/../api/' . $script, $dir . '/' . $script);
    }
    mkdir($dir . '/cache');
    $snapshotFile = $dir . '/cache/rates_snapshot.json';
    file_put_contents($snapshotFile, json_encode([
        'fetchedAt' => gmdate('c'),
        'khan' => array_replace($rates, ['stale' => true]),
        'cbr' => ['ok' => true, 'rubPerEur' => 90],
        'atb' => ['ok' => true, 'rubPerUsd' => 75, 'rubPerYen' => 0.5],
    ]));
    $snapshot = static function () use ($dir): array {
        $process = proc_open([PHP_BINARY, $dir . '/rates_snapshot.php'], [1 => ['pipe', 'w']], $pipes);
        check(is_resource($process), 'Start snapshot endpoint');
        $body = stream_get_contents($pipes[1]);
        fclose($pipes[1]);
        check(proc_close($process) === 0 && is_string($body), 'Read snapshot endpoint');
        return json_decode($body, true, 512, JSON_THROW_ON_ERROR);
    };
    $response = $snapshot();
    check(!$response['complete'] && $response['khanStale'] && $response['usdMnt'] === null, 'Stale Khan blocks completeness');
    check($response['rubPerEur'] === 90 && $response['rubPerUsd'] === 75, 'Snapshot preserves CBR and ATB');

    $data = json_decode(file_get_contents($snapshotFile), true, 512, JSON_THROW_ON_ERROR);
    $data['khan'] = array_replace($rates, ['date' => manual_rates_today()]);
    file_put_contents($snapshotFile, json_encode($data));
    $response = $snapshot();
    check($response['complete'] && !$response['khanStale'] && $response['khanSource'] === 'DTA.mn', 'Fresh DTA completes snapshot');
    $data['khan']['date'] = (new DateTimeImmutable(manual_rates_today()))->modify('-6 days')->format('Y-m-d');
    file_put_contents($snapshotFile, json_encode($data));
    $response = $snapshot();
    check(!$response['complete'] && $response['khanStale'] && $response['jpyMnt'] === null, 'Rate expires without stale flag');

    file_put_contents($dir . '/cache/manual_rates.json', json_encode([
        'date' => manual_rates_today(), 'usdMnt' => 3599, 'jpyMnt' => 23.01, 'setAt' => gmdate('c'),
    ]));
    $response = $snapshot();
    check($response['complete'] && !$response['khanStale'] && $response['khanSource'] === 'manual'
        && $response['usdMnt'] === 3599, 'Current manual quote overrides stale Khan');
} finally {
    foreach (glob($dir . '/cache/*') ?: [] as $file) {
        unlink($file);
    }
    if (is_dir($dir . '/cache')) {
        rmdir($dir . '/cache');
    }
    foreach (glob($dir . '/*') ?: [] as $file) {
        unlink($file);
    }
    if (is_dir($dir)) {
        rmdir($dir);
    }
}

echo "Khan rate tests passed\n";
