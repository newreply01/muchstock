import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 預設備用語系與翻譯資源
const resources = {
  'zh-TW': {
    translation: {
      "app": {
        "title": "MUCH Stock",
        "marketStatus": "市場狀態"
      },
      "nav": {
        "market": "市場總覽",
        "screener": "智能選股",
        "trading": "交易中心",
        "stockDetail": "個股分析",
        "news": "新聞資訊"
      }
    }
  },
  'en-US': {
    translation: {
      "app": {
        "title": "MUCH Stock",
        "marketStatus": "Market Status"
      },
      "nav": {
        "market": "Market",
        "screener": "Screener",
        "trading": "Trading",
        "stockDetail": "Stock",
        "news": "News"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh-TW', // 預設語言
    fallbackLng: 'zh-TW',
    interpolation: {
      escapeValue: false // React 已經預防 XSS
    }
  });

export default i18n;
