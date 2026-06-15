import { useState, useEffect } from 'react'
import { getNews } from '../../utils/api'
import { Newspaper, ChevronRight, Clock, Image as ImageIcon } from 'lucide-react'

const NEWS_CATEGORIES = [
    { id: 'headline', label: '熱門頭條' },
    { id: 'tw_stock', label: '台股新聞' },
    { id: 'us_stock', label: '美股雷達' },
    { id: 'tech', label: '科技產業' },
    { id: 'wd_macro', label: '全球時事' }
]

export default function NewsBoard() {
    const [activeTab, setActiveTab] = useState('headline')
    const [news, setNews] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const fetchNews = async () => {
            setLoading(true)
            try {
                const data = await getNews(activeTab)
                setNews(data)
            } catch (err) {
                console.error('Failed to fetch news:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchNews()

        // 每 5 分鐘自動更新一次前端顯示 (後端是每小時抓)
        const interval = setInterval(fetchNews, 300000)
        return () => clearInterval(interval)
    }, [activeTab])

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        const now = new Date()
        const diff = (now - date) / 1000 // seconds

        if (diff < 60) return '剛剛'
        if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`
        if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`
        return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-brand-primary rounded flex items-center justify-center">
                        <Newspaper className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-white font-bold text-base tracking-tight">即時財經快訊</span>
                </div>
                <div className="flex bg-slate-800 rounded-lg p-0.5">
                    {NEWS_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveTab(cat.id)}
                            className={`px-3 py-1.5 text-sm font-bold rounded-md transition-all ${activeTab === cat.id
                                ? 'bg-brand-primary text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* News List */}
            <div className="flex-grow overflow-y-auto p-0">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
                        <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-medium">正在載入最新消息...</span>
                    </div>
                ) : news.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
                        <Newspaper className="w-8 h-8 opacity-20" />
                        <span className="text-xs font-medium">目前尚無此分類新聞</span>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {news.map((item) => (
                            <a
                                key={item.news_id}
                                href={`https://news.cnyes.com/news/id/${item.news_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group block p-4 hover:bg-slate-50 dark:bg-slate-800 transition-colors"
                            >
                                <div className="flex gap-4">
                                    {/* Image Thumbnail */}
                                    <div className="flex-shrink-0 w-24 h-16 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden relative">
                                        {item.image_url ? (
                                            <img
                                                src={item.image_url}
                                                alt={item.title}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'flex';
                                                }}
                                            />
                                        ) : null}
                                        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800" style={{ display: item.image_url ? 'none' : 'flex' }}>
                                            <ImageIcon className="w-6 h-6 text-slate-300" />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-grow min-w-0">
                                        <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-snug mb-2 group-hover:text-brand-primary transition-colors line-clamp-2">
                                            {item.title}
                                        </h4>
                                        <div className="flex items-center gap-3 text-sm text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatDate(item.publish_at)}
                                            </span>
                                            {item.summary && (
                                                <span className="truncate max-w-[200px] hidden sm:block opacity-70">
                                                    {item.summary}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-primary self-center opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0" />
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 text-center">
                <a href="https://news.cnyes.com/" target="_blank" className="text-xs font-bold text-slate-400 hover:text-brand-primary transition-colors flex items-center justify-center gap-1">
                    查看更多MuchStock新聞 <ChevronRight className="w-4 h-4" />
                </a>
            </div>
        </div>
    )
}
