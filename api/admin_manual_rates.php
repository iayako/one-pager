<?php
declare(strict_types=1);

/**
 * Ручной курс тугрика на сегодня (см. manual_rates_lib.php).
 *
 * GET  — текущее состояние: действующий ручной курс и последний курс Khan Bank для сверки.
 * POST {"action":"set","usdMnt":3599,"jpyMnt":23.01} — задать на сегодня.
 * POST {"action":"clear"} — сбросить, калькулятор вернётся к курсу банка.
 */

require_once __DIR__ . '/admin_auth.php';
require_once __DIR__ . '/manual_rates_lib.php';

/** Последний курс, полученный от самого банка (кэш khan_rates.php), — для сверки в админке. */
function manual_rates_bank_reference(): ?array
{
    $file = __DIR__ . '/cache/khan_last.json';
    $raw = is_readable($file) ? @file_get_contents($file) : false;
    $data = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($data) || !is_numeric($data['usdMnt'] ?? null) || !is_numeric($data['jpyMnt'] ?? null)) {
        return null;
    }
    return [
        'usdMnt' => (float) $data['usdMnt'],
        'jpyMnt' => (float) $data['jpyMnt'],
        'savedAt' => (string) ($data['savedAt'] ?? ''),
    ];
}

function manual_rates_state(): array
{
    return [
        'ok' => true,
        'today' => manual_rates_today(),
        'active' => manual_rates_active(),
        'bank' => manual_rates_bank_reference(),
    ];
}

try {
    $pdo = api_pdo();
    $user = admin_require_user($pdo);
} catch (PDOException) {
    api_json_response(['ok' => false, 'error' => 'Ошибка БД при проверке входа.'], 500);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    api_json_response(manual_rates_state());
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_json_response(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$payload = api_read_json_body(10000);
$action = (string) ($payload['action'] ?? '');

try {
    if ($action === 'set') {
        [$usd, $jpy] = manual_rates_validate($payload['usdMnt'] ?? null, $payload['jpyMnt'] ?? null);
        manual_rates_save($usd, $jpy, $user['username']);
    } elseif ($action === 'clear') {
        manual_rates_clear();
    } else {
        api_json_response(['ok' => false, 'error' => 'Неизвестное действие.'], 400);
    }
} catch (InvalidArgumentException $e) {
    api_json_response(['ok' => false, 'error' => $e->getMessage()], 400);
} catch (RuntimeException $e) {
    api_json_response(['ok' => false, 'error' => $e->getMessage()], 500);
}

api_json_response(manual_rates_state());
