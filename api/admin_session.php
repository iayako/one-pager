<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    api_json_response(['ok' => false, 'error' => 'Method not allowed'], 405);
}

try {
    $pdo = api_pdo();
    $user = admin_current_user($pdo);
    api_json_response(['ok' => true, 'authenticated' => $user !== null, 'user' => $user]);
} catch (Throwable) {
    api_json_response(['ok' => false, 'error' => 'Ошибка проверки сессии.'], 500);
}
