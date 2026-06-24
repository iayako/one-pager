<?php
declare(strict_types=1);

/**
 * Дублирование заявок с сайта в Google-таблицу (для статистики и аналитики).
 *
 * Используется Google Apps Script Web App: скрипт привязан к таблице и принимает
 * POST с JSON { secret, lead: {...} }, добавляя строку на лист «Заявки».
 * Настройки — в api/google_sheets_config.php (в git не коммитится):
 *   - 'webhook_url' — URL развёрнутого веб-приложения Apps Script;
 *   - 'secret'      — общий секрет (должен совпадать со значением в скрипте).
 *
 * Все функции отказоустойчивы: при любой проблеме просто молчат, чтобы
 * не ломать приём заявки на сайте.
 */

/**
 * @return array{url:string,secret:string}|null
 */
function google_sheets_config(): ?array
{
    $path = __DIR__ . '/google_sheets_config.php';
    if (!is_file($path)) {
        return null;
    }
    /** @var mixed $cfg */
    $cfg = require $path;
    if (!is_array($cfg)) {
        return null;
    }

    $url = isset($cfg['webhook_url']) ? trim((string) $cfg['webhook_url']) : '';
    $secret = isset($cfg['secret']) ? (string) $cfg['secret'] : '';
    if ($url === '' || str_starts_with($url, 'PASTE_') || !str_starts_with($url, 'https://')) {
        return null;
    }

    return ['url' => $url, 'secret' => $secret];
}

function gs_age_ru(?string $code): string
{
    return match ($code) {
        'under3' => 'Младше 3 лет',
        '3to5' => 'От 3 до 5 лет',
        'over5' => 'Старше 5 лет',
        default => ($code !== null && $code !== '') ? $code : '',
    };
}

function gs_engine_ru(?string $code): string
{
    return match ($code) {
        'gasoline' => 'ДВС бензиновый',
        'hybrid' => 'Гибрид',
        default => ($code !== null && $code !== '') ? $code : '',
    };
}

function gs_contact_ru(string $code): string
{
    return match ($code) {
        'telegram' => 'Telegram',
        'whatsapp' => 'WhatsApp',
        default => 'Звонок',
    };
}

/** @param mixed $v */
function gs_num_or_empty($v)
{
    if ($v === null || $v === '') {
        return '';
    }
    if (!is_numeric($v)) {
        return '';
    }
    $n = (float) $v;
    return is_finite($n) ? $n : '';
}

/**
 * Добавляет строку заявки в Google-таблицу. Принимает ту же форму данных,
 * что и telegram_notify_new_lead().
 *
 * @param array{
 *   id?:int,
 *   name?:?string,
 *   phone?:string,
 *   contactMethod?:string,
 *   comment?:?string,
 *   vehicle?:array<string,mixed>,
 *   snapshot?:array<string,mixed>|null,
 *   calculationLogId?:?int,
 *   clientIp?:?string,
 *   createdAt?:?string
 * } $lead
 */
function google_sheets_append_lead(array $lead): void
{
    $cfg = google_sheets_config();
    if ($cfg === null || !function_exists('curl_init')) {
        return;
    }

    $vehicle = is_array($lead['vehicle'] ?? null) ? $lead['vehicle'] : [];
    $outputs = is_array($lead['snapshot']['outputs'] ?? null) ? $lead['snapshot']['outputs'] : [];

    // Ключи строки должны совпадать с массивом COLUMNS в Apps Script.
    $row = [
        'createdAt' => (string) ($lead['createdAt'] ?? ''),
        'id' => (int) ($lead['id'] ?? 0),
        'name' => (string) ($lead['name'] ?? ''),
        'phone' => (string) ($lead['phone'] ?? ''),
        'contactMethod' => gs_contact_ru((string) ($lead['contactMethod'] ?? 'phone')),
        'comment' => (string) ($lead['comment'] ?? ''),
        'auctionPriceYen' => gs_num_or_empty($vehicle['auction_price_yen'] ?? null),
        'vehicleAge' => gs_age_ru(isset($vehicle['vehicle_age']) ? (string) $vehicle['vehicle_age'] : null),
        'engineType' => gs_engine_ru(isset($vehicle['engine_type']) ? (string) $vehicle['engine_type'] : null),
        'auctionName' => (string) ($vehicle['auction_name'] ?? ''),
        'engineCc' => gs_num_or_empty($vehicle['engine_cc'] ?? null),
        'engineHp' => gs_num_or_empty($vehicle['engine_hp'] ?? null),
        'grandTrain' => gs_num_or_empty($outputs['grandTotalTrainRub'] ?? null),
        'grandTrack' => gs_num_or_empty($outputs['grandTotalTrackRub'] ?? null),
        'calculationLogId' => ($lead['calculationLogId'] ?? null) !== null ? (int) $lead['calculationLogId'] : '',
        'clientIp' => (string) ($lead['clientIp'] ?? ''),
    ];

    $payload = json_encode(
        ['secret' => $cfg['secret'], 'lead' => $row],
        JSON_UNESCAPED_UNICODE
    );
    if ($payload === false) {
        return;
    }

    $ch = curl_init($cfg['url']);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        // Apps Script отвечает 302 на script.googleusercontent.com — нужно следовать.
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 10,
    ]);

    // Если Google закрыт с этого сервера — можно пустить через тот же прокси, что и Telegram.
    $proxy = trim((string) (getenv('GOOGLE_PROXY') ?: getenv('TELEGRAM_PROXY') ?: ''));
    if ($proxy !== '') {
        curl_setopt($ch, CURLOPT_PROXY, $proxy);
    }

    curl_exec($ch);
    curl_close($ch);
}
