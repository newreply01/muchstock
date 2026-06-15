import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';

const BrokerTracking = ({ symbol }) => {
  const [topTraders, setTopTraders] = useState({ buying: [], selling: [] });
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [tradersRes, trendRes] = await Promise.all([
          fetch(`/api/broker/top-traders/${symbol}`).then(r => r.json()),
          fetch(`/api/broker/major-trend/${symbol}`).then(r => r.json())
        ]);
        setTopTraders(tradersRes);
        setTrend(trendRes);
      } catch (err) {
        console.error('Failed to fetch broker data:', err);
      } finally {
        setLoading(false);
      }
    };
    if (symbol) fetchData();
  }, [symbol]);

  if (loading) return <div className="p-8 text-center">載入中...</div>;

  return (
    <div className="space-y-8 p-4">
      {/* 1. 主力進出趨勢圖 */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm">
        <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">主力進出趨勢 (前 15 大分點淨買賣)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(val) => val.split('T')[0].substring(5)} />
              <YAxis />
              <Tooltip labelFormatter={(label) => label.split('T')[0]} />
              <Legend />
              <ReferenceLine y={0} stroke="#000" />
              <Bar 
                dataKey="major_net_buy" 
                name="主力淨買賣" 
                fill={(entry) => entry.major_net_buy > 0 ? '#ef4444' : '#22c55e'} 
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. 前 15 大買賣分點 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 買方 */}
        <div className="bg-red-50 p-6 rounded-xl border border-red-100">
          <h3 className="text-lg font-bold mb-4 text-red-700">🏆 前 15 大買超分點</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-red-200">
                  <th className="py-2 text-gray-600">券商分點</th>
                  <th className="py-2 text-red-600 text-right">淨買超</th>
                </tr>
              </thead>
              <tbody>
                {topTraders.buying.map((item, idx) => (
                  <tr key={idx} className="border-b border-red-100 last:border-0 hover:bg-red-100/50">
                    <td className="py-2 font-medium text-gray-800 dark:text-gray-100">{item.broker}</td>
                    <td className="py-2 text-right font-bold text-red-600">
                      {Math.round(item.net_buy).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {topTraders.buying.length === 0 && (
                  <tr><td colSpan="2" className="py-8 text-center text-gray-500">暫無買超數據</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 賣方 */}
        <div className="bg-green-50 p-6 rounded-xl border border-green-100">
          <h3 className="text-lg font-bold mb-4 text-green-700">📉 前 15 大賣超分點</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-green-200">
                  <th className="py-2 text-gray-600">券商分點</th>
                  <th className="py-2 text-green-600 text-right">淨賣超</th>
                </tr>
              </thead>
              <tbody>
                {topTraders.selling.map((item, idx) => (
                  <tr key={idx} className="border-b border-green-100 last:border-0 hover:bg-green-100/50">
                    <td className="py-2 font-medium text-gray-800 dark:text-gray-100">{item.broker}</td>
                    <td className="py-2 text-right font-bold text-green-600">
                      {Math.round(Math.abs(item.net_buy)).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {topTraders.selling.length === 0 && (
                  <tr><td colSpan="2" className="py-8 text-center text-gray-500">暫無賣超數據</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrokerTracking;
