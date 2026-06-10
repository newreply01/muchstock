module.exports = {
    apps: [
        {
            name: 'stock-screener-api',
            script: 'npm',
            args: 'run start',
            cwd: '/home/xg/stock-screener',
            env: {
                NODE_ENV: 'production',
                PORT: 3005
            }
        },
        {
            name: 'stock-screener-frontend',
            script: 'npm',
            args: 'run client',
            cwd: '/home/xg/stock-screener'
        },
        {
            name: 'stock-realtime-crawler',
            script: 'node',
            args: 'server/realtime_crawler.js',
            cwd: '/home/xg/stock-screener',
            env: {
                ENABLE_CRAWLER: 'true'
            }
        },
        {
            name: 'update-ai-reports',
            script: 'node',
            args: 'server/scripts/update_ai_reports.js',
            cwd: '/home/xg/stock-screener',
            autorestart: true,
            watch: false
        },
        {
            name: 'sync-supabase',
            script: 'node',
            args: 'server/scripts/sync_realtime_supabase.js',
            cwd: '/home/xg/stock-screener',
            autorestart: true,
            watch: false
        }
    ]
};
