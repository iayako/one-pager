<?php
declare(strict_types=1);

/**
 * Telegram-бот: заявки с сайта (lead_request) и отладочный просмотр расчётов (calculation_log).
 *
 * Команды:
 *   /start, /help — справка
 *   /leads — список заявок (кнопки и листание)
 *   /lead &lt;id&gt; — карточка заявки
 *   /last — последний расчёт (calculation_log)
 *   /id &lt;n&gt; — расчёт по ID (calculation_log)
 *
 * Запуск: php api/telegram_bot.php
 */

const LEADS_PAGE_SIZE = 5;

/** Текст на reply-клавиатуре (должен совпадать с проверкой в обработчике). */
const MENU_LEADS = '📋 Заявки';
const MENU_HELP = 'ℹ️ Справка';
const MENU_LAST = '🔧 Последний расчёт';

/** Показ даты/времени в боте (заявки, расчёты). */
const DISPLAY_TIMEZONE = 'Asia/Irkutsk';

/**
 * В какой зоне интерпретировать строку created_at из MySQL без суффикса TZ.
 * Чаще всего TIMESTAMP отдаётся в UTC; если сдвиг неверный — смените на зону сессии MySQL.
 */
const DB_NAIVE_DATETIME_SOURCE_TZ = 'UTC';

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "Этот скрипт нужно запускать из консоли: php api/telegram_bot.php\n");
    exit(1);
}

// ---- Загрузка конфигов ----

$dbConfigPath = __DIR__ . '/config.php';
if (!file_exists($dbConfigPath)) {
    fwrite(STDERR, "Ошибка: отсутствует api/config.php. Скопируйте api/config.example.php и заполните доступы к БД.\n");
    exit(1);
}

/** @var array{host:string,port:int,name:string,user:string,password:string} $dbConfig */
$dbConfig = require $dbConfigPath;

$tgConfigPath = __DIR__ . '/telegram_config.php';
if (!file_exists($tgConfigPath)) {
    fwrite(STDERR, "Ошибка: отсутствует api/telegram_config.php. Скопируйте api/telegram_config.example.php и вставьте токен бота.\n");
    exit(1);
}

/** @var array{token:string,allowed_chat_ids?:array<int,int>} $tgConfig */
$tgConfig = require $tgConfigPath;

$botToken = trim($tgConfig['token'] ?? '');
if ($botToken === '') {
    fwrite(STDERR, "Ошибка: в api/telegram_config.php не задан токен бота.\n");
    exit(1);
}

$allowedChatIds = [];
if (isset($tgConfig['allowed_chat_ids']) && is_array($tgConfig['allowed_chat_ids'])) {
    foreach ($tgConfig['allowed_chat_ids'] as $id) {
        if (is_int($id)) {
            $allowedChatIds[$id] = true;
        }
    }
}

// ---- Подключение к БД ----

$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
    $dbConfig['host'],
    (int) $dbConfig['port'],
    $dbConfig['name']
);

try {
    $pdo = new PDO($dsn, $dbConfig['user'], $dbConfig['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    fwrite(STDERR, "Не удалось подключиться к БД: " . $e->getMessage() . "\n");
    exit(1);
}

// ---- Вспомогательные функции ----

if (!function_exists('str_starts_with')) {
    function str_starts_with(string $haystack, string $needle): bool
    {
        return $needle === '' || strpos($haystack, $needle) === 0;
    }
}

function redactTelegramToken(string $message, string $botToken): string
{
    return $botToken !== '' ? str_replace($botToken, '[token]', $message) : $message;
}

function tgEsc(?string $s): string
{
    $s = (string) $s;

    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
}

/**
 * Строка из БД (Y-m-d H:i:s) → локальное время Иркутска для отображения в боте.
 */
function formatDatetimeIrkutsk(?string $mysqlDatetime): string
{
    if ($mysqlDatetime === null) {
        return '—';
    }
    $s = trim((string) $mysqlDatetime);
    if ($s === '') {
        return '—';
    }

    try {
        $from = new DateTimeZone(DB_NAIVE_DATETIME_SOURCE_TZ);
        $to = new DateTimeZone(DISPLAY_TIMEZONE);
        $dt = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $s, $from);
        if ($dt === false) {
            $dt = DateTimeImmutable::createFromFormat('Y-m-d H:i:s.u', $s, $from);
        }
        if ($dt === false) {
            $dt = new DateTimeImmutable($s, $from);
        }

        return $dt->setTimezone($to)->format('Y-m-d H:i:s');
    } catch (Throwable) {
        return htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
}

function vehicleAgeRu(?string $code): string
{
    return match ($code) {
        'under3' => 'Младше 3 лет',
        '3to5' => 'От 3 до 5 лет',
        'over5' => 'Старше 5 лет',
        default => $code !== null && $code !== '' ? tgEsc($code) : '—',
    };
}

function engineTypeRu(?string $code): string
{
    return match ($code) {
        'gasoline' => 'ДВС бензиновый',
        'hybrid' => 'Гибрид',
        default => $code !== null && $code !== '' ? tgEsc($code) : '—',
    };
}

function contactMethodRu(string $m): string
{
    return match ($m) {
        'telegram' => 'Telegram',
        'whatsapp' => 'WhatsApp',
        default => 'Звонок',
    };
}

/** @param float|int|string|null $n */
function formatMoneyYen($n): string
{
    if ($n === null || $n === '') {
        return '—';
    }
    $v = is_numeric($n) ? (float) $n : null;
    if ($v === null || !is_finite($v)) {
        return '—';
    }

    return number_format($v, 0, '.', ' ') . ' ¥';
}

/** @param float|int|string|null $n */
function formatNumRu($n, string $suffix = ''): string
{
    if ($n === null || $n === '') {
        return '—';
    }
    if (!is_numeric($n)) {
        return '—';
    }
    $v = (float) $n;
    if (!is_finite($v)) {
        return '—';
    }
    $dec = fmod($v, 1.0) === 0.0 ? 0 : 2;

    return number_format($v, $dec, ',', ' ') . ($suffix !== '' ? ' ' . $suffix : '');
}

/**
 * GET (для getUpdates).
 *
 * @return array<string,mixed>
 */
function telegramApiRequest(string $botToken, string $method, array $params = []): array
{
    $url = 'https://api.telegram.org/bot' . $botToken . '/' . $method;

    if (!empty($params)) {
        $url .= '?' . http_build_query($params);
    }

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 20,
            CURLOPT_TIMEOUT => 70,
            CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
            CURLOPT_HTTPGET => true,
        ]);

        $raw = curl_exec($ch);
        $curlErr = curl_error($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($raw === false) {
            return ['ok' => false, 'description' => $curlErr !== '' ? $curlErr : 'curl_exec вернул false'];
        }

        if ($raw === '') {
            return ['ok' => false, 'description' => $curlErr !== ''
                ? $curlErr
                : 'Пустой ответ от Telegram (HTTP ' . $httpCode . ')'];
        }
    } else {
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 70,
            ],
        ]);

        $raw = @file_get_contents($url, false, $context);
        if ($raw === false) {
            $err = error_get_last();
            $hint = is_array($err) && isset($err['message']) ? (string) $err['message'] : 'file_get_contents вернул false';

            return ['ok' => false, 'description' => redactTelegramToken($hint, $botToken)];
        }
    }

    $decoded = json_decode((string) $raw, true);
    if (!is_array($decoded)) {
        return ['ok' => false, 'description' => 'Некорректный JSON от Telegram API'];
    }

    return $decoded;
}

/**
 * POST application/x-www-form-urlencoded (sendMessage, editMessageText, …).
 *
 * @return array<string,mixed>
 */
function telegramApiPost(string $botToken, string $method, array $params): array
{
    $url = 'https://api.telegram.org/bot' . $botToken . '/' . $method;

    $flat = [];
    foreach ($params as $k => $v) {
        $flat[$k] = is_array($v) ? json_encode($v, JSON_UNESCAPED_UNICODE) : (string) $v;
    }

    if (!function_exists('curl_init')) {
        return ['ok' => false, 'description' => 'Нужно расширение php-curl'];
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $flat,
        CURLOPT_CONNECTTIMEOUT => 20,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
    ]);

    $raw = curl_exec($ch);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($raw === false || $raw === '') {
        return ['ok' => false, 'description' => $curlErr !== '' ? $curlErr : 'curl POST failed'];
    }

    $decoded = json_decode((string) $raw, true);

    return is_array($decoded) ? $decoded : ['ok' => false, 'description' => 'Некорректный JSON'];
}

telegramApiPost($botToken, 'setMyCommands', [
    'commands' => json_encode([
        ['command' => 'start', 'description' => 'Приветствие и кнопки меню'],
        ['command' => 'leads', 'description' => 'Заявки с сайта'],
        ['command' => 'lead', 'description' => 'Заявка по номеру (напр. /lead 12)'],
        ['command' => 'last', 'description' => 'Последний расчёт в логе'],
        ['command' => 'id', 'description' => 'Расчёт по ID из лога'],
    ], JSON_UNESCAPED_UNICODE),
]);

function truncatePlain(string $text, int $maxLen): string
{
    if (mb_strlen($text, 'UTF-8') <= $maxLen) {
        return $text;
    }

    return mb_substr($text, 0, $maxLen - 1, 'UTF-8') . '…';
}

function replyKeyboardMarkupJson(): string
{
    return json_encode([
        'keyboard' => [
            [['text' => MENU_LEADS]],
            [
                ['text' => MENU_HELP],
                ['text' => MENU_LAST],
            ],
        ],
        'resize_keyboard' => true,
        'is_persistent' => true,
    ], JSON_UNESCAPED_UNICODE);
}

function sendPlain(string $botToken, int $chatId, string $text, bool $withReplyMenu = true): void
{
    if (mb_strlen($text, 'UTF-8') > 4000) {
        $text = mb_substr($text, 0, 4000, 'UTF-8') . "\n\n(сообщение обрезано)";
    }

    $params = [
        'chat_id' => (string) $chatId,
        'text' => $text,
    ];

    if ($withReplyMenu) {
        $params['reply_markup'] = replyKeyboardMarkupJson();
    }

    telegramApiPost($botToken, 'sendMessage', $params);
}

/**
 * @param array<int,array<int,array{text:string,callback_data:string}>> $inlineKeyboard
 */
function sendHtml(
    string $botToken,
    int $chatId,
    string $html,
    ?array $inlineKeyboard = null
): void {
    if (mb_strlen($html, 'UTF-8') > 4000) {
        $html = mb_substr($html, 0, 4000, 'UTF-8') . "\n\n<i>(обрезано)</i>";
    }

    $params = [
        'chat_id' => (string) $chatId,
        'text' => $html,
        'parse_mode' => 'HTML',
        'disable_web_page_preview' => '1',
    ];

    if ($inlineKeyboard !== null) {
        $params['reply_markup'] = json_encode(['inline_keyboard' => $inlineKeyboard], JSON_UNESCAPED_UNICODE);
    }

    telegramApiPost($botToken, 'sendMessage', $params);
}

/**
 * @param array<int,array<int,array{text:string,callback_data:string}>>|null $inlineKeyboard
 */
function editHtmlMessage(
    string $botToken,
    int $chatId,
    int $messageId,
    string $html,
    ?array $inlineKeyboard = null
): void {
    if (mb_strlen($html, 'UTF-8') > 4000) {
        $html = mb_substr($html, 0, 4000, 'UTF-8') . "\n\n<i>(обрезано)</i>";
    }

    $params = [
        'chat_id' => (string) $chatId,
        'message_id' => (string) $messageId,
        'text' => $html,
        'parse_mode' => 'HTML',
        'disable_web_page_preview' => '1',
    ];

    if ($inlineKeyboard !== null) {
        $params['reply_markup'] = json_encode(['inline_keyboard' => $inlineKeyboard], JSON_UNESCAPED_UNICODE);
    }

    telegramApiPost($botToken, 'editMessageText', $params);
}

function answerCallbackQuery(string $botToken, string $callbackQueryId, ?string $text = null): void
{
    $p = ['callback_query_id' => $callbackQueryId];
    if ($text !== null && $text !== '') {
        $p['text'] = truncatePlain($text, 200);
        $p['show_alert'] = '0';
    }

    telegramApiPost($botToken, 'answerCallbackQuery', $p);
}

/**
 * @param array<string,mixed> $data
 */
function formatShortJson(array $data, int $maxLen = 600): string
{
    $parts = [];

    foreach ($data as $key => $value) {
        if (is_scalar($value) || $value === null) {
            $valStr = (string) ($value ?? 'null');
        } else {
            $valStr = json_encode($value, JSON_UNESCAPED_UNICODE);
        }

        if ($valStr === false) {
            $valStr = '[error]';
        }

        $parts[] = $key . ': ' . $valStr;

        $joined = implode("\n", $parts);
        if (mb_strlen($joined, 'UTF-8') > $maxLen) {
            array_pop($parts);
            $parts[] = '...';
            break;
        }
    }

    return implode("\n", $parts);
}

function reconnectPdo(PDO &$pdo): void
{
    global $dsn, $dbConfig;

    $pdo = new PDO($dsn, $dbConfig['user'], $dbConfig['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}

/**
 * @return array{text: string, keyboard: array<int, array<int, array{text: string, callback_data: string}>>|null}
 */
function buildLeadsView(PDO &$pdo, int $offset): array
{
    $total = (int) $pdo->query('SELECT COUNT(*) AS c FROM lead_request')->fetch()['c'];

    if ($total === 0) {
        return [
            'text' => "<b>Заявки с сайта</b>\n\nПока нет ни одной записи.",
            'keyboard' => null,
        ];
    }

    $stmt = $pdo->prepare(
        'SELECT id, created_at, name, phone, auction_price_yen, auction_name, vehicle_age
         FROM lead_request
         ORDER BY id DESC
         LIMIT :lim OFFSET :off'
    );
    $stmt->bindValue(':lim', LEADS_PAGE_SIZE, PDO::PARAM_INT);
    $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
    $stmt->execute();
    /** @var array<int,array<string,mixed>> $rows */
    $rows = $stmt->fetchAll();

    $pages = max(1, (int) ceil($total / LEADS_PAGE_SIZE));
    $pageNum = (int) floor($offset / LEADS_PAGE_SIZE) + 1;

    $lines = [];
    $lines[] = '<b>Заявки с сайта</b>';
    $lines[] = 'Страница ' . $pageNum . ' из ' . $pages . ' · всего ' . $total;
    $lines[] = '';

    $keyboard = [];

    foreach ($rows as $row) {
        $id = (int) $row['id'];
        $when = tgEsc(formatDatetimeIrkutsk(isset($row['created_at']) ? (string) $row['created_at'] : null));
        $name = trim((string) ($row['name'] ?? ''));
        $nameDisp = $name !== '' ? tgEsc($name) : 'без имени';
        $phone = tgEsc((string) ($row['phone'] ?? ''));
        $price = formatMoneyYen($row['auction_price_yen'] ?? null);
        $auction = trim((string) ($row['auction_name'] ?? ''));
        $auctionDisp = $auction !== '' ? tgEsc(truncatePlain($auction, 40)) : '—';
        $ageShort = vehicleAgeRu(isset($row['vehicle_age']) ? (string) $row['vehicle_age'] : null);

        $lines[] = '────────────';
        $lines[] = "<b>№{$id}</b> · {$when}";
        $lines[] = "👤 {$nameDisp} · 📞 {$phone}";
        $lines[] = '🚗 ' . $price . ' · ' . $auctionDisp;
        $lines[] = '📅 ' . $ageShort;
        $lines[] = '';

        $btnLabel = 'Открыть №' . $id;
        $keyboard[] = [['text' => truncatePlain($btnLabel, 64), 'callback_data' => 'ld_' . $id]];
    }

    $navRow = [];
    if ($offset > 0) {
        $prev = max(0, $offset - LEADS_PAGE_SIZE);
        $navRow[] = ['text' => '◀ Назад', 'callback_data' => 'pg_' . $prev];
    }
    if ($offset + LEADS_PAGE_SIZE < $total) {
        $next = $offset + LEADS_PAGE_SIZE;
        $navRow[] = ['text' => 'Вперёд ▶', 'callback_data' => 'pg_' . $next];
    }
    if ($navRow !== []) {
        $keyboard[] = $navRow;
    }

    return [
        'text' => implode("\n", $lines),
        'keyboard' => $keyboard !== [] ? $keyboard : null,
    ];
}

/**
 * @param array<string,mixed>|false $row
 */
function buildLeadDetailHtml($row): string
{
    if ($row === false || !is_array($row)) {
        return 'Заявка не найдена.';
    }

    $id = (int) $row['id'];
    $when = tgEsc(formatDatetimeIrkutsk(isset($row['created_at']) ? (string) $row['created_at'] : null));
    $name = trim((string) ($row['name'] ?? ''));
    $phone = tgEsc((string) ($row['phone'] ?? ''));
    $cm = contactMethodRu((string) ($row['contact_method'] ?? 'phone'));
    $comment = trim((string) ($row['comment'] ?? ''));

    $price = formatMoneyYen($row['auction_price_yen'] ?? null);
    $vAge = vehicleAgeRu(isset($row['vehicle_age']) ? (string) $row['vehicle_age'] : null);
    $eType = engineTypeRu(isset($row['engine_type']) ? (string) $row['engine_type'] : null);
    $auction = trim((string) ($row['auction_name'] ?? ''));
    $auctionLine = $auction !== '' ? tgEsc($auction) : '—';
    $cc = formatNumRu($row['engine_cc'] ?? null, 'см³');
    $hp = formatNumRu($row['engine_hp'] ?? null, 'л.с.');

    $lines = [];
    $lines[] = "<b>Заявка №{$id}</b>";
    $lines[] = '📆 ' . $when . ' · Иркутск';
    $lines[] = '';
    $lines[] = '<b>Контакт</b>';
    $lines[] = 'Имя: ' . ($name !== '' ? tgEsc($name) : '—');
    $lines[] = 'Телефон: ' . $phone;
    $lines[] = 'Связь: ' . tgEsc($cm);
    if ($comment !== '') {
        $lines[] = 'Комментарий: ' . tgEsc($comment);
    }
    $lines[] = '';
    $lines[] = '<b>Параметры расчёта</b>';
    $lines[] = 'Цена авто: ' . $price;
    $lines[] = 'Возраст: ' . $vAge;
    $lines[] = 'Тип двигателя: ' . $eType;
    $lines[] = 'Аукцион: ' . $auctionLine;
    $lines[] = 'Объём: ' . $cc;
    $lines[] = 'Мощность: ' . $hp;

    $calcLogId = $row['calculation_log_id'] ?? null;
    if ($calcLogId !== null && (int) $calcLogId > 0) {
        $lines[] = '';
        $lines[] = '🔗 Расчёт в логе: ID ' . (int) $calcLogId;
    }

    return implode("\n", $lines);
}

function handleLastCommand(PDO &$pdo): ?string
{
    $attempts = 0;

    while (true) {
        $attempts++;

        try {
            $stmt = $pdo->query(
                'SELECT id, created_at, inputs_json, outputs_json FROM calculation_log ORDER BY id DESC LIMIT 1'
            );
            $row = $stmt->fetch();

            if (!$row) {
                return 'В базе пока нет ни одного расчёта.';
            }

            $inputs = json_decode((string) $row['inputs_json'], true);
            $outputs = json_decode((string) $row['outputs_json'], true);

            $inputsText = is_array($inputs) ? formatShortJson($inputs) : '[не удалось разобрать JSON]';
            $outputsText = is_array($outputs) ? formatShortJson($outputs) : '[не удалось разобрать JSON]';

            $text = "Последний расчёт #" . (int) $row['id'] . "\n";
            $text .= 'Создан (Иркутск): ' . formatDatetimeIrkutsk((string) $row['created_at']) . "\n\n";
            $text .= "Входные данные:\n";
            $text .= $inputsText . "\n\n";
            $text .= "Результаты:\n";
            $text .= $outputsText;

            return $text;
        } catch (PDOException $e) {
            $code = (string) $e->getCode();
            $msg = $e->getMessage();
            $isGone =
                $code === '2006'
                || $code === '2013'
                || str_contains($msg, 'server has gone away');

            if ($isGone && $attempts < 2) {
                reconnectPdo($pdo);
                continue;
            }

            throw $e;
        }
    }
}

function handleIdCommand(PDO &$pdo, int $id): ?string
{
    $attempts = 0;

    while (true) {
        $attempts++;

        try {
            $stmt = $pdo->prepare(
                'SELECT id, created_at, inputs_json, outputs_json FROM calculation_log WHERE id = :id LIMIT 1'
            );
            $stmt->execute([':id' => $id]);
            $row = $stmt->fetch();

            if (!$row) {
                return 'Расчёт с таким ID не найден: ' . $id;
            }

            $inputs = json_decode((string) $row['inputs_json'], true);
            $outputs = json_decode((string) $row['outputs_json'], true);

            $inputsText = is_array($inputs) ? formatShortJson($inputs) : '[не удалось разобрать JSON]';
            $outputsText = is_array($outputs) ? formatShortJson($outputs) : '[не удалось разобрать JSON]';

            $text = "Расчёт #" . (int) $row['id'] . "\n";
            $text .= 'Создан (Иркутск): ' . formatDatetimeIrkutsk((string) $row['created_at']) . "\n\n";
            $text .= "Входные данные:\n";
            $text .= $inputsText . "\n\n";
            $text .= "Результаты:\n";
            $text .= $outputsText;

            return $text;
        } catch (PDOException $e) {
            $code = (string) $e->getCode();
            $msg = $e->getMessage();
            $isGone =
                $code === '2006'
                || $code === '2013'
                || str_contains($msg, 'server has gone away');

            if ($isGone && $attempts < 2) {
                reconnectPdo($pdo);
                continue;
            }

            throw $e;
        }
    }
}

function helpText(): string
{
    return <<<TXT
Кнопки снизу экрана — основной способ: Заявки, Справка, Последний расчёт.

Команды (список также в меню «☰» у поля ввода):
/leads — заявки с сайта
/lead N — карточка заявки № N
/last — последний технический расчёт (calculation_log)
/id N — расчёт по ID (calculation_log)

В списке заявок нажимайте «Открыть №…» для подробностей.
TXT;
}

function welcomeWithMenuText(): string
{
    return "Выберите действие кнопками под полем ввода или командой из меню «☰».\n\n" . helpText();
}

// ---- Основной цикл long polling ----

fwrite(STDOUT, "Telegram-бот запущен. Нажмите Ctrl+C для остановки.\n");

$offset = 0;

while (true) {
    $response = telegramApiRequest($botToken, 'getUpdates', [
        'timeout' => 25,
        'offset' => $offset,
        'allowed_updates' => json_encode(['message', 'callback_query']),
    ]);

    if (!($response['ok'] ?? false)) {
        $detail = $response['description'] ?? '';
        if ($detail !== '') {
            fwrite(STDERR, "Ошибка getUpdates: {$detail}. Жду 5 секунд...\n");
        } else {
            fwrite(STDERR, 'Ошибка getUpdates: ' . json_encode($response, JSON_UNESCAPED_UNICODE) . ". Жду 5 секунд...\n");
        }
        sleep(5);
        continue;
    }

    /** @var array<int,array<string,mixed>> $updates */
    $updates = $response['result'] ?? [];

    if (!$updates) {
        continue;
    }

    foreach ($updates as $update) {
        $updateId = (int) ($update['update_id'] ?? 0);
        if ($updateId >= $offset) {
            $offset = $updateId + 1;
        }

        // --- callback_query (inline-кнопки) ---
        $cb = $update['callback_query'] ?? null;
        if (is_array($cb)) {
            $cbId = isset($cb['id']) && is_string($cb['id']) ? $cb['id'] : '';
            $cbFrom = $cb['from'] ?? null;
            $cbMsg = $cb['message'] ?? null;
            $data = isset($cb['data']) && is_string($cb['data']) ? $cb['data'] : '';

            if ($cbId === '' || !is_array($cbFrom) || !is_array($cbMsg)) {
                continue;
            }

            $cqChatId = isset($cbMsg['chat']['id']) ? (int) $cbMsg['chat']['id'] : 0;
            $cqMessageId = isset($cbMsg['message_id']) ? (int) $cbMsg['message_id'] : 0;
            if ($allowedChatIds !== [] && !isset($allowedChatIds[$cqChatId])) {
                answerCallbackQuery($botToken, $cbId, 'Нет доступа.');
                continue;
            }

            answerCallbackQuery($botToken, $cbId);

            if (preg_match('/^pg_(\d+)$/', $data, $m) && $cqChatId > 0 && $cqMessageId > 0) {
                $off = (int) $m[1];
                try {
                    $view = buildLeadsView($pdo, $off);
                    editHtmlMessage($botToken, $cqChatId, $cqMessageId, $view['text'], $view['keyboard']);
                } catch (Throwable $e) {
                    sendPlain($botToken, $cqChatId, 'Ошибка БД: ' . $e->getMessage());
                }
                continue;
            }

            if (preg_match('/^ld_(\d+)$/', $data, $m)) {
                $leadId = (int) $m[1];
                try {
                    $stmt = $pdo->prepare(
                        'SELECT id, created_at, name, phone, contact_method, comment, calculation_log_id,
                         auction_price_yen, vehicle_age, engine_type, auction_name, engine_cc, engine_hp
                         FROM lead_request WHERE id = :id LIMIT 1'
                    );
                    $stmt->execute([':id' => $leadId]);
                    $row = $stmt->fetch();
                    $html = buildLeadDetailHtml($row);
                    sendHtml($botToken, $cqChatId, $html);
                } catch (Throwable $e) {
                    sendPlain($botToken, $cqChatId, 'Ошибка БД: ' . $e->getMessage());
                }
                continue;
            }

            continue;
        }

        // --- message ---
        $message = $update['message'] ?? null;
        if (!is_array($message)) {
            continue;
        }

        $chat = $message['chat'] ?? null;
        if (!is_array($chat) || !isset($chat['id'])) {
            continue;
        }

        $chatId = (int) $chat['id'];
        $text = isset($message['text']) && is_string($message['text'])
            ? trim($message['text'])
            : '';

        fwrite(STDOUT, "Сообщение из чата {$chatId}: {$text}\n");

        if ($allowedChatIds !== [] && !isset($allowedChatIds[$chatId])) {
            sendPlain($botToken, $chatId, 'Доступ к этому боту ограничен для данного чата.');
            continue;
        }

        if ($text === '') {
            sendPlain($botToken, $chatId, helpText());
            continue;
        }

        if ($text === MENU_LEADS) {
            $text = '/leads';
        } elseif ($text === MENU_HELP) {
            $text = '/help';
        } elseif ($text === MENU_LAST) {
            $text = '/last';
        }

        $cmd = strtolower(explode(' ', $text, 2)[0]);

        if ($cmd === '/start') {
            sendPlain($botToken, $chatId, welcomeWithMenuText());
            continue;
        }

        if ($cmd === '/help') {
            sendPlain($botToken, $chatId, helpText());
            continue;
        }

        if ($cmd === '/leads' || str_starts_with($text, '/leads')) {
            try {
                $view = buildLeadsView($pdo, 0);
                sendHtml($botToken, $chatId, $view['text'], $view['keyboard']);
            } catch (Throwable $e) {
                $msg = $e->getMessage();
                if (str_contains($msg, 'Unknown column') || str_contains($msg, "doesn't exist")) {
                    sendPlain(
                        $botToken,
                        $chatId,
                        'В БД нет новых колонок для заявок. Выполните на сервере: mysql ... < api/migration_lead_client_fields.sql'
                    );
                } else {
                    sendPlain($botToken, $chatId, 'Ошибка: ' . $msg);
                }
            }
            continue;
        }

        if (preg_match('~^/lead\s+(\d+)\s*$~u', $text, $m)) {
            $leadId = (int) $m[1];
            try {
                $stmt = $pdo->prepare(
                    'SELECT id, created_at, name, phone, contact_method, comment, calculation_log_id,
                     auction_price_yen, vehicle_age, engine_type, auction_name, engine_cc, engine_hp
                     FROM lead_request WHERE id = :id LIMIT 1'
                );
                $stmt->execute([':id' => $leadId]);
                $row = $stmt->fetch();
                sendHtml($botToken, $chatId, buildLeadDetailHtml($row));
            } catch (Throwable $e) {
                sendPlain($botToken, $chatId, 'Ошибка: ' . $e->getMessage());
            }
            continue;
        }

        if (str_starts_with($text, '/last')) {
            try {
                $reply = handleLastCommand($pdo);
                sendPlain($botToken, $chatId, $reply ?? 'Не удалось получить последний расчёт.');
            } catch (Throwable $e) {
                sendPlain($botToken, $chatId, 'Ошибка: ' . $e->getMessage());
            }
            continue;
        }

        if (preg_match('~^/id\s+(\d+)~u', $text, $m)) {
            $id = (int) $m[1];
            try {
                $reply = handleIdCommand($pdo, $id);
                sendPlain($botToken, $chatId, $reply ?? 'Не удалось получить данные по указанному ID.');
            } catch (Throwable $e) {
                sendPlain($botToken, $chatId, 'Ошибка: ' . $e->getMessage());
            }
            continue;
        }

        sendPlain($botToken, $chatId, "Неизвестная команда.\n\n" . helpText());
    }
}
