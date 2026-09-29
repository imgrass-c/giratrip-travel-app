import React, { useState, useEffect } from 'react';
import type { Trip, ItineraryItem, Expense } from './types';
import { 
  loadTrips, 
  saveTrips, 
  getActiveTripId, 
  setActiveTripId as persistActiveTripId,
  loadItineraryItems, 
  saveItineraryItems, 
  loadExpenses, 
  saveExpenses 
} from './services/storage';
import { 
  isFirebaseReady, 
  subscribeTripExpenses, 
  syncExpenseToRemote, 
  deleteExpenseFromRemote, 
  syncTripToRemote,
  subscribeTrips,
  subscribeTripItinerary,
  syncItineraryToRemote,
  type AppUser,
  getStoredUser,
  subscribeAuthState,
  logoutUser
} from './services/firebase';
import { Navbar } from './components/Navbar';
import { BottomNav, type ActiveTab } from './components/BottomNav';
import { TripModal } from './components/TripModal';
import { ItineraryTab } from './components/ItineraryTab';
import { ExpenseTab } from './components/ExpenseTab';
import { ScannerTab } from './components/ScannerTab';
import { SettlementTab } from './components/SettlementTab';
import { SettingsTab } from './components/SettingsTab';
import { AuthGate } from './components/AuthGate';

export const App: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>(() => loadTrips());
  const [activeTripId, setActiveTripId] = useState<string>(() => getActiveTripId(trips));
  const [activeTab, setActiveTab] = useState<ActiveTab>('itinerary');
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(() => isFirebaseReady());
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => getStoredUser());

  // Active Trip derived
  const activeTrip = trips.find((t) => t.id === activeTripId) || trips[0];

  // Itinerary items for active trip
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>(() =>
    loadItineraryItems(activeTrip.id)
  );

  // Expenses for active trip
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    loadExpenses(activeTrip.id)
  );

  // Prefilled spot when transitioning from Itinerary to Expense
  const [prefilledItineraryItem, setPrefilledItineraryItem] = useState<ItineraryItem | null>(null);

  // Subscribe to Firebase Auth state
  useEffect(() => {
    const unsubscribe = subscribeAuthState((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, [isFirebaseConnected]);

  // Subscribe to Firebase Trips realtime updates (cross-device sync)
  useEffect(() => {
    if (!isFirebaseConnected) return;
    const unsubscribe = subscribeTrips((remoteTrips) => {
      setTrips((prevTrips) => {
        const tripMap = new Map<string, Trip>();
        prevTrips.forEach((t) => tripMap.set(t.id, t));
        remoteTrips.forEach((t) => tripMap.set(t.id, t));
        const merged = Array.from(tripMap.values()).sort((a, b) => 
          new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        );
        saveTrips(merged);
        return merged;
      });
    });
    return () => unsubscribe();
  }, [isFirebaseConnected]);

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
  };

  // Initialize theme accent and accessibility preferences on mount
  useEffect(() => {
    const savedAccent = localStorage.getItem('giratrip_theme_accent') || 'pine';
    const savedFontSize = localStorage.getItem('giratrip_font_size') || 'normal';
    const savedContrast = localStorage.getItem('giratrip_high_contrast') || 'false';
    document.documentElement.setAttribute('data-accent', savedAccent);
    document.documentElement.setAttribute('data-font-size', savedFontSize);
    document.documentElement.setAttribute('data-high-contrast', savedContrast);
  }, []);

  // Reload data when activeTripId changes
  useEffect(() => {
    if (!activeTrip) return;
    persistActiveTripId(activeTrip.id);
    const loadedItinerary = loadItineraryItems(activeTrip.id);
    const loadedExp = loadExpenses(activeTrip.id);
    setItineraryItems(loadedItinerary);
    setExpenses(loadedExp);

    // Subscribe to Firebase realtime updates for Expenses & Itinerary
    let unsubscribeExpenses = () => {};
    let unsubscribeItinerary = () => {};

    if (isFirebaseConnected) {
      unsubscribeExpenses = subscribeTripExpenses(activeTrip.id, (remoteExpenses) => {
        if (remoteExpenses && remoteExpenses.length > 0) {
          setExpenses(remoteExpenses);
          saveExpenses(activeTrip.id, remoteExpenses);
        }
      });

      unsubscribeItinerary = subscribeTripItinerary(activeTrip.id, (remoteItems) => {
        if (remoteItems && remoteItems.length > 0) {
          setItineraryItems(remoteItems);
          saveItineraryItems(activeTrip.id, remoteItems);
        }
      });
    }

    return () => {
      unsubscribeExpenses();
      unsubscribeItinerary();
    };
  }, [activeTripId, isFirebaseConnected]);

  // Trip selection
  const handleSelectTrip = (newTripId: string) => {
    setActiveTripId(newTripId);
    setPrefilledItineraryItem(null);
  };

  // Create new trip or update active trip
  const handleSaveTrip = (tripData: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTripId = `trip_${Date.now()}`;
    const newTrip: Trip = {
      ...tripData,
      id: newTripId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedTrips = [newTrip, ...trips];
    setTrips(updatedTrips);
    saveTrips(updatedTrips);
    setActiveTripId(newTripId);
    setItineraryItems([]);
    setExpenses([]);
    saveItineraryItems(newTripId, []);
    saveExpenses(newTripId, []);

    // Sync trip to remote if connected
    if (isFirebaseConnected) {
      syncTripToRemote(newTrip);
    }
  };

  const handleUpdateActiveTrip = (updatedTrip: Trip) => {
    const updated = trips.map((t) => (t.id === updatedTrip.id ? updatedTrip : t));
    setTrips(updated);
    saveTrips(updated);
    if (isFirebaseConnected) {
      syncTripToRemote(updatedTrip);
    }
  };

  // Itinerary handlers
  const handleSaveItineraryItems = (items: ItineraryItem[]) => {
    setItineraryItems(items);
    saveItineraryItems(activeTrip.id, items);
    if (isFirebaseConnected) {
      syncItineraryToRemote(activeTrip.id, items);
    }
  };

  // Link Spot to Expense
  const handleLinkToExpense = (item: ItineraryItem) => {
    setPrefilledItineraryItem(item);
    setActiveTab('expenses');
  };

  // Expense handlers
  const handleAddExpense = (expense: Expense) => {
    const updated = [expense, ...expenses];
    setExpenses(updated);
    saveExpenses(activeTrip.id, updated);

    // Sync to Firebase if connected
    if (isFirebaseConnected) {
      syncExpenseToRemote(activeTrip.id, expense);
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    const updated = expenses.filter((e) => e.id !== expenseId);
    setExpenses(updated);
    saveExpenses(activeTrip.id, updated);

    // Sync to Firebase
    if (isFirebaseConnected) {
      deleteExpenseFromRemote(activeTrip.id, expenseId);
    }
  };

  // Import from Scanner
  const handleImportExpenseFromOCR = (expense: Expense) => {
    handleAddExpense(expense);
    setActiveTab('expenses');
  };

  // Reload all data (from settings reset)
  const handleReloadAllData = () => {
    const freshTrips = loadTrips();
    setTrips(freshTrips);
    const freshActiveId = getActiveTripId(freshTrips);
    setActiveTripId(freshActiveId);
    setItineraryItems(loadItineraryItems(freshActiveId));
    setExpenses(loadExpenses(freshActiveId));
  };

  return (
    <AuthGate
      currentUser={currentUser}
      activeTrip={activeTrip}
      onAuthSuccess={(u) => setCurrentUser(u)}
    >
      <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans selection:bg-primary/20">
        {/* Top Navbar */}
        <Navbar
          trips={trips}
          activeTrip={activeTrip}
          onSelectTrip={handleSelectTrip}
          onOpenNewTripModal={() => setIsTripModalOpen(true)}
          isFirebaseConnected={isFirebaseConnected}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Main Content Pane */}
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-5">
          {activeTab === 'itinerary' && (
            <ItineraryTab
              trip={activeTrip}
              items={itineraryItems}
              onSaveItems={handleSaveItineraryItems}
              onLinkToExpense={handleLinkToExpense}
              onUpdateTrip={handleUpdateActiveTrip}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpenseTab
              trip={activeTrip}
              expenses={expenses}
              itineraryItems={itineraryItems}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
              prefilledItineraryItem={prefilledItineraryItem}
              onClearPrefilledItineraryItem={() => setPrefilledItineraryItem(null)}
            />
          )}

          {activeTab === 'scanner' && (
            <ScannerTab
              trip={activeTrip}
              onImportExpenseFromOCR={handleImportExpenseFromOCR}
            />
          )}

          {activeTab === 'settlement' && (
            <SettlementTab
              trip={activeTrip}
              expenses={expenses}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              trip={activeTrip}
              onUpdateTrip={handleUpdateActiveTrip}
              onReloadAllData={handleReloadAllData}
              isFirebaseConnected={isFirebaseConnected}
              setIsFirebaseConnected={setIsFirebaseConnected}
            />
          )}
        </main>

        {/* Bottom Thumb-Friendly Nav */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          expenseCount={expenses.length}
        />

        {/* Create Trip Modal */}
        <TripModal
          isOpen={isTripModalOpen}
          onClose={() => setIsTripModalOpen(false)}
          onSaveTrip={handleSaveTrip}
        />
      </div>
    </AuthGate>
  );
};
