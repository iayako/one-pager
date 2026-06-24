<?php
declare(strict_types=1);

/**
 * Скопируйте этот файл в google_sheets_config.php и заполните реальные значения.
 * Никогда не коммитьте google_sheets_config.php в git.
 *
 * Как получить webhook_url:
 *  1. Создайте Google-таблицу → Расширения → Apps Script.
 *  2. Вставьте код из api/google_sheets_apps_script.gs, замените SECRET.
 *  3. Развернуть → Создать развёртывание → тип «Веб-приложение»,
 *     «Выполнять от имени: я», «У кого есть доступ: все».
 *  4. Скопируйте URL веб-приложения (вида https://script.google.com/macros/s/AKfy.../exec).
 *
 * secret здесь должен совпадать с SECRET в скрипте Apps Script.
 */
return [
    'webhook_url' => 'PASTE_APPS_SCRIPT_WEB_APP_URL_HERE',
    'secret' => 'PASTE_A_LONG_RANDOM_SECRET',
];
