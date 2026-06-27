# 台股篩選器 (Stock Screener)

這是一個基於 Node.js 與 React 的台股篩選器系統，整合了 FinMind Data 與 TWSE 資料來源，並提供即時行情監控與自動化資料同步功能。

## 1. 專案架構

-   **Backend (Express)**: 位於 `server/` 目錄。
    -   提供 API 服務（選股、監控、即時查詢等）。
    -   包含 `scheduler.js` 排程系統，自動執行資料抓取與同步。
-   **Frontend (React + Vite + React Router)**: 位於 `client/` 目錄。
    -   提供儀表板、選股工具及系統監控介面。
    -   生產環境下由後端伺服器併行服務。
    -   支援 URL 路由（可直接透過網址進入各功能頁面）。
-   **Database (PostgreSQL)**: 儲存 K 線、三大法人、融資券、新聞與健診分數。

## 2. 通訊埠 (Ports) 配置

-   **生產環境/監控**: 預設監聽在 `31000` 埠。
-   **前端開發模式 (Vite)**: 預設監聽在 `32000` 埠。
-   **資料庫**: 預設監聽在 `5533` 埠。

## 3. 🚀 從零開始（開發者 Onboarding）

### 前置需求

-   WSL2 (ubuntu_dv)
-   Node.js v25.8.1 (使用 nvm 安裝)
-   PostgreSQL 執行於 5533 埠
-   `.env` 檔案（參考下方範例）

### 環境設定

```bash
# 1. 克隆專案
cd /home/xg && git clone <repo-url> stock-screener
cd stock-screener

# 2. 切換 Node 版本
nvm use  # 讀取 .nvmrc (v25.8.1)

# 3. 安裝後端依賴
npm install

# 4. 安裝前端依賴
npm install --prefix client

# 5. 設定環境變數（複製範本後修改）
cp .env.example .env
# 編輯 .env，填入以下必要欄位：
#   FINMIND_TOKENS=<你的 FinMind API Token>
#   JWT_SECRET=<至少 32 字元的安全亂數>
#   DB_PASSWORD=<你的資料庫密碼>
```

### .env 範本

```env
FINMIND_TOKENS=<your-token>
PORT=31000
DB_HOST=localhost
DB_USER=postgres
DB_NAME=stock_screener
DB_PASSWORD=<your-password>
DB_PORT=5533
ENABLE_CRAWLER=true
TZ=Asia/Taipei
# 安全金鑰（必填，至少 32 字元）
JWT_SECRET=<generate-with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
```

### 啟動與部署 (PM2)

本專案推薦使用 PM2 進行程序管理，可確保服務在崩潰時自動重啟，並支援系統開機自啟動。

#### 1. 啟動服務
```bash
cd /home/xg/stock-screener
# 使用預定義配置啟動 (Port 31000)
npx pm2 start ecosystem.config.cjs
```

#### 2. 設定開機自動啟動 (Auto-startup)
由於 WSL 已開啟 `systemd` 支援，可依照以下步驟設定：
1. **產生啟動腳本**：`npx pm2 startup systemd -u xg --hp /home/xg`
2. **執行指令**：複製並執行上述指令產生的 `sudo`開頭指令。
3. **保存當前列表**：`npx pm2 save` (此步驟會將當前運行的程序保存至 `~/.pm2/dump.pm2`)。

#### 3. 常用 PM2 指令
| 指令 | 說明 |
|---|---|
| `npx pm2 list` | 查看當前所有程序狀態 |
| `npx pm2 logs` | 查看所有程序日誌 (或 `npx pm2 logs stock-server`) |
| `npx pm2 restart all` | 重啟所有服務 |
| `npx pm2 stop all` | 停止所有服務 |
| `npx pm2 delete all` | 刪除所有程序列表 |

### 啟動開發環境 (Vite)
若需進行前端即時開發，請執行：
```bash
npm run dev      # 啟動後端 (31000) + 前端開發伺服器 (32000)
```


### 建置前端

```bash
npm run build    # 打包 React 前端到 client/dist/
```

## 4. 存取方式 (URLs)

服務啟動後，可由 Windows 瀏覽器訪問：

| 路徑 | 功能 |
|---|---|
| `http://localhost:31000/` | 大盤概覽 |
| `http://localhost:31000/screener` | 股票篩選器 |
| `http://localhost:31000/stock/2330` | 台積電個股詳情 |
| `http://localhost:31000/portfolio` | 投資組合（需登入） |
| `http://localhost:31000/watchlist` | 自選股清單（需登入） |
| `http://localhost:31000/monitor` | 系統監控 |
| `http://localhost:31000/admin/users` | 使用者管理（Admin） |
| `http://localhost:31000/api/health` | 後端 API 健康狀態 |

## 5. 執行測試

後端已導入 Jest 與 Supertest 框架來進行自動化 API 測試：

```bash
cd /home/xg/stock-screener

# 執行所有後端測試
npm test

# 執行特定測試檔（例如 auth.test.js）
npx jest --testPathPattern='server/tests/auth.test.js'
```

## 6. 系統監控功能

您可以透過「系統監控」頁面即時查看：
- **服務狀態**: 資料庫與後端 API 是否正常。
- **資料同步進度**: 各項 FinMind 資料集的最後更新時間。
- **程式執行狀態**: 背景爬蟲與擷取程式的歷史執行紀錄。
- **資料寫入趨勢**: 近 14 天的資料抓取筆數統計。

## 7. 腳本工具說明

請參閱 [`server/scripts/README.md`](server/scripts/README.md) 了解各工具腳本的功能與使用方式。

## 8. 注意事項

-   **環境變數**: `.env` 必須包含 `JWT_SECRET`（強制要求，不可缺少）與 `FINMIND_TOKENS`。
-   **時區處理**: 系統核心邏輯已強制轉換為 `Asia/Taipei`（台灣時間）。
-   **Vercel 部署**: 支援 Vercel 雲端執行，請參考 `vercel.json` 配置。



## 10. 標的篩選邏輯 (Target Filtering)

為確保 AI 生成資源的有效利用與系統效能，本系統在執行「資料掃描」、「AI 報告生成」與「資料暫存」時，會遵循以下篩選規則：

-   **包含對象 (Include)**:
    -   **普通個股**: 代號為 4 位數純數字之股票（如 `2330`, `2454`）。
    -   **ETF**: 代號以 `00` 開頭之受益憑證（如 `0050`, `0056`, `00919`）。
-   **排除對象 (Exclude)**:
    -   **權證 / 認購售 (Warrants)**: 5 位數或 6 位數之衍生性金融商品。
    -   **可轉債 (CB)**: 代號末尾帶有英文字母或特殊格式。
    -   **大盤 / 各類指數**: 僅作為參考數據，不生成獨立 AI 報告。

此邏輯已整合至 `ai_generation_queue` 任務管理與資料庫清理腳本中。

## 11. AI 報告生成分層架構 (Tiered AI Model)

為了解決全市場 2,100+ 檔標的生成耗時問題，系統採用了 **「分級分流 (Tiering)」** 策略，自動優化運算資源分配：

### 分流規則 (Model Selection)
系統每日 22:30 初始化任務時，會依據當日 **成交量 (Volume)** 進行全市場排名：
- **全市場**: 自動分配給 Google Gemini API (`gemini-1.5-pro`) 模型。具備良好的生成速度與品質。

### 任務佇列機制 (Queue System)
- **資料表**: `ai_generation_queue`
- **狀態追蹤**: 支援 `pending` (待處理)、`processing` (處理中)、`completed` (已完成)、`failed` (失敗) 四種狀態。
- **斷點續傳**: 若系統異常重啟，Worker 會自動從最後一個 `pending` 任務繼續執行。

### 運行模式 (Worker Mode)
- **單線程常駐**: 為確保 GPU 顯存 (VRAM) 不溢出，`update_ai_reports.js` 預設以 **單執行緒 (-i 1)** 運行。
- **監控整合**: 任務進度會即時同步至「系統監控」面板，顯示當日已完成百分比與預計剩餘任務。

---
*最後更新日期: 2026-03-30*

## 12. 使用者驗證與信箱註冊系統 (User Authentication)

為確保系統安全性與防止惡意註冊，系統在「在地帳號註冊」流程中導入了 **電子信箱驗證 (Email Verification)** 機制。

### 驗證流程 (Verification Flow)
1. **註冊提交**: 使用者填寫 Email 與密碼，系統會即刻建立一個「未待核 (Unverified)」之帳號。
2. **寄送代碼**: 系統自動產生一組 **6 位數驗證碼**，透過 SMTP 寄送至使用者電子信箱。
3. **輸入代碼**: 使用者於 10 分鐘內輸入代碼，系統比對正確後會正式啟用帳號並核發專屬 JWT Token。

### 安全規範
- **代碼有效期**: 驗證代碼在寄送後 **10 分鐘內有效**，逾時需點擊「重新寄送」。
- **登入防護**: 未完成驗證之帳號將無法登入系統（API 會回傳 `needsVerification` 狀態碼）。
- **第三方登入 (Google)**: 透過 Google Sign-In 註冊者，因為其來源信箱已由 Google 驗證，系統會自動跳過驗證步驟直接啟用。

### 環境變數配置 (SMTP)
要正常啟用發信功能，請務必在 `.env` 中填入以下參數：
```env
# 郵件發送設定 (以 Gmail 為例)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=您的信箱位址
SMTP_PASS=您的應用程式專用密碼
SMTP_FROM_NAME=Stock Screener (系統名稱)
```
*註：若使用 Gmail，請先至 Google 帳戶設定啟用「兩步驟驗證」並產生「應用程式專用密碼」。*

## 13. 新聞情緒辨識與健檢引擎 (News Sentiment Engine v3.0)

系統具備對台股全市場（個股及 ETF）新聞內容進行「語義量化」的能力，並將其深度整合至健檢評分中。

### 核心功能
1. **全市場標點識別**: 自動辨識 **台灣個股 (4位數)** 及 **熱門 ETF (5-6位數)**。
2. **多股關聯技術**: 單一新聞提及多檔股票時，自動分離並產出各別的情緒指標。
3. **AI 語義分析**: 使用 Gemini API 進行利多/利空定性，產出 -1.0 至 +1.0 之情緒值。
4. **近期熱度匯總 (3天)**: AI 報表生成時，會彙整過去 **3 天** 內該個股的所有情緒紀錄。

## 14. 資料庫優化與生命週期管理 (Database Optimization & Data LCM)

為應對每日數百萬筆的即時行情數據，系統於 2026-05-02 導入了全新的資料庫管理架構：

### 📈 即時行情每日分割 (Daily Partitioning)
-   **對象**: `realtime_ticks` 資料表。
-   **機制**: 採用 PostgreSQL 原生分區，按日 (`trade_time`) 自動切分。
-   **優勢**:
    -   **高效寫入**: 每日數據寫入獨立分區，避免單一索引過大。
    -   **快速清理**: 過期數據可直接透過 `DROP TABLE` 移除，不消耗交易日誌空間。

### 🕒 資料生命週期管理 (Data LCM)
-   **核心指令**: `node server/scripts/data_lcm.js`
-   **自動化流程 (每日 08:30)**:
    1.  **自動建表**: 預先建立未來 7 天所需之 `realtime_ticks_YYYYMMDD` 分區。
    2.  **資料降階 (Downsampling)**: 將 7 天前的逐筆成交明細彙總為 **1 分鐘 K 線**，存入 `daily_prices_1m`。
    3.  **過期清理**:
        -   移除 14 天前的 `realtime_ticks` 原始明細分區。
        -   清理 `fm_*` 備份表中超過 30 天的舊資料。

---
*最後更新日期: 2026-05-02*

## 15. 架構現代化與 RAG 語意搜尋升級 (v4.0)

為了解決前後端架構過度耦合與 AI 報告深度問題，專案已於 2026-06-08 進行全面重構：

### 前端重構
- **狀態管理**: 捨棄複雜的 Context API，導入 Zustand 集中管理全域過濾與選股狀態。
- **資料獲取快取**: 導入 @tanstack/react-query，替換手動 API Fetch 邏輯，增加快取與背景更新能力。
- **SSE 即時推送**: 實作 Server-Sent Events 取代原本的短輪詢，實現「零延遲」盤中報價與儀表板實時跳動。

### 後端與資料庫升級
- **結構化日誌**: 導入 winston 紀錄分級 Log 至 logs/，大幅強化異常監控與追蹤能力。
- **API Key 健康度監控**: 於系統後台整合動態 API Key 的使用量、成功率、429 錯誤偵測與延遲追蹤。
- **Drizzle ORM 漸進導入**: 針對新聞模組導入型別安全的 Drizzle ORM，提升 Schema 管理與開發體驗。
- **pgvector 與 RAG 整合**:
  - 資料庫啟用 pgvector 擴充，為新聞表加入 ector(768) 欄位。
  - 使用 Gemini 進行文字向量化 (Embedding)，於 AI 報告生成時改用**餘弦相似度 (Cosine Similarity)** 取代傳統 ILIKE 搜尋。
  - 大幅提升重大事件關聯性檢索準確率，消弭 AI 幻覺。

---
*最後更新日期: 2026-06-08*
