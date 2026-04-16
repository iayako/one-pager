<?php
declare(strict_types=1);

/**
 * Скопируйте этот файл в telegram_config.php и заполните реальные значения.
 *
 * Никогда не коммитьте файл telegram_config.php с реальным токеном в git.
 */
return [
    // Токен Telegram-бота вида 123456789:ABC...
    'token' => 'PASTE_YOUR_TELEGRAM_BOT_TOKEN_HERE',

    /**
     * (Опционально) Список разрешённых chat_id, чтобы бот отвечал только «своим».
     * Получить chat_id можно, запустив бота и посмотрев логи (мы выводим его в консоль).
     *
     * Пример:
     * 'allowed_chat_ids' => [123456789, 987654321],
     */
    'allowed_chat_ids' => [],
];

