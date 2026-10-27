<?php
declare(strict_types=1);

/**
 * Ручной курс тугрика (₮/$ и ₮/¥), который менеджер вводит в админке.
 *
 * Действует только в тот день, на который введён (по Улан-Батору / Улан-Удэ, UTC+8),
 * и в этот день главнее курса Khan Bank. На следующий день перестаёт действовать сам:
 * так нельзя неделю считать по забытому курсу — калькулятор вернётся к курсу банка.
 *
 * Хранится в api/cache/manual_rates.json, а не в схеме формул: иначе ради курса
 * пришлось бы каждое утро публиковать новую версию схемы.
 */

const MANUAL_RATES_TZ = 'Asia/Ulaanbaatar';

/** Границы правдоподобных значений: ловят опечатки вроде курса доллара в поле йены. */
const MANUAL_USD_MNT_MIN = 1000.0;
const MANUAL_USD_MNT_MAX = 20000.0;
const MANUAL_JPY_MNT_MIN = 5.0;
const MANUAL_JPY_MNT_MAX = 100.0;

function manual_rates_file(): string
{
    return __DIR__ . '/cache/manual_rates.json';
}

function manual_rates_today(): string
{
    return (new DateTimeImmutable('now', new DateTimeZone(MANUAL_RATES_TZ)))->format('Y-m-d');
}

/** Сохранённая запись (в том числе на прошедший день) или null. */
function manual_rates_read(): ?array
{
    $file = manual_rates_file();
    if (!is_readable($file)) {
        return null;
    }
    $raw = @file_get_contents($file);
    $data = is_string($raw) ? json_decode($raw, true) : null;
    if (
        !is_array($data)
        || !isset($data['date'], $data['usdMnt'], $data['jpyMnt'])
        || !is_numeric($data['usdMnt'])
        || !is_numeric($data['jpyMnt'])
    ) {
        return null;
    }
    return [
        'date' => (string) $data['date'],
        'usdMnt' => (float) $data['usdMnt'],
        'jpyMnt' => (float) $data['jpyMnt'],
        'setAt' => (string) ($data['setAt'] ?? ''),
        'setBy' => (string) ($data['setBy'] ?? ''),
    ];
}

/** Запись, если она действует сегодня; иначе null. */
function manual_rates_active(): ?array
{
    $rates = manual_rates_read();
    if ($rates === null || $rates['date'] !== manual_rates_today()) {
        return null;
    }
    return $rates;
}

/**
 * Применять ли ручной курс к запросу курса на дату $requestedDate (Y-m-d).
 * Вызывающие передают дату по своему часовому поясу (браузер, Москва), поэтому
 * «вчера» по Улан-Батору тоже считается текущим запросом, а явный исторический — нет.
 */
function manual_rates_applies_to(string $requestedDate): bool
{
    $today = new DateTimeImmutable(manual_rates_today(), new DateTimeZone(MANUAL_RATES_TZ));
    return $requestedDate >= $today->modify('-1 day')->format('Y-m-d');
}

/**
 * @return array{0: float, 1: float}
 * @throws InvalidArgumentException с понятным менеджеру текстом
 */
function manual_rates_validate(mixed $usdMnt, mixed $jpyMnt): array
{
    $parse = static function (mixed $v): ?float {
        if (is_string($v)) {
            $v = str_replace([' ', "\u{00A0}", ','], ['', '', '.'], trim($v));
        }
        return is_numeric($v) ? (float) $v : null;
    };
    $usd = $parse($usdMnt);
    $jpy = $parse($jpyMnt);
    if ($usd === null || $usd < MANUAL_USD_MNT_MIN || $usd > MANUAL_USD_MNT_MAX) {
        throw new InvalidArgumentException('Курс ₮ за 1 $ выглядит неверно: ожидается число около 3 600.');
    }
    if ($jpy === null || $jpy < MANUAL_JPY_MNT_MIN || $jpy > MANUAL_JPY_MNT_MAX) {
        throw new InvalidArgumentException('Курс ₮ за 1 ¥ выглядит неверно: ожидается число около 23.');
    }
    return [round($usd, 2), round($jpy, 4)];
}

/** @throws RuntimeException если файл не записать */
function manual_rates_save(float $usdMnt, float $jpyMnt, string $setBy): array
{
    $record = [
        'date' => manual_rates_today(),
        'usdMnt' => $usdMnt,
        'jpyMnt' => $jpyMnt,
        'setAt' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('c'),
        'setBy' => $setBy,
    ];
    $file = manual_rates_file();
    $dir = dirname($file);
    if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
        throw new RuntimeException('Нет каталога api/cache для сохранения курса.');
    }
    $tmp = $file . '.' . getmypid() . '.tmp';
    $json = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false || @file_put_contents($tmp, $json) === false || !@rename($tmp, $file)) {
        @unlink($tmp);
        throw new RuntimeException('Не удалось сохранить курс: нет прав на запись в api/cache.');
    }
    return $record;
}

/** @throws RuntimeException если файл не удалить */
function manual_rates_clear(): void
{
    $file = manual_rates_file();
    if (is_file($file) && !@unlink($file)) {
        throw new RuntimeException('Не удалось сбросить курс: нет прав на запись в api/cache.');
    }
}

/** Ответ в формате khan_rates.php, собранный из ручного курса. */
function manual_rates_as_khan_payload(array $manual): array
{
    return [
        'ok' => true,
        'date' => $manual['date'],
        'usdNonCashSellMnt' => $manual['usdMnt'],
        'jpyNonCashBuyMnt' => null,
        'jpyNonCashSellMnt' => $manual['jpyMnt'],
        'usdMnt' => $manual['usdMnt'],
        'jpyMnt' => $manual['jpyMnt'],
        'yenPerUsd' => round($manual['usdMnt'] / $manual['jpyMnt'], 4),
        'manual' => true,
        'manualSetAt' => $manual['setAt'],
    ];
}
