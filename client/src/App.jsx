import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import MarketHub from './components/pages/MarketHub'
import ScreenerHub from './components/pages/ScreenerHub'
import TradingHub from './components/pages/TradingHub'
import AdminHub from './components/pages/AdminHub'
import MarketStats from './components/pages/MarketStats'
import StockDetail from './components/pages/StockDetail'
import ComparisonChart from './components/charts/ComparisonChart'
import ProfilePage from './components/pages/ProfilePage'
import LoginModal from './components/modals/LoginModal'
import NewsBoard from './components/pages/NewsBoard'
import MonitorPage from './components/pages/MonitorPage'
import { screenStocks, getStats, getWatchlists, addStockToWatchlist, removeStockFromWatchlist } from './utils/api'
import { useAuth } from './context/AuthContext';
import { useGlobalFilters } from './context/GlobalFilterContext'

function App() {
  const isCloudDeployment = 
    window.location.hostname.includes('zeabur.app') || 
    window.location.hostname.includes('zeabur.com') || 
    window.location.hostname.includes('vercel.app');

  const navigate = useNavigate()
  const location = useLocation()
  const { requireLogin, user, showLoginModal, setShowLoginModal } = useAuth()
  const { marketForApi, stockTypesForApi, industryForApi } = useGlobalFilters()
  const [results, setResults] = useState({ data: [], total: 0, page: 1, totalPages: 0, latestDate: null })
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({})
  const [sortBy, setSortBy] = useState('volume')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [mainStock, setMainStock] = useState(() => {
    try {
      const saved = localStorage.getItem('muchstock-main-stock');
      return saved ? JSON.parse(saved) : { symbol: '2330', name: '台積電', industry: '半導體業' };
    } catch { return { symbol: '2330', name: '台積電', industry: '半導體業' }; }
  })
  const [detailStock, setDetailStock] = useState(null)

  useEffect(() => {
    if (mainStock) {
      localStorage.setItem('muchstock-main-stock', JSON.stringify(mainStock));
    }
  }, [mainStock]);
  const [activeCompareSymbols, setActiveCompareSymbols] = useState([])
  const [watchlists, setWatchlists] = useState([])
  const [activePatterns, setActivePatterns] = useState([])

  const fetchUserWatchlists = async () => {
    try {
      const res = await getWatchlists();
      if (res.success && res.data.length > 0) setWatchlists(res.data)
    } catch (e) { console.error('Watchlist fetch error:', e) }
  }

  useEffect(() => { 
    if (user) fetchUserWatchlists() 
  }, [location.pathname, user])

  const toggleWatchlist = async (symbol) => {
    if (!requireLogin()) return;
    if (watchlists.length === 0) return;
    const defaultList = watchlists[0];
    const isWatched = defaultList.items?.some(i => i.symbol === symbol)
    try {
      if (isWatched) await removeStockFromWatchlist(defaultList.id, symbol)
      else await addStockToWatchlist(defaultList.id, symbol)
      fetchUserWatchlists()
    } catch (e) { console.error('Toggle watchlist error:', e) }
  }

  const watchedSymbols = new Set()
  watchlists.forEach(w => w.items?.forEach(i => watchedSymbols.add(i.symbol)))

  useEffect(() => {
    const handleSearch = (e) => {
      setSearchTerm(e.detail)
      setPage(1)
      setMainStock(null)
      if (!location.pathname.startsWith('/stock')) navigate(`/stock/${e.detail?.symbol || '2330'}`)
    }
    const handleSelect = (e) => {
      const stock = e.detail
      setMainStock(stock)
      if (!location.pathname.startsWith('/stock')) navigate(`/stock/${stock?.symbol || '2330'}`)
    }
    const handleSwitchView = (e) => {
      let targetView = e.detail;
      let incomingFilters = null;

      if (typeof e.detail === 'object') {
        targetView = e.detail.view;
        incomingFilters = e.detail.filters;
      }

      console.log('App: Switching view to', targetView, 'with filters', incomingFilters);

      if (['watchlist', 'portfolio'].includes(targetView) && !requireLogin()) {
        return;
      }

      if (incomingFilters) {
        setFilters(prev => ({ ...prev, ...incomingFilters }));
        setPage(1);
      }

      const routesMap = {
        'market': '/',
        'screener': '/screener',
        'trading': '/trading',
        'admin': '/admin',
        'stock-detail': `/stock/${mainStock?.symbol || '2330'}`,
        'news': '/news',
        'profile': '/profile',
        'monitor': '/monitor'
      };
      
      navigate(routesMap[targetView] || '/');
      window.scrollTo(0, 0)
    }
    window.addEventListener('muchstock-view', handleSwitchView)
    window.addEventListener('muchstock-search', handleSearch)
    window.addEventListener('muchstock-select', handleSelect)
    return () => {
      window.removeEventListener('muchstock-search', handleSearch)
      window.removeEventListener('muchstock-view', handleSwitchView)
      window.removeEventListener('muchstock-select', handleSelect)
    }
  }, [location.pathname, requireLogin, navigate, mainStock])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await screenStocks({
        ...filters,
        market: marketForApi,
        stock_types: stockTypesForApi,
        industry: industryForApi,
        search: searchTerm,
        sort_by: sortBy,
        sort_dir: sortDir,
        page,
        limit: 50
      })
      setResults(data || { data: [], total: 0, page: 1, totalPages: 0, latestDate: null })
    } catch (err) { console.error('Screening error:', err) } finally { setLoading(false) }
  }, [filters, sortBy, sortDir, page, searchTerm, marketForApi, stockTypesForApi, industryForApi])

  useEffect(() => {
    if (results?.data?.length > 0 && !mainStock && !localStorage.getItem('muchstock-main-stock')) {
      setMainStock(results.data[0])
    }
  }, [results, mainStock])

  const fetchStats = useCallback(async () => {
    try {
      const data = await getStats({
        ...filters,
        market: marketForApi,
        stock_types: stockTypesForApi,
        industry: industryForApi
      })
      setStats(data)
    } catch (err) { console.error('Stats error:', err) }
  }, [filters, marketForApi, stockTypesForApi, industryForApi])

  useEffect(() => { fetchStats(); fetchData() }, [fetchData, fetchStats])

  const getActiveView = (path) => {
    if (path === '/') return 'market';
    if (path.startsWith('/screener')) return 'screener';
    if (path.startsWith('/trading')) return 'trading';
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/stock/')) return 'stock-detail';
    if (path.startsWith('/news')) return 'news';
    if (path.startsWith('/profile')) return 'profile';
    if (path.startsWith('/monitor')) return 'monitor';
    return 'market';
  };
  const activeViewName = getActiveView(location.pathname);

  return (
    <Layout currentView={activeViewName}>
      <MarketStats stats={stats} fallbackDate={results?.latestDate} />
      <div className="max-w-[1600px] mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<MarketHub onStockSelect={(s) => { setMainStock(s); setDetailStock(null); navigate(`/stock/${s.symbol}`); }} watchedSymbols={watchedSymbols} onToggleWatchlist={toggleWatchlist} />} />
          <Route path="/news" element={<div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm rounded-2xl p-6 transition-colors duration-300"><NewsBoard /></div>} />
          <Route path="/monitor" element={
            user?.role === 'admin' || (!isCloudDeployment && !user) ? (
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm rounded-2xl p-6 transition-colors duration-300">
                <MonitorPage />
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          } />
          
          <Route path="/screener" element={
            <ScreenerHub
              onFilter={(f) => { setFilters(f); setPage(1); }}
              onClear={() => { setFilters({}); setPage(1); setMainStock(null); }}
              filters={filters}
              results={results}
              loading={loading}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={(c) => {
                if (sortBy === c) setSortDir(p => p === 'desc' ? 'asc' : 'desc');
                else { setSortBy(c); setSortDir('desc'); }
                setPage(1);
              }}
              page={page}
              onPageChange={setPage}
              onStockClick={(s) => { setMainStock(s); setDetailStock(null); navigate(`/stock/\${s.symbol}`); }}
              watchedSymbols={watchedSymbols}
              onToggleWatchlist={toggleWatchlist}
              mainStock={mainStock}
              activePatterns={activePatterns}
              setActivePatterns={setActivePatterns}
              onCompare={setActiveCompareSymbols}
              activeCompareSymbols={activeCompareSymbols}
            />
          } />

          <Route path="/trading" element={
            <TradingHub
              onStockSelect={(s) => { setMainStock(s); setDetailStock(null); navigate(`/stock/\${s.symbol}`); }}
              watchedSymbols={watchedSymbols}
              onToggleWatchlist={toggleWatchlist}
              watchlists={watchlists}
              onRefreshWatchlists={fetchUserWatchlists}
              requireLogin={requireLogin}
            />
          } />

          <Route path="/admin/*" element={
            <AdminHub user={user} isCloudDeployment={window.location.hostname.includes('zeabur.app') || window.location.hostname.includes('zeabur.com') || window.location.hostname.includes('vercel.app')} />
          } />
          
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/stock/:symbol" element={
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm rounded-2xl p-6 transition-colors duration-300">
              <StockDetail stock={mainStock} isInline={true} />
            </div>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {detailStock && activeViewName !== 'screener' && activeViewName !== 'market' && (
        <StockDetail
          stock={detailStock}
          onClose={() => setDetailStock(null)}
          isWatched={watchedSymbols.has(detailStock.symbol)}
          onToggleWatchlist={() => toggleWatchlist(detailStock.symbol)}
        />
      )}
      {activeCompareSymbols.length > 0 && (
        <ComparisonChart
          symbols={activeCompareSymbols}
          onClose={() => setActiveCompareSymbols([])}
        />
      )}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </Layout>
  )
}
export default App
