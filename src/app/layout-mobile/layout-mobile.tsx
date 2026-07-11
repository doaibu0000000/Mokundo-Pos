import React, { useEffect, useState } from 'react';
import { 
  Home, ShoppingCart, Coffee, BarChart2, Settings, 
  Sun, Moon, User, LogOut
} from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { db } from '../../shared/services/db';
import { NeumorphicCard, NeumorphicButton } from '../../shared/components';
import { DashboardView } from '../../modules/dashboard';
import { TransaksiView } from '../../modules/transaksi';
import { ProdukView } from '../../modules/produk';
import { LaporanView } from '../../modules/laporan';
import { PengaturanView } from '../../modules/pengaturan';

// Currency formatter
const formatRupiah = (number: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number);
};

export const MobileLayout: React.FC = () => {
  const { 
    user, 
    activeTab, 
    setActiveTab, 
    isDarkMode, 
    toggleDarkMode, 
    currentShift,
    canInstall,
    installApp,
    logoutUser
  } = useApp();

  const [omsetToday, setOmsetToday] = useState(0);
  const [salesCount, setSalesCount] = useState(0);

  useEffect(() => {
    loadHomeStats();
  }, [activeTab]);

  const loadHomeStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const todayTx = await db.transactions
      .where('tanggal')
      .aboveOrEqual(todayStr)
      .toArray();

    let sum = 0;
    let count = 0;
    todayTx.forEach(t => {
      if (t.status === 'COMPLETED') {
        sum += t.total;
        count++;
      }
    });

    setOmsetToday(sum);
    setSalesCount(count);
  };

  // Nav menus matching roles
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: <Home size={20} />, roles: ['Admin', 'Manajer'] },
    { id: 'transaksi', label: 'POS', icon: <ShoppingCart size={20} />, roles: ['Admin', 'Kasir', 'Manajer'] },
    { id: 'produk', label: 'Produk', icon: <Coffee size={20} />, roles: ['Admin', 'Kasir', 'Manajer'] },
    { id: 'laporan', label: 'Laporan', icon: <BarChart2 size={20} />, roles: ['Admin', 'Manajer'] },
    { id: 'pengaturan', label: 'Profil', icon: <Settings size={20} />, roles: ['Admin', 'Manajer'] },
    { id: 'logout', label: 'Keluar', icon: <LogOut size={20} />, roles: ['Kasir'] }
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user?.role || ''));

  // Main navigation view switch
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderGoPayHome();
      case 'transaksi':
        return <TransaksiView />;
      case 'produk':
        return <ProdukView />;
      case 'laporan':
        return <LaporanView />;
      case 'pengaturan':
        return <PengaturanView />;
      default:
        return renderGoPayHome();
    }
  };

  // GoPay Style Home layout
  const renderGoPayHome = () => {
    return (
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
        
        {/* Profile and Theme Toggle header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              className="nm-inset"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-blue)'
              }}
            >
              <User size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Selamat datang,</div>
              <div style={{ fontSize: '14px', fontWeight: 800 }}>{user?.nama_lengkap?.replace(' Utama', '')} ({user?.role})</div>
            </div>
          </div>

          <NeumorphicButton 
            onClick={toggleDarkMode}
            style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0 }}
          >
            {isDarkMode ? <Sun size={18} color="var(--accent-orange)" /> : <Moon size={18} />}
          </NeumorphicButton>
        </div>

        {/* PWA Install Banner */}
        {canInstall && (
          <NeumorphicCard
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--accent-blue)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div>
              <h4 style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>Pasang Aplikasi Mokundo POS</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.4' }}>
                Instal di HP/tablet Anda agar berjalan mandiri di layar penuh tanpa browser dan tetap stabil saat offline.
              </p>
            </div>
            <NeumorphicButton variant="primary" size="sm" onClick={installApp} style={{ width: '100%' }}>
              Instal Aplikasi POS
            </NeumorphicButton>
          </NeumorphicCard>
        )}

        {/* Large Summary Card (GoPay balance-card look) */}
        <NeumorphicCard 
          style={{
            background: 'var(--accent-blue-gradient)',
            color: 'var(--text-on-accent)',
            padding: '24px 20px',
            boxShadow: '4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light)',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <span style={{ fontSize: '11px', opacity: 0.8, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
            Omset Penjualan Hari Ini
          </span>
          <h2 style={{ fontSize: '28px', fontWeight: 900 }}>
            {formatRupiah(omsetToday)}
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', opacity: 0.9, marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '8px' }}>
            <span>Transaksi: <b>{salesCount} Berhasil</b></span>
            <span>Shift: <b>{currentShift ? 'Laci Buka' : 'Laci Tutup'}</b></span>
          </div>
        </NeumorphicCard>



        {/* Dashboard low stock info */}
        <div style={{ flex: 1 }}>
          <DashboardView />
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      
      {/* Scrollable Screen Content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {renderContent()}
      </div>

      {/* Neumorphic Bottom Navigation Bar */}
      <div
        className="nm-flat"
        style={{
          height: '68px',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)',
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          borderWidth: 'var(--border-width-hc) 0 0 0',
          borderStyle: 'solid',
          borderColor: 'var(--border-high-contrast)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '0 12px',
          zIndex: 100
        }}
      >
        {filteredNavItems.map(item => {
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'logout') {
                  if (confirm('Apakah Anda yakin ingin keluar?')) {
                    logoutUser();
                  }
                } else {
                  setActiveTab(item.id);
                }
              }}
              className={isActive ? 'nm-inset' : ''}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                border: 'none',
                background: 'none',
                color: item.id === 'logout' ? 'var(--accent-red)' : (isActive ? 'var(--accent-blue)' : 'var(--text-secondary)'),
                gap: '2px',
                transition: 'all 0.15s ease'
              }}
            >
              {item.icon}
              <span style={{ fontSize: '9px', fontWeight: 800 }}>{item.label}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
};
