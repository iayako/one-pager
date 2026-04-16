<?php
declare(strict_types=1);

/**
 * Простой Telegram-бот для чтения расчётов из таблицы calculation_log.
 *
 * Команды:
 *  - /last         — показать последний расчёт
 *  - /id <ID>      — показать расчёт по конкретному ID (например, /id 123)
 *
 * Запуск (из корня проекта):
 *   php api/telegram_bot.php
 */

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

/**
 * Вызов Telegram Bot API.
 *
 * @return array<string,mixed>
 */
function telegramApiRequest(string $botToken, string $method, array $params = []): array
{
    $url = 'https://api.telegram.org/bot' . $botToken . '/' . $method;

    if (!empty($params)) {
        $url .= '?' . http_build_query($params);
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 30,
        ],
    ]);

    $raw = @file_get_contents($url, false, $context);
    if ($raw === false) {
        return ['ok' => false];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return ['ok' => false];
    }

    return $decoded;
}

function sendMessage(string $botToken, int $chatId, string $text): void
{
    // Telegram режет сообщения длиннее 4096 символов.
    if (mb_strlen($text, 'UTF-8') > 4000) {
        $text = mb_substr($text, 0, 4000, 'UTF-8') . "\n\n(сообщение обрезано)";
    }

    telegramApiRequest($botToken, 'sendMessage', [
        'chat_id' => $chatId,
        'text' => $text,
        'parse_mode' => 'Markdown',
    ]);
}

/**
 * Аккуратное короткое представление JSON-объекта (только верхний уровень).
 *
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

// ---- Обработка комманд ----

/**
 * Обработать команду /last.
 */
function handleLastCommand(PDO $pdo): ?string
{
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
    $text .= "Создан: " . (string) $row['created_at'] . "\n\n";
    $text .= "*Входные данные:*\n";
    $text .= $inputsText . "\n\n";
    $text .= "*Результаты:*\n";
    $text .= $outputsText;

    return $text;
}

/**
 * Обработать команду /id <N>.
 */
function handleIdCommand(PDO $pdo, int $id): ?string
{
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
    $text .= "Создан: " . (string) $row['created_at'] . "\n\n";
    $text .= "*Входные данные:*\n";
    $text .= $inputsText . "\n\n";
    $text .= "*Результаты:*\n";
    $text .= $outputsText;

    return $text;
}

// ---- Основной цикл long polling ----

fwrite(STDOUT, "Telegram-бот запущен. Нажмите Ctrl+C для остановки.\n");

$offset = 0;

while (true) {
    $response = telegramApiRequest($botToken, 'getUpdates', [
        'timeout' => 25,
        'offset' => $offset,
        'allowed_updates' => json_encode(['message']),
    ]);

    if (!($response['ok'] ?? false)) {
        fwrite(STDERR, "Ошибка при запросе getUpdates, жду 5 секунд...\n");
        sleep(5);
        continue;
    }

    /** @var array<int,array<string,mixed>> $updates */
    $updates = $response['result'] ?? [];

    if (!$updates) {
        // Нет новых сообщений.
        continue;
    }

    foreach ($updates as $update) {
        $updateId = (int) ($update['update_id'] ?? 0);
        if ($updateId >= $offset) {
            $offset = $updateId + 1;
        }

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
            sendMessage($botToken, $chatId, 'Доступ к этому боту ограничен для данного чата.');
            continue;
        }

        if ($text === '') {
            sendMessage($botToken, $chatId, "Я понимаю только текстовые команды.\n\nКоманды:\n/last — последний расчёт\n/id <ID> — расчёт по ID");
            continue;
        }

        if (str_starts_with($text, '/last')) {
            $reply = handleLastCommand($pdo);
            sendMessage($botToken, $chatId, $reply ?? 'Не удалось получить последний расчёт.');
            continue;
        }

        if (preg_match('~^/id\s+(\d+)~u', $text, $m)) {
            $id = (int) $m[1];
            $reply = handleIdCommand($pdo, $id);
            sendMessage($botToken, $chatId, $reply ?? 'Не удалось получить данные по указанному ID.');
            continue;
        }

        sendMessage(
            $botToken,
            $chatId,
            "Неизвестная команда.\n\nДоступные команды:\n/last — показать последний расчёт\n/id <ID> — показать расчёт по ID"
        );
    }
}

