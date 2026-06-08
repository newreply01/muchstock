import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Layout from './components/layout/Layout'
import { screenStocks, getStats, getWatchlists, addStockToWatchlist, removeStockFromWatchlist } from './utils/api'
import { useAuth } from './context/AuthContext'
import useGlobalStore from './store/useGlobalStore'

// Lazy loaded components
const MarketHub = lazy(() => import('./components/pages/MarketHub'));
const ScreenerHub = lazy(() => import('./components/pages/ScreenerHub'));
const TradingHub = lazy(() => import('./components/pages/TradingHub'));
const AdminHub = lazy(() => import('./components/pages/AdminHub'));
const MarketStats = lazy(() => import('./components/pages/MarketStats'));
const StockDetail = lazy(() => import('./components/pages/StockDetail'));
const ComparisonChart = lazy(() => import('./components/charts/ComparisonChart'));
const ProfilePage = lazy(() => import('./components/pages/ProfilePage'));
const LoginModal = lazy(() => import('./components/modals/LoginModal'));
const NewsBoard = lazy(() => import('./components/pages/NewsBoard'));
const MonitorPage = lazy(() => import('./components/pages/MonitorPage'));

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
    </div>
  );
}

function App() {
  const isCloudDeployment = 
    window.location.hostname.includes('zeabur.app') || 
    window.location.hostname.includes('zeabur.com') || 
    window.location.hostname.includes('vercel.app');

  const navigate = useNavigate()
  const location = useLocation()
  const { requireLogin, user, showLoginModal, setShowLoginModal } = useAuth()

  // Zustand Store
  const {
    filters, setFilters,
    sortBy, setSortBy,
    sortDir, setSortDir,
    page, setPage,
    searchTerm, setSearchTerm,
    mainStock, setMainStock,
    detailStock, setDetailStock,
    activePatterns, setActivePatterns,
    activeCompareSymbols, setActiveCompareSymbols,
    globalMarket, globalIndustry, globalStockTypes
  } = useGlobalStore();

  const marketForApi = globalMarket === 'all' ? undefined : globalMarket;
  const industryForApi = globalIndustry === 'all' ? undefined : globalIndustry;
  const stockTypesForApi = globalStockTypes.join(',');

  // React Query: Watchlists
  const { data: watchlistsRes, refetch: fetchUserWatchlists } = useQuery({
    queryKey: ['watchlists', user?.id],
    queryFn: getWatchlists,
    enabled: !!user
  });
  const watchlists = watchlistsRes?.success ? watchlistsRes.data : [];

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
    window.addEventListener('muchstock-search', handleSearch)
    window.addEventListener('muchstock-select', handleSelect)
    return () => {
      window.removeEventListener('muchstock-search', handleSearch)
      window.removeEventListener('muchstock-select', handleSelect)
    }
  }, [location.pathname, navigate, setMainStock, setPage, setSearchTerm])

  // React Query: Screener Results
  const { data: resultsData, isFetching: loading } = useQuery({
    queryKey: ['screenStocks', filters, sortBy, sortDir, page, searchTerm, marketForApi, stockTypesForApi, industryForApi],
    queryFn: () => screenStocks({
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
  });
  const results = resultsData || { data: [], total: 0, page: 1, totalPages: 0, latestDate: null };

  useEffect(() => {
    if (results?.data?.length > 0 && !mainStock && !loading) {
      setMainStock(results.data[0])
    }
  }, [results, mainStock, setMainStock, loading])

  // React Query: Market Stats
  const { data: stats } = useQuery({
    queryKey: ['marketStats', filters, marketForApi, stockTypesForApi, industryForApi],
    queryFn: () => getStats({
      ...filters,
      market: marketForApi,
      stock_types: stockTypesForApi,
      industry: industryForApi
    })
  });

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
      <Suspense fallback={<LoadingSpinner />}>
        <MarketStats stats={stats} fallbackDate={results?.latestDate} />
      </Suspense>
      <div className="max-w-[1600px] mx-auto px-4 py-8">
        <Suspense fallback={<LoadingSpinner />}>
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
                  if (sortBy === c) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
                  else { setSortBy(c); setSortDir('desc'); }
                  setPage(1);
                }}
                page={page}
                onPageChange={setPage}
                onStockClick={(s) => { setMainStock(s); setDetailStock(null); navigate(`/stock/${s.symbol}`); }}
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
                onStockSelect={(s) => { setMainStock(s); setDetailStock(null); navigate(`/stock/${s.symbol}`); }}
                watchedSymbols={watchedSymbols}
                onToggleWatchlist={toggleWatchlist}
                watchlists={watchlists}
                onRefreshWatchlists={fetchUserWatchlists}
                requireLogin={requireLogin}
              />
            } />

            <Route path="/admin/*" element={
              <AdminHub user={user} isCloudDeployment={isCloudDeployment} />
            } />
            
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/stock/:symbol" element={
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm rounded-2xl p-6 transition-colors duration-300">
                <StockDetail stock={mainStock} isInline={true} />
              </div>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
      <Suspense fallback={null}>
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
      </Suspense>
    </Layout>
  )
}
export default App
