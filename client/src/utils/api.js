export const API_BASE = import.meta.env.VITE_API_URL || '/api';
import { authFetch, getToken } from './auth';

/**
 * 統一 API 請求 wrapper
 * 自動處理認證 header、錯誤格式化與 JSON 解析
 * @param {string} url - API URL
 * @param {object} options - fetch options
 * @param {boolean} requiresAuth - 是否需要攜帶認證 token
 */
async function apiRequest(url, options = {}, requiresAuth = false) {
    const fetchFn = requiresAuth ? authFetch : fetch;
    const res = await fetchFn(url, options);
    if (!res.ok) {
        let errorMsg = `API 請求失敗 (${res.status})`;
        try {
            const errData = await res.json();
            errorMsg = errData.error || errData.message || errorMsg;
        } catch (_) {}
        throw new Error(errorMsg);
    }
    return res.json();
}

export async function screenStocks(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
            searchParams.append(key, value);
        }
    });
    return apiRequest(`${API_BASE}/screen?${searchParams.toString()}`);
}

export async function searchStocks(queryStr, limit = 10) {
    if (!queryStr) return [];
    const searchParams = new URLSearchParams();
    searchParams.append('q', queryStr);
    searchParams.append('limit', limit);
    return apiRequest(`${API_BASE}/stocks/search?${searchParams.toString()}`);
}

export async function getStats(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.date) searchParams.append('date', params.date);
    return apiRequest(`${API_BASE}/stats?${searchParams.toString()}`);
}

export async function getMarketSummary(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.market) searchParams.append('market', params.market);
    return apiRequest(`${API_BASE}/market-summary?${searchParams.toString()}`);
}

export async function getMarketFocus(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.market) searchParams.append('market', params.market);
    return apiRequest(`${API_BASE}/market-focus?${searchParams.toString()}`);
}


export async function getMarketMargin() {
    return apiRequest(`${API_BASE}/market-margin`);
}

export async function getInstitutionalRank(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            searchParams.append(key, value);
        }
    });
    return apiRequest(`${API_BASE}/institutional-rank?${searchParams.toString()}`);
}

export async function getInstitutionalTotal(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.days) searchParams.append('days', params.days);
    return apiRequest(`${API_BASE}/institutional-total?${searchParams.toString()}`);
}

export async function getNews(category = 'all', limit = 10) {
    return apiRequest(`${API_BASE}/news?category=${category}&limit=${limit}`);
}

export async function getHistory(symbol, limit = 200, period = '日K') {
    if (!symbol) return [];
    return apiRequest(`${API_BASE}/history/${symbol}?limit=${limit}&period=${encodeURIComponent(period)}`);
}

export async function getComparisonData(symbols, limit = 100) {
    if (!symbols || symbols.length === 0) return {};
    const symbolStr = symbols.join(',');
    return apiRequest(`${API_BASE}/compare?symbols=${symbolStr}&limit=${limit}`);
}

export async function getStockFinancials(symbol) {
    if (!symbol) return null;
    return apiRequest(`${API_BASE}/stock/${symbol}/financials`);
}

export async function getInstitutionalData(symbol, limit = 60) {
    if (!symbol) return [];
    return apiRequest(`${API_BASE}/stock/${symbol}/institutional?limit=${limit}`);
}

export async function getAIReport(symbol) {
    if (!symbol) return null;
    return apiRequest(`${API_BASE}/stock/${symbol}/ai-report`);
}

export async function getStockNews(symbol, limit = 10) {
    if (!symbol) return [];
    return apiRequest(`${API_BASE}/stock/${symbol}/news?limit=${limit}`);
}

export async function getUserSettings() {
    return apiRequest(`${API_BASE}/auth/settings`, {}, true);
}

export async function updateUserSettings(settings) {
    return apiRequest(`${API_BASE}/auth/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
    }, true);
}

export async function getWatchlists() {
    return apiRequest(`${API_BASE}/watchlists`, {}, true);
}

export async function addStockToWatchlist(watchlistId, symbol) {
    return apiRequest(`${API_BASE}/watchlists/${watchlistId}/symbols`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
    }, true);
}

export async function removeStockFromWatchlist(watchlistId, symbol) {
    return apiRequest(`${API_BASE}/watchlists/${watchlistId}/symbols/${symbol}`, {
        method: 'DELETE'
    }, true);
}

export async function getSavedFilters() {
    return apiRequest(`${API_BASE}/filters`, {}, true);
}

export async function saveFilter(name, filters) {
    return apiRequest(`${API_BASE}/filters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, filters })
    }, true);
}

export async function deleteFilter(id) {
    return apiRequest(`${API_BASE}/filters/${id}`, {
        method: 'DELETE'
    }, true);
}
export async function getBrokerTrading(symbol, period = '日K') {
    if (!symbol) return { buyers: [], sellers: [], date: null };
    return apiRequest(`${API_BASE}/stock/${symbol}/broker-trading?period=${encodeURIComponent(period)}`);
}

export async function getMarginTrading(symbol, limit = 60) {
    if (!symbol) return { data: [] };
    return apiRequest(`${API_BASE}/stock/${symbol}/margin-trading?limit=${limit}`);
}
export async function getBrokerTrace(symbol, limit = 60, period = '日K') {
    if (!symbol) return { data: [] };
    return apiRequest(`${API_BASE}/stock/${symbol}/broker-trace?limit=${limit}&period=${encodeURIComponent(period)}`);
}

export async function getRealtimeData(symbol) {
    if (!symbol) return null;
    return apiRequest(`${API_BASE}/realtime/${symbol}`);
}

export async function getRealtimeTicks(symbol, date) {
    if (!symbol) return { data: [], date: null };
    const dateParam = date ? `&date=${date}` : '';
    return apiRequest(`${API_BASE}/realtime/realtime-ticks?symbol=${symbol}${dateParam}`);
}

export async function getRealtimeActive() {
    return apiRequest(`${API_BASE}/realtime/realtime-active`);
}

export async function getRealtimeBatch(symbols) {
    if (!symbols || symbols.length === 0) return { success: true, data: {} };
    return apiRequest(`${API_BASE}/realtime/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols })
    });
}

export async function getMarketIndex() {
    return apiRequest(`${API_BASE}/realtime/market-index`);
}

export async function getIndustries() {
    return apiRequest(`${API_BASE}/stocks/industries`);
}

export async function getHealthHistory(symbol) {
    if (!symbol) return { data: [] };
    return apiRequest(`${API_BASE}/stock/${symbol}/health-history`);
}

export async function getQuickDiagnosis(symbol) {
    if (!symbol) return null;
    return apiRequest(`${API_BASE}/stock/${symbol}/quick-diagnosis`);
}

export async function getPromptTemplates() {
    return apiRequest(`${API_BASE}/admin/prompts`, {}, true);
}

export async function getPromptTemplate(name) {
    return apiRequest(`${API_BASE}/admin/prompts/${name}`, {}, true);
}

export async function updatePromptTemplate(name, content, note) {
    const res = await authFetch(`${API_BASE}/admin/prompts/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, note })
    });
    if (!res.ok) throw new Error(`更新提示詞模板 ${name} 失敗`);
    return res.json();
}

export async function getPromptHistory(name) {
    const res = await authFetch(`${API_BASE}/admin/prompts/${name}/history`);
    if (!res.ok) throw new Error(`獲取提示詞歷史 ${name} 失敗`);
    return res.json();
}

export async function getPromptVersion(id) {
    return authFetch(`${API_BASE}/admin/prompts/version/${id}`, {}, true).then(res => res.json());
}

export async function overwritePromptVersion(id, content, note) {
    return authFetch(`${API_BASE}/admin/prompts/version/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, note })
    }).then(res => res.json());
}

export async function deletePromptVersion(id) {
    return authFetch(`${API_BASE}/admin/prompts/version/${id}`, {
        method: 'DELETE'
    }, true).then(res => res.json());
}


export async function generateAIReport(symbol) {
    return apiRequest(`${API_BASE}/stock/${symbol}/generate-ai-report`, {
        method: 'POST'
    }, true);
}

// ==================== 持倉分析 API ====================
export async function analyzePositionAPI(symbol) {
    return apiRequest(`${API_BASE}/position/analyze/${symbol}`);
}

export async function analyzeBatchPositions(symbols) {
    return apiRequest(`${API_BASE}/position/analyze-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols })
    });
}

// ==================== 分析權重設定 API ====================
export async function getAnalysisSettings() {
    return apiRequest(`${API_BASE}/position/settings`);
}

export async function updateAnalysisSettings(weights) {
    const res = await authFetch(`${API_BASE}/position/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(weights)
    }, true);
    return res.json();
}

// ==================== 歷史評分走勢 API ====================
export async function getPositionHistory(symbol, days = 30) {
    if (!symbol) return { data: [] };
    return apiRequest(`${API_BASE}/position/history/${symbol}?days=${days}`);
}

