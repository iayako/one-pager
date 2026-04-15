<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$response = [
    'ok' => true,
    'runtime' => 'php',
    'php_version' => PHP_VERSION,
    'time_utc' => gmdate('c'),
    'extensions' => [
        'pdo' => extension_loaded('pdo'),
        'pdo_mysql' => extension_loaded('pdo_mysql'),
        'mysqli' => extension_loaded('mysqli'),
    ],
];

echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
