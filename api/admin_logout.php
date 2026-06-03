<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_json_response(['ok' => false, 'error' => 'Method not allowed'], 405);
}

admin_logout_user();
api_json_response(['ok' => true]);
