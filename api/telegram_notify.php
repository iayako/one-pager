<?php
declare(strict_types=1);

/**
 * Push-уведомления менеджеру в Telegram при новой заявке с сайта.
 *
 * Бот (api/telegram_bot.php) работает в режиме pull (отвечает на команды).
 * Здесь — обратное направление: сайт сам шлёт сообщение в чат(ы) менеджера.
 *
 * Конфиг — тот же api/telegram_config.php, что и у бота:
 *   - 'token'             — токен бота (обязателен);
 *   - 'notify_chat_ids'   — кому слать уведомления о заявках (приоритет);
 *   - 'allowed_chat_ids'  — fallback, если notify_chat_ids не задан.
 *
 * Все функции отказоустойчивы: при любой проблеме просто молчат, чтобы
 * не ломать приём заявки на сайте.
 */

/**
 * @return array{token:string,chat_ids:array<int,int>}|null
 */
function telegram_notify_config(): ?array
{
    $path = __DIR__ . '/telegram_config.php';
    if (!is_file($path)) {
        return null;
    }
    /** @var mixed $cfg */
    $cfg = require $path;
    if (!is_array($cfg)) {
        return null;
    }

    $token = isset($cfg['token']) ? trim((string) $cfg['token']) : '';
    if ($token === '' || $token === 'PASTE_YOUR_TELEGRAM_BOT_TOKEN_HERE') {
        return null;
    }

    $source = $cfg['notify_chat_ids'] ?? $cfg['allowed_chat_ids'] ?? [];
    $ids = [];
    if (is_array($source)) {
        foreach ($source as $id) {
            if (is_int($id)) {
                $ids[] = $id;
            } elseif (is_string($id) && preg_match('/^-?\d+$/', trim($id)) === 1) {
                $ids[] = (int) trim($id);
            }
        }
    }
    $ids = array_values(array_unique($ids));
    if ($ids === []) {
        return null;
    }

    return ['token' => $token, 'chat_ids' => $ids];
}

function telegram_notify_send_message(string $token, int $chatId, string $html): void
{
    if (!function_exists('curl_init')) {
        return;
    }

    if (mb_strlen($html, 'UTF-8') > 4000) {
        $html = mb_substr($html, 0, 4000, 'UTF-8') . "\n\n…";
    }

    $url = 'https://api.telegram.org/bot' . $token . '/sendMessage';
    $fields = [
        'chat_id' => (string) $chatId,
        'text' => $html,
        'parse_mode' => 'HTML',
        'disable_web_page_preview' => '1',
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $fields,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
    ]);

    // Опциональный прокси из окружения — как у бота (на случай блокировок).
    $proxy = trim((string) (
        getenv('TELEGRAM_PROXY')
        ?: getenv('HTTPS_PROXY')
        ?: getenv('HTTP_PROXY')
        ?: ''
    ));
    if ($proxy !== '') {
        curl_setopt($ch, CURLOPT_PROXY, $proxy);
    }

    curl_exec($ch);
    curl_close($ch);
}

function telegram_notify_age_ru(?string $code): string
{
    return match ($code) {
        'under3' => 'Младше 3 лет',
        '3to5' => 'От 3 до 5 лет',
        'over5' => 'Старше 5 лет',
        default => ($code !== null && $code !== '') ? $code : '—',
    };
}

function telegram_notify_engine_ru(?string $code): string
{
    return match ($code) {
        'gasoline' => 'ДВС бензиновый',
        'hybrid' => 'Гибрид',
        default => ($code !== null && $code !== '') ? $code : '—',
    };
}

function telegram_notify_contact_ru(string $code): string
{
    return match ($code) {
        'telegram' => 'Telegram',
        'whatsapp' => 'WhatsApp',
        default => 'Звонок',
    };
}

/** @param mixed $n */
function telegram_notify_money($n, string $suffix): string
{
    if (!is_numeric($n)) {
        return '—';
    }
    $v = (float) $n;
    if (!is_finite($v)) {
        return '—';
    }

    return number_format($v, 0, '.', ' ') . ($suffix !== '' ? ' ' . $suffix : '');
}

/**
 * Отправляет уведомление о новой заявке во все настроенные чаты.
 *
 * @param array{
 *   id:int,
 *   name?:?string,
 *   phone:string,
 *   contactMethod?:string,
 *   comment?:?string,
 *   vehicle?:array<string,mixed>,
 *   snapshot?:array<string,mixed>|null
 * } $lead
 */
function telegram_notify_new_lead(array $lead): void
{
    $cfg = telegram_notify_config();
    if ($cfg === null) {
        return;
    }

    $esc = static fn ($s): string => htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

    $id = (int) ($lead['id'] ?? 0);
    $name = trim((string) ($lead['name'] ?? ''));
    $phone = trim((string) ($lead['phone'] ?? ''));
    $contact = telegram_notify_contact_ru((string) ($lead['contactMethod'] ?? 'phone'));
    $comment = trim((string) ($lead['comment'] ?? ''));
    $vehicle = is_array($lead['vehicle'] ?? null) ? $lead['vehicle'] : [];

    $phoneDigits = preg_replace('/\D+/', '', $phone) ?? '';

    $lines = [];
    $lines[] = '🔔 <b>Новая заявка с сайта №' . $id . '</b>';
    $lines[] = '';
    $lines[] = '👤 Имя: ' . ($name !== '' ? $esc($name) : '—');
    $lines[] = $phoneDigits !== ''
        ? '📞 Телефон: <a href="tel:+' . $esc($phoneDigits) . '">' . $esc($phone) . '</a>'
        : '📞 Телефон: ' . $esc($phone);
    $lines[] = '💬 Связь: ' . $esc($contact);
    if ($comment !== '') {
        $lines[] = '📝 Комментарий: ' . $esc($comment);
    }

    $price = $vehicle['auction_price_yen'] ?? null;
    $age = isset($vehicle['vehicle_age']) ? (string) $vehicle['vehicle_age'] : null;
    $engine = isset($vehicle['engine_type']) ? (string) $vehicle['engine_type'] : null;
    $auction = trim((string) ($vehicle['auction_name'] ?? ''));
    $cc = $vehicle['engine_cc'] ?? null;
    $hp = $vehicle['engine_hp'] ?? null;

    if ($price !== null || $age !== null || $engine !== null || $auction !== '' || $cc !== null || $hp !== null) {
        $lines[] = '';
        $lines[] = '<b>Параметры авто</b>';
        $lines[] = '🚗 Цена: ' . telegram_notify_money($price, '¥');
        $lines[] = '📅 Возраст: ' . $esc(telegram_notify_age_ru($age));
        $lines[] = '⚙️ Двигатель: ' . $esc(telegram_notify_engine_ru($engine));
        if ($auction !== '') {
            $lines[] = '🏷 Аукцион: ' . $esc($auction);
        }
        $lines[] = '🔧 Объём / мощность: ' . telegram_notify_money($cc, 'см³') . ' · ' . telegram_notify_money($hp, 'л.с.');
    }

    $snapshot = is_array($lead['snapshot'] ?? null) ? $lead['snapshot'] : null;
    $outputs = is_array($snapshot['outputs'] ?? null) ? $snapshot['outputs'] : null;
    if (is_array($outputs)) {
        $train = $outputs['grandTotalTrainRub'] ?? null;
        $track = $outputs['grandTotalTrackRub'] ?? null;
        if ($train !== null || $track !== null) {
            $lines[] = '';
            $lines[] = '<b>Итог расчёта</b>';
            $lines[] = 'Train: ' . telegram_notify_money($train, '₽') . ' · Track: ' . telegram_notify_money($track, '₽');
        }
    }

    $lines[] = '';
    $lines[] = 'Подробнее: /lead ' . $id;

    $text = implode("\n", $lines);

    foreach ($cfg['chat_ids'] as $chatId) {
        telegram_notify_send_message($cfg['token'], (int) $chatId, $text);
    }
}
