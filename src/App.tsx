import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './store/AppContext';
import { LoginView } from './modules/auth';
import { MobileLayout } from './app/layout-mobile/layout-mobile';
import { WebLayout } from './app/layout-web/layout-web';
import { SyncService } from './shared/services/syncService';
import { seedDatabase } from './shared/services/db';

// Layout switcher based on viewport width
const LayoutSelector: React.FC = () => {
  const { user, isInitializing } = useApp();
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

  // Show splash screen while initializing data to prevent flash of wrong screen
  if (isInitializing) {
    return (
      <div style={{ 
        height: '100dvh', 
        width: '100vw', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: 'var(--bg-base)', 
        color: 'var(--text-primary)' 
      }}>
        <div className="nm-flat" style={{ padding: '24px', borderRadius: '50%', marginBottom: '24px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
            <path d="M17 8h1a4 4 0 1 1 0 8h-1"></path>
            <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path>
            <line x1="6" y1="2" x2="6" y2="4"></line>
            <line x1="10" y1="2" x2="10" y2="4"></line>
            <line x1="14" y1="2" x2="14" y2="4"></line>
          </svg>
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Mokundo Kasir</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>Memuat sistem...</p>
      </div>
    );
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
