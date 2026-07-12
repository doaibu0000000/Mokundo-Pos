import React from 'react';
import { 
  Home, ShoppingCart, Coffee, BarChart2, Settings, 
  Sun, Moon, LogOut, Coffee as ShopIcon, Download
} from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { NeumorphicButton } from '../../shared/components';
import { DashboardView } from '../../modules/dashboard';
import { TransaksiView } from '../../modules/transaksi';
import { ProdukView } from '../../modules/produk';
import { LaporanView } from '../../modules/laporan';
import { PengaturanView } from '../../modules/pengaturan';

export const WebLayout: React.FC = () => {
  const {
    user,
    activeTab,
    setActiveTab,
    isDarkMode,
    toggleDarkMode,
    isHighContrast,
    toggleHighContrast,
    logoutUser,
    canInstall,
    installApp
  } = useApp();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home size={18} />, roles: ['Admin', 'Manajer'] },
    { id: 'transaksi', label: 'Transaksi (POS)', icon: <ShoppingCart size={18} />, roles: ['Admin', 'Kasir', 'Manajer'] },
    { id: 'produk', label: 'Produk & Stok', icon: <Coffee size={18} />, roles: ['Admin', 'Kasir', 'Manajer'] },
    { id: 'laporan', label: 'Laporan Keuangan', icon: <BarChart2 size={18} />, roles: ['Admin', 'Manajer'] },
    { id: 'pengaturan', label: 'Pengaturan', icon: <Settings size={18} />, roles: ['Admin', 'Manajer'] }
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user?.role || ''));

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'transaksi':
        return <TransaksiView />;
      case 'produk':
        return <ProdukView />;
      case 'laporan':
        return <LaporanView />;
      case 'pengaturan':
        return <PengaturanView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div style={{ display: 'flex', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
      
      {/* Left fixed Sidebar panel */}
      <div
        className="nm-flat"
        style={{
          width: '260px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 16px',
          borderRight: 'var(--border-width-hc) solid var(--border-high-contrast)',
          borderRadius: 0,
          borderTopRightRadius: 'var(--radius-xl)',
          borderBottomRightRadius: 'var(--radius-xl)',
          zIndex: 50,
          backgroundColor: 'var(--bg-surface)'
        }}
      >
        {/* Header Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', paddingLeft: '8px' }}>
          <div
            className="nm-inset"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-blue)',
            }}
          >
            <ShopIcon size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 900, lineHeight: 1.1 }}>Mokundo POS</h2>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>Sistem Kasir UMKM</span>
          </div>
        </div>

        {/* User Card */}
        <div
          className="nm-inset"
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '24px',
            fontSize: '13px'
          }}
        >
          <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{user?.nama_lengkap}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '2px' }}>
            Role: {user?.role}
          </div>
        </div>

        {/* Navigation Sidebar List */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredMenuItems.map(item => {
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={isActive ? 'nm-inset' : 'nm-button'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  width: '100%',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: isActive ? 'var(--accent-blue)' : 'var(--text-primary)',
                  boxShadow: isActive 
                    ? 'inset 2px 2px 4px var(--shadow-dark-inset), inset -2px -2px 4px var(--shadow-light-inset)'
                    : '3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light)',
                  transition: 'all 0.15s ease'
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* PWA Install Button for Desktop */}
        {canInstall && (
          <NeumorphicButton
            variant="primary"
            onClick={installApp}
            style={{ width: '100%', marginBottom: '16px', padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Download size={16} />
            <span style={{ fontSize: '12px', fontWeight: 800 }}>Pasang POS App</span>
          </NeumorphicButton>
        )}

        {/* Sidebar Footer theme configurations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px dashed var(--text-muted)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Dark Mode toggle */}
            <NeumorphicButton
              onClick={toggleDarkMode}
              style={{ flex: 1, padding: '8px 0' }}
            >
              {isDarkMode ? <Sun size={16} color="var(--accent-orange)" /> : <Moon size={16} />}
              <span style={{ fontSize: '11px', marginLeft: '4px' }}>{isDarkMode ? 'Light' : 'Dark'}</span>
            </NeumorphicButton>

            {/* High Contrast toggle */}
            <NeumorphicButton
              active={isHighContrast}
              onClick={toggleHighContrast}
              style={{ flex: 1, padding: '8px 0', fontSize: '11px' }}
            >
              ♿ HC
            </NeumorphicButton>
          </div>

          {/* Logout button */}
          <NeumorphicButton
            onClick={logoutUser}
            style={{ width: '100%', color: 'var(--accent-red)', padding: '10px 0' }}
          >
            <LogOut size={16} />
            <span style={{ fontSize: '12px', marginLeft: '6px' }}>Keluar</span>
          </NeumorphicButton>
        </div>

      </div>

      {/* Right Content View Area */}
      <div style={{ flex: 1, height: '100%', overflow: 'hidden', position: 'relative', backgroundColor: 'var(--bg-base)' }}>
        {renderActiveView()}
      </div>

    </div>
  );
};
