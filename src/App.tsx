import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './store/AppContext';
import { LoginView } from './modules/auth';
import { MobileLayout } from './app/layout-mobile/layout-mobile';
import { WebLayout } from './app/layout-web/layout-web';
import { SyncService } from './shared/services/syncService';
import { NeumorphicModal } from './shared/components/NeumorphicModal';
import { NeumorphicButton } from './shared/components/NeumorphicButton';
import { LogOut } from 'lucide-react';

// Layout switcher based on viewport width
const LayoutSelector: React.FC = () => {
  const { user, isInitializing } = useApp();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    // Listen to resize changes
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleForceLogout = () => setShowLogoutModal(true);
    window.addEventListener('show-force-logout-modal', handleForceLogout);
    return () => window.removeEventListener('show-force-logout-modal', handleForceLogout);
  }, []);

  const handleModalClose = () => {
    setShowLogoutModal(false);
    window.location.reload();
  };

  // Wait for session validation silently to avoid splash screen flash
  if (isInitializing) {
    return <div style={{ height: '100dvh', width: '100vw', backgroundColor: 'var(--bg-default)' }} />;
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <>
      {isDesktop ? <WebLayout /> : <MobileLayout />}
      
      <NeumorphicModal
        isOpen={showLogoutModal}
        onClose={handleModalClose}
        hideCloseButton={true}
      >
        <div style={{ textAlign: 'center', padding: '0.5rem 1rem' }}>
          <div style={{
            width: '64px', height: '64px', margin: '0 auto 1.5rem',
            backgroundColor: 'var(--bg-inset)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--danger)',
            boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.2), inset -3px -3px 6px rgba(255,255,255,0.05)'
          }}>
            <LogOut size={32} />
          </div>
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)', fontSize: '1.25rem' }}>Kata Sandi Diubah</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.5' }}>
            Kata sandi Anda telah diperbarui oleh Admin. Silakan login ulang untuk melanjutkan.
          </p>
          <NeumorphicButton 
            variant="primary" 
            style={{ width: '100%' }}
            onClick={handleModalClose}
          >
            Login Ulang
          </NeumorphicButton>
        </div>
      </NeumorphicModal>
    </>
  );
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
