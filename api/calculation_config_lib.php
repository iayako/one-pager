<?php
declare(strict_types=1);

function default_calculation_config(): array
{
    /** @var array<string,mixed> $config */
    $config = require __DIR__ . '/default_calculation_config.php';
    return $config;
}

function normalize_calculation_config(array $config, ?int $versionId = null): array
{
    $name = isset($config['name']) ? trim((string) $config['name']) : '';
    if ($name === '') {
        $name = 'Схема расчёта';
    }
    $variables = $config['variables'] ?? null;
    $formulas = $config['formulas'] ?? null;
    if (!is_array($variables) || !is_array($formulas)) {
        throw new InvalidArgumentException('Config must contain variables and formulas objects.');
    }
    $defaultConfig = default_calculation_config();

    foreach ($variables as $key => $item) {
        if (!is_string($key) || !preg_match('/^[A-Za-z][A-Za-z0-9_]*$/', $key)) {
            throw new InvalidArgumentException('Invalid variable key: ' . (string) $key);
        }
        $value = is_array($item) && array_key_exists('value', $item) ? $item['value'] : $item;
        if (!is_numeric($value)) {
            throw new InvalidArgumentException('Variable must be numeric: ' . $key);
        }
    }

    foreach ($formulas as $key => $_item) {
        if (!is_string($key) || !preg_match('/^[A-Za-z][A-Za-z0-9_]*$/', $key)) {
            throw new InvalidArgumentException('Invalid formula key: ' . (string) $key);
        }
    }

    $config['id'] = isset($config['id']) && is_string($config['id']) && $config['id'] !== ''
        ? $config['id']
        : 'custom-admin-config';
    $config['versionId'] = $versionId;
    $config['name'] = mb_substr($name, 0, 160);
    $config['variables'] = $variables;
    $defaultFormulas = is_array($defaultConfig['formulas'] ?? null) ? $defaultConfig['formulas'] : [];
    $config['formulas'] = array_replace_recursive($defaultFormulas, $formulas);
    $defaultRows = $defaultConfig['resultRows'] ?? [];
    $rows = $config['resultRows'] ?? [];
    $config['resultRows'] = is_array($rows) ? array_replace_recursive($defaultRows, $rows) : $defaultRows;
    return $config;
}

function active_calculation_config(PDO $pdo): array
{
    $sql = 'SELECT v.id, v.name, v.config_json, v.published_at
        FROM calculation_config_active a
        JOIN calculation_config_version v ON v.id = a.calculation_config_version_id
        WHERE a.id = 1 AND v.status = "published"
        LIMIT 1';
    $stmt = $pdo->query($sql);
    $row = $stmt ? $stmt->fetch() : false;
    if (is_array($row)) {
        $decoded = json_decode((string) $row['config_json'], true);
        if (is_array($decoded)) {
            $config = normalize_calculation_config($decoded, (int) $row['id']);
            $config['publishedAt'] = $row['published_at'] ?? null;
            return $config;
        }
    }

    return normalize_calculation_config(default_calculation_config(), null);
}

function latest_draft_or_active_config(PDO $pdo): array
{
    $stmt = $pdo->query('SELECT id, name, status, config_json, updated_at, published_at FROM calculation_config_version ORDER BY updated_at DESC, id DESC LIMIT 1');
    $row = $stmt ? $stmt->fetch() : false;
    if (is_array($row)) {
        $decoded = json_decode((string) $row['config_json'], true);
        if (is_array($decoded)) {
            $config = normalize_calculation_config($decoded, (int) $row['id']);
            $config['_meta'] = [
                'status' => (string) $row['status'],
                'updatedAt' => $row['updated_at'] ?? null,
                'publishedAt' => $row['published_at'] ?? null,
            ];
            return $config;
        }
    }

    $config = normalize_calculation_config(default_calculation_config(), null);
    $config['_meta'] = [
        'status' => 'default',
        'updatedAt' => null,
        'publishedAt' => null,
    ];
    return $config;
}
