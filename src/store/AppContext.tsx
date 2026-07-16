import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, type User, type Store, type Shift, type Product } from '../shared/services/db';
import { seedDatabase } from '../shared/services/db';
import { SyncService } from '../shared/services/syncService';
import { calculateTotals } from '../shared/lib/math';

export interface CartItem {
  product: Product;
  qty: number;
  selectedVarian: string;
  notes: string;
}

interface AppContextType {
  user: User | null;
  loginUser: (user: User) => void;
  logoutUser: () => void;
  
  store: Store | null;
  refreshStore: () => Promise<void>;
  
  currentShift: Shift | null;
  refreshShift: () => Promise<void>;
  
  activeTab: string;
  setActiveTab: (tab: string) => void;
  
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  
  cart: CartItem[];
  addToCart: (product: Product, varian: string, notes: string) => void;
  updateCartQty: (productId: number, varian: string, change: number) => void;
  removeFromCart: (productId: number, varian: string) => void;
  clearCart: () => void;
  cartTotals: {
    subtotal: number;
    discount: number;
    tax: number;
    serviceCharge: number;
    total: number;
  };
  discountAmount: number; // custom transactions discount
  setDiscountAmount: (val: number) => void;
  platform: 'Dine-in' | 'Take Away' | 'GrabFood' | 'GoFood' | 'ShopeeFood' | 'TikTok';
  setPlatform: (val: 'Dine-in' | 'Take Away' | 'GrabFood' | 'GoFood' | 'ShopeeFood' | 'TikTok') => void;
  canInstall: boolean;
  installApp: () => Promise<void>;
  isInitializing: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(() => {
    const cachedUser = localStorage.getItem('mokundo_user');
    return cachedUser ? JSON.parse(cachedUser) : null;
  });
  const [store, setStore] = useState<Store | null>(() => {
    const cached = sessionStorage.getItem('mokundo_cached_store');
    return cached ? JSON.parse(cached) : null;
  });
  const [currentShift, setCurrentShift] = useState<Shift | null>(() => {
    const cached = sessionStorage.getItem('mokundo_cached_shift');
    return cached ? JSON.parse(cached) : null;
  });
  const [activeTab, setActiveTabState] = useState<string>(() => {
    return localStorage.getItem('mokundo_activeTab') || 'dashboard';
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('mokundo_isDarkMode') === 'true';
  });
  
  const [cart, setCart] = useState<CartItem[]>(() => {
    const cached = localStorage.getItem('mokundo_cart');
    return cached ? JSON.parse(cached) : [];
  });
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [platform, setPlatform] = useState<'Dine-in' | 'Take Away' | 'GrabFood' | 'GoFood' | 'ShopeeFood' | 'TikTok'>(() => {
    return (localStorage.getItem('mokundo_platform') as any) || 'Dine-in';
  });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Persist cart to localStorage
  useEffect(() => {
    localStorage.setItem('mokundo_cart', JSON.stringify(cart));
  }, [cart]);

  // Persist platform to localStorage
  useEffect(() => {
    localStorage.setItem('mokundo_platform', platform);
  }, [platform]);

  // Listen to PWA installation events
  useEffect(() => {
    const handleBeforePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleAppInstalled = () => {
      console.log('PWA app was successfully installed');
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', handleBeforePrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforePrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('PWA installation status:', outcome);
    setDeferredPrompt(null);
  };

  // Load Session and System configs on startup
  useEffect(() => {
    // 1. Theme configuration
    const html = document.documentElement;
    if (isDarkMode) html.classList.add('dark');
    else html.classList.remove('dark');

    // 3. Load database configs and finish initializing
    const initApp = async () => {
      try {
        // A. Check if the database is currently empty (wiped) BEFORE seeding
        const isDatabaseWiped = (await db.users.count()) === 0;

        // B. If user exists in localStorage, but DB is wiped, it's a ghost session
        if (user && isDatabaseWiped) {
          logoutUser();
        }

        // C. Now safely seed the database
        await seedDatabase();

        // D. Initialize sync services
        SyncService.init();
        SyncService.syncAll().catch(err => console.error('Auto sync check error:', err));

        // E. Refresh local state
        await refreshStore();
        await refreshShift();
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsInitializing(false);
      }
    };
    initApp();
  }, []);

  // Update theme classes on change
  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) html.classList.add('dark');
    else html.classList.remove('dark');
  }, [isDarkMode]);

  const refreshStore = async () => {
    try {
      const dbStore = await db.stores.toCollection().first();
      if (dbStore) {
        setStore(dbStore);
        sessionStorage.setItem('mokundo_cached_store', JSON.stringify(dbStore));
      }
      
      const dbShift = await db.shifts.where('status').equals('OPEN').first();
      if (dbShift) {
        setCurrentShift(dbShift);
        sessionStorage.setItem('mokundo_cached_shift', JSON.stringify(dbShift));
      } else {
        setCurrentShift(null);
        sessionStorage.removeItem('mokundo_cached_shift');
      }
    } catch (error) {
      console.error('Failed to refresh store/shift', error);
    }
  };

  const refreshShift = async () => {
    let openShift: Shift | undefined = await db.shifts.where('status').equals('OPEN').first();
    if (!openShift) {
      // Auto-create shift so the user never sees the "Buka Shift" modal
      const newId = await db.shifts.add({
        kasir_id: user?.id || 0,
        kasir_nama: user?.nama_lengkap || 'Kasir',
        waktu_buka: new Date().toISOString(),
        modal_awal: 0,
        total_penjualan_tunai: 0,
        total_penjualan_non_tunai: 0,
        status: 'OPEN',
        sync_status: 'PENDING',
      });
      openShift = await db.shifts.get(newId as number);
    }
    if (openShift) {
      setCurrentShift(openShift);
      sessionStorage.setItem('mokundo_cached_shift', JSON.stringify(openShift));
    }
  };

  const loginUser = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('mokundo_user', JSON.stringify(loggedInUser));
    
    // Redirect Kasir strictly to POS screen
    if (loggedInUser.role === 'Kasir') {
      setActiveTabState('transaksi');
      localStorage.setItem('mokundo_activeTab', 'transaksi');
    } else {
      setActiveTabState('dashboard');
      localStorage.setItem('mokundo_activeTab', 'dashboard');
    }
  };

  const logoutUser = () => {
    setUser(null);
    localStorage.removeItem('mokundo_user');
  };

  const setActiveTab = (tab: string) => {
    // Restrict Kasir role from accessing Admin-only tabs
    if (user?.role === 'Kasir' && tab !== 'transaksi' && tab !== 'produk' && tab !== 'pengaturan') {
      return;
    }
    setActiveTabState(tab);
    localStorage.setItem('mokundo_activeTab', tab);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newValue = !prev;
      localStorage.setItem('mokundo_isDarkMode', String(newValue));
      return newValue;
    });
  };

  // Cart operations
  const addToCart = (product: Product, varian: string, notes: string) => {
    setCart(prevCart => {
      const existingIdx = prevCart.findIndex(
        item => item.product.id === product.id && item.selectedVarian === varian
      );

      if (existingIdx > -1) {
        const updated = [...prevCart];
        updated[existingIdx].qty += 1;
        // Merge notes if needed or append
        if (notes && !updated[existingIdx].notes.includes(notes)) {
          updated[existingIdx].notes = updated[existingIdx].notes 
            ? `${updated[existingIdx].notes}, ${notes}` 
            : notes;
        }
        return updated;
      }

      return [...prevCart, { product, qty: 1, selectedVarian: varian, notes }];
    });
  };

  const updateCartQty = (productId: number, varian: string, change: number) => {
    setCart(prevCart => {
      const idx = prevCart.findIndex(
        item => item.product.id === productId && item.selectedVarian === varian
      );
      if (idx === -1) return prevCart;

      const updated = [...prevCart];
      updated[idx].qty += change;

      if (updated[idx].qty <= 0) {
        updated.splice(idx, 1);
      }
      return updated;
    });
  };

  const removeFromCart = (productId: number, varian: string) => {
    setCart(prevCart => 
      prevCart.filter(item => !(item.product.id === productId && item.selectedVarian === varian))
    );
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
  };

  // Cart financial calculations using shared pure utility
  const cartTotals = calculateTotals(
    cart.map(item => ({ price: item.product.harga, qty: item.qty })),
    discountAmount,
    0, // PPN removed
    store?.service_charge ?? 0
  );

  return (
    <AppContext.Provider
      value={{
        user,
        loginUser,
        logoutUser,
        store,
        refreshStore,
        currentShift,
        refreshShift,
        activeTab,
        setActiveTab,
        isDarkMode,
        toggleDarkMode,
        cart,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        cartTotals,
        discountAmount,
        setDiscountAmount,
        platform,
        setPlatform,
        canInstall: !!deferredPrompt,
        installApp,
        isInitializing
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
