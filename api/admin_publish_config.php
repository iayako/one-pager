<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_auth.php';
require_once __DIR__ . '/calculation_config_lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_json_response(['ok' => false, 'error' => 'Method not allowed'], 405);
}

try {
    $pdo = api_pdo();
    $user = admin_require_user($pdo);
    $payload = api_read_json_body();
    $versionId = $payload['versionId'] ?? null;
    if (!is_int($versionId) && !(is_string($versionId) && ctype_digit($versionId))) {
        api_json_response(['ok' => false, 'error' => 'Expected versionId.'], 400);
    }

    $stmt = $pdo->prepare('SELECT id, config_json FROM calculation_config_version WHERE id = ? LIMIT 1');
    $stmt->execute([(int) $versionId]);
    $row = $stmt->fetch();
    if (!is_array($row)) {
        api_json_response(['ok' => false, 'error' => 'Version not found.'], 404);
    }
    $decoded = json_decode((string) $row['config_json'], true);
    if (!is_array($decoded)) {
        api_json_response(['ok' => false, 'error' => 'Version contains invalid config JSON.'], 400);
    }
    normalize_calculation_config($decoded, (int) $versionId);

    $pdo->beginTransaction();
    $pdo->prepare('UPDATE calculation_config_version SET status = "archived" WHERE status = "published"')->execute();
    $pdo->prepare('UPDATE calculation_config_version SET status = "published", published_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([(int) $versionId]);
    $upsert = $pdo->prepare(
        'INSERT INTO calculation_config_active (id, calculation_config_version_id, activated_by_admin_id)
         VALUES (1, ?, ?)
         ON DUPLICATE KEY UPDATE calculation_config_version_id = VALUES(calculation_config_version_id),
           activated_by_admin_id = VALUES(activated_by_admin_id),
           activated_at = CURRENT_TIMESTAMP'
    );
    $upsert->execute([(int) $versionId, (int) $user['id']]);
    $pdo->commit();

    api_json_response(['ok' => true, 'activeVersionId' => (int) $versionId]);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    $missing = str_contains($e->getMessage(), 'calculation_config') || $e->getCode() === '42S02';
    api_json_response([
        'ok' => false,
        'error' => $missing
            ? 'Таблицы админки не созданы. Выполните api/migration_admin_calculation_builder.sql.'
            : 'Ошибка публикации в БД.',
    ], $missing ? 503 : 500);
} catch (Throwable) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    api_json_response(['ok' => false, 'error' => 'Ошибка публикации схемы.'], 500);
}
