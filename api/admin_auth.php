<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

function admin_start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_name('one_pager_admin');
    session_start();
}

function admin_current_user(PDO $pdo): ?array
{
    admin_start_session();
    $id = $_SESSION['admin_user_id'] ?? null;
    if (!is_int($id) && !(is_string($id) && ctype_digit($id))) {
        return null;
    }
    $stmt = $pdo->prepare('SELECT id, username, is_active FROM admin_user WHERE id = ? LIMIT 1');
    $stmt->execute([(int) $id]);
    $user = $stmt->fetch();
    if (!is_array($user) || (int) $user['is_active'] !== 1) {
        unset($_SESSION['admin_user_id']);
        return null;
    }
    return [
        'id' => (int) $user['id'],
        'username' => (string) $user['username'],
    ];
}

function admin_require_user(PDO $pdo): array
{
    $user = admin_current_user($pdo);
    if ($user === null) {
        api_json_response(['ok' => false, 'error' => 'Unauthorized'], 401);
    }
    return $user;
}

function admin_login_user(int $adminId): void
{
    admin_start_session();
    session_regenerate_id(true);
    $_SESSION['admin_user_id'] = $adminId;
}

function admin_logout_user(): void
{
    admin_start_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', (bool) $params['secure'], (bool) $params['httponly']);
    }
    session_destroy();
}
