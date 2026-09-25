# GiraTrip (記啦旅) 生產上線與 0 元部署指南 (DEPLOYMENT RUNBOOK)

> **架構目標**：全月維護營運費用 **NT$ 0 元**，享有全域邊緣 CDN 加速、即時多裝置資料庫同步與自動免費 SSL 憑證。

---

## 步驟一：本地啟動與測試 (Local Development)

在本地終端機中執行：

```bash
# 啟動本地 Vite 開發伺服器
npm run dev

# 進行生產打包驗證
npm run build
```

---

## 步驟二：GitHub 託管代碼 (GitHub Repository)

1. 在 [GitHub](https://github.com/new) 上建立一個新的儲存庫（例：`giratrip-travel-app`，設為 Private 或 Public 皆可）。
2. 在本機專案目錄下執行以下指令：

```bash
git init
git add .
git commit -m "feat: initial production-ready release of GiraTrip (v1.0.0)"
git branch -M main
git remote add origin https://github.com/<您的GitHub帳號>/giratrip-travel-app.git
git push -u origin main
```

*(注意：因 `.gitignore` 已設定，您的 `.env` 機密檔案將絕對不會被推送到 GitHub)*

---

## 步驟三：Google Firebase Firestore 設定 (0元動態資料庫)

若您希望在不同手機或旅伴開啟 Web App 時即時連線更新帳目：

1. 前往 [Google Firebase Console](https://console.firebase.google.com/)。
2. 點擊「新增專案」，輸入專案名稱（例：`giratrip-app`）。
3. 建立後，點擊左側「**Firestore Database**」➔「建立資料庫」➔ 選擇伺服器位置（建議選擇 `asia-east1 (台灣)` 或 `asia-northeast1 (東京)`）。
4. 在「規則 (Rules)」頁籤中，貼上以下安全規則以允許讀寫旅行帳目：
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /trips/{tripId} {
         allow read, write: if true;
         match /expenses/{expenseId} {
           allow read, write: if true;
         }
       }
     }
   }
   ```
5. 點擊專案設定（齒輪圖標）➔「一般」➔「您的應用程式」➔ 點擊 Web 圖標 `</>` 註冊應用程式。
6. 複製產生的 `firebaseConfig`（包含 `apiKey`, `projectId`, `appId` 等），您可直接在 GiraTrip App 的「設定」頁面中貼上，或作為環境變數設定。

---

## 步驟四：Google Sheets 靜態行程發布 (Google Sheets Integration)

若要透過 Google 試算表編輯行程並讓 App 一鍵同步：

1. 在 Google 試算表中建立欄位表頭：
   `Day, Time, Title, Location, Category, Notes, GoogleMaps, Instagram, PDF`
2. 填寫行程資料，在 `GoogleMaps`、`Instagram`、`PDF` 欄位填入對應的 URL。
3. 點選試算表功能表：**「檔案」➔「共用」➔「發布到網路」**。
4. 在發布彈窗中，將格式由「網頁」改選為 **「逗號分隔值 (.csv)」**，然後點擊「發布」。
5. 複製發布後的網址，貼入 GiraTrip 行程頁面的「同步試算表」輸入框，即可隨時一鍵下載快取至手機本地！

---

## 步驟五：Cloudflare Pages 一鍵自動上線 (100% 免費託管)

Cloudflare Pages 提供無限流量、台灣 CDN 邊緣加速與自動免費 HTTPS：

1. 前往 [Cloudflare 儀表板](https://dash.cloudflare.com/) ➔ 點擊左側「**Workers 和 Pages**」➔「**建立應用程式**」➔ 切換至「**Pages**」分頁。
2. 點擊「**連線至 Git**」並選取您剛才推送的 GitHub 儲存庫 `giratrip-travel-app`。
3. 配置建置設定 (Build Settings)：
   * **框架預設 (Framework preset)**：`Vite`
   * **建置指令 (Build command)**：`npm run build`
   * **建置輸出目錄 (Build output directory)**：`dist`
4. （可選）在「環境變數 (Environment variables)」中填入：
   * `VITE_FIREBASE_API_KEY`
   * `VITE_FIREBASE_PROJECT_ID`
   * `VITE_FIREBASE_APP_ID`
   * `VITE_GEMINI_API_KEY`
5. 點擊「**儲存並部署 (Save and Deploy)**」！
6. 約 40 秒後即可取得正式上線網址（例：`https://giratrip-travel-app.pages.dev`）。在手機瀏覽器開啟後，可點擊「分享 ➔ 加入主畫面」，即可像原生 App 一樣全螢幕流暢使用！
