#!/usr/bin/env bash
# После деплоя вызывается по SSH без sudo (см. GitHub Actions).
# Пользователь деплоя должен быть в группе www-data, иначе chgrp не сработает:
#   sudo usermod -aG www-data deploy
# Перелогин или новая SSH-сессия; один раз на сервере.

set -euo pipefail

ROOT="${DEPLOY_ROOT:-/var/www/one-pager}"
CACHE="${ROOT}/api/cache"

mkdir -p "${CACHE}"

owner=$(stat -c '%U' "$CACHE")

if [ "$owner" = "www-data" ]; then
  echo "OK: ${CACHE} already owned by www-data"
  exit 0
fi

if ! chgrp www-data "$CACHE" 2>/dev/null; then
  echo "chgrp www-data failed (need deploy in group www-data, or run once: sudo chown www-data:www-data ${CACHE})" >&2
  echo "Fix: sudo usermod -aG www-data deploy   # then re-run job or deploy again" >&2
  exit 1
fi

chmod 2775 "$CACHE"

echo "OK: ${CACHE} → group www-data, 2775 (setgid); www-data can write rates_snapshot.json"
