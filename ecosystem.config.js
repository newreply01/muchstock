module.exports = {
    apps: [
        {
            name: 'muchstock-api',
            script: 'npm',
            args: 'run start',
            cwd: '/home/xg/muchstock',
            env: {
                NODE_ENV: 'production',
                PORT: 3005
            }
        },
        {
            name: 'muchstock-frontend',
            script: 'npm',
            args: 'run client',
            cwd: '/home/xg/muchstock'
        },
        {
            name: 'stock-realtime-crawler',
            script: 'node',
            args: 'server/realtime_crawler.js',
            cwd: '/home/xg/muchstock',
            env: {
                ENABLE_CRAWLER: 'true'
            }
        },
        {
            name: 'update-ai-reports',
            script: 'node',
            args: 'server/scripts/update_ai_reports.js',
            cwd: '/home/xg/muchstock',
            autorestart: true,
            watch: false
        },
        {
            name: 'sync-supabase',
            script: 'node',
            args: 'server/scripts/sync_realtime_supabase.js',
            cwd: '/home/xg/muchstock',
            autorestart: true,
            watch: false
        },
        {
            name: 'finmind-daily-crawler',
            script: 'node',
            args: 'server/scripts/fast_daily_sync.js',
            cwd: '/home/xg/muchstock',
            autorestart: true,
            watch: false
        }
    ]
};
