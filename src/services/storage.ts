import type { Trip, ItineraryItem, Expense } from '../types';

const STORAGE_KEYS = {
  TRIPS: 'giratrip_trips_v1',
  ACTIVE_TRIP_ID: 'giratrip_active_trip_id_v1',
  ITINERARY_PREFIX: 'giratrip_itinerary_',
  EXPENSES_PREFIX: 'giratrip_expenses_',
  EXCHANGE_RATES: 'giratrip_custom_rates_v1',
};

// Initial default sample trip for instant out-of-the-box experience
export const INITIAL_SAMPLE_TRIP: Trip = {
  id: 'trip_tokyo_spring_2026',
  title: '東京春櫻美食漫步',
  destination: '日本 東京',
  startDate: '2026-04-01',
  endDate: '2026-04-05',
  baseCurrency: 'TWD',
  members: [
    { id: 'm_me', name: '我 (主記人)', avatarColor: '#526655', isDefaultPayer: true },
    { id: 'm_alex', name: 'Alex', avatarColor: '#8A6B58' },
    { id: 'm_chloe', name: 'Chloe', avatarColor: '#6B7A82' },
  ],
  sheetCsvUrl: '',
  createdAt: '2026-04-01T08:00:00.000Z',
  updatedAt: '2026-04-01T08:00:00.000Z',
};

export const INITIAL_SAMPLE_ITINERARY: ItineraryItem[] = [
  {
    id: 'it_1',
    tripId: 'trip_tokyo_spring_2026',
    dayNumber: 1,
    time: '11:30',
    title: '成田機場 ➔ 上野 Skyliner',
    locationName: '成田國際機場 第二航廈',
    category: 'transport',
    notes: '抵達後憑電子憑證於櫃檯兌換實體票，記得領取行李',
    googleMapsUrl: 'https://maps.google.com/?q=Narita+Airport',
    pdfUrl: 'https://drive.google.com/file/d/sample-skyliner-ticket/view',
    createdAt: '2026-04-01T09:00:00.000Z',
  },
  {
    id: 'it_2',
    tripId: 'trip_tokyo_spring_2026',
    dayNumber: 1,
    time: '14:00',
    title: '淺草 今半 壽喜燒午餐',
    locationName: '淺草今半 國際通本店',
    category: 'food',
    notes: '已預約 3 位，限定黑毛和牛壽喜燒定食',
    googleMapsUrl: 'https://maps.google.com/?q=Asakusa+Imahan',
    instagramUrl: 'https://www.instagram.com/explore/tags/asakusaimahan/',
    createdAt: '2026-04-01T09:10:00.000Z',
  },
  {
    id: 'it_3',
    tripId: 'trip_tokyo_spring_2026',
    dayNumber: 1,
    time: '16:30',
    title: '隅田公園 櫻花散策與晴空塔遠眺',
    locationName: '隅田公園',
    category: 'attraction',
    notes: '落日河畔散步，沿岸櫻花大道適合拍照',
    googleMapsUrl: 'https://maps.google.com/?q=Sumida+Park',
    instagramUrl: 'https://www.instagram.com/explore/tags/sumidapark/',
    createdAt: '2026-04-01T09:20:00.000Z',
  },
  {
    id: 'it_4',
    tripId: 'trip_tokyo_spring_2026',
    dayNumber: 2,
    time: '09:00',
    title: '築地場外市場 壽司與海鮮丼',
    locationName: '築地場外市場',
    category: 'food',
    notes: '推薦虎杖元祖海鮮丼與玉子燒',
    googleMapsUrl: 'https://maps.google.com/?q=Tsukiji+Outer+Market',
    createdAt: '2026-04-01T09:30:00.000Z',
  }
];

export const INITIAL_SAMPLE_EXPENSES: Expense[] = [
  {
    id: 'exp_1',
    tripId: 'trip_tokyo_spring_2026',
    title: '成田特急 Skyliner 三人車票',
    category: 'traffic',
    date: '2026-04-01',
    originalCurrency: 'JPY',
    originalAmount: 7650,
    exchangeRate: 0.215,
    amountInBaseCurrency: 1645,
    paidById: 'm_me',
    splitType: 'equal',
    splitMemberIds: ['m_me', 'm_alex', 'm_chloe'],
    createdAt: '2026-04-01T11:40:00.000Z',
    updatedAt: '2026-04-01T11:40:00.000Z',
  },
  {
    id: 'exp_2',
    tripId: 'trip_tokyo_spring_2026',
    title: '淺草今半 和牛壽喜燒午間套餐',
    category: 'dining',
    date: '2026-04-01',
    originalCurrency: 'JPY',
    originalAmount: 18500,
    exchangeRate: 0.215,
    amountInBaseCurrency: 3978,
    paidById: 'm_alex',
    splitType: 'equal',
    splitMemberIds: ['m_me', 'm_alex', 'm_chloe'],
    linkedItineraryItemId: 'it_2',
    createdAt: '2026-04-01T15:00:00.000Z',
    updatedAt: '2026-04-01T15:00:00.000Z',
  },
  {
    id: 'exp_3',
    tripId: 'trip_tokyo_spring_2026',
    title: '隅田川 櫻花祭咖啡與抹茶大福',
    category: 'dining',
    date: '2026-04-01',
    originalCurrency: 'JPY',
    originalAmount: 2400,
    exchangeRate: 0.215,
    amountInBaseCurrency: 516,
    paidById: 'm_chloe',
    splitType: 'equal',
    splitMemberIds: ['m_me', 'm_alex', 'm_chloe'],
    createdAt: '2026-04-01T17:15:00.000Z',
    updatedAt: '2026-04-01T17:15:00.000Z',
  }
];

export const loadTrips = (): Trip[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRIPS);
    if (!raw) {
      saveTrips([INITIAL_SAMPLE_TRIP]);
      saveItineraryItems(INITIAL_SAMPLE_TRIP.id, INITIAL_SAMPLE_ITINERARY);
      saveExpenses(INITIAL_SAMPLE_TRIP.id, INITIAL_SAMPLE_EXPENSES);
      return [INITIAL_SAMPLE_TRIP];
    }
    const trips = JSON.parse(raw);
    return Array.isArray(trips) && trips.length > 0 ? trips : [INITIAL_SAMPLE_TRIP];
  } catch (err) {
    console.error('Failed to load trips:', err);
    return [INITIAL_SAMPLE_TRIP];
  }
};

export const saveTrips = (trips: Trip[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
  } catch (err) {
    console.error('Failed to save trips:', err);
  }
};

export const getActiveTripId = (trips: Trip[]): string => {
  const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_TRIP_ID);
  if (stored && trips.some(t => t.id === stored)) {
    return stored;
  }
  const fallback = trips[0]?.id || INITIAL_SAMPLE_TRIP.id;
  localStorage.setItem(STORAGE_KEYS.ACTIVE_TRIP_ID, fallback);
  return fallback;
};

export const setActiveTripId = (tripId: string) => {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_TRIP_ID, tripId);
};

export const loadItineraryItems = (tripId: string): ItineraryItem[] => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.ITINERARY_PREFIX}${tripId}`);
    if (!raw) {
      if (tripId === INITIAL_SAMPLE_TRIP.id) {
        saveItineraryItems(tripId, INITIAL_SAMPLE_ITINERARY);
        return INITIAL_SAMPLE_ITINERARY;
      }
      return [];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to load itinerary for ${tripId}:`, err);
    return [];
  }
};

export const saveItineraryItems = (tripId: string, items: ItineraryItem[]) => {
  try {
    localStorage.setItem(`${STORAGE_KEYS.ITINERARY_PREFIX}${tripId}`, JSON.stringify(items));
  } catch (err) {
    console.error(`Failed to save itinerary for ${tripId}:`, err);
  }
};

export const loadExpenses = (tripId: string): Expense[] => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.EXPENSES_PREFIX}${tripId}`);
    if (!raw) {
      if (tripId === INITIAL_SAMPLE_TRIP.id) {
        saveExpenses(tripId, INITIAL_SAMPLE_EXPENSES);
        return INITIAL_SAMPLE_EXPENSES;
      }
      return [];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to load expenses for ${tripId}:`, err);
    return [];
  }
};

export const saveExpenses = (tripId: string, expenses: Expense[]) => {
  try {
    localStorage.setItem(`${STORAGE_KEYS.EXPENSES_PREFIX}${tripId}`, JSON.stringify(expenses));
  } catch (err) {
    console.error(`Failed to save expenses for ${tripId}:`, err);
  }
};

// Preset default exchange rates to TWD
export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  TWD: 1.0,
  JPY: 0.215,
  KRW: 0.024,
  USD: 32.5,
  EUR: 35.2,
  THB: 0.92,
};

export const loadExchangeRates = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXCHANGE_RATES);
    if (raw) return { ...DEFAULT_EXCHANGE_RATES, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Failed to parse exchange rates:', e);
  }
  return DEFAULT_EXCHANGE_RATES;
};

export const saveExchangeRates = (rates: Record<string, number>) => {
  try {
    localStorage.setItem(STORAGE_KEYS.EXCHANGE_RATES, JSON.stringify(rates));
  } catch (e) {
    console.warn('Failed to save exchange rates:', e);
  }
};
