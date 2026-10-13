# 本機驗證結果

2026-10-13 執行：`node --test --test-isolation=none tests/*.test.js`

結果：9 passed、0 failed、0 skipped。

1. Health 不需要憑證或外部設定。
2. 缺少與錯誤 API 憑證皆拒絕，沒有呼叫 GAS。
3. API 串接實際 GAS 原始碼與模擬 Google 服務，新增、查詢、重複、衝突符合預期；僅寫入一次。
4. GAS 驗證共享密鑰、輸入與表頭；檢查/寫入/flush 在鎖內，鎖忙不寫入，異常釋鎖。
5. 上游連線、HTTP、JSON 與格式錯誤皆回通用 502，不轉送密鑰。
6. 上游逾時回 504。
7. ContentService 模擬重新導向使用無憑證 GET，拒絕其他主機。
8. 拒絕 query、不合法輸入、過大本文、錯誤方法與設定。
9. 啟動本機 HTTP server，透過真實 HTTP 驗證路由、授權與 POST 本文解析。

預設 Node 測試模式受 Sandbox 子程序限制回報 `spawn EPERM`；改用同程序模式通過。Google 網路、Vercel 執行環境及真實 LockService 並行互斥尚未驗證；人工步驟見 README。沒有部署或使用正式資料。
