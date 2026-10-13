# Sprint 1：隔離雲端 API POC

僅技術驗證；不含正式登入，不可用於正式員工驗證。沒有部署，也沒有連線正式或測試 Google Sheets。Mock 通過不代表 Google 雲端連線成功。

## 放置與本機執行

將本 `sprint1-poc/` 目錄整個放進現有專案根目錄（與 `backend/` 同層），不覆蓋任何原有檔案。本交付為新增目錄，未解壓或修改原專案。實際提供附件為 `人員認證系統_Step2_管理者導覽UI修復.zip`；未取得需求所列 `(2).zip`，不宣稱核對過該版本。

使用 Node.js 22 以上，不需 npm install 或全域套件：

```powershell
cd sprint1-poc
node --test tests/*.test.js
Copy-Item .env.example .env
# 在本機 .env 設定下述三項伺服器端變數
npm start
```

未設定憑證仍可測 `http://127.0.0.1:3000/api/health`。自動測試使用 Node VM 執行同一份 `gas/Code.gs`，以記憶體模擬 Sheets/LockService，不連 Google。

本次 Sandbox 禁止建立子程序（預設測試模式回報 `spawn EPERM`），已使用 `node --test --test-isolation=none tests/*.test.js` 完成全部 9 項測試；若遇相同限制可使用此指令（需支援此選項的 Node 版本）。未安裝任何套件。

## 環境變數

| 位置 | 名稱 | 用途 |
|---|---|---|
| Node / Vercel | `TEST_API_TOKEN` | 測試客戶端 Authorization Bearer 憑證 |
| Node / Vercel | `GAS_URL` | 獨立測試 GAS 的 `https://script.google.com/macros/s/.../exec`，不得附加 query |
| Node / Vercel、GAS Script Properties | `GAS_SHARED_SECRET` | 兩端一致的共享密鑰，必須與 API token 不同 |
| GAS Script Properties | `TEST_SHEET_ID` | 僅新建測試試算表的 ID，不傳給 Node 或瀏覽器 |

使用密碼管理器分別產生兩個高強度隨機值。所有值留空於範例，不提交 `.env`，不要設 `PUBLIC_` / `NEXT_PUBLIC_` 等公開變數。API token 的伺服器預期值僅由環境變數讀取；測試者使用受控 HTTP 工具從其環境提供 Bearer header，不將 token 嵌入前端。不得把任何密鑰放 URL、Log 或截圖。程式不記錄 request/response 或例外內容。

## API 協定

- `GET /api/health`：200，不需憑證且不存取資料。
- `GET /api/test-records`：需 `Authorization: Bearer <TEST_API_TOKEN>`，200 `{ok:true,code:"OK",records:[...]}`。
- `POST /api/test-records`：同上，Content-Type `application/json`。本文僅含 `request_id`、`employee_id`、`certification_id`，例如 `{"request_id":"test-request-1","employee_id":"TEST_EMP_001","certification_id":"TEST_CERT_001"}`。
- ID 限 1–64 個英數、底線、連字號，首字需英數；不接受額外欄位或公式。輸入上限 4096 bytes。
- 新建 201 `CREATED`；同 ID 同內容 200 `DUPLICATE` 並回原紀錄；同 ID 異內容 409 `REQUEST_ID_CONFLICT`。
- 缺少或錯誤憑證 401；輸入錯誤 400；缺設定 503；上游失敗 502；鎖忙 503；逾時 504。回應不轉送上游例外或額外欄位。

新增的 `record_id` 由 GAS UUID 產生，`created_at` 為伺服器 UTC ISO 字串。所有資料 API 拒絕 query；GAS 查詢也透過 POST 本文驗證共享密鑰。ContentService 的允許重新導向僅以無憑證 GET 取回結果。逾時或網路中斷可能已寫入，重試必須沿用原 `request_id` 與內容。

## 人工建立測試環境（尚未執行）

1. 新建獨立空白 Google Sheet，不含正式資料，建立工作表 `Sprint1_TestRecords`。第一列 A1:E1 必須依序為 `request_id`、`record_id`、`employee_id`、`certification_id`、`created_at`；將 A:E 設為純文字，勿新增其他有值欄位。
2. 建立獨立 Apps Script，貼入 `gas/Code.gs`。在專案設定的 Script Properties 設 `TEST_SHEET_ID`、`GAS_SHARED_SECRET`，不要寫入程式碼。
3. 人工將此測試 GAS 部署為 Web App，以擁有者執行；允許伺服器無 Google 互動登入呼叫（通常為 Anyone）。資料仍必須通過共享密鑰驗證。若 Workspace 政策不允許，請先處理測試帳號政策；不要改用正式試算表或移除驗證。複製 `/exec` URL 到本機 `.env`，授權僅限此測試用途。
4. 先在本機經 API 測一次新增、讀取與重複提交，確認 Sheet 僅一列資料。GAS 更新需發佈新的部署版本。
5. 如後續要驗證 Vercel，人工建立**獨立 POC 專案**，Framework 選 Other，Root Directory 設為 `sprint1-poc`，不設建置指令或靜態輸出目錄，使用 Node.js 22+；設定三項 Node 環境變數。根目錄 `api/` 為 Functions 入口。僅使用該 POC 的測試部署網址，不連接正式網域，不改既有 Vercel 專案。本次未執行此步。

## 尚需實機驗證

- 實際 Vercel → GAS → 測試 Sheets 授權、ContentService 重新導向與讀寫。
- 對同一新 `request_id` 與相同內容同時送出 10 個 POST；應只有一個 `CREATED`，其餘 `DUPLICATE`（鎖忙或逾時可沿用同 ID 重試）；在 Sheet 確认只有一筆、record_id 一致。另以同 ID 異內容確認 409 且無新增。
- 模擬回應丟失後重試相同 ID，確認只有一筆。真實 LockService 跨執行個體互斥仍需上述並行實測；本機只驗證鎖內檢查/寫入/flush、釋鎖及鎖忙分支。
- 缺少/錯誤 API token 不能讀寫；直接 GAS POST 缺少/錯誤共享密鑰也不能讀寫。不要把真實密鑰放 URL 測試，避免平台存取紀錄收錄。
- 確認 HTTP 回應不含密鑰/Sheet ID，停止 GAS 或撤回測試授權時僅回通用錯誤。此 POC 不提供正式驗證、分頁或大量資料服務。

官方參考：[Vercel Node Functions](https://vercel.com/docs/functions/runtimes/node-js)、[GAS Web Apps](https://developers.google.com/apps-script/guides/web)、[LockService](https://developers.google.com/apps-script/reference/lock/)。
