import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './store/AppContext';
import { LoginView } from './modules/auth';
import { MobileLayout } from './app/layout-mobile/layout-mobile';
import { WebLayout } from './app/layout-web/layout-web';
import { SyncService } from './shared/services/syncService';
// Layout switcher based on viewport width
const LayoutSelector: React.FC = () => {
  const { user, isInitializing } = useApp();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    // Listen to resize changes
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Wait for session validation silently to avoid splash screen flash
  if (isInitializing) {
    return <div style={{ height: '100dvh', width: '100vw', backgroundColor: 'var(--bg-default)' }} />;
  }

  if (!user) {
    return <LoginView />;
  }

  return isDesktop ? <WebLayout /> : <MobileLayout />;
};

function App() {
  useEffect(() => {
    // Initial pull of master data if online
    SyncService.pullMasterData().catch(err => console.error('Initial data pull failed:', err));
  }, []);

  return (
    <AppProvider>
      <LayoutSelector />
    </AppProvider>
  );
}

export default App;
