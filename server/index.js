process.env.TZ = 'Asia/Taipei';
const express = require('express');
const logger = require('./utils/logger');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const helmet = require('helmet');
const compression = require('compression');

const screenerRoutes = require('./routes/screener');
const stockRoutes = require('./routes/stock');
const institutionalRoutes = require('./routes/institutional');
const financialsRoutes = require('./routes/financials');
const aiReportRoutes = require('./routes/ai_report');
const marketRoutes = require('./routes/market');
const positionRoutes = require('./routes/position');

const authRoutes = require('./routes/auth');
const monitorRoutes = require('./routes/monitor');
const watchlistRoutes = require('./routes/watchlist');
const realtimeRoutes = require('./routes/realtime_query');
const filterRoutes = require('./routes/filters');
const portfolioRoutes = require('./routes/portfolio');
const streamRoutes = require('./routes/stream');
const adminRoutes = require('./routes/admin');
const brokerRoutes = require('./routes/broker_analysis');
const { errorHandler } = require('./middleware/errorHandler');
const { pool } = require('./db');

const app = express();

// ─── Rate Limiting ────────────────────────────────────────────
let rateLimit;
try {
    rateLimit = require('express-rate-limit');
} catch (e) {
    logger.warn('[WARN] express-rate-limit 未安裝，Rate Limiting 已停用。執行 npm install express-rate-limit 以啟用。');
}

if (rateLimit) {
    // 全域限制：每個 IP 15 分鐘最多 3000 次請求
    const globalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 3000,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, error: '請求太頻繁，請稍後再試' }
    });

    // AI 報告生成嚴格限制：每個 IP 每分鐘最多 5 次
    const aiLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 5,
        message: { success: false, error: 'AI 報告生成請求過於頻繁，請稍後再試' }
    });

    app.use('/api', globalLimiter);
    app.use('/api/stock/*/generate-ai-report', aiLimiter);
}

// ─── Middleware ───────────────────────────────────────────────
// Security & Performance
app.use(helmet({
    contentSecurityPolicy: false, // 暫不啟用 CSP，避免阻擋前端資源載入
    crossOriginEmbedderPolicy: false // 允許跨來源圖片/資源
}));
app.use(compression());

// 嚴格 CORS 設定
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:31000',
    process.env.FRONTEND_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());

// Request Logging Middleware
app.use((req, res, next) => {
    logger.info(`Incoming ${req.method} request to ${req.originalUrl}`);
    next();
});

// ─── Health Check ─────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            success: true,
            status: 'ok',
            timestamp: new Date().toISOString(),
            services: {
                database: 'ok',
                server: 'ok'
            }
        });
    } catch (err) {
        res.status(503).json({
            success: false,
            status: 'degraded',
            timestamp: new Date().toISOString(),
            services: {
                database: 'error',
                server: 'ok'
            },
            error: err.message || '資料庫連線異常'
        });
    }
});

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/monitor', monitorRoutes);
app.use('/api/watchlists', watchlistRoutes);
app.use('/api/realtime', realtimeRoutes);
app.use('/api/filters', filterRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/broker', brokerRoutes);

// 新拆分的模組
app.use('/api', stockRoutes);
app.use('/api', institutionalRoutes);
app.use('/api', financialsRoutes);
app.use('/api', aiReportRoutes);
app.use('/api', marketRoutes);
app.use('/api', positionRoutes);

app.use('/api', screenerRoutes);
app.use('/api/screener', screenerRoutes); // Alias for frontend compatibility

// ─── Static Frontend & Dev Proxy ──────────────────────────────────
const distPath = path.join(__dirname, '..', 'client', 'dist');

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    // 開發環境：使用 http-proxy-middleware 代理所有非 API 請求到 Vite Dev Server (port 32000)
    // 這允許用戶造訪 http://localhost:31000 也能享有 Vite 的即時熱更新 (HMR)，修改 React 程式碼立即生效，完全不需要重新 build
    const { createProxyMiddleware } = require('http-proxy-middleware');
    const viteProxy = createProxyMiddleware({
        target: 'http://localhost:32000',
        changeOrigin: true,
        ws: true, // 支援 WebSocket 熱更新
        logLevel: 'silent',
        onError: (err, req, res) => {
            // 若 Vite Dev Server 未啟動，自動降級讀取 dist 的靜態資源
            if (req.path.startsWith('/api')) {
                return res.status(404).json({ success: false, error: '找不到該 API 端點' });
            }
            // 優先嘗試提供 dist 目錄下的實體靜態檔案，若找不到則 fallback 到 index.html (對 index.html 禁用快取)
            express.static(distPath, {
                setHeaders: (res, filePath) => {
                    if (filePath.endsWith('.html')) {
                        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                        res.setHeader('Pragma', 'no-cache');
                        res.setHeader('Expires', '0');
                    }
                }
            })(req, res, () => {
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
                res.sendFile(path.join(distPath, 'index.html'));
            });
        }
    });

    app.use((req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        viteProxy(req, res, next);
    });
} else {
    // 生產環境：提供 client/dist 靜態檔案，並對 HTML 強制停用快取，解決 F5 重新整理回到舊版的問題
    app.use(express.static(distPath, {
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
            }
        }
    }));
    if (!process.env.VERCEL) {
        app.get('*', (req, res) => {
            if (req.path.startsWith('/api')) return res.status(404).json({ success: false, error: '找不到該 API 端點' });
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }
}

    // ─── Global Error Handler ─────────────────────────────────
    app.use(errorHandler);

    if (process.env.NODE_ENV !== 'test') {
        try {
            const { startScheduler } = require('./scheduler');
            startScheduler();
            const PORT = process.env.PORT || 31000;
            app.listen(PORT, '0.0.0.0', () => logger.info(`✅ Server started on port ${PORT}`));
        } catch (e) {
            logger.error(`Failed to start server: ${e.message}`, { stack: e.stack });
        }
    }

module.exports = app;
