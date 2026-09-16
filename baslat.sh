#!/usr/bin/env bash
# GDD Creator — yerel sunucuyu başlatır ve tarayıcıda açar.
# Doğrudan index.html'i açmak da çalışır; sunucu file:// kısıtlarını tamamen ortadan kaldırır.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${GDD_PORT:-8477}"
URL="http://127.0.0.1:${PORT}/index.html"

# Port zaten dinleniyorsa yeni sunucu başlatma
if ! curl -sf -o /dev/null "http://127.0.0.1:${PORT}/index.html" 2>/dev/null; then
  cd "$DIR"
  python3 -m http.server "$PORT" --bind 127.0.0.1 >/tmp/gdd-creator-server.log 2>&1 &
  SRV=$!
  # Hazır olmasını bekle (kör sleep yok)
  for _ in $(seq 1 40); do
    if curl -sf -o /dev/null "$URL"; then break; fi
    sleep 0.1
  done
  if ! curl -sf -o /dev/null "$URL"; then
    echo "Sunucu ${PORT} portunda başlatılamadı. Günlük: /tmp/gdd-creator-server.log" >&2
    kill "$SRV" 2>/dev/null || true
    exit 1
  fi
  echo "Sunucu başladı (pid $SRV, port $PORT)"
else
  echo "Sunucu zaten çalışıyor (port $PORT)"
fi

xdg-open "$URL" >/dev/null 2>&1 &
echo "Açılıyor: $URL"
