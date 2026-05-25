#!/bin/bash
export PGPASSWORD='HfSDHrdekEY0vLPz'
cd /home/xg/stock-screener
echo "🚀 Starting continuous upload to Supabase (Production Project)..."
cat chunks/part_* | psql -v ON_ERROR_STOP=1 -h aws-1-us-east-1.pooler.supabase.com -p 5432 -d postgres -U postgres.gfwlifpmstidgudgojwe 2>&1 | tee logs/supabase_upload.log
if [ ${PIPESTATUS[1]} -eq 0 ]; then
    echo "🎉 All data uploaded successfully! (Log: logs/supabase_upload.log)"
else
    echo "❌ Upload failed! Check logs/supabase_upload.log"
    exit 1
fi
echo "🎉 All chunks uploaded successfully!"
