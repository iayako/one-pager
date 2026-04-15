<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$configPath = __DIR__ . '/config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Missing api/config.php. Copy api/config.example.php and fill DB credentials.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/** @var array{host:string,port:int,name:string,user:string,password:string} $config */
$config = require $configPath;

$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
    $config['host'],
    (int) $config['port'],
    $config['name']
);

try {
    $pdo = new PDO($dsn, $config['user'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $pdo->query('SELECT 1')->closeCursor();

    echo json_encode([
        'ok' => true,
        'db' => 'connected',
        'time_utc' => gmdate('c'),
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'db' => 'failed',
        'error' => 'Ошибка подключения к БД',
    ], JSON_UNESCAPED_UNICODE);
}
