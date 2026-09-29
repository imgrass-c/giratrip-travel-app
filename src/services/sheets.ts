import type { ItineraryItem, ItineraryCategory } from '../types';

/**
 * Parses CSV text fetched from a published Google Sheet into ItineraryItem array.
 * Expected headers (flexible matching):
 * Day, Time, Title, Location, Category, Notes, GoogleMaps, Instagram, PDF
 */
export const parseGoogleSheetCsv = (csvText: string, tripId: string): ItineraryItem[] => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const headerLine = lines[0];
  const headers = parseCsvRow(headerLine).map(h => h.trim().toLowerCase());

  const dayIdx = headers.findIndex(h => h.includes('day') || h.includes('天'));
  const timeIdx = headers.findIndex(h => h.includes('time') || h.includes('時間'));
  const titleIdx = headers.findIndex(h => h.includes('title') || h.includes('標題') || h.includes('行程'));
  const locationIdx = headers.findIndex(h => h.includes('location') || h.includes('地點'));
  const categoryIdx = headers.findIndex(h => h.includes('category') || h.includes('分類') || h.includes('類型'));
  const notesIdx = headers.findIndex(h => h.includes('note') || h.includes('備註') || h.includes('說明'));
  const mapsIdx = headers.findIndex(h => h.includes('map') || h.includes('地圖') || h.includes('google'));
  const igIdx = headers.findIndex(h => h.includes('ig') || h.includes('instagram') || h.includes('reels'));
  const pdfIdx = headers.findIndex(h => h.includes('pdf') || h.includes('憑證') || h.includes('drive'));

  const items: ItineraryItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvRow(lines[i]);
    if (row.length === 0 || !row.some(cell => cell.trim().length > 0)) continue;

    const dayStr = dayIdx >= 0 ? row[dayIdx] : '1';
    const dayNumber = parseInt(dayStr.replace(/\D/g, '') || '1', 10);
    const time = timeIdx >= 0 && row[timeIdx] ? row[timeIdx].trim() : '09:00';
    const title = titleIdx >= 0 && row[titleIdx] ? row[titleIdx].trim() : `第 ${dayNumber} 天行程`;
    const locationName = locationIdx >= 0 && row[locationIdx] ? row[locationIdx].trim() : title;
    
    // Map category
    let category: ItineraryCategory = 'attraction';
    if (categoryIdx >= 0 && row[categoryIdx]) {
      const catStr = row[categoryIdx].toLowerCase();
      if (catStr.includes('食') || catStr.includes('餐') || catStr.includes('food') || catStr.includes('dining')) category = 'food';
      else if (catStr.includes('車') || catStr.includes('行') || catStr.includes('transport') || catStr.includes('交通')) category = 'transport';
      else if (catStr.includes('住') || catStr.includes('hotel') || catStr.includes('stay')) category = 'hotel';
      else if (catStr.includes('備') || catStr.includes('note')) category = 'note';
    }

    const notes = notesIdx >= 0 ? row[notesIdx]?.trim() : undefined;
    const googleMapsUrl = mapsIdx >= 0 ? row[mapsIdx]?.trim() : undefined;
    const instagramUrl = igIdx >= 0 ? row[igIdx]?.trim() : undefined;
    const pdfUrl = pdfIdx >= 0 ? row[pdfIdx]?.trim() : undefined;

    items.push({
      id: `sheet_it_${Date.now()}_${i}`,
      tripId,
      dayNumber,
      time,
      title,
      locationName,
      category,
      notes,
      googleMapsUrl,
      instagramUrl,
      pdfUrl,
      createdAt: new Date().toISOString(),
    });
  }

  return items;
};

// Robust CSV row parser handling quotes and commas
function parseCsvRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export interface SheetSyncResult {
  items: ItineraryItem[];
  members?: { id: string; name: string; avatarColor: string; isDefaultPayer?: boolean }[];
  tripTitle?: string;
}

/**
 * Fetches full trip bundle (itinerary + members) from GAS or CSV
 */
export const fetchGoogleSheetBundle = async (sheetOrGasUrl: string, tripId: string): Promise<SheetSyncResult> => {
  if (!sheetOrGasUrl || !sheetOrGasUrl.trim()) {
    throw new Error('Google Sheets 或 GAS 網址為空');
  }

  const cleanUrl = sheetOrGasUrl.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    throw new Error('請輸入以 https:// 開頭的合法網址');
  }

  // 1. Google Apps Script Web App (JSON API)
  if (cleanUrl.includes('script.google.com')) {
    const fetchUrl = cleanUrl.includes('?') 
      ? `${cleanUrl}&action=getItinerary` 
      : `${cleanUrl}?action=getItinerary`;
    
    const response = await fetch(fetchUrl, { redirect: 'follow' });
    if (!response.ok) {
      throw new Error(`Google Apps Script 連線失敗，HTTP 狀態碼: ${response.status}`);
    }
    const json = await response.json();
    if (json.status !== 'success' || !Array.isArray(json.items)) {
      throw new Error(json.message || 'Google Apps Script 回傳資料格式不符合規範');
    }
    
    const items: ItineraryItem[] = json.items.map((it: any, idx: number) => ({
      id: it.id || `gas_it_${Date.now()}_${idx}`,
      tripId,
      dayNumber: Number(it.dayNumber) || 1,
      time: String(it.time || '10:00'),
      title: String(it.title || '行程活動'),
      locationName: String(it.locationName || it.title || ''),
      category: (it.category as ItineraryCategory) || 'attraction',
      notes: it.notes || undefined,
      googleMapsUrl: it.googleMapsUrl || undefined,
      instagramUrl: it.instagramUrl || undefined,
      pdfUrl: it.pdfUrl || undefined,
      createdAt: new Date().toISOString(),
    }));

    const members = Array.isArray(json.members) && json.members.length > 0
      ? json.members.map((m: any, i: number) => ({
          id: m.id || `mem_${i}`,
          name: String(m.name || '旅伴'),
          avatarColor: String(m.avatarColor || '#15803D'),
          isDefaultPayer: !!m.isDefaultPayer,
        }))
      : undefined;

    return { items, members, tripTitle: json.tripTitle };
  }

  // 2. Published Google Sheet CSV
  const response = await fetch(cleanUrl);
  if (!response.ok) {
    throw new Error(`Google Sheets 下載失敗，狀態碼: ${response.status}`);
  }

  const csvText = await response.text();
  const items = parseGoogleSheetCsv(csvText, tripId);
  return { items };
};

/**
 * Fetches itinerary from either a Google Apps Script (GAS) Web App or a published Google Sheet CSV
 */
export const fetchGoogleSheetItinerary = async (sheetOrGasUrl: string, tripId: string): Promise<ItineraryItem[]> => {
  const result = await fetchGoogleSheetBundle(sheetOrGasUrl, tripId);
  return result.items;
};

/**
 * 安全地從 Google Apps Script 讀取管理者雲端設定（比對 Admin PIN）
 */
export const fetchGasConfig = async (gasUrl: string, adminPin: string) => {
  const cleanUrl = gasUrl.trim();
  const fetchUrl = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}action=getConfig&adminPin=${encodeURIComponent(adminPin)}`;
  const response = await fetch(fetchUrl, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`GAS 設定讀取失敗 (${response.status})`);
  }
  return await response.json();
};

/**
 * 透過 GAS doPost 將記帳開銷即時歸檔儲存至 Google 試算表
 */
export const syncExpenseToGas = async (gasUrl: string, expense: any) => {
  const cleanUrl = gasUrl.trim();
  const response = await fetch(cleanUrl, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'syncExpense', expense }),
  });
  return await response.json();
};
