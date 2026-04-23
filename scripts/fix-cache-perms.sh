#!/usr/bin/env bash
# Вызывается после деплоя с сервера: sudo bash /var/www/one-pager/scripts/fix-cache-perms.sh
# Нужны права root (cron и refresh_rates_cache.php пишут в api/cache от www-data).

set -euo pipefail

ROOT="${DEPLOY_ROOT:-/var/www/one-pager}"
CACHE="${ROOT}/api/cache"

mkdir -p "${CACHE}"
chown www-data:www-data "${CACHE}"
chmod 775 "${CACHE}"

echo "OK: ${CACHE} → www-data:www-data, 775"
