const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { logActivity } = require('../utils/audit_logger');

// GET /api/watchlists — 取得使用者的自選股清單
router.get('/', requireAuth, async (req, res) => {
    try {
        let listsRes = await query(
            'SELECT * FROM watchlists WHERE user_id = $1 ORDER BY created_at ASC',
            [req.user.id]
        );

        // 如果該使用者沒有任何自選股清單（可能是舊版資料未建立），自動建立一個
        if (listsRes.rows.length === 0) {
            await query('INSERT INTO watchlists (name, user_id) VALUES ($1, $2)', ['我的自選股', req.user.id]);
            listsRes = await query(
                'SELECT * FROM watchlists WHERE user_id = $1 ORDER BY created_at ASC',
                [req.user.id]
            );
        }

        const watchlists = listsRes.rows;

        for (let wl of watchlists) {
            const itemsRes = await query(`
                SELECT 
                    wi.symbol, wi.added_at,
                    s.name, s.market, s.industry,
                    dp.close_price, dp.change_amount, dp.change_percent, dp.volume
                FROM watchlist_items wi
                JOIN stocks s ON wi.symbol = s.symbol
                LEFT JOIN LATERAL (
                    SELECT close_price, change_amount, change_percent, volume
                    FROM daily_prices
                    WHERE symbol = wi.symbol
                    ORDER BY trade_date DESC
                    LIMIT 1
                ) dp ON true
                WHERE wi.watchlist_id = $1
                ORDER BY wi.added_at DESC
            `, [wl.id]);
            wl.items = itemsRes.rows;
        }

        res.json({ success: true, data: watchlists });
    } catch (err) {
        console.error('取得自選股清單失敗:', err);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// POST /api/watchlists/:id/symbols — 新增股票
router.post('/:id/symbols', requireAuth, async (req, res) => {
    const watchlistId = req.params.id;
    const { symbol } = req.body;

    if (!symbol) {
        return res.status(400).json({ success: false, error: '缺少股票代號 (symbol)' });
    }

    try {
        // 驗證清單屬於使用者
        const wl = await query('SELECT id FROM watchlists WHERE id = $1 AND user_id = $2', [watchlistId, req.user.id]);
        if (wl.rows.length === 0) {
            return res.status(403).json({ success: false, error: '無權操作此清單' });
        }
        await query(
            'INSERT INTO watchlist_items (watchlist_id, symbol) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [watchlistId, symbol]
        );

        // 紀錄加入自選股
        await logActivity(req.user.uuid, 'WATCHLIST_ADD', 'watchlist', watchlistId, { symbol }, req);

        res.json({ success: true, message: '已加入自選' });
    } catch (err) {
        if (err.code === '23503') {
            return res.status(400).json({ success: false, error: '無效的股票代號' });
        }
        console.error('新增自選股失敗:', err);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// DELETE /api/watchlists/:id/symbols/:symbol — 移除股票
router.delete('/:id/symbols/:symbol', requireAuth, async (req, res) => {
    const watchlistId = req.params.id;
    const symbol = req.params.symbol;

    try {
        const wl = await query('SELECT id FROM watchlists WHERE id = $1 AND user_id = $2', [watchlistId, req.user.id]);
        if (wl.rows.length === 0) {
            return res.status(403).json({ success: false, error: '無權操作此清單' });
        }
        await query(
            'DELETE FROM watchlist_items WHERE watchlist_id = $1 AND symbol = $2',
            [watchlistId, symbol]
        );

        // 紀錄移除自選股
        await logActivity(req.user.uuid, 'WATCHLIST_REMOVE', 'watchlist', watchlistId, { symbol }, req);

        res.json({ success: true, message: '已移除自選' });
    } catch (err) {
        console.error('移除自選股失敗:', err);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// GET /api/watchlists/:id/status/:symbol — 檢查股票是否在清單中
router.get('/:id/status/:symbol', requireAuth, async (req, res) => {
    const watchlistId = req.params.id;
    const symbol = req.params.symbol;

    try {
        const result = await query(
            'SELECT 1 FROM watchlist_items WHERE watchlist_id = $1 AND symbol = $2',
            [watchlistId, symbol]
        );
        res.json({ success: true, is_watched: result.rowCount > 0 });
    } catch (err) {
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

module.exports = router;
