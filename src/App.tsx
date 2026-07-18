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

  useEffect(() => {
    if (!user) return;
    
    // Polling session validator every 10s as a fallback
    // (guarantees logout even if Supabase Realtime is not explicitly enabled for 'users' table in SQL)
    const sessionInterval = setInterval(async () => {
      if (!navigator.onLine) return;
      try {
        const { SyncService } = await import('./shared/services/syncService');
        const cfg = await SyncService.getSupabaseConfig();
        if (cfg) {
          const res = await fetch(`${cfg.url}/rest/v1/users?id=eq.${user.id}&select=password_hash`, {
            headers: { 'apikey': cfg.key, 'Authorization': `Bearer ${cfg.key}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              const remoteHash = data[0].password_hash;
              const { db } = await import('./shared/services/db');
              const localUser = await db.users.get(user.id!);
              if (localUser && localUser.password_hash !== remoteHash) {
                await db.users.update(user.id!, { password_hash: remoteHash });
                localStorage.removeItem('mokundo_user');
                localStorage.removeItem('mokundo_cart');
                localStorage.removeItem('mokundo_platform');
                localStorage.removeItem('mokundo_activeTab');
                alert('Kata sandi Anda telah diubah oleh Admin. Sesi berakhir, silakan login ulang.');
                window.location.reload();
              }
            }
          }
        }
      } catch (e) {
        // silently fail
      }
    }, 10000);
    
    return () => clearInterval(sessionInterval);
  }, [user]);

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
    // Initial sync and pull on load
    if (navigator.onLine) {
      SyncService.syncAll().then(() => {
        return SyncService.pullMasterData();
      }).then((ok) => {
        if (ok) window.dispatchEvent(new CustomEvent('masterdata-updated'));
      }).catch(err => console.error('Initial sync failed:', err));
      
      // Start listening to instant realtime updates
      SyncService.subscribeToRealtime().catch(err => console.error('Realtime subscription failed:', err));
    }

    // Removed 30-second polling interval - Supabase Realtime handles instant updates
    // without causing any flickering or full data reloads
  }, []);

  return (
    <AppProvider>
      <LayoutSelector />
    </AppProvider>
  );
}

export default App;
