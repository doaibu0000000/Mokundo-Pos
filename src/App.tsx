import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './store/AppContext';
import { LoginView } from './modules/auth';
import { MobileLayout } from './app/layout-mobile/layout-mobile';
import { WebLayout } from './app/layout-web/layout-web';
import { SyncService } from './shared/services/syncService';
import { seedDatabase } from './shared/services/db';

// Layout switcher based on viewport width
const LayoutSelector: React.FC = () => {
  const { user, isAuthReady } = useApp();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    // Seed database on first mount
    seedDatabase()
      .then(() => {
        // Initialize synchronization event listeners
        SyncService.init();
        SyncService.syncAll().catch(err => console.error('Auto sync check error:', err));
      })
      .catch(err => console.error('Database seed error:', err));

    // Listen to resize changes
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Wait until auth state is restored from localStorage before rendering anything.
  // This prevents a brief flash of the login screen when the user is already logged in.
  if (!isAuthReady) {
    return null;
  }

  if (!user) {
    return <LoginView />;
  }

  return isDesktop ? <WebLayout /> : <MobileLayout />;
};

function App() {
  return (
    <AppProvider>
      <LayoutSelector />
    </AppProvider>
  );
}

export default App;
