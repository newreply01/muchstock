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

// GET /api/stock/:symbol/ai-prediction - AI 漲跌機率預測
router.get('/stock/:symbol/ai-prediction', async (req, res) => {
    try {
        const { symbol } = req.params;

        // 取得近 20 日技術指標
        const techSql = `
            SELECT d.close_price, d.change_percent, d.volume,
                   i.rsi_14, i.macd_hist, i.ma_5, i.ma_20, i.ma_60
            FROM daily_prices d
            LEFT JOIN indicators i ON d.symbol = i.symbol AND d.trade_date = i.trade_date
            WHERE d.symbol = $1
            ORDER BY d.trade_date DESC LIMIT 20
        `;
        const techRes = await query(techSql, [symbol]);
        if (techRes.rows.length < 5) {
            return res.json({ success: false, error: '資料不足' });
        }

        const latest = techRes.rows[0];
        const rsi = parseFloat(latest.rsi_14) || 50;
        const macdHist = parseFloat(latest.macd_hist) || 0;
        const close = parseFloat(latest.close_price);
        const ma5 = parseFloat(latest.ma_5) || close;
        const ma20 = parseFloat(latest.ma_20) || close;

        // 近 5 日法人
        const instSql = `
            SELECT COALESCE(SUM(sub.net), 0) as net_5d FROM (
                SELECT (foreign_net + trust_net + dealer_net) as net
                FROM institutional WHERE symbol = $1
                ORDER BY trade_date DESC LIMIT 5
            ) sub
        `;
        const instRes = await query(instSql, [symbol]);
        const net5d = Math.round((parseInt(instRes.rows[0]?.net_5d) || 0) / 1000);

        // 取得近 10 日法人買賣超以計算主力燈號
        const inst10dSql = `
            SELECT total_net, foreign_net, trust_net, dealer_net, trade_date
            FROM institutional
            WHERE symbol = $1
            ORDER BY trade_date DESC LIMIT 10
        `;
        const inst10dRes = await query(inst10dSql, [symbol]);
        const inst10d = inst10dRes.rows;

        // 取得最新 AI 報告情緒分數 (對齊 AI 情緒與技術/籌碼預測)
        let aiSentiment = 50;
        const aiReportRes = await query(`
            SELECT sentiment_score FROM ai_reports 
            WHERE symbol = $1 
            ORDER BY report_date DESC LIMIT 1
        `, [symbol]);
        if (aiReportRes.rows.length > 0) {
            const rawScore = aiReportRes.rows[0].sentiment_score;
            // 轉換為 0-100 正規化範圍 (有些舊數據可能存 0.0-1.0，需在此防呆)
            if (rawScore <= 1.0 && rawScore >= 0.0) {
                aiSentiment = Math.round(rawScore * 100);
            } else {
                aiSentiment = parseInt(rawScore) || 50;
            }
        }

        // 計算近 5 日動量
        const changes = techRes.rows.slice(0, 5).map(r => parseFloat(r.change_percent) || 0);
        const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;

        // 主力燈號判定邏輯
        let mainForceStatus = '-';
        let mainForceDesc = '觀察';
        let mainForceReason = '主力買賣無常\n法人多空不明\n區間整理，建議觀察';

        if (inst10d.length >= 3) {
            const net10d = Math.round(inst10d.reduce((sum, r) => sum + (parseInt(r.total_net) || 0), 0) / 1000);
            const isAboveMA20 = close >= ma20;

            // 不同成交規模個股應有自適應門檻，此處以 500 張作為中大型股主力門檻基準
            if (net10d > 800 && isAboveMA20) {
                mainForceStatus = '多';
                mainForceDesc = '多頭';
                mainForceReason = `主力 10 日累計大買 ${net10d.toLocaleString()} 張\n法人買盤積極且站上月線\n偏多控盤，多頭佔優`;
            } else if (net10d < -800 && !isAboveMA20) {
                mainForceStatus = '空';
                mainForceDesc = '空頭';
                mainForceReason = `主力 10 日累計大賣 ${Math.abs(net10d).toLocaleString()} 張\n法人持續調節且跌破月線\n偏空操作，多單迴避`;
            } else if (net10d > 200) {
                mainForceStatus = '偏多';
                mainForceDesc = '偏多';
                mainForceReason = `主力 10 日累計買超 ${net10d.toLocaleString()} 張\n法人小幅布局\n高檔震盪，伺機突破`;
            } else if (net10d < -200) {
                mainForceStatus = '偏空';
                mainForceDesc = '偏空';
                mainForceReason = `主力 10 日累計賣超 ${Math.abs(net10d).toLocaleString()} 張\n法人調節賣壓\n高檔震盪，注意回檔`;
            } else {
                mainForceStatus = '-';
                mainForceDesc = '觀察';
                mainForceReason = `主力 10 日買賣互見 (累計 ${net10d.toLocaleString()} 張)\n法人動向不明\n區間整理，建議靜待訊號`;
            }
        }

        // 多因子機率模型
        let upScore = 50;
        // RSI
        if (rsi < 30) upScore += 12;
        else if (rsi < 40) upScore += 6;
        else if (rsi > 70) upScore -= 12;
        else if (rsi > 60) upScore -= 4;
        // MACD
        if (macdHist > 0) upScore += 5;
        else upScore -= 5;
        // 均線位置
        if (close > ma5 && ma5 > ma20) upScore += 8;
        else if (close < ma5 && ma5 < ma20) upScore -= 8;
        // 法人
        if (net5d > 500) upScore += 6;
        else if (net5d < -500) upScore -= 6;
        // 動量
        if (avgChange > 1) upScore += 4;
        else if (avgChange < -1) upScore -= 4;

        // 結合 AI 情緒微調 (最大影響 +/- 10 分)
        const aiAdjustment = (aiSentiment - 50) * 0.2;
        upScore += aiAdjustment;

        // 限制範圍
        upScore = Math.max(10, Math.min(85, upScore));
        const flatScore = Math.max(5, 25 - Math.abs(upScore - 50) * 0.5);
        const downScore = Math.max(5, 100 - upScore - flatScore);
        const total = upScore + downScore + flatScore;

        res.json({
            success: true,
            data: {
                up: Math.round(upScore / total * 100),
                down: Math.round(downScore / total * 100),
                flat: Math.round(flatScore / total * 100),
                factors: {
                    rsi: parseFloat(rsi.toFixed(1)),
                    macd_hist: parseFloat(macdHist.toFixed(2)),
                    ma_position: close > ma20 ? '上方' : '下方',
                    inst_net_5d: net5d,
                    momentum_5d: parseFloat(avgChange.toFixed(2)),
                    ai_sentiment: aiSentiment
                },
                main_force: {
                    status: mainForceStatus,
                    status_desc: mainForceDesc,
                    reason: mainForceReason
                },
                updated_at: new Date().toISOString()
            }
        });
    } catch (err) {
        console.error('AI prediction failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/stock/:symbol/ai-report
router.get('/stock/:symbol/ai-report', async (req, res) => {

    try {


        const { symbol } = req.params;
        const result = await query('SELECT content as report, sentiment_score, created_at FROM ai_reports WHERE symbol = $1', [symbol]);
        
        if (result.rows.length === 0) {
            return res.json({
                success: true,
                data: {
                    report: "目前尚無此個股的 AI 分析報告。",
                    sentiment_score: 0.5
                }
            });
        }

        const data = result.rows[0];
        // Scale sentiment_score from 0-100 integer to 0.0-1.0 float if it's > 1
        if (data.sentiment_score > 1) {
            data.sentiment_score = data.sentiment_score / 100;
        }

        res.json({
            success: true,
            data: data
        });
    } catch (err) {
        console.error('Failed to fetch AI report:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/admin/prompts - 獲取所有提示詞模板列表 (去重)
// ⚠️ 以下 admin 路由需要管理員權限
router.get('/admin/prompts', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const result = await query('SELECT DISTINCT name FROM ai_prompt_templates ORDER BY name');
        res.json({ success: true, data: result.rows.map(r => r.name) });
    } catch (err) {
        console.error('Failed to fetch prompt names:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/admin/prompts/:name - 獲取特定模板的當前生效版本
router.get('/admin/prompts/:name', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { name } = req.params;
        const result = await query('SELECT * FROM ai_prompt_templates WHERE name = $1 AND is_active = true ORDER BY version DESC LIMIT 1', [name]);
        if (result.rows.length === 0) {
            return res.json({ success: false, message: '未找到生效中的模板' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Failed to fetch active prompt:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/admin/prompts/:name/history - 獲取特定模板的所有版本紀錄
router.get('/admin/prompts/:name/history', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { name } = req.params;
        const result = await query('SELECT id, version, is_active, note, created_at FROM ai_prompt_templates WHERE name = $1 ORDER BY version DESC', [name]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Failed to fetch prompt history:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/admin/prompts/:name - 建立新版本的模板 (並將其設為生效)
router.post('/admin/prompts/:name', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { name } = req.params;
        const { content, note } = req.body;

        if (!content) {
            return res.status(400).json({ success: false, message: '提示詞內容不能為空' });
        }

        // 1. 獲取當前最高版本
        const versionRes = await query('SELECT MAX(version) as current_version FROM ai_prompt_templates WHERE name = $1', [name]);
        const nextVersion = (versionRes.rows[0].current_version || 0) + 1;

        // 2. 將舊的生效版本設為不生效
        await query('UPDATE ai_prompt_templates SET is_active = false WHERE name = $1', [name]);

        // 3. 插入新版本並設為生效
        const result = await query(
            'INSERT INTO ai_prompt_templates (name, content, version, is_active, note) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, content, nextVersion, true, note || null]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Failed to update prompt:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/admin/prompts/version/:id - 獲取特定 ID 的模板內容
router.get('/admin/prompts/version/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('SELECT * FROM ai_prompt_templates WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.json({ success: false, message: '未找到該版本的模板' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Failed to fetch specific prompt version:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/admin/prompts/version/:id - 覆蓋特定 ID 的模板內容
router.put('/admin/prompts/version/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { content, note } = req.body;
        if (!content) return res.status(400).json({ success: false, message: '內容不能為空' });

        const result = await query('UPDATE ai_prompt_templates SET content = $1, note = $2 WHERE id = $3 RETURNING *', [content, note || null, id]);
        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, message: '找不到該版本' });
        }
        res.json({ success: true, data: result.rows[0], message: '成功覆蓋版本' });
    } catch (err) {
        console.error('Failed to overwrite prompt version:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/admin/prompts/version/:id - 刪除特定 ID 的模板 (僅允許刪除未生效的版本)
router.delete('/admin/prompts/version/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('DELETE FROM ai_prompt_templates WHERE id = $1 AND is_active = false RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, message: '找不到該版本，或無法刪除正在生效中的版本' });
        }
        res.json({ success: true, message: '版本刪除成功' });
    } catch (err) {
        console.error('Failed to delete prompt version:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/stock/:symbol/generate-ai-report - 手動觸發 AI 報告生成 (需登入)
router.post('/stock/:symbol/generate-ai-report', requireAuth, async (req, res) => {
    try {
        const { symbol } = req.params;
        // 這裡可以檢查權限，暫時允許所有請求
        const result = await generateAIReport(symbol);
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (err) {
        console.error('API Generation Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ---------------------------------

module.exports = router;
