const express = require('express');
const router = express.Router();
const { query, pool } = require('../db');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');
const { generateAIReport } = require('../utils/ai_service');
const { analyzePosition, analyzeMultiple } = require('../position_analyzer');
const { getTaiwanDate, formatTaiwanTime, TZ, getTaiwanDateString } = require('../utils/timeUtils');

// 日期格式化助手 (解決時區偏移問題)
const formatLocalDate = (date) => {
    if (!date) return null;
    if (!(date instanceof Date)) {
        const d = new Date(date);
        if (isNaN(d.getTime())) return date;
        date = d;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// GET /api/position/analyze/:symbol — 單一股票持倉分析
router.get('/position/analyze/:symbol', optionalAuth, async (req, res) => {
    try {
        const { symbol } = req.params;
        const customWeights = await getUserWeights(req);
        const result = await analyzePosition(symbol, customWeights);
        res.json({ success: true, data: result });
    } catch (err) {
        console.error('Position analyze error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/position/analyze-batch — 批量股票持倉分析
router.post('/position/analyze-batch', optionalAuth, async (req, res) => {
    try {
        const { symbols } = req.body;
        if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
            return res.status(400).json({ success: false, error: '請提供股票代號陣列' });
        }
        // Limit to 30 symbols at a time
        const limitedSymbols = symbols.slice(0, 30);
        const customWeights = await getUserWeights(req);
        const results = await analyzeMultiple(limitedSymbols, customWeights);
        res.json({ success: true, data: results });
    } catch (err) {
        console.error('Position batch analyze error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/position/settings — 取得使用者分析權重設定
router.get('/position/settings', requireAuth, async (req, res) => {
    try {
        const result = await query(
            'SELECT tech_weight, fund_weight, chip_weight, mom_weight, updated_at FROM user_analysis_settings WHERE user_id = $1',
            [req.user.id]
        );
        if (result.rows.length > 0) {
            res.json({ success: true, data: result.rows[0] });
        } else {
            // 回傳預設值
            res.json({
                success: true,
                data: {
                    tech_weight: 0.30,
                    fund_weight: 0.25,
                    chip_weight: 0.25,
                    mom_weight: 0.20,
                    updated_at: null
                }
            });
        }
    } catch (err) {
        console.error('Get analysis settings error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/position/settings — 更新使用者分析權重設定
router.post('/position/settings', requireAuth, async (req, res) => {
    try {
        const { tech_weight, fund_weight, chip_weight, mom_weight } = req.body;
        
        // 驗證權重
        const weights = [
            parseFloat(tech_weight) || 0,
            parseFloat(fund_weight) || 0,
            parseFloat(chip_weight) || 0,
            parseFloat(mom_weight) || 0
        ];
        
        if (weights.some(w => w < 0 || w > 1)) {
            return res.status(400).json({ success: false, error: '權重必須介於 0 到 1 之間' });
        }
        
        const sum = weights.reduce((a, b) => a + b, 0);
        if (Math.abs(sum - 1) > 0.05) {
            return res.status(400).json({ success: false, error: `權重總和必須為 1 (目前: ${sum.toFixed(2)})` });
        }

        await query(`
            INSERT INTO user_analysis_settings (user_id, tech_weight, fund_weight, chip_weight, mom_weight, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                tech_weight = EXCLUDED.tech_weight,
                fund_weight = EXCLUDED.fund_weight,
                chip_weight = EXCLUDED.chip_weight,
                mom_weight = EXCLUDED.mom_weight,
                updated_at = NOW()
        `, [req.user.id, weights[0], weights[1], weights[2], weights[3]]);

        res.json({ success: true, message: '權重設定已更新' });
    } catch (err) {
        console.error('Update analysis settings error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/position/history/:symbol — 取得個股歷史評分走勢
router.get('/position/history/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { days = 30 } = req.query;
        const result = await query(`
            SELECT 
                TO_CHAR(calc_date, 'YYYY-MM-DD') as date,
                overall_score, tech_score, fund_score, chip_score, mom_score,
                recommendation, signal
            FROM stock_daily_analysis_results
            WHERE symbol = $1
            ORDER BY calc_date DESC
            LIMIT $2
        `, [symbol, parseInt(days)]);
        
        // 倒序回傳 (日期由舊到新)
        res.json({ success: true, data: result.rows.reverse() });
    } catch (err) {
        console.error('Position history error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});


module.exports = router;
