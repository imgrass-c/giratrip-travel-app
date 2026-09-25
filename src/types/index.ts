export type CurrencyCode = 'TWD' | 'JPY' | 'KRW' | 'USD' | 'EUR' | 'THB';

export interface Member {
  id: string;
  name: string;
  avatarColor: string; // Tailwind color class or hex
  isDefaultPayer?: boolean;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  baseCurrency: CurrencyCode;
  members: Member[];
  sheetCsvUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type ItineraryCategory = 'attraction' | 'food' | 'transport' | 'hotel' | 'note';

export interface ItineraryItem {
  id: string;
  tripId: string;
  dayNumber: number;
  time: string;
  title: string;
  locationName: string;
  category: ItineraryCategory;
  notes?: string;
  googleMapsUrl?: string;
  instagramUrl?: string;
  pdfUrl?: string;
  linkedExpenseId?: string;
  createdAt?: string;
}

export interface ExpenseItemBreakdown {
  id: string;
  name: string;
  amount: number;
  assignedMemberIds: string[];
}

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  category: 'dining' | 'traffic' | 'ticket' | 'shopping' | 'stay' | 'other';
  date: string;
  originalCurrency: CurrencyCode;
  originalAmount: number;
  exchangeRate: number; // e.g., 1 originalCurrency = exchangeRate baseCurrency
  amountInBaseCurrency: number;
  paidById: string; // Member id
  splitType: 'equal' | 'custom_itemized';
  splitMemberIds: string[]; // Member ids sharing the cost
  itemBreakdown?: ExpenseItemBreakdown[];
  linkedItineraryItemId?: string;
  receiptImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DebtSettlement {
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amount: number;
  currency: CurrencyCode;
}

export interface MemberBalance {
  memberId: string;
  memberName: string;
  totalPaid: number;
  totalShouldPay: number;
  netBalance: number; // Positive = should receive money, Negative = owes money
}

export interface OCRDetectedItem {
  id: string;
  name: string;
  translatedName?: string;
  price?: number;
  quantity?: number;
  selected?: boolean;
}

export interface OCRScanResult {
  mode: 'receipt' | 'menu';
  detectedItems: OCRDetectedItem[];
  rawText: string;
  merchantName?: string;
  date?: string;
  totalAmount?: number;
  currency?: CurrencyCode;
}
