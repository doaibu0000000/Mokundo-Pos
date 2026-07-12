import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, type User, type Store, type Shift, type Product } from '../shared/services/db';
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
  isHighContrast: boolean;
  toggleHighContrast: () => void;
  
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
  platform: 'Dine-in' | 'Take Away' | 'GrabFood' | 'GoFood' | 'ShopeeFood';
  setPlatform: (val: 'Dine-in' | 'Take Away' | 'GrabFood' | 'GoFood' | 'ShopeeFood') => void;
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
  const [store, setStore] = useState<Store | null>(null);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [activeTab, setActiveTabState] = useState<string>(() => {
    return localStorage.getItem('mokundo_activeTab') || 'dashboard';
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false); // Default light
  const [isHighContrast, setIsHighContrast] = useState<boolean>(false);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [platform, setPlatform] = useState<'Dine-in' | 'Take Away' | 'GrabFood' | 'GoFood' | 'ShopeeFood'>('Dine-in');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

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
    
    if (isHighContrast) html.classList.add('high-contrast');
    else html.classList.remove('high-contrast');

    // 3. Load database configs and finish initializing
    const initApp = async () => {
      // Validate session: if IndexedDB was wiped but localStorage survived,
      // the user will be in state but not in the DB. We must force logout.
      if (user) {
        const dbUser = await db.users.where('username').equalsIgnoreCase(user.username).first();
        if (!dbUser) {
          logoutUser();
        }
      }

      await refreshStore();
      await refreshShift();
      setIsInitializing(false);
    };
    initApp();
  }, []);

  // Update theme classes on change
  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) html.classList.add('dark');
    else html.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    const html = document.documentElement;
    if (isHighContrast) html.classList.add('high-contrast');
    else html.classList.remove('high-contrast');
  }, [isHighContrast]);

  const refreshStore = async () => {
    const storeInfo = await db.stores.toCollection().first();
    if (storeInfo) {
      setStore(storeInfo);
    }
  };

  const refreshShift = async () => {
    const openShift = await db.shifts.where('status').equals('OPEN').first();
    if (openShift) {
      setCurrentShift(openShift);
    } else {
      setCurrentShift(null);
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
    // Restrict Kasir role from accessing Admin tabs
    if (user?.role === 'Kasir' && tab !== 'transaksi' && tab !== 'produk') {
      return;
    }
    setActiveTabState(tab);
    localStorage.setItem('mokundo_activeTab', tab);
  };

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);
  const toggleHighContrast = () => setIsHighContrast(prev => !prev);

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
    store?.PPN ?? 11,
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
        isHighContrast,
        toggleHighContrast,
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
