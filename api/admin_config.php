<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_auth.php';
require_once __DIR__ . '/calculation_config_lib.php';

try {
    $pdo = api_pdo();
    $user = admin_require_user($pdo);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        api_json_response([
            'ok' => true,
            'config' => latest_draft_or_active_config($pdo),
            'activeConfig' => active_calculation_config($pdo),
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        api_json_response(['ok' => false, 'error' => 'Method not allowed'], 405);
    }

    $payload = api_read_json_body();
    $configRaw = $payload['config'] ?? null;
    if (!is_array($configRaw)) {
        api_json_response(['ok' => false, 'error' => 'Expected config object.'], 400);
    }
    try {
        $config = normalize_calculation_config($configRaw, null);
    } catch (InvalidArgumentException $e) {
        api_json_response(['ok' => false, 'error' => $e->getMessage()], 400);
    }

    $note = isset($payload['note']) ? mb_substr(trim((string) $payload['note']), 0, 500) : null;
    $json = json_encode($config, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

    $stmt = $pdo->prepare('INSERT INTO calculation_config_version (created_by_admin_id, status, name, config_json, note) VALUES (?, "draft", ?, ?, ?)');
    $stmt->execute([(int) $user['id'], (string) $config['name'], $json, $note !== '' ? $note : null]);
    $id = (int) $pdo->lastInsertId();
    $config['versionId'] = $id;

    api_json_response(['ok' => true, 'id' => $id, 'config' => $config]);
} catch (PDOException $e) {
    $msg = $e->getMessage();
    $missing = str_contains($msg, 'admin_user') || str_contains($msg, 'calculation_config_version') || $e->getCode() === '42S02';
    api_json_response([
        'ok' => false,
        'error' => $missing
            ? 'Таблицы админки не созданы. Выполните api/migration_admin_calculation_builder.sql.'
            : 'Ошибка БД при сохранении схемы.',
    ], $missing ? 503 : 500);
} catch (Throwable) {
    api_json_response(['ok' => false, 'error' => 'Ошибка сохранения схемы.'], 500);
}
