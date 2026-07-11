import React, { useEffect, useState } from 'react';
import { 
  Home, ShoppingCart, Coffee, BarChart2, Settings, 
  Sun, Moon, User
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
    currentShift 
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
    { id: 'pengaturan', label: 'Profil', icon: <Settings size={20} />, roles: ['Admin', 'Manajer'] }
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
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflowY: 'auto' }}>
        
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
              <div style={{ fontSize: '14px', fontWeight: 800 }}>{user?.nama_lengkap} ({user?.role})</div>
            </div>
          </div>

          <NeumorphicButton 
            onClick={toggleDarkMode}
            style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0 }}
          >
            {isDarkMode ? <Sun size={18} color="var(--accent-orange)" /> : <Moon size={18} />}
          </NeumorphicButton>
        </div>

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

        {/* Quick Menu Grids */}
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>Menu Cepat</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            
            {/* Quick Button 1: Open POS */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <NeumorphicButton 
                onClick={() => setActiveTab('transaksi')}
                style={{ width: '56px', height: '56px', borderRadius: '50%', padding: 0 }}
              >
                <ShoppingCart size={22} color="var(--accent-blue)" />
              </NeumorphicButton>
              <span style={{ fontSize: '11px', fontWeight: 700, textAlign: 'center' }}>Mulai POS</span>
            </div>

            {/* Quick Button 2: Stock view */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <NeumorphicButton 
                onClick={() => setActiveTab('produk')}
                style={{ width: '56px', height: '56px', borderRadius: '50%', padding: 0 }}
              >
                <Coffee size={22} color="var(--accent-green)" />
              </NeumorphicButton>
              <span style={{ fontSize: '11px', fontWeight: 700, textAlign: 'center' }}>Cek Stok</span>
            </div>

            {/* Quick Button 3: Laporan */}
            {user?.role !== 'Kasir' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <NeumorphicButton 
                  onClick={() => setActiveTab('laporan')}
                  style={{ width: '56px', height: '56px', borderRadius: '50%', padding: 0 }}
                >
                  <BarChart2 size={22} color="var(--accent-orange)" />
                </NeumorphicButton>
                <span style={{ fontSize: '11px', fontWeight: 700, textAlign: 'center' }}>Laporan</span>
              </div>
            )}

            {/* Quick Button 4: Pengaturan */}
            {user?.role !== 'Kasir' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <NeumorphicButton 
                  onClick={() => setActiveTab('pengaturan')}
                  style={{ width: '56px', height: '56px', borderRadius: '50%', padding: 0 }}
                >
                  <Settings size={22} color="var(--text-primary)" />
                </NeumorphicButton>
                <span style={{ fontSize: '11px', fontWeight: 700, textAlign: 'center' }}>Profil Toko</span>
              </div>
            )}

          </div>
        </div>

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
              onClick={() => setActiveTab(item.id)}
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
                color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
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
