<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Достаём из снимка расчёта поля авто для отдельных колонок в БД (удобный отчёт и бот).
 *
 * @param array<string,mixed>|null $calcSnapshot Объект { inputs, outputs } с фронта
 * @return array{auction_price_yen: ?float, vehicle_age: ?string, engine_type: ?string, auction_name: ?string, engine_cc: ?float, engine_hp: ?float}
 */
function extractLeadVehicleFieldsFromSnapshot(?array $calcSnapshot): array
{
    $out = [
        'auction_price_yen' => null,
        'vehicle_age' => null,
        'engine_type' => null,
        'auction_name' => null,
        'engine_cc' => null,
        'engine_hp' => null,
    ];

    if (!is_array($calcSnapshot)) {
        return $out;
    }

    $inputs = $calcSnapshot['inputs'] ?? null;
    if (!is_array($inputs)) {
        return $out;
    }

    $priceRaw = $inputs['auctionYen'] ?? null;
    if (is_numeric($priceRaw)) {
        $p = (float) $priceRaw;
        if (is_finite($p)) {
            $out['auction_price_yen'] = round($p, 2);
        }
    }

    $va = isset($inputs['vehicleAge']) ? trim((string) $inputs['vehicleAge']) : '';
    if ($va !== '') {
        $out['vehicle_age'] = mb_substr($va, 0, 32);
    }

    $et = isset($inputs['engineType']) ? trim((string) $inputs['engineType']) : '';
    if ($et !== '') {
        $out['engine_type'] = mb_substr($et, 0, 32);
    }

    $an = isset($inputs['auctionName']) ? trim((string) $inputs['auctionName']) : '';
    if ($an !== '') {
        $out['auction_name'] = mb_substr($an, 0, 160);
    }

    foreach (['engineDisplacementCc' => 'engine_cc', 'enginePowerHp' => 'engine_hp'] as $src => $key) {
        $v = $inputs[$src] ?? null;
        if (is_numeric($v)) {
            $n = (float) $v;
            if (is_finite($n)) {
                $out[$key] = round($n, 2);
            }
        }
    }

    return $out;
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
    echo json_encode(['ok' => false, 'error' => 'Empty body'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (strlen($raw) > 2_000_000) {
    http_response_code(413);
    echo json_encode(['ok' => false, 'error' => 'Payload too large'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $payload = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
} catch (Throwable) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid JSON'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Body must be a JSON object'], JSON_UNESCAPED_UNICODE);
    exit;
}

$name = isset($payload['name']) ? trim((string) $payload['name']) : '';
$phone = isset($payload['phone']) ? trim((string) $payload['phone']) : '';
$contactMethod = isset($payload['contactMethod']) ? trim((string) $payload['contactMethod']) : 'phone';
$comment = isset($payload['comment']) ? trim((string) $payload['comment']) : '';
$calcIdRaw = $payload['calculationLogId'] ?? null;
$calcSnapshot = $payload['calculationSnapshot'] ?? null;

if ($phone === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Phone is required'], JSON_UNESCAPED_UNICODE);
    exit;
}

$phoneDigits = preg_replace('/\D+/', '', $phone) ?? '';
if (strlen($phoneDigits) < 11) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid phone number'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (strlen($name) > 80) {
    $name = mb_substr($name, 0, 80);
}
if (strlen($phone) > 25) {
    $phone = mb_substr($phone, 0, 25);
}
if (strlen($comment) > 300) {
    $comment = mb_substr($comment, 0, 300);
}

$allowedMethods = ['phone', 'telegram', 'whatsapp'];
if (!in_array($contactMethod, $allowedMethods, true)) {
    $contactMethod = 'phone';
}

$calculationLogId = null;
if (is_int($calcIdRaw) || (is_string($calcIdRaw) && ctype_digit($calcIdRaw))) {
    $tmp = (int) $calcIdRaw;
    if ($tmp > 0) {
        $calculationLogId = $tmp;
    }
}

$calcSnapshotJson = null;
if (is_array($calcSnapshot)) {
    try {
        $calcSnapshotJson = json_encode($calcSnapshot, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    } catch (Throwable) {
        $calcSnapshotJson = null;
    }
}

$vehicle = extractLeadVehicleFieldsFromSnapshot(is_array($calcSnapshot) ? $calcSnapshot : null);

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
        'INSERT INTO lead_request
        (name, phone, contact_method, comment, calculation_log_id, calculation_snapshot_json, client_ip, user_agent,
         auction_price_yen, vehicle_age, engine_type, auction_name, engine_cc, engine_hp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $name !== '' ? $name : null,
        $phone,
        $contactMethod,
        $comment !== '' ? $comment : null,
        $calculationLogId,
        $calcSnapshotJson,
        $ip,
        $ua,
        $vehicle['auction_price_yen'],
        $vehicle['vehicle_age'],
        $vehicle['engine_type'],
        $vehicle['auction_name'],
        $vehicle['engine_cc'],
        $vehicle['engine_hp'],
    ]);

    echo json_encode([
        'ok' => true,
        'id' => (int) $pdo->lastInsertId(),
    ], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    $msg = $e->getMessage();
    $isMissingTable = strpos($msg, 'lead_request') !== false
        || strpos($msg, "doesn't exist") !== false
        || $e->getCode() === '42S02';
    http_response_code($isMissingTable ? 503 : 500);
    echo json_encode([
        'ok' => false,
        'error' => $isMissingTable
            ? 'Таблица lead_request не создана. Выполните api/schema.sql в MySQL.'
            : 'Ошибка сохранения заявки в БД',
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Ошибка сохранения заявки'], JSON_UNESCAPED_UNICODE);
}
