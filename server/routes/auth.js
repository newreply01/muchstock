const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const { query } = require('../db');
const { generateToken, requireAuth } = require('../middleware/auth');
const { logActivity } = require('../utils/audit_logger');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const { sendVerificationEmail } = require('../utils/mail_service');

function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/register — Email + 密碼註冊
router.post('/register', async (req, res) => {
    const { email, password, name, nickname } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: '請輸入 Email 和密碼' });
    }
    if (password.length < 6) {
        return res.status(400).json({ success: false, error: '密碼至少需要 6 個字元' });
    }

    try {
        // 檢查是否已註冊
        const existing = await query('SELECT id FROM users WHERE email = $1 AND provider = $2', [email, 'local']);
        if (existing.rows.length > 0) {
            return res.status(409).json({ success: false, error: '此 Email 已被註冊' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const displayName = name || email.split('@')[0];
        const displayNickname = nickname || displayName;
        const verificationCode = generateCode();
        const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const result = await query(
            `INSERT INTO users (email, password_hash, name, nickname, provider, role, is_verified, verification_code, code_expires_at) 
             VALUES ($1, $2, $3, $4, 'local', 'user', FALSE, $5, $6) RETURNING id, uuid, email, name, nickname, avatar_url, provider, role`,
            [email, passwordHash, displayName, displayNickname, verificationCode, codeExpiresAt]
        );

        const user = result.rows[0];

        // 自動建立預設自選股清單
        await query('INSERT INTO watchlists (name, user_id) VALUES ($1, $2)', ['我的自選股', user.id]);

        // 寄送驗證信 (非同步執行，不擋住註冊回應)
        sendVerificationEmail(email, verificationCode, displayNickname).catch(err => console.error('發送郵件失敗:', err));

        // 註冊時不直接發放 token，回報需要驗證
        res.json({ 
            success: true, 
            message: '註冊成功，請檢查電子信箱並輸入 6 位數驗證碼', 
            needsVerification: true,
            user: { email: user.email } 
        });
    } catch (err) {
        console.error('註冊失敗:', err);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// POST /api/auth/login — Email + 密碼登入
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: '請輸入 Email 和密碼' });
    }

    try {
        const result = await query(
            'SELECT id, uuid, email, name, nickname, avatar_url, password_hash, provider, role, is_verified, is_active FROM users WHERE email = $1 AND provider = $2',
            [email, 'local']
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: '帳號或密碼錯誤' });
        }

        const user = result.rows[0];

        if (user.is_active === false) {
            return res.status(403).json({ success: false, error: '此帳號已被停用，請聯絡管理員' });
        }

        // 檢查是否已驗證
        if (user.provider === 'local' && !user.is_verified) {
            return res.status(403).json({ 
                success: false, 
                error: '帳號尚未驗證', 
                needsVerification: true,
                email: user.email 
            });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ success: false, error: '帳號或密碼錯誤' });
        }

        const token = generateToken(user);
        
        // 紀錄登入行為
        await logActivity(user.uuid, 'USER_LOGIN', 'user', user.id, { email: user.email }, req);
        
        res.json({ success: true, token, user: { id: user.id, uuid: user.uuid, email: user.email, name: user.name, nickname: user.nickname, avatar_url: user.avatar_url, role: user.role } });
    } catch (err) {
        console.error('登入失敗:', err);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// POST /api/auth/google — Google Sign-In (前端傳送 credential token)
router.post('/google', async (req, res) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({ success: false, error: '缺少 Google credential' });
    }

    try {
        // 驗證 Google ID Token
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        // 檢查是否已有此 Google 帳號
        let result = await query(
            'SELECT id, uuid, email, name, nickname, avatar_url, provider, role, is_active FROM users WHERE provider = $1 AND provider_id = $2',
            ['google', googleId]
        );

        let user;
        if (result.rows.length > 0) {
            // 已註冊，更新資訊
            user = result.rows[0];

            if (user.is_active === false) {
                return res.status(403).json({ success: false, error: '此帳號已被停用，請聯絡管理員' });
            }

            await query(
                'UPDATE users SET name = $1, avatar_url = $2, updated_at = NOW() WHERE id = $3',
                [name, picture, user.id]
            );
            user.name = name;
            user.avatar_url = picture;
        } else {
            // 新使用者
            const insertResult = await query(
                `INSERT INTO users (email, name, nickname, avatar_url, provider, provider_id, role) 
                 VALUES ($1, $2, $2, $3, 'google', $4, 'user') RETURNING id, uuid, email, name, nickname, avatar_url, provider, role`,
                [email, name, picture, googleId]
            );
            user = insertResult.rows[0];

            // 為新使用者自動建立預設自選股清單
            await query('INSERT INTO watchlists (name, user_id) VALUES ($1, $2)', ['我的自選股', user.id]);
        }

        const token = generateToken(user);
        
        // 紀錄 Google 登入行為
        await logActivity(user.uuid, 'USER_LOGIN_GOOGLE', 'user', user.id, { email: user.email }, req);
        
        res.json({ success: true, token, user: { id: user.id, uuid: user.uuid, email: user.email, name: user.name, nickname: user.nickname, avatar_url: user.avatar_url, role: user.role } });
    } catch (err) {
        console.error('Google 登入失敗:', err);
        res.status(401).json({ success: false, error: 'Google 驗證失敗' });
    }
});

// POST /api/auth/verify-email — 驗證 6 位數代碼
router.post('/verify-email', async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ success: false, error: '請提供 Email 與驗證碼' });
    }

    try {
        const result = await query(
            'SELECT id, uuid, email, name, nickname, avatar_url, role, verification_code, code_expires_at, is_verified FROM users WHERE email = $1 AND provider = $2',
            [email, 'local']
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: '使用者不存在' });
        }

        const user = result.rows[0];

        if (user.is_verified) {
            return res.status(400).json({ success: false, error: '此帳號已通過驗證，請直接登入' });
        }

        // 比對驗證碼
        if (user.verification_code !== code) {
            return res.status(400).json({ success: false, error: '驗證碼不正確' });
        }

        // 檢查是否過期
        if (new Date() > new Date(user.code_expires_at)) {
            return res.status(400).json({ success: false, error: '驗證碼已過期，請重新註冊或請求發送' });
        }

        // 更新狀態為已驗證
        await query(
            'UPDATE users SET is_verified = TRUE, verification_code = NULL, code_expires_at = NULL, updated_at = NOW() WHERE id = $1',
            [user.id]
        );

        // 發放正式憑證
        const token = generateToken(user);
        
        await logActivity(user.uuid, 'USER_VERIFIED', 'user', user.id, { email: user.email }, req);

        res.json({ 
            success: true, 
            message: '驗證成功！', 
            token, 
            user: { id: user.id, uuid: user.uuid, email: user.email, name: user.name, nickname: user.nickname, avatar_url: user.avatar_url, role: user.role } 
        });

    } catch (err) {
        console.error('驗證失敗:', err);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// POST /api/auth/resend-code — 重新發送驗證碼
router.post('/resend-code', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: '請提供 Email' });

    try {
        const result = await query('SELECT id, name, is_verified FROM users WHERE email = $1 AND provider = $2', [email, 'local']);
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: '使用者不存在' });
        
        const user = result.rows[0];
        if (user.is_verified) return res.status(400).json({ success: false, error: '帳號已驗證' });

        const newCode = generateCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        
        await query('UPDATE users SET verification_code = $1, code_expires_at = $2 WHERE id = $3', [newCode, expiresAt, user.id]);
        
        sendVerificationEmail(email, newCode, user.name).catch(err => console.error('重發郵件失敗:', err));
        
        res.json({ success: true, message: '驗證碼已重新寄送' });
    } catch (err) {
        console.error('重發失敗:', err);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// GET /api/auth/me — 取得目前使用者資訊
router.get('/me', requireAuth, async (req, res) => {
    try {
        const { rows } = await query('SELECT id, uuid, email, name, nickname, avatar_url, provider, role, created_at FROM users WHERE id = $1', [req.user.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: '使用者不存在' });
        }
        res.json({ success: true, user: rows[0] });
    } catch (err) {
        console.error('Fetch me error:', err);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// 更新使用者資訊 (名稱、暱稱)
router.put('/me', requireAuth, async (req, res) => {
    const { name, nickname } = req.body;
    if (!name || name.trim() === '') {
        return res.status(400).json({ success: false, error: '名稱不能為空' });
    }
    try {
        const { rows } = await query(
            'UPDATE users SET name = $1, nickname = $2, updated_at = NOW() WHERE id = $3 RETURNING id, uuid, email, name, nickname, avatar_url, provider, role',
            [name.trim(), nickname?.trim() || name.trim(), req.user.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: '使用者不存在' });
        }

        // 紀錄個人資料修改
        await logActivity(req.user.uuid, 'UPDATE_PROFILE', 'user', req.user.id, { name, nickname }, req);

        res.json({ success: true, user: rows[0] });
    } catch (err) {
        console.error('Update me error:', err);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// 更新使用者信箱
router.put('/me/email', requireAuth, async (req, res) => {
    const { newEmail, password } = req.body;
    if (!newEmail || !password) {
        return res.status(400).json({ success: false, error: '請提供新信箱與密碼' });
    }
    try {
        const { rows } = await query('SELECT password_hash, provider FROM users WHERE id = $1', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, error: '使用者不存在' });

        const user = rows[0];
        if (user.provider !== 'local') {
            return res.status(400).json({ success: false, error: '第三方登入的帳號無法修改信箱' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: '密碼不正確' });
        }

        // 檢查新信箱是否已被佔用
        const existing = await query('SELECT id FROM users WHERE email = $1 AND provider = $2', [newEmail, 'local']);
        if (existing.rows.length > 0) {
            return res.status(409).json({ success: false, error: '此 Email 已被其他帳號使用' });
        }
        // 執行更新
        const updateRes = await query(
            'UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2 RETURNING id, uuid, email, name, nickname, avatar_url, provider, role',
            [newEmail, req.user.id]
        );
        
        res.json({ success: true, message: '信箱已成功更新', user: updateRes.rows[0] });
    } catch (err) {
        console.error('Update email error:', err);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// GET /api/auth/settings — 取得使用者個人設定 (JSON)
router.get('/settings', requireAuth, async (req, res) => {
    try {
        const { rows } = await query('SELECT settings FROM user_settings WHERE user_id = $1', [req.user.id]);
        if (rows.length === 0) {
            return res.json({ success: true, settings: {} });
        }
        res.json({ success: true, settings: rows[0].settings || {} });
    } catch (err) {
        console.error('Fetch settings error:', err);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

// PUT /api/auth/settings — 更新使用者個人設定 (合併 JSON)
router.put('/settings', requireAuth, async (req, res) => {
    const newSettings = req.body;
    if (!newSettings || typeof newSettings !== 'object') {
        return res.status(400).json({ success: false, error: '無效的設定格式' });
    }

    try {
        // 先檢查是否存在
        const check = await query('SELECT settings FROM user_settings WHERE user_id = $1', [req.user.id]);
        
        if (check.rows.length === 0) {
            // 不存在則建立
            await query(
                'INSERT INTO user_settings (user_id, settings) VALUES ($1, $2)',
                [req.user.id, newSettings]
            );
            return res.json({ success: true, settings: newSettings });
        } else {
            // 存在則合併
            const merged = { ...check.rows[0].settings, ...newSettings };
            await query(
                'UPDATE user_settings SET settings = $1 WHERE user_id = $2',
                [merged, req.user.id]
            );
            return res.json({ success: true, settings: merged });
        }
    } catch (err) {
        console.error('Update settings error:', err);
        res.status(500).json({ success: false, error: '伺服器錯誤' });
    }
});

module.exports = router;
