<?php
declare(strict_types=1);

function api_json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function api_config(): array
{
    $configPath = __DIR__ . '/config.php';
    if (!file_exists($configPath)) {
        api_json_response([
            'ok' => false,
            'error' => 'Missing api/config.php. Copy api/config.example.php and fill DB credentials.',
        ], 500);
    }

    $config = require $configPath;
    if (!is_array($config)) {
        api_json_response(['ok' => false, 'error' => 'Invalid api/config.php'], 500);
    }
    return $config;
}

function api_pdo(): PDO
{
    $config = api_config();
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $config['host'] ?? 'localhost',
        (int) ($config['port'] ?? 3306),
        $config['name'] ?? ''
    );

    return new PDO($dsn, (string) ($config['user'] ?? ''), (string) ($config['password'] ?? ''), [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}

function api_read_json_body(int $maxBytes = 2000000): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        api_json_response(['ok' => false, 'error' => 'Empty body'], 400);
    }
    if (strlen($raw) > $maxBytes) {
        api_json_response(['ok' => false, 'error' => 'Payload too large'], 413);
    }
    try {
        $payload = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    } catch (Throwable) {
        api_json_response(['ok' => false, 'error' => 'Invalid JSON'], 400);
    }
    if (!is_array($payload)) {
        api_json_response(['ok' => false, 'error' => 'Body must be a JSON object'], 400);
    }
    return $payload;
}
