<?php
declare(strict_types=1);

require_once __DIR__ . '/khan_rates_lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$today = manual_rates_today();
$dateParam = $_GET['date'] ?? '';
$date = is_string($dateParam) ? trim($dateParam) : null;
if ($date === '') {
    $date = $today;
}

if (khan_date($date) === null || $date > $today) {
    $result = ['ok' => false, 'error' => 'Ожидается дата YYYY-MM-DD не позже сегодняшнего дня по Улан-Батору'];
    http_response_code(400);
} else {
    $manual = ($_GET['source'] ?? '') === 'bank' ? null : manual_rates_active();
    if ($manual !== null && manual_rates_applies_to($date)) {
        $result = manual_rates_as_khan_payload($manual);
    } elseif ($date === $today) {
        $result = khan_current_rates($today, __DIR__ . '/cache', 'khan_fetch_body');
    } else {
        $result = khan_fetch_rates($date, false, 'khan_fetch_body') ?? khan_unavailable([]);
    }
    if (!$result['ok']) {
        http_response_code(502);
    }
}

echo json_encode($result, JSON_UNESCAPED_UNICODE);
