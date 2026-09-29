# 🦌 GiraTrip (記啦旅) - Google Apps Script (GAS) 雲端部署教學

這份 Google Apps Script (GAS) 將您的 Google 試算表直接升級為 **GiraTrip 專屬雲端 API 後端**！

---

## 🌟 核心特色

1. **🛡️ 角色權限分層 (RBAC)**：
   - 區分 **管理者 (Admin)** 與 **一般旅伴 (User)**。
   - Firebase 金鑰與 Gemini API Key 存放於「權限與金鑰」工作表（或 Script Properties）。
   - 只有輸入正確 Admin PIN（預設 `giratrip888`）才能取得敏感金鑰；一般旅伴呼叫 API 時**絕不外洩任何金鑰**！
2. **📁 一鍵自動建立工作表**：
   - 試算表自帶選單：`🦌 GiraTrip 記啦旅 ➔ 一鍵初始化/重置所有工作表範本`。
   - 自動生成高山冷杉綠風格標題列、9 欄位規範、分類下拉選單驗證與範例東京賞櫻行程。
3. **📊 雙向資料傳輸**：
   - `doGet`：高速讀取行程表 JSON，離線快取於手機端。
   - `doPost`：支援將 Web App 記帳紀錄即時同步歸檔回 Google 試算表的「記帳歸檔」工作表。

---

## 🚀 部署 4 步驟（3 分鐘搞定）

### 步驟 1：建立或開啟 Google 試算表
1. 前往 [Google 雲端硬碟](https://drive.google.com/)，建立一份新的 Google 試算表（或開啟現有試算表）。
2. 將試算表命名為例如：`GiraTrip 旅程資料庫`。

### 步驟 2：貼上 Apps Script 程式碼
1. 點擊頂部功能表的 **「擴充功能」 ➔ 「Apps Script」**。
2. 刪除編輯器中的預設程式碼，將 [`google-apps-script/Code.js`](./Code.js) 的完整內容複製並貼入編輯器中。
3. 點擊上方的 **「儲存」圖示**（或按 `Ctrl+S` / `Cmd+S`）。

### 步驟 3：執行一鍵初始化（產生工作表結構）
1. 在編輯器上方函式下拉選單中選擇 **`setupGiraTripSheets`**，點擊 **「執行」**。
2. 首次執行時 Google 會跳出「需要授權」提示，點擊 **「審查權限」 ➔ 選擇您的 Google 帳號 ➔ 點擊「進階」 ➔ 點擊「前往...（不安全）」 ➔ 點擊「允許」**。
3. 執行完成後，切回您的 Google 試算表，您會看到已自動建立好 3 個漂亮的工作表：
   - 🟢 **`行程清單`**：已設定 9 欄位與分類下拉選單。
   - 🔒 **`權限與金鑰`**：可修改管理者密碼（預設 `giratrip888`）、填寫 Firebase 與 Gemini Key。
   - 📊 **`記帳歸檔`**：隨時備份旅程支出。

### 步驟 4：發布為網頁應用程式 (Web App)
1. 在 Apps Script 編輯器右上角，點擊 **「部署 (Deploy)」 ➔ 「新增部署作業 (New deployment)」**。
2. 點擊左側齒輪 ⚙️，選擇 **「網頁應用程式 (Web app)」**。
3. 填寫部署設定（**極重要！**）：
   - **說明**：`GiraTrip Backend v1`
   - **執行身分**：`我 (Me)`
   - **誰可以存取**：**`所有人 (Anyone)`** 👈 **請務必選 Anyone，手機 App 才能跨網域讀取！**
4. 點擊 **「部署」**。
5. 複製產生的 **網頁應用程式網址 (Web app URL)**，格式類似：
   ```text
   https://script.google.com/macros/s/AKfycbx.../exec
   ```

---

## 📱 在 GiraTrip Web App 中使用

1. 打開 GiraTrip Web App。
2. 切換至 **「行程」分頁** ➔ 點擊右上角 **「同步 Sheets」**。
3. 將剛才複製的 GAS 網址貼入輸入框中，點擊 **「立即下載同步」**！
4. 系統會自動辨識並由 GAS API 抓取乾淨的結構化資料，並快取至手機端離線使用！

---

## 🔐 管理者權限解鎖方式

在試算表中的 **「權限與金鑰」** 工作表：
- `AdminPin`：預設為 `giratrip888`（您可以改成任何您自訂的密碼）。
- `FirebaseApiKey` / `GeminiApiKey`：只有在 GiraTrip Web App 設定頁面輸入該 PIN 碼時，才會透過安全 API 讀取並配置；一般旅伴點進 App 完全無法取得敏感金鑰！
