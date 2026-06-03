<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/calculation_config_lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    api_json_response(['ok' => false, 'error' => 'Method not allowed'], 405);
}

try {
    if (!file_exists(__DIR__ . '/config.php')) {
        api_json_response([
            'ok' => true,
            'source' => 'default',
            'config' => normalize_calculation_config(default_calculation_config(), null),
            'warning' => 'api/config.php не настроен, используется дефолтная схема.',
        ]);
    }
    $pdo = api_pdo();
    $config = active_calculation_config($pdo);
    api_json_response([
        'ok' => true,
        'source' => $config['versionId'] === null ? 'default' : 'mysql',
        'config' => $config,
    ]);
} catch (PDOException $e) {
    $missing = str_contains($e->getMessage(), 'calculation_config') || $e->getCode() === '42S02';
    if ($missing) {
        api_json_response([
            'ok' => true,
            'source' => 'default',
            'config' => normalize_calculation_config(default_calculation_config(), null),
            'warning' => 'Таблицы админки ещё не созданы, используется дефолтная схема.',
        ]);
    }
    api_json_response(['ok' => false, 'error' => 'Ошибка чтения активной схемы расчёта.'], 500);
} catch (Throwable) {
    api_json_response(['ok' => false, 'error' => 'Ошибка чтения схемы расчёта.'], 500);
}
