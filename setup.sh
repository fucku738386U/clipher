#!/bin/bash
set -e
DIR="/root/clipher"

echo "[CLIPHER] Setup starting..."
pkill -f "python3 a.py" 2>/dev/null || true
sleep 1
rm -rf "$DIR"
git clone https://github.com/fucku738386U/clipher.git "$DIR"
cd "$DIR"

python3 -m py_compile a.py && echo "[CLIPHER] Syntax OK"

echo "[CLIPHER] Starting..."
nohup python3 a.py > clipher.log 2>&1 &
sleep 2

if pgrep -f "python3 a.py" > /dev/null; then
    echo "[CLIPHER] RUNNING on port 7860"
    IP=$(curl -s https://api.ipify.org 2>/dev/null || echo "localhost")
    echo "URL: http://$IP:7860"
    echo "Set API key: export OPENROUTER_API_KEY=your_key"
else
    echo "[CLIPHER] FAILED:"
    tail -20 clipher.log
fi
