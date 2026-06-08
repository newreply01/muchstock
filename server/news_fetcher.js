const { pool } = require('./db');
const fetch = require('node-fetch');
const nodeFetch = fetch.default || fetch;
const NewsSentiment = require('./utils/newsSentiment');

const CATEGORIES = {
    'headline': '熱門頭條',
    'tw_stock': '台股新聞',
    'us_stock': '美股雷達',
    'tech': '科技產業',
    'wd_macro': '全球時事'
};

// 更新同步進度 (用於系統監控)
async function updateProgress(dataset, stockId = '', count = -1) {
    const finalCount = count < 0 ? 0 : count;
    try {
        await pool.query(
            `INSERT INTO fm_sync_progress (dataset, stock_id, last_sync_date, status, data_count)
             VALUES ($1, $2, NOW(), 'done', $3)
             ON CONFLICT (dataset, stock_id) DO UPDATE SET last_sync_date = NOW(), status = 'done', data_count = $3`,
            [dataset, stockId, finalCount]
        );
    } catch (e) {
        console.error(`[Progress] Failed to update ${dataset}:`, e.message);
    }
}

async function fetchCategoryNews(categoryId) {
    const url = `https://api.cnyes.com/media/api/v1/newslist/category/${categoryId}?limit=20`;
    try {
        const response = await nodeFetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.items.data || [];
    } catch (err) {
        console.error(`[NewsFetcher] Failed to fetch category ${categoryId}:`, err.message);
        return [];
    }
}

async function saveNews(newsItems, categoryId) {
    const client = await pool.connect();
    try {
        let newCount = 0;
        for (const item of newsItems) {
            const newsId = item.newsId;
            const title = item.title;
            const summary = item.summary || '';
            const publishAt = new Date(item.publishAt * 1000);
            const imageUrl = item.coverSrc?.['xs']?.src || item.coverSrc?.['s']?.src || item.coverSrc?.['m']?.src || '';

            // 檢查該新聞是否已存在
            const checkRes = await client.query('SELECT category FROM news WHERE news_id = $1', [newsId]);
            let isNew = false;

            if (checkRes.rows.length === 0) {
                // 不存在，直接新增
                await client.query(`
                    INSERT INTO news (news_id, category, title, summary, image_url, publish_at)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [newsId, categoryId, title, summary, imageUrl, publishAt]);
                isNew = true;
            } else {
                // 已存在，若分類尚未加入則追加
                const existingCategory = checkRes.rows[0].category;
                if (existingCategory && !existingCategory.split(',').includes(categoryId)) {
                    const newCategory = existingCategory + ',' + categoryId;
                    await client.query(`
                        UPDATE news SET category = $1 WHERE news_id = $2
                    `, [newCategory, newsId]);
                }
            }

            if (isNew) {
                newCount++;
                // 台股新聞類別且標題含股票代號 → 使用 AI 情緒分析（更精確）
                // 其他類別 → 使用規則引擎（更快速）
                const hasSymbolInTitle = /[\(\[（【]\d{4,6}[\)\]）】]/.test(title);
                const useAI = (categoryId === 'tw_stock' && hasSymbolInTitle && process.env.OLLAMA_URL);
                await NewsSentiment.processNews(newsId, !!useAI);
            }
        }
        return newCount;
    } catch (err) {
        console.error(`[NewsFetcher] Error saving news for ${categoryId}:`, err.message);
        return 0;
    } finally {
        client.release();
    }
}

async function syncAllNews() {
    console.log('📰 [NewsFetcher] Starting hourly news sync...');
    let totalSaved = 0;
    for (const [catId, catName] of Object.entries(CATEGORIES)) {
        const items = await fetchCategoryNews(catId);
        if (items.length > 0) {
            const saved = await saveNews(items, catId);
            totalSaved += saved;
            console.log(`✅ [NewsFetcher] ${catName}: Synced ${items.length} items, ${saved} new.`);
        }
    }
    await updateProgress('News', '', totalSaved);
    console.log('📰 [NewsFetcher] News sync completed.');
}

module.exports = { syncAllNews };
