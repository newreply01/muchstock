#!/bin/bash
# Restart AI report worker
cd /home/xg/stock-screener
export PATH=/home/xg/.nvm/versions/node/v20.20.1/bin:$PATH
pkill -f update_ai_reports.js || true
sleep 2
nohup node scripts/update_ai_reports.js >> /home/xg/stock-screener/logs/ai_reports.log 2>&1 &
echo "AI Worker restarted."
