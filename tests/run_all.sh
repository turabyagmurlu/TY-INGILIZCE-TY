#!/bin/sh
# Tüm testler: sh tests/run_all.sh   (Playwright global kurulu; Chromium PLAYWRIGHT_BROWSERS_PATH'te). Bir paket ALL PASS basmazsa çıkış 1.
cd "$(dirname "$0")/.."
python3 build.py || exit 1
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
rc=0
for t in rt_test app_test visual_test voice_test units_test pen_test install_test keyxfer_test sync_test scan_test lesson_test exam_test konus_test voice_quality_test nav_test update_test; do echo "== $t"
  out=$(node "tests/$t.js" 2>&1); echo "$out" | grep -E "^(FAIL|errors|ALL PASS|FAILED)"
  echo "$out" | grep -q "^ALL PASS" || { echo "!! $t: ALL PASS yok"; echo "$out" | grep -vE "^PASS" | tail -15; rc=1; }
done
[ $rc -eq 0 ] && echo "TÜM PAKETLER GEÇTİ" || echo "BAŞARISIZ PAKET VAR"
exit $rc
