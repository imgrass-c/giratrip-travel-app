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

/**
 * Fetches Google Sheet published CSV url with fallback proxy/CORS warning
 */
export const fetchGoogleSheetItinerary = async (csvUrl: string, tripId: string): Promise<ItineraryItem[]> => {
  if (!csvUrl || !csvUrl.trim()) {
    throw new Error('Google Sheets CSV URL 為空');
  }

  const cleanUrl = csvUrl.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    throw new Error('請輸入以 https:// 開頭的合法網址');
  }

  const response = await fetch(cleanUrl);
  if (!response.ok) {
    throw new Error(`Google Sheets 下載失敗，狀態碼: ${response.status}`);
  }

  const csvText = await response.text();
  const items = parseGoogleSheetCsv(csvText, tripId);
  return items;
};
