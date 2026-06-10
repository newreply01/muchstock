# 專案開發與架構更新紀錄 (Development & Architecture Log)

## 最近更新：大規模架構重構與基礎設施優化 (2026-06)

為了提升台股篩選器 (stock-screener) 的長期可維護性、安全性與效能，我們進行了一系列深度的架構重構。以下為目前的開發進度與核心設計變更：

### 1. 核心效能突破：批量寫入 (Bulk Insert)
過去每日盤後更新行情時（如 `twse_fetcher.js`），採用的是 `for` 迴圈內逐筆發送 `INSERT` 查詢，對於超過 2000 檔股票的台股市場而言，會對 PostgreSQL 連線池造成極大負載並拉長同步時間。
- **架構更新**：在 `server/db.js` 新增了 `executeBatch(tableName, columns, rowsData, conflictClause)` 封裝函式，能將數千筆資料在應用程式端打包為單一 SQL 查詢送出。這將原本的寫入時間從分鐘級縮短至秒級以內。

### 2. 安全性與標準化：API 防禦與回應格式
- **SQL 防注入 (Anti-Injection)**：原本 `server/routes/screener.js` 中的排序 (`sort_by`) 允許前端傳入任意字串拼接進 SQL，存在極大風險。現已導入嚴格的白名單 (Whitelist Validation) 機制。
- **統一的回應介面**：新建 `server/utils/response.js`，將所有路由的 JSON 回傳格式統一化，降低前端串接與錯誤處理的成本。

### 3. 排程與系統監控 (Observability)
過去 `node-cron` 背景排程在失敗或卡住時缺乏紀錄，導致難以追查。
- **持久化排程日誌**：在資料庫建立 `scheduler_history` 表格。修改了 `scheduler.js` 的 `runTaskSafely`，每次任務的開始時間、結束時間、成功與否及錯誤訊息均會寫入 DB。
- **PM2 進程守護**：更新 `ecosystem.config.js`，將 `update_ai_reports.js` 等重要背景任務轉交 PM2 監管，具備自動重啟與日誌輪替 (Log Rotation) 功能。

### 4. 目錄結構大掃除與封裝 (Clean Architecture)
- **測試腳本歸檔**：將散落在根目錄及 `server/` 目錄下的數十個 `debug_*.js`, `test_*.js`, `check_*.js` 等開發測試用腳本，集中歸檔至 `server/scripts/dev/`。
- **Service 層抽象 (進行中)**：為了解除路由層 (`routes`) 與資料庫操作的過度耦合，已開始建立 `server/services/` 目錄，規劃將包含龐大商業邏輯的 AI 生成與選股篩選器封裝為獨立模組（如 `screenerService.js`）。

### 5. 前端架構優化
- 前端 (React/Vite) 確認已採用 `React.lazy` 與 `Suspense` 進行路由層級的 Code-Splitting，確保龐大的圖表套件與資料處理邏輯不會影響首頁的載入效能。

---

## 未來技術債清理方向 (Next Steps)
1. **完成 AI 模組拆分**：將 800 行以上的 `ai_service.js` 拆分為 `keyManager`, `ragService`, `promptBuilder`, `reportGenerator`。
2. **FinMind 抓取器批量化**：將 `finmind_fetcher.js` 中的 10 多種財報/籌碼抓取 API 全面改寫為 `executeBatch` 寫入。
3. **導入 Redis 快取層**：降低高頻 API (`/api/screen`, `/api/health-check-ranking`) 對 PostgreSQL 的讀取壓力。
