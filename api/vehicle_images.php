<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

$dbPath = dirname(__DIR__) . '/car_selector.db';
if (!file_exists($dbPath)) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Database file car_selector.db not found',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * @return array<string, mixed>|null
 */
function fetchJsonFromUrl(string $url): ?array
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        if ($ch !== false) {
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_CONNECTTIMEOUT => 8,
                CURLOPT_TIMEOUT => 12,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => 0,
                CURLOPT_HTTPHEADER => [
                    'Accept: application/json',
                    'User-Agent: one-pager-car-selector/1.0',
                ],
            ]);
            $raw = curl_exec($ch);
            $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

            if (is_string($raw) && $raw !== '' && $code >= 200 && $code < 300) {
                try {
                    /** @var array<string,mixed> $decoded */
                    $decoded = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
                    return $decoded;
                } catch (Throwable) {
                    // Fall through to stream fallback below.
                }
            }
        }
    }

    $ctx = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 12,
            'header' => "User-Agent: one-pager-car-selector/1.0\r\nAccept: application/json\r\n",
        ],
    ]);

    $raw = @file_get_contents($url, false, $ctx);
    if ($raw === false || $raw === '') {
        return null;
    }

    try {
        /** @var array<string,mixed> $decoded */
        $decoded = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        return $decoded;
    } catch (Throwable) {
        return null;
    }
}

function fetchWikipediaPageImage(string $title): ?string
{
    $url = 'https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=original&titles='
        . rawurlencode($title)
        . '&format=json';
    $payload = fetchJsonFromUrl($url);
    if (!is_array($payload)) {
        return null;
    }
    $pages = $payload['query']['pages'] ?? null;
    if (!is_array($pages)) {
        return null;
    }
    foreach ($pages as $page) {
        $src = $page['original']['source'] ?? null;
        if (is_string($src) && $src !== '') {
            return $src;
        }
    }
    return null;
}

/**
 * @return ?string
 */
function resolveVehicleImage(string $make, string $model, int $year): ?string
{
    $candidates = [
        $make . ' ' . $model . ' (' . $year . ')',
        $make . ' ' . $model,
        $make . ' ' . $model . ' car',
    ];

    foreach ($candidates as $title) {
        $image = fetchWikipediaPageImage($title);
        if ($image !== null) {
            return $image;
        }
    }

    $searchImage = resolveVehicleImageViaSearch($make, $model, $year);
    if ($searchImage !== null) {
        return $searchImage;
    }

    return null;
}

/**
 * @return array<string,mixed>|null
 */
function fetchWikipediaSearch(string $query): ?array
{
    $url = 'https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch='
        . rawurlencode($query)
        . '&srlimit=5&format=json';
    return fetchJsonFromUrl($url);
}

function resolveVehicleImageViaSearch(string $make, string $model, int $year): ?string
{
    $queries = [
        $make . ' ' . $model . ' ' . $year . ' car',
        $make . ' ' . $model . ' car',
    ];

    foreach ($queries as $query) {
        $searchPayload = fetchWikipediaSearch($query);
        $searchItems = $searchPayload['query']['search'] ?? null;
        if (!is_array($searchItems)) {
            continue;
        }

        foreach ($searchItems as $item) {
            $title = $item['title'] ?? null;
            if (!is_string($title) || $title === '') {
                continue;
            }
            $image = fetchWikipediaPageImage($title);
            if ($image !== null) {
                return $image;
            }
        }
    }

    return null;
}

try {
    $pdo = new PDO('sqlite:' . $dbPath, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $refresh = isset($_GET['refresh']) && (string) $_GET['refresh'] === '1';

    $vehicles = $pdo->query(
        'SELECT id, vin, make, model, model_year, age_years, engine_type, engine_displacement_l, engine_hp
         FROM vehicles
         ORDER BY id'
    )->fetchAll();

    if (!is_array($vehicles)) {
        $vehicles = [];
    }

    if ($refresh) {
        $findImageStmt = $pdo->prepare(
            'SELECT image_url FROM vehicle_images WHERE vehicle_id = ? AND is_primary = 1 LIMIT 1'
        );
        $insertImageStmt = $pdo->prepare(
            'INSERT INTO vehicle_images (vehicle_id, image_url, source_name, is_primary) VALUES (?, ?, ?, 1)'
        );

        foreach ($vehicles as $vehicle) {
            $vehicleId = (int) ($vehicle['id'] ?? 0);
            if ($vehicleId <= 0) {
                continue;
            }

            $findImageStmt->execute([$vehicleId]);
            $existing = $findImageStmt->fetchColumn();
            if (is_string($existing) && $existing !== '') {
                continue;
            }

            $make = trim((string) ($vehicle['make'] ?? ''));
            $model = trim((string) ($vehicle['model'] ?? ''));
            $year = (int) ($vehicle['model_year'] ?? 0);

            if ($make === '' || $model === '' || $year <= 0) {
                continue;
            }

            $imageUrl = resolveVehicleImage($make, $model, $year);
            if ($imageUrl === null) {
                continue;
            }

            $insertImageStmt->execute([$vehicleId, $imageUrl, 'wikipedia']);
        }
    }

    $rows = $pdo->query(
        'SELECT
            v.id,
            v.vin,
            v.make,
            v.model,
            v.model_year,
            v.age_years,
            v.engine_type,
            v.engine_displacement_l,
            v.engine_hp,
            vi.image_url,
            vi.source_name
         FROM vehicles v
         LEFT JOIN vehicle_images vi
           ON vi.vehicle_id = v.id AND vi.is_primary = 1
         ORDER BY v.id'
    )->fetchAll();

    echo json_encode([
        'ok' => true,
        'refresh_used' => $refresh,
        'count' => count($rows),
        'results' => $rows,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Failed to read or update vehicle images',
        'details' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}

