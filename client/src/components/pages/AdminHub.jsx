import { useState } from 'react';
import { Users, Sparkles, Server, Key } from 'lucide-react';
import AdminUserManagement from './AdminUserManagement';
import AIPromptManager from './AIPromptManager';
import MonitorPage from './MonitorPage';
import AdminApiKeys from './AdminApiKeys';

export default function AdminHub({ user, isCloudDeployment }) {
    const [activeTab, setActiveTab] = useState('users');

    const tabs = [
        { id: 'users', label: '使用者管理', icon: Users, show: user?.role === 'admin' },
        { id: 'prompts', label: 'AI 提示詞', icon: Sparkles, show: user?.role === 'admin' },
        { id: 'apikeys', label: 'API 金鑰', icon: Key, show: user?.role === 'admin' },
        { id: 'monitor', label: '系統監控', icon: Server, show: !isCloudDeployment },
    ].filter(t => t.show);

    return (
        <div className="space-y-6">
            {/* Admin Hub Navigation */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 flex gap-2 overflow-x-auto shadow-sm">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-300 ${
                                isActive 
                                    ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'users' && <AdminUserManagement />}
                {activeTab === 'prompts' && <AIPromptManager />}
                {activeTab === 'apikeys' && <AdminApiKeys />}
                {activeTab === 'monitor' && <MonitorPage />}
            </div>
        </div>
    );
}
