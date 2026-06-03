<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_json_response(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$payload = api_read_json_body();
$username = trim((string) ($payload['username'] ?? ''));
$password = (string) ($payload['password'] ?? '');

try {
    $pdo = api_pdo();
    $stmt = $pdo->prepare('SELECT id, username, password_hash, is_active FROM admin_user WHERE username = ? LIMIT 1');
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    if (!is_array($user) || (int) $user['is_active'] !== 1 || !password_verify($password, (string) $user['password_hash'])) {
        api_json_response(['ok' => false, 'error' => 'Неверный логин или пароль.'], 401);
    }
    admin_login_user((int) $user['id']);
    api_json_response(['ok' => true, 'user' => ['id' => (int) $user['id'], 'username' => (string) $user['username']]]);
} catch (Throwable) {
    api_json_response(['ok' => false, 'error' => 'Ошибка входа. Проверьте БД.'], 500);
}
