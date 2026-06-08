import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useGlobalStore = create(
  persist(
    (set) => ({
      // Market/Screener Filters & Settings
      filters: {},
      setFilters: (filters) => set({ filters }),
      
      globalMarket: 'all',
      setGlobalMarket: (market) => set({ globalMarket: market }),
      
      globalIndustry: 'all',
      setGlobalIndustry: (industry) => set({ globalIndustry: industry }),
      
      globalStockTypes: ['stock'],
      toggleGlobalStockType: (typeId) => set((state) => {
        const current = state.globalStockTypes;
        if (current.includes(typeId)) {
          const next = current.filter(t => t !== typeId);
          return { globalStockTypes: next.length === 0 ? ['stock'] : next };
        } else {
          return { globalStockTypes: [...current, typeId] };
        }
      }),
      
      sortBy: 'volume',
      setSortBy: (sortBy) => set({ sortBy }),
      
      sortDir: 'desc',
      setSortDir: (sortDir) => set({ sortDir }),
      
      page: 1,
      setPage: (page) => set({ page }),
      
      searchTerm: '',
      setSearchTerm: (searchTerm) => set({ searchTerm }),

      // Active / Selected State
      mainStock: null,
      setMainStock: (stock) => set({ mainStock: stock }),
      
      detailStock: null,
      setDetailStock: (stock) => set({ detailStock: stock }),

      activePatterns: [],
      setActivePatterns: (patterns) => set({ activePatterns: patterns }),

      activeCompareSymbols: [],
      setActiveCompareSymbols: (symbols) => set({ activeCompareSymbols: symbols }),

      // Methods to help reset or handle clear
      clearFilters: () => set({ filters: {}, page: 1, mainStock: null }),
    }),
    {
      name: 'muchstock-global-storage', // key for localStorage
      partialize: (state) => ({ 
        mainStock: state.mainStock,
        filters: state.filters,
        globalMarket: state.globalMarket,
        globalIndustry: state.globalIndustry,
        globalStockTypes: state.globalStockTypes
      }), // persist these fields
    }
  )
);

export default useGlobalStore;
