/**
 * ==============================================================================
 * GiraTrip (記啦旅) - Google Apps Script (GAS) 雲端後端服務
 * ==============================================================================
 * 
 * 功能亮點：
 * 1. 【安全權限控管 (RBAC)】：區分管理者 (Admin) 與一般旅伴 (User)。
 *    - Firebase 金鑰與 Gemini API Key 存放於試算表受保護工作表，
 *      僅當管理者輸入正確 PIN 碼時才可讀取，一般旅伴呼叫 API 絕不外洩金鑰！
 * 2. 【雙向行程與記帳 API】：
 *    - doGet: 取得行程表 JSON、驗證管理者權限、取得雲端設定。
 *    - doPost: 將 Web App 記帳紀錄即時歸檔儲存至 Google 試算表。
 * 3. 【一鍵自動初始化】：
 *    - 試算表選單內建「🦌 GiraTrip 記啦旅 ➔ 一鍵建立/重置所有工作表範本」，
 *      自動產生高山冷杉綠風格標題列、下拉選單資料驗證與範例資料。
 * ==============================================================================
 */

// 工作表名稱常數
const SHEET_NAMES = {
  ITINERARY: '行程清單',
  MEMBERS: '成員名單',
  CONFIG: '權限與金鑰',
  EXPENSES: '記帳歸檔'
};

// 預設管理員 PIN 碼（可在「權限與金鑰」工作表中自由修改）
const DEFAULT_ADMIN_PIN = 'giratrip888';

/**
 * 當試算表開啟時，自動在頂端選單加入 GiraTrip 專屬控制台
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🦌 GiraTrip 記啦旅')
    .addItem('📁 一鍵初始化/重置所有工作表範本', 'setupGiraTripSheets')
    .addItem('🔍 檢查工作表健康狀態', 'checkSheetsHealth')
    .addSeparator()
    .addItem('📋 複製 Web App 發布與部署教學', 'showDeploymentHelp')
    .addToUi();
}

/**
 * 一鍵建立與格式化 3 個標準工作表：
 * 1. 行程清單 (Itinerary) - 9 欄位 + 冷杉綠標題 + 類別下拉驗證
 * 2. 權限與金鑰 (Config_Protected) - 存放管理員 PIN、Firebase 與 Gemini Key
 * 3. 記帳歸檔 (Expenses_Archive) - 備份 Web App 產生的開銷紀錄
 */
function setupGiraTripSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. 初始化【行程清單】
  let itSheet = ss.getSheetByName(SHEET_NAMES.ITINERARY);
  if (!itSheet) {
    itSheet = ss.insertSheet(SHEET_NAMES.ITINERARY, 0);
  }
  itSheet.clear();

  const itHeaders = [
    '天數 (Day)',
    '時間 (Time)',
    '類別 (Category)',
    '行程名稱 (Title)',
    '地點地址 (Location)',
    '備忘說明 (Notes)',
    'Google地圖連結 (GoogleMaps)',
    'IG短影音連結 (Instagram)',
    'PDF門票憑證 (PDF)'
  ];

  itSheet.getRange(1, 1, 1, itHeaders.length)
    .setValues([itHeaders])
    .setBackground('#15803D') // 高山冷杉綠
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  itSheet.setFrozenRows(1);

  // 範例行程資料
  const sampleItinerary = [
    [1, '09:30', '交通', '成田機場搭乘 Skyliner', '成田國際機場', '憑 QR Code 至京成電鐵櫃台換實體票', 'https://maps.app.goo.gl/sampleAirport', 'https://www.instagram.com/reel/sampleTransit', 'https://drive.google.com/file/d/sampleSkylinerTicket/view'],
    [1, '11:30', '住宿', '上野三井花園飯店 Check-in', '東京都台東區上野東上野3-19-7', '先寄放大件行李與護照登記', 'https://maps.app.goo.gl/sampleHotel', 'https://www.instagram.com/reel/sampleHotelReview', 'https://drive.google.com/file/d/sampleHotelBooking/view'],
    [1, '13:00', '美食', '淺草今半 壽喜燒午餐', '東京都台東區西淺草3-1-12', '必點百年極上牛壽喜燒定食，午間套餐超划算', 'https://maps.app.goo.gl/sampleSukiyaki', 'https://www.instagram.com/reel/sampleFoodReel', 'https://drive.google.com/file/d/sampleMenuReservation/view'],
    [1, '15:00', '景點', '淺草寺雷門與仲見世商店街', '東京都台東區淺草2-3-1', '拍照雷門大燈籠，買人形燒與抹茶冰淇淋', 'https://maps.app.goo.gl/sampleSensoji', 'https://www.instagram.com/reel/sampleSensojiVlog', ''],
    [2, '09:00', '景點', '澀谷 Shibuya Sky 觀景台', '東京都澀谷區澀谷2-24-12', '門票已預訂 09:30 場次，須掃描 PDF QR Code 進場', 'https://maps.app.goo.gl/sampleShibuyaSky', 'https://www.instagram.com/reel/sampleSkyReels', 'https://drive.google.com/file/d/sampleSkyTicket/view'],
    [2, '12:30', '美食', '極味屋 炭火漢堡排', '澀谷 PARCO B1', '需排隊約 30 分鐘，鐵板生牛肉漢堡排招牌', 'https://maps.app.goo.gl/sampleKiwamiya', 'https://www.instagram.com/reel/sampleBurgerReel', ''],
    [2, '15:30', '備忘', '新宿伊勢丹 退稅手續', '東京都新宿區新宿3-14-1', '本館 6F 退稅櫃台需出示護照實體與當日發票', 'https://maps.app.goo.gl/sampleIsetan', '', '']
  ];

  itSheet.getRange(2, 1, sampleItinerary.length, itHeaders.length).setValues(sampleItinerary);

  // 類別欄位資料驗證下拉選單 (景點, 美食, 交通, 住宿, 備忘)
  const categoryRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['景點', '美食', '交通', '住宿', '備忘'], true)
    .setAllowInvalid(false)
    .build();
  itSheet.getRange('C2:C500').setDataValidation(categoryRule);

  itSheet.autoResizeColumns(1, itHeaders.length);

  // 2. 初始化【成員名單】
  let memSheet = ss.getSheetByName(SHEET_NAMES.MEMBERS) || ss.insertSheet(SHEET_NAMES.MEMBERS, 1);
  memSheet.clear();

  const memHeaders = ['成員姓名 (Name)', 'Google帳號 (Email/白名單)', '身分角色 (Role)', '預設代墊人 (DefaultPayer)', '頭像代表色 (AvatarColor)', '備註 (Notes)'];
  memSheet.getRange(1, 1, 1, memHeaders.length)
    .setValues([memHeaders])
    .setBackground('#15803D')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  memSheet.setFrozenRows(1);

  const sampleMembers = [
    ['Alex', 'alex@gmail.com', '管理者 (Admin)', '是', '#15803D', '主揪 / 財務管理'],
    ['Chloe', 'chloe@gmail.com', '旅伴 (Member)', '否', '#E07A5F', '攝影 / 地圖導航'],
    ['我', '', '旅伴 (Member)', '否', '#2563EB', '美食挑選 / 記帳']
  ];
  memSheet.getRange(2, 1, sampleMembers.length, memHeaders.length).setValues(sampleMembers);

  const roleRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['管理者 (Admin)', '旅伴 (Member)'], true)
    .setAllowInvalid(false)
    .build();
  memSheet.getRange('C2:C100').setDataValidation(roleRule);
  memSheet.autoResizeColumns(1, memHeaders.length);

  // 3. 初始化【權限與金鑰】
  let cfgSheet = ss.getSheetByName(SHEET_NAMES.CONFIG) || ss.insertSheet(SHEET_NAMES.CONFIG, 2);
  cfgSheet.clear();

  const cfgHeaders = ['設定項目 (Key)', '設定值 (Value)', '權限層級 (Level)', '詳細說明 (Description)'];
  cfgSheet.getRange(1, 1, 1, cfgHeaders.length)
    .setValues([cfgHeaders])
    .setBackground('#1E293B') // 深墨黑
    .setFontColor('#FFFFFF')
    .setFontWeight('bold');
  cfgSheet.setFrozenRows(1);

  const configRows = [
    ['AdminPin', DEFAULT_ADMIN_PIN, 'Admin', '管理者驗證通行密碼（預設 giratrip888，可自由修改）'],
    ['TripTitle', '東京春櫻美食漫步', 'Public', '本份試算表對應的旅程名稱'],
    ['BaseCurrency', 'TWD', 'Public', '預設基準結算幣別 (TWD / JPY / USD)'],
    ['FirebaseApiKey', '', 'Admin', 'Firebase API Key (選填，填入後管理者可於 Web App 解鎖同步)'],
    ['FirebaseProjectId', '', 'Admin', 'Firebase Project ID (選填，如 giratrip-project)'],
    ['FirebaseAppId', '', 'Admin', 'Firebase Web App ID (選填)'],
    ['GeminiApiKey', '', 'Admin', 'Google Gemini Vision OCR 辨識金鑰 (選填)']
  ];
  cfgSheet.getRange(2, 1, configRows.length, cfgHeaders.length).setValues(configRows);
  cfgSheet.autoResizeColumns(1, cfgHeaders.length);

  // 3. 初始化【記帳歸檔】
  let expSheet = ss.getSheetByName(SHEET_NAMES.EXPENSES);
  if (!expSheet) {
    expSheet = ss.insertSheet(SHEET_NAMES.EXPENSES, 2);
  }
  expSheet.clear();

  const expHeaders = ['記錄編號', '日期', '開銷項目', '分類', '原幣金額', '幣別', '匯率', '折合台幣', '代墊付款人', '分攤成員名單', '歸檔時間'];
  expSheet.getRange(1, 1, 1, expHeaders.length)
    .setValues([expHeaders])
    .setBackground('#15803D')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold');
  expSheet.setFrozenRows(1);
  expSheet.autoResizeColumns(1, expHeaders.length);

  SpreadsheetApp.getActiveSpreadsheet().toast('GiraTrip 試算表範本已初始化完成！', '🎉 建立成功', 5);
}

/**
 * 檢查工作表狀態
 */
function checkSheetsHealth() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hasIt = !!ss.getSheetByName(SHEET_NAMES.ITINERARY);
  const hasCfg = !!ss.getSheetByName(SHEET_NAMES.CONFIG);
  const hasExp = !!ss.getSheetByName(SHEET_NAMES.EXPENSES);

  const ui = SpreadsheetApp.getUi();
  if (hasIt && hasCfg && hasExp) {
    ui.alert('健康檢查通過 ✅\n\n所有 GiraTrip 必要工作表（行程清單、權限與金鑰、記帳歸檔）皆已就緒！');
  } else {
    ui.alert('部分工作表缺失 ⚠️\n\n請點擊選單「一鍵初始化/重置所有工作表範本」以自動補齊。');
  }
}

/**
 * 顯示部署說明對話框
 */
function showDeploymentHelp() {
  const ui = SpreadsheetApp.getUi();
  const msg = 
    "【GiraTrip Google Apps Script 部署 3 步驟】\n\n" +
    "1. 點擊頂部功能表「部署 (Deploy)」➔「新增部署作業 (New deployment)」\n" +
    "2. 種類選擇「網頁應用程式 (Web app)」：\n" +
    "   - 說明：GiraTrip API\n" +
    "   - 執行身分：我 (Me)\n" +
    "   - 誰可以存取：所有人 (Anyone)  <-- 關鍵設定！\n" +
    "3. 點擊「部署」，授權 Google 權限後複製「網頁應用程式網址 (Web app URL)」\n" +
    "   (格式類似 https://script.google.com/macros/s/.../exec)\n\n" +
    "將此網址貼回 GiraTrip 行程頁面即可直接連線！";
  ui.alert(msg);
}

// ==============================================================================
// Web App HTTP 端點 (doGet / doPost)
// ==============================================================================

/**
 * HTTP GET 處理器
 * 支援參數：
 * - action=getItinerary (預設)：取得行程表 JSON
 * - action=getConfig&adminPin=xxx：安全取得雲端設定（比對管理員密碼）
 * - action=ping：連線測試
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params.action || 'getItinerary';

    if (action === 'ping') {
      return jsonResponse({
        status: 'success',
        message: 'GiraTrip Google Apps Script 雲端後端運作正常！',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'getConfig') {
      return handleGetConfig(params.adminPin);
    }

    // 預設: 取得行程資料
    return handleGetItinerary();

  } catch (err) {
    return jsonResponse({
      status: 'error',
      message: err.toString()
    });
  }
}

/**
 * 讀取行程清單並轉為 JSON
 */
function handleGetItinerary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ITINERARY);
  if (!sheet) {
    return jsonResponse({
      status: 'error',
      message: '找不到「' + SHEET_NAMES.ITINERARY + '」工作表，請先點擊選單初始化'
    });
  }

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return jsonResponse({
      status: 'success',
      count: 0,
      items: []
    });
  }

  const headers = values[0].map(h => String(h).toLowerCase());
  const dayIdx = headers.findIndex(h => h.includes('day') || h.includes('天'));
  const timeIdx = headers.findIndex(h => h.includes('time') || h.includes('時間'));
  const catIdx = headers.findIndex(h => h.includes('category') || h.includes('類別') || h.includes('分類'));
  const titleIdx = headers.findIndex(h => h.includes('title') || h.includes('名稱') || h.includes('行程'));
  const locIdx = headers.findIndex(h => h.includes('location') || h.includes('地點') || h.includes('地址'));
  const noteIdx = headers.findIndex(h => h.includes('note') || h.includes('備忘') || h.includes('說明'));
  const mapIdx = headers.findIndex(h => h.includes('map') || h.includes('地圖'));
  const igIdx = headers.findIndex(h => h.includes('ig') || h.includes('instagram') || h.includes('影片'));
  const pdfIdx = headers.findIndex(h => h.includes('pdf') || h.includes('憑證') || h.includes('門票'));

  const items = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row || row.every(cell => String(cell).trim() === '')) continue;

    const dayRaw = dayIdx >= 0 ? String(row[dayIdx]) : '1';
    const dayNumber = parseInt(dayRaw.replace(/\D/g, '') || '1', 10);
    const time = timeIdx >= 0 && row[timeIdx] ? formatTimeValue(row[timeIdx]) : '10:00';
    const title = titleIdx >= 0 && row[titleIdx] ? String(row[titleIdx]).trim() : `第 ${dayNumber} 天行程`;
    const locationName = locIdx >= 0 && row[locIdx] ? String(row[locIdx]).trim() : title;
    
    // 映射分類
    let category = 'attraction';
    if (catIdx >= 0 && row[catIdx]) {
      const c = String(row[catIdx]).toLowerCase();
      if (c.includes('食') || c.includes('餐') || c.includes('food')) category = 'food';
      else if (c.includes('行') || c.includes('車') || c.includes('交通') || c.includes('transport')) category = 'transport';
      else if (c.includes('住') || c.includes('宿') || c.includes('hotel')) category = 'hotel';
      else if (c.includes('備') || c.includes('note')) category = 'note';
    }

    items.push({
      id: 'gas_' + i + '_' + Date.now(),
      dayNumber: dayNumber,
      time: time,
      category: category,
      title: title,
      locationName: locationName,
      notes: noteIdx >= 0 && row[noteIdx] ? String(row[noteIdx]).trim() : '',
      googleMapsUrl: mapIdx >= 0 && row[mapIdx] ? String(row[mapIdx]).trim() : '',
      instagramUrl: igIdx >= 0 && row[igIdx] ? String(row[igIdx]).trim() : '',
      pdfUrl: pdfIdx >= 0 && row[pdfIdx] ? String(row[pdfIdx]).trim() : ''
    });
  }

  // 讀取成員名單 (若有建立成員工作表)
  const members = [];
  const memSheet = ss.getSheetByName(SHEET_NAMES.MEMBERS);
  if (memSheet) {
    const memValues = memSheet.getDataRange().getValues();
    if (memValues.length > 1) {
      const headers = memValues[0].map(function(h) { return String(h).toLowerCase(); });
      const nameIdx = headers.findIndex(function(h) { return h.includes('姓名') || h.includes('name'); });
      const emailIdx = headers.findIndex(function(h) { return h.includes('email') || h.includes('信箱') || h.includes('帳號'); });
      const roleIdx = headers.findIndex(function(h) { return h.includes('身分') || h.includes('角色') || h.includes('role'); });
      const payerIdx = headers.findIndex(function(h) { return h.includes('墊') || h.includes('payer'); });
      const colorIdx = headers.findIndex(function(h) { return h.includes('色') || h.includes('color'); });

      for (let m = 1; m < memValues.length; m++) {
        const mRow = memValues[m];
        const mName = String(mRow[nameIdx >= 0 ? nameIdx : 0] || '').trim();
        if (!mName) continue;
        const mEmail = emailIdx >= 0 ? String(mRow[emailIdx] || '').trim().toLowerCase() : '';
        const mRole = roleIdx >= 0 ? String(mRow[roleIdx] || '旅伴') : String(mRow[1] || '旅伴');
        const isDefaultPayer = payerIdx >= 0 ? String(mRow[payerIdx] || '').includes('是') : false;
        const avatarColor = colorIdx >= 0 && mRow[colorIdx] ? String(mRow[colorIdx]).trim() : '#15803D';
        members.push({
          id: 'mem_' + m,
          name: mName,
          email: mEmail,
          role: (mRole.includes('Admin') || mRole.includes('管理')) ? 'Admin' : 'Member',
          isDefaultPayer: isDefaultPayer,
          avatarColor: avatarColor
        });
      }
    }
  }

  return jsonResponse({
    status: 'success',
    action: 'getItinerary',
    count: items.length,
    items: items,
    members: members,
    timestamp: new Date().toISOString()
  });
}

/**
 * 安全權限控管：取得雲端設定
 * 僅當 adminPin 比對正確時，才回傳敏感的 Firebase 與 Gemini Key！
 */
function handleGetConfig(inputPin) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
  
  let storedAdminPin = DEFAULT_ADMIN_PIN;
  let tripTitle = 'GiraTrip 旅程';
  let baseCurrency = 'TWD';
  let firebaseApiKey = '';
  let firebaseProjectId = '';
  let firebaseAppId = '';
  let geminiApiKey = '';

  if (sheet) {
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      const key = String(rows[i][0]).trim();
      const val = String(rows[i][1] || '').trim();
      if (key === 'AdminPin' && val) storedAdminPin = val;
      if (key === 'TripTitle' && val) tripTitle = val;
      if (key === 'BaseCurrency' && val) baseCurrency = val;
      if (key === 'FirebaseApiKey' && val) firebaseApiKey = val;
      if (key === 'FirebaseProjectId' && val) firebaseProjectId = val;
      if (key === 'FirebaseAppId' && val) firebaseAppId = val;
      if (key === 'GeminiApiKey' && val) geminiApiKey = val;
    }
  }

  // 驗證管理者身分
  const isAdmin = (inputPin && String(inputPin).trim() === storedAdminPin);

  if (isAdmin) {
    return jsonResponse({
      status: 'success',
      role: 'admin',
      authorized: true,
      config: {
        tripTitle: tripTitle,
        baseCurrency: baseCurrency,
        firebase: {
          apiKey: firebaseApiKey,
          projectId: firebaseProjectId,
          appId: firebaseAppId
        },
        geminiApiKey: geminiApiKey
      },
      message: '管理者身分驗證成功，已載入雲端設定'
    });
  }

  // 一般旅伴/訪客：金鑰完全隱藏遮蔽！
  return jsonResponse({
    status: 'success',
    role: 'user',
    authorized: false,
    config: {
      tripTitle: tripTitle,
      baseCurrency: baseCurrency
    },
    message: '一般旅伴模式：機密金鑰已隱藏遮蔽'
  });
}

/**
 * HTTP POST 處理器
 * 支援將 Web App 的記帳支出同步歸檔進 Google 試算表
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    const action = payload.action || 'syncExpense';

    if (action === 'syncExpense') {
      return handleSyncExpense(payload.expense);
    }

    return jsonResponse({
      status: 'error',
      message: '未知的 POST action: ' + action
    });

  } catch (err) {
    return jsonResponse({
      status: 'error',
      message: err.toString()
    });
  }
}

/**
 * 寫入一筆開銷到【記帳歸檔】工作表
 */
function handleSyncExpense(expense) {
  if (!expense || !expense.title) {
    return jsonResponse({ status: 'error', message: '無效的支出資料' });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAMES.EXPENSES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.EXPENSES);
  }

  const newRow = [
    expense.id || ('exp_' + Date.now()),
    expense.date || new Date().toISOString().split('T')[0],
    expense.title,
    expense.category || 'other',
    expense.originalAmount || 0,
    expense.originalCurrency || 'TWD',
    expense.exchangeRate || 1,
    expense.amountInBaseCurrency || expense.originalAmount,
    expense.payerName || expense.paidById || '',
    (expense.splitMembers || []).join(', '),
    new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
  ];

  sheet.appendRow(newRow);

  return jsonResponse({
    status: 'success',
    message: '開銷已成功歸檔至 Google 試算表！',
    expenseId: expense.id
  });
}

/**
 * 輔助函式：建立標準 CORS 相容 JSON 回應
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 輔助函式：將試算表時間格式化為 HH:mm
 */
function formatTimeValue(val) {
  if (val instanceof Date) {
    const h = String(val.getHours()).padStart(2, '0');
    const m = String(val.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }
  const str = String(val).trim();
  return str.length > 0 ? str : '10:00';
}
