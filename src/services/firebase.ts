import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  type Firestore,
  query,
  orderBy
} from 'firebase/firestore';
import type { Expense, Trip } from '../types';

export interface FirebaseCustomConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

export const getStoredFirebaseConfig = (): FirebaseCustomConfig | null => {
  try {
    const raw = localStorage.getItem('giratrip_firebase_config');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse custom firebase config:', e);
  }

  // Check env
  const envKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const envProj = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (envKey && envProj && !envKey.includes('Dummy')) {
    return {
      apiKey: envKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${envProj}.firebaseapp.com`,
      projectId: envProj,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };
  }

  return null;
};

export const initFirebase = (customConfig?: FirebaseCustomConfig): boolean => {
  const config = customConfig || getStoredFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId || config.apiKey.includes('Dummy')) {
    return false;
  }

  try {
    if (getApps().length === 0) {
      firebaseApp = initializeApp(config);
    } else {
      firebaseApp = getApps()[0];
    }
    firestoreDb = getFirestore(firebaseApp);
    return true;
  } catch (err) {
    console.error('Firebase initialization error:', err);
    return false;
  }
};

export const isFirebaseReady = (): boolean => {
  if (!firestoreDb) {
    return initFirebase();
  }
  return true;
};

// Realtime subscription for expenses of a trip
export const subscribeTripExpenses = (
  tripId: string, 
  onData: (expenses: Expense[]) => void,
  onError?: (err: Error) => void
): (() => void) => {
  if (!isFirebaseReady() || !firestoreDb) {
    return () => {};
  }

  try {
    const expensesCol = collection(firestoreDb, 'trips', tripId, 'expenses');
    const q = query(expensesCol, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expenses: Expense[] = [];
      snapshot.forEach((docSnap) => {
        expenses.push({ id: docSnap.id, ...docSnap.data() } as Expense);
      });
      onData(expenses);
    }, (err) => {
      console.warn('Firestore snapshot error:', err);
      if (onError) onError(err);
    });

    return unsubscribe;
  } catch (err: any) {
    console.warn('subscribeTripExpenses setup error:', err);
    if (onError) onError(err);
    return () => {};
  }
};

// Save or update an expense
export const syncExpenseToRemote = async (tripId: string, expense: Expense): Promise<boolean> => {
  if (!isFirebaseReady() || !firestoreDb) return false;
  try {
    const docRef = doc(firestoreDb, 'trips', tripId, 'expenses', expense.id);
    await setDoc(docRef, {
      ...expense,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('Failed to sync expense to Firebase:', err);
    return false;
  }
};

// Delete an expense
export const deleteExpenseFromRemote = async (tripId: string, expenseId: string): Promise<boolean> => {
  if (!isFirebaseReady() || !firestoreDb) return false;
  try {
    const docRef = doc(firestoreDb, 'trips', tripId, 'expenses', expenseId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error('Failed to delete expense from Firebase:', err);
    return false;
  }
};

// Sync Trip metadata
export const syncTripToRemote = async (trip: Trip): Promise<boolean> => {
  if (!isFirebaseReady() || !firestoreDb) return false;
  try {
    const docRef = doc(firestoreDb, 'trips', trip.id);
    await setDoc(docRef, {
      ...trip,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('Failed to sync trip to Firebase:', err);
    return false;
  }
};
