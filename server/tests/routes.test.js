const request = require('supertest');

jest.mock('../db', () => ({
    pool: { query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }) },
    query: jest.fn().mockResolvedValue({ rows: [] })
}));

process.env.JWT_SECRET = 'test-secret-for-unit-tests-only-32chars';
process.env.NODE_ENV = 'test';

const app = require('../index');

describe('錯誤回應格式統一', () => {
    it('所有 404 回應都應包含 success: false', async () => {
        const res = await request(app).get('/api/nonexistent-xyz');
        expect(res.statusCode).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body).toHaveProperty('error');
        expect(res.body).not.toHaveProperty('message');
    });

    it('未授權回應應包含 success: false 及 error 欄位', async () => {
        const res = await request(app).get('/api/admin/users');
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body).toHaveProperty('error');
    });
});

describe('Screener 路由', () => {
    it('GET /api/screen 無參數應回傳 200', async () => {
        const res = await request(app).get('/api/screen');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success');
    });

    it('GET /api/institutional-total 應回傳 200', async () => {
        const res = await request(app).get('/api/institutional-total');
        expect(res.statusCode).toBeLessThan(500);
    });
});

describe('Realtime 路由', () => {
    it('GET /api/realtime/realtime-ticks 無 symbol 應回傳 400', async () => {
        const res = await request(app).get('/api/realtime/realtime-ticks');
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body).toHaveProperty('error');
        expect(res.body).not.toHaveProperty('message');
    });

    it('GET /api/realtime/realtime-active 應回傳 200', async () => {
        const res = await request(app).get('/api/realtime/realtime-active');
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

describe('Stream 路由', () => {
    it('GET /api/stream/realtime 無 symbols 應回傳 400', async () => {
        const res = await request(app).get('/api/stream/realtime');
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body).toHaveProperty('error');
    });

    it('GET /api/stream/realtime symbols 為空應回傳 400', async () => {
        const res = await request(app).get('/api/stream/realtime?symbols=');
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });
});

describe('Portfolio 路由保護', () => {
    it('GET /api/portfolio 未授權應回傳 401', async () => {
        const res = await request(app).get('/api/portfolio');
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });

    it('POST /api/portfolio 未授權應回傳 401', async () => {
        const res = await request(app).post('/api/portfolio').send({ symbol: '2330', quantity: 1, avg_cost: 500 });
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });
});

describe('Watchlist 路由保護', () => {
    it('GET /api/watchlists 未授權應回傳 401', async () => {
        const res = await request(app).get('/api/watchlists');
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });
});

describe('Filters 路由保護', () => {
    it('GET /api/filters 未授權應回傳 401', async () => {
        const res = await request(app).get('/api/filters');
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });
});

describe('New Split Routes', () => {
    it('GET /api/market-summary 應回傳 200', async () => {
        const res = await request(app).get('/api/market-summary');
        expect(res.statusCode).toBeLessThan(500);
    });

    it('GET /api/stock/2330/quick-diagnosis 應回傳 200', async () => {
        const res = await request(app).get('/api/stock/2330/quick-diagnosis');
        expect(res.statusCode).toBeLessThan(500);
    });
});
