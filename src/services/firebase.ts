import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  type Auth 
} from 'firebase/auth';
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
import type { Expense, Trip, ItineraryItem } from '../types';

export interface FirebaseCustomConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;

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
    firebaseAuth = getAuth(firebaseApp);
    return true;
  } catch (err) {
    console.error('Firebase initialization error:', err);
    return false;
  }
};

export const getFirebaseAuth = (): Auth | null => {
  if (!firebaseAuth && firebaseApp) {
    firebaseAuth = getAuth(firebaseApp);
  }
  return firebaseAuth;
};

export const isFirebaseReady = (): boolean => {
  if (!firestoreDb) {
    return initFirebase();
  }
  return true;
};

export const loginWithGoogle = async (): Promise<AppUser> => {
  if (!isFirebaseReady()) {
    throw new Error('尚未設定 Firebase 連線，請先確認已配置 Firebase 金鑰');
  }
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Auth 模組尚未就緒');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  const appUser: AppUser = {
    uid: result.user.uid,
    email: result.user.email,
    displayName: result.user.displayName,
    photoURL: result.user.photoURL,
  };
  localStorage.setItem('giratrip_current_user', JSON.stringify(appUser));
  return appUser;
};

export const logoutUser = async (): Promise<void> => {
  const auth = getFirebaseAuth();
  if (auth) {
    await signOut(auth);
  }
  localStorage.removeItem('giratrip_current_user');
};

export const getStoredUser = (): AppUser | null => {
  try {
    const raw = localStorage.getItem('giratrip_current_user');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse stored user:', e);
  }
  return null;
};

export const subscribeAuthState = (
  callback: (user: AppUser | null) => void
): (() => void) => {
  if (!isFirebaseReady()) {
    callback(getStoredUser());
    return () => {};
  }

  const auth = getFirebaseAuth();
  if (!auth) {
    callback(getStoredUser());
    return () => {};
  }

  return onAuthStateChanged(auth, (user) => {
    if (user) {
      const appUser: AppUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      };
      localStorage.setItem('giratrip_current_user', JSON.stringify(appUser));
      callback(appUser);
    } else {
      localStorage.removeItem('giratrip_current_user');
      callback(null);
    }
  });
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

// Realtime subscription for all Trips in Firestore
export const subscribeTrips = (
  onData: (trips: Trip[]) => void,
  onError?: (err: Error) => void
): (() => void) => {
  if (!isFirebaseReady() || !firestoreDb) {
    return () => {};
  }
  try {
    const tripsCol = collection(firestoreDb, 'trips');
    const q = query(tripsCol, orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const remoteTrips: Trip[] = [];
      snapshot.forEach((docSnap) => {
        remoteTrips.push({ id: docSnap.id, ...docSnap.data() } as Trip);
      });
      if (remoteTrips.length > 0) {
        onData(remoteTrips);
      }
    }, (err) => {
      console.warn('Firestore trips subscription warning:', err);
      if (onError) onError(err);
    });
    return unsubscribe;
  } catch (err: any) {
    console.warn('subscribeTrips setup error:', err);
    if (onError) onError(err);
    return () => {};
  }
};

// Realtime subscription for Itinerary items of a trip
export const subscribeTripItinerary = (
  tripId: string,
  onData: (items: ItineraryItem[]) => void,
  onError?: (err: Error) => void
): (() => void) => {
  if (!isFirebaseReady() || !firestoreDb) {
    return () => {};
  }
  try {
    const docRef = doc(firestoreDb, 'trips', tripId, 'itinerary_data', 'items');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data?.items)) {
          onData(data.items as ItineraryItem[]);
        }
      }
    }, (err) => {
      console.warn('Firestore itinerary subscription warning:', err);
      if (onError) onError(err);
    });
    return unsubscribe;
  } catch (err: any) {
    console.warn('subscribeTripItinerary setup error:', err);
    if (onError) onError(err);
    return () => {};
  }
};

// Save itinerary items to remote Firestore
export const syncItineraryToRemote = async (tripId: string, items: ItineraryItem[]): Promise<boolean> => {
  if (!isFirebaseReady() || !firestoreDb) return false;
  try {
    const docRef = doc(firestoreDb, 'trips', tripId, 'itinerary_data', 'items');
    await setDoc(docRef, {
      items,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('Failed to sync itinerary to Firebase:', err);
    return false;
  }
};

