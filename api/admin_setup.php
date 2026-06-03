<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_json_response(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$config = api_config();
$setupToken = trim((string) ($config['admin_setup_token'] ?? ''));
if ($setupToken === '') {
    api_json_response(['ok' => false, 'error' => 'Setup token is not configured.'], 403);
}

$payload = api_read_json_body();
$token = trim((string) ($payload['setupToken'] ?? ''));
$username = trim((string) ($payload['username'] ?? ''));
$password = (string) ($payload['password'] ?? '');

if (!hash_equals($setupToken, $token)) {
    api_json_response(['ok' => false, 'error' => 'Invalid setup token.'], 403);
}
if (!preg_match('/^[A-Za-z0-9_.@-]{3,80}$/', $username)) {
    api_json_response(['ok' => false, 'error' => 'Username must be 3-80 chars: latin letters, digits, . _ @ -.'], 400);
}
if (strlen($password) < 10) {
    api_json_response(['ok' => false, 'error' => 'Password must be at least 10 characters.'], 400);
}

try {
    $pdo = api_pdo();
    $count = (int) $pdo->query('SELECT COUNT(*) FROM admin_user')->fetchColumn();
    if ($count > 0) {
        api_json_response(['ok' => false, 'error' => 'Admin already exists.'], 409);
    }
    $stmt = $pdo->prepare('INSERT INTO admin_user (username, password_hash) VALUES (?, ?)');
    $stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT)]);
    $id = (int) $pdo->lastInsertId();
    admin_login_user($id);
    api_json_response(['ok' => true, 'user' => ['id' => $id, 'username' => $username]]);
} catch (Throwable) {
    api_json_response(['ok' => false, 'error' => 'Cannot create admin. Check DB schema.'], 500);
}
