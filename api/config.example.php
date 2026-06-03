<?php
declare(strict_types=1);

return [
    'host' => 'localhost',
    'port' => 3306,
    'name' => 'onepager_db',
    'user' => 'onepager_user',
    'password' => 'change_me',

    // Нужен только для первого запуска админки:
    // POST /api/admin_setup.php с этим токеном создаёт первого администратора.
    // После создания админа можно оставить пустым.
    'admin_setup_token' => 'change_this_long_random_token',
];
