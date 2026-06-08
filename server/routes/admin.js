const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logActivity } = require('../utils/audit_logger');

// 所有 /api/admin/* 都需要管理員權限
router.use(requireAuth, requireRole('admin'));

// GET /api/admin/users — 取得使用者列表（含關鍵字搜尋、簡單分頁）
router.get('/users', async (req, res) => {
    const { search, role, limit = 50, offset = 0 } = req.query;
    let sql = 'SELECT id, uuid, email, name, nickname, avatar_url, provider, role, is_active, created_at FROM users WHERE 1=1';
    const params = [];

    if (search) {
        params.push(`%${search.trim()}%`);
        sql += ` AND (email ILIKE $${params.length} OR nickname ILIKE $${params.length} OR name ILIKE $${params.length})`;
    }

    if (role) {
        params.push(role);
        sql += ` AND role = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    try {
        const result = await query(sql, params);
        const countRes = await query('SELECT count(*) FROM users');
        res.json({ 
            success: true, 
            users: result.rows,
            total: parseInt(countRes.rows[0].count)
        });
    } catch (err) {
        console.error('Admin Fetch Users Error:', err);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// GET /api/admin/users/:id/portfolio — 取得指定使用者的自選股資訊
router.get('/users/:id/portfolio', async (req, res) => {
    const { id } = req.params;
    try {
        // 1. 取得該帳號所有自選股清單
        const watchlists = await query(
            'SELECT id, name, created_at FROM watchlists WHERE user_id = $1 ORDER BY created_at ASC',
            [id]
        );

        // 2. 取得所有清單中的個股細節
        const items = await query(
            `SELECT wi.watchlist_id, wi.symbol as stock_symbol, s.name as stock_name
             FROM watchlist_items wi
             JOIN stocks s ON wi.symbol = s.symbol
             WHERE wi.watchlist_id IN (SELECT id FROM watchlists WHERE user_id = $1)`,
            [id]
        );

        // 組合資料結構
        const data = watchlists.rows.map(w => ({
            ...w,
            items: items.rows.filter(item => item.watchlist_id === w.id)
        }));

        res.json({ success: true, watchlists: data });
    } catch (err) {
        console.error('Admin Fetch User Portfolio Error:', err);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// GET /api/admin/audit-logs — 取得操作軌跡紀錄
router.get('/audit-logs', async (req, res) => {
    const { user_id, action, limit = 50, offset = 0 } = req.query;
    let sql = `
        SELECT al.*, u.email as user_email, u.nickname as user_nickname 
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.uuid
        WHERE 1=1
    `;
    const params = [];

    if (user_id) {
        params.push(user_id);
        sql += ` AND al.user_id = $${params.length}`;
    }

    if (action) {
        params.push(action);
        sql += ` AND al.action = $${params.length}`;
    }

    sql += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    try {
        const result = await query(sql, params);
        const countRes = await query('SELECT count(*) FROM audit_logs');
        res.json({ 
            success: true, 
            logs: result.rows,
            total: parseInt(countRes.rows[0].count)
        });
    } catch (err) {
        console.error('Admin Fetch Audit Logs Error:', err);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// PUT /api/admin/users/:id — 更新使用者資訊（如變更權限角色、停用/啟用）
router.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { role, nickname, is_active } = req.body;

    if (role === undefined && nickname === undefined && is_active === undefined) {
        return res.status(400).json({ success: false, error: '未提供更新資訊' });
    }

    try {
        let sql = 'UPDATE users SET updated_at = NOW()';
        const params = [];
        let i = 1;

        if (role !== undefined) {
            sql += `, role = $${i++}`;
            params.push(role);
        }
        if (nickname !== undefined) {
            sql += `, nickname = $${i++}`;
            params.push(nickname);
        }
        if (is_active !== undefined) {
            sql += `, is_active = $${i++}`;
            params.push(is_active);
        }

        sql += ` WHERE id = $${i} RETURNING id, uuid, email, nickname, role, is_active`;
        params.push(id);

        const result = await query(sql, params);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: '使用者不存在' });
        }

        // 紀錄稽核軌跡
        await logActivity(
            req.user.id, 
            'UPDATE_USER', 
            'user', 
            id, 
            { 
                changes: { role, nickname, is_active },
                target_email: result.rows[0].email
            }, 
            req
        );

        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        console.error('Admin Update User Error:', err);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// DELETE /api/admin/users/:id — 刪除使用者帳號
router.delete('/users/:id', async (req, res) => {
    const { id } = req.params;

    // 防止刪除自己
    if (req.user.id === parseInt(id) || req.user.uuid === id) {
        return res.status(400).json({ success: false, error: '無法刪除目前的管理員帳號' });
    }

    try {
        // 先取得使用者資訊供稽核紀錄
        const userRes = await query('SELECT uuid, email FROM users WHERE id = $1', [id]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: '使用者不存在' });
        }
        const targetUser = userRes.rows[0];

        // PostgreSQL 若沒有設定 ON DELETE CASCADE，可能需要手動刪除相關資料表紀錄
        // 刪除使用者自選股清單與項目 (假設 watchlist_items 沒有 cascade, 需要先刪)
        await query(`
            DELETE FROM watchlist_items 
            WHERE watchlist_id IN (SELECT id FROM watchlists WHERE user_id = $1)
        `, [id]);
        
        await query('DELETE FROM watchlists WHERE user_id = $1', [id]);

        // 刪除使用者
        await query('DELETE FROM users WHERE id = $1', [id]);

        // 紀錄稽核軌跡
        await logActivity(
            req.user.id, 
            'DELETE_USER', 
            'user', 
            id, 
            { 
                target_email: targetUser.email,
                target_uuid: targetUser.uuid
            }, 
            req
        );

        res.json({ success: true, message: '帳號已成功刪除' });
    } catch (err) {
        console.error('Admin Delete User Error:', err);
        res.status(500).json({ success: false, error: '伺服器錯誤，可能因為有關聯資料無法刪除' });
    }
});

// ================= API Keys Management =================

// GET /api/admin/api-keys
router.get('/api-keys', async (req, res) => {
    try {
        const result = await query(`
            SELECT id, service_name, api_key, description, is_active, 
                   invoke_count, success_count, error_429_count, total_latency_ms,
                   created_at, updated_at 
            FROM system_api_keys 
            ORDER BY created_at DESC
        `);
        res.json({ success: true, apiKeys: result.rows });
    } catch (err) {
        console.error('Admin Fetch API Keys Error:', err);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// POST /api/admin/api-keys
router.post('/api-keys', async (req, res) => {
    const { service_name, api_key, description, is_active = true } = req.body;
    if (!service_name || !api_key) {
        return res.status(400).json({ success: false, error: '缺少必要參數' });
    }
    
    try {
        const result = await query(
            'INSERT INTO system_api_keys (service_name, api_key, description, is_active) VALUES ($1, $2, $3, $4) RETURNING id, service_name, description, is_active, created_at, updated_at',
            [service_name, api_key, description, is_active]
        );
        res.json({ success: true, apiKey: result.rows[0] });
    } catch (err) {
        console.error('Admin Add API Key Error:', err);
        if (err.code === '23505') { // Unique violation
            return res.status(400).json({ success: false, error: '該服務名稱的金鑰已存在' });
        }
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// PUT /api/admin/api-keys/:id
router.put('/api-keys/:id', async (req, res) => {
    const { id } = req.params;
    const { service_name, api_key, description, is_active } = req.body;
    
    try {
        let sql = 'UPDATE system_api_keys SET updated_at = NOW()';
        const params = [];
        let i = 1;
        
        if (service_name !== undefined) {
            sql += `, service_name = $${i++}`;
            params.push(service_name);
        }
        // 若 api_key 為空，代表前端不想更新密碼，只傳其他欄位
        if (api_key && api_key.trim() !== '') {
            sql += `, api_key = $${i++}`;
            params.push(api_key);
        }
        if (description !== undefined) {
            sql += `, description = $${i++}`;
            params.push(description);
        }
        if (is_active !== undefined) {
            sql += `, is_active = $${i++}`;
            params.push(is_active);
        }
        
        sql += ` WHERE id = $${i} RETURNING id, service_name, description, is_active, created_at, updated_at`;
        params.push(id);
        
        const result = await query(sql, params);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'API Key 不存在' });
        }
        
        res.json({ success: true, apiKey: result.rows[0] });
    } catch (err) {
        console.error('Admin Update API Key Error:', err);
        if (err.code === '23505') {
            return res.status(400).json({ success: false, error: '該服務名稱的金鑰已存在' });
        }
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// DELETE /api/admin/api-keys/:id
router.delete('/api-keys/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query('DELETE FROM system_api_keys WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'API Key 不存在' });
        }
        res.json({ success: true, message: '刪除成功' });
    } catch (err) {
        console.error('Admin Delete API Key Error:', err);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

module.exports = router;
