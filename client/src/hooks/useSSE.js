import { useState, useEffect, useRef } from 'react';

/**
 * useSSE Hook
 * 建立 Server-Sent Events 連線以訂閱即時股票行情
 * @param {string[]} symbols 欲訂閱的股票代碼陣列 (例如: ['2330', 'TAIEX'])
 * @returns {object} { data, connectionStatus, error }
 * - data: 是一個 Key-Value 物件，以 symbol 為 key，對應最新的行情資料
 * - connectionStatus: 'connecting', 'connected', 'disconnected', 'error'
 */
export function useSSE(symbols = []) {
    const [data, setData] = useState({});
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [error, setError] = useState(null);
    const eventSourceRef = useRef(null);

    // 當 symbols 陣列改變時（確保順序無關）重新連線
    const symbolsKey = [...symbols].sort().join(',');

    useEffect(() => {
        if (!symbolsKey) {
            setConnectionStatus('disconnected');
            return;
        }

        setConnectionStatus('connecting');
        setError(null);

        // 建立 SSE 連線
        const url = `/api/stream/realtime?symbols=${symbolsKey}`;
        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.onopen = () => {
            setConnectionStatus('connected');
        };

        es.onmessage = (event) => {
            try {
                if (event.data === ':') return; // Heartbeat
                const parsedData = JSON.parse(event.data);
                
                // parsedData is expected to be an array of updates
                if (Array.isArray(parsedData)) {
                    setData(prev => {
                        const newData = { ...prev };
                        let hasChanges = false;
                        
                        parsedData.forEach(tick => {
                            if (tick && tick.symbol) {
                                // 只有當資料確實有更新時才觸發 React re-render
                                if (JSON.stringify(newData[tick.symbol]) !== JSON.stringify(tick)) {
                                    newData[tick.symbol] = tick;
                                    hasChanges = true;
                                }
                            }
                        });
                        
                        return hasChanges ? newData : prev;
                    });
                }
            } catch (err) {
                console.error('[useSSE] 解析資料錯誤:', err);
            }
        };

        es.onerror = (err) => {
            console.error('[useSSE] 連線發生錯誤:', err);
            setConnectionStatus('error');
            setError('SSE Connection Error');
            // 瀏覽器預設會嘗試重新連線
        };

        return () => {
            es.close();
            setConnectionStatus('disconnected');
        };
    }, [symbolsKey]);

    return { data, connectionStatus, error };
}
