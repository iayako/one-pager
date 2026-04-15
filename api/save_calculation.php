<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'ok' => false,
        'error' => 'Method not allowed',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

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

$raw = file_get_contents('php://input');
if ($raw === false || $raw === '') {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'error' => 'Empty body',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if (strlen($raw) > 2_000_000) {
    http_response_code(413);
    echo json_encode([
        'ok' => false,
        'error' => 'Payload too large',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $payload = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
} catch (Throwable) {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'error' => 'Invalid JSON',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'error' => 'Body must be a JSON object',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$inputs = $payload['inputs'] ?? null;
$outputs = $payload['outputs'] ?? null;

if (!is_array($inputs) || !is_array($outputs)) {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'error' => 'Expected keys "inputs" and "outputs" with objects',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$inputsJson = json_encode($inputs, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
$outputsJson = json_encode($outputs, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

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

    $ip = $_SERVER['REMOTE_ADDR'] ?? null;
    if (!is_string($ip) || $ip === '') {
        $ip = null;
    }

    $ua = $_SERVER['HTTP_USER_AGENT'] ?? null;
    if (is_string($ua) && strlen($ua) > 512) {
        $ua = substr($ua, 0, 512);
    } elseif (!is_string($ua) || $ua === '') {
        $ua = null;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO calculation_log (inputs_json, outputs_json, client_ip, user_agent) VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$inputsJson, $outputsJson, $ip, $ua]);

    $id = (int) $pdo->lastInsertId();

    echo json_encode([
        'ok' => true,
        'id' => $id,
    ], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    $msg = $e->getMessage();
    $isMissingTable = strpos($msg, 'calculation_log') !== false
        || strpos($msg, "doesn't exist") !== false
        || $e->getCode() === '42S02';
    http_response_code($isMissingTable ? 503 : 500);
    echo json_encode([
        'ok' => false,
        'error' => $isMissingTable
            ? 'Таблица calculation_log не создана. Выполните api/schema.sql в MySQL.'
            : 'Ошибка сохранения в БД',
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Ошибка сохранения',
    ], JSON_UNESCAPED_UNICODE);
}
