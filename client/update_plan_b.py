import os
import re

FILE_PATH = "src/components/pages/StockDetail.jsx"

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State Replacement
state_old = """    // 側欄: 展開的群組 (可多個)
    const [expandedGroups, setExpandedGroups] = useState(() => new Set([findGroupForTab('dashboard')]))
    // 側欄收合 (行動裝置)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)"""

state_new = """    // 方案 B: 頂部橫向導航 (Top Navigation) 狀態
    const [activeGroup, setActiveGroup] = useState(() => findGroupForTab('dashboard'));

    // 找出當前 activeTab 的整個層級路徑
    useEffect(() => {
        const group = findGroupForTab(activeTab);
        if (group !== activeGroup) {
            setActiveGroup(group);
        }
    }, [activeTab]);"""

content = content.replace(state_old, state_new)

# 2. ToggleGroup Removal
toggle_group_old = """    const toggleGroup = (groupId) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    }"""
content = content.replace(toggle_group_old, "")

# 3. HandleTabClick update (remove setExpandedGroups)
handle_old = """        // 確保所屬群組是展開的
        const groupId = findGroupForTab(parentItem?.id || item.id);
        setExpandedGroups(prev => {
            const next = new Set(prev);
            next.add(groupId);
            return next;
        });"""
content = content.replace(handle_old, "")

# 4. activeMenuItem removal
active_old = """    // 判斷當前選中的 tab 是否需要子選單 (Level 1 / Level 2)
    const activeMenuItem = (() => {
        for (const g of SIDEBAR_GROUPS) {
            for (const item of g.items) {
                if (item.id === activeTab) return item;
            }
        }
        return null;
    })();"""
content = content.replace(active_old, "")


# 5. Header buttons update
header_btn_old = """                            {/* Mobile sidebar toggle */}
                            <button
                                onClick={() => setSidebarCollapsed(p => !p)}
                                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                            >
                                <BarChart3 className="w-5 h-5" />
                            </button>"""
content = content.replace(header_btn_old, "")

header_industry_old = """                                <div className="flex items-center gap-2 mt-1">
                                    {stock.industry && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30">
                                            {stock.industry}
                                        </span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest
                                        ${stock.market === 'twse'
                                            ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-500 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30'
                                            : 'bg-orange-50 dark:bg-orange-950/30 text-orange-500 dark:text-orange-400 border border-orange-100/50 dark:border-orange-900/30'}`}>
                                        {stock.market === 'twse' ? 'TWSE 上市' : 'TPEX 上櫃'}
                                    </span>
                                </div>"""
content = content.replace(header_industry_old, "")

# 6. Sidebar to Top Nav Replacement

nav_regex = re.compile(r'                    {/\* ─── 左側側欄 ─── \*/}.*?                    {/\* ─── 右側內容區 ─── \*/}', re.DOTALL)

top_nav_new = """                    {/* ─── 方案 B: 頂部多層橫向導航 ─── */}
                    <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-20 flex flex-col w-full">
                        
                        {/* 第 1 層: 主群組 (Groups) */}
                        <div className="flex overflow-x-auto hide-scrollbar px-2 pt-2 border-b border-slate-100 dark:border-slate-800/50">
                            {SIDEBAR_GROUPS.map(group => {
                                const Icon = group.icon;
                                const isActive = activeGroup === group.id;
                                return (
                                    <button
                                        key={group.id}
                                        onClick={() => {
                                            setActiveGroup(group.id);
                                            // 點擊群組時自動切換到該群組的第一個項目
                                            if (group.items && group.items.length > 0) {
                                                handleTabClick(group.items[0]);
                                            }
                                        }}
                                        className={`flex items-center gap-2 px-5 py-3 text-sm font-bold uppercase tracking-widest transition-all border-b-2 whitespace-nowrap
                                            ${isActive 
                                                ? 'border-brand-primary text-brand-primary' 
                                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {group.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* 第 2 層: 子項目 (Items) */}
                        {(() => {
                            const currentGroup = SIDEBAR_GROUPS.find(g => g.id === activeGroup);
                            if (!currentGroup || !currentGroup.items || currentGroup.items.length === 0) return null;
                            
                            return (
                                <div className="flex overflow-x-auto hide-scrollbar px-4 py-2.5 gap-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/50 items-center">
                                    {currentGroup.items.map(item => {
                                        const isActive = activeTab === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => handleTabClick(item)}
                                                className={`px-4 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors
                                                    ${isActive
                                                        ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-sm'
                                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                    }`}
                                            >
                                                {item.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })()}

                        {/* 第 3 層: 孫項目 (Children) - 例如三大法人、財報明細 */}
                        {(() => {
                            const currentGroup = SIDEBAR_GROUPS.find(g => g.id === activeGroup);
                            const currentItem = currentGroup?.items.find(i => i.id === activeTab);
                            if (!currentItem || !currentItem.children || currentItem.children.length === 0) return null;

                            return (
                                <div className="flex overflow-x-auto hide-scrollbar px-6 py-2 gap-3 bg-white dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800/30 items-center">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{currentItem.label}</span>
                                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
                                    {currentItem.children.map(child => {
                                        const isActive = activeSubTab === child.id;
                                        return (
                                            <button
                                                key={child.id}
                                                onClick={() => {
                                                    setActiveSubTab(child.id);
                                                    if (child.children) {
                                                        setActiveSubSubTab(child.children[0].id);
                                                    } else {
                                                        setActiveSubSubTab(null);
                                                    }
                                                }}
                                                className={`text-[12px] font-bold whitespace-nowrap transition-colors
                                                    ${isActive
                                                        ? 'text-brand-primary border-b border-brand-primary'
                                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                                    }`}
                                            >
                                                {child.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })()}

                        {/* 第 4 層: 曾孫項目 (GrandChildren) - 例如毛利趨勢、EPS走勢 */}
                        {(() => {
                            const currentGroup = SIDEBAR_GROUPS.find(g => g.id === activeGroup);
                            const currentItem = currentGroup?.items.find(i => i.id === activeTab);
                            const currentChild = currentItem?.children?.find(c => c.id === activeSubTab);
                            if (!currentChild || !currentChild.children || currentChild.children.length === 0) return null;

                            return (
                                <div className="flex overflow-x-auto hide-scrollbar px-8 py-1.5 gap-3 bg-slate-50/30 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800/20 items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentChild.label}</span>
                                    <div className="h-3 w-px bg-slate-200 dark:bg-slate-700"></div>
                                    {currentChild.children.map(gc => {
                                        const isActive = activeSubSubTab === gc.id;
                                        return (
                                            <button
                                                key={gc.id}
                                                onClick={() => setActiveSubSubTab(gc.id)}
                                                className={`text-[11px] font-semibold whitespace-nowrap transition-colors px-2 py-0.5 rounded
                                                    ${isActive
                                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                    }`}
                                            >
                                                {gc.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })()}

                    </div>

                    {/* ─── 右側內容區 ─── */}"""

content = nav_regex.sub(top_nav_new, content)

# 7. Update flex direction in Main Body
main_body_old = """                {/* Main body: Sidebar + Content */}
                <div className="flex flex-1 overflow-hidden">"""
main_body_new = """                {/* Main body: Top Nav + Content */}
                <div className="flex flex-col flex-1 overflow-hidden w-full">"""
content = content.replace(main_body_old, main_body_new)

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated successfully")
