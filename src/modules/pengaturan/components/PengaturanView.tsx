import React, { useEffect, useState } from 'react';
import { Settings, Key, Cloud, FolderLock, Power, AlertTriangle } from 'lucide-react';
import { useApp } from '../../../store/AppContext';
import { db, hashPassword } from '../../../shared/services/db';
import { SyncService } from '../../../shared/services/syncService';
import { NeumorphicCard, NeumorphicButton, NeumorphicInput } from '../../../shared/components';

// Format currency helper
const formatRupiah = (number: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number);
};

export const PengaturanView: React.FC = () => {
  const {
    user,
    store,
    currentShift,
    refreshStore,
    refreshShift,
    isHighContrast,
    toggleHighContrast,
    logoutUser,
    canInstall,
    installApp
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'profil' | 'keamanan' | 'sync' | 'shift'>('profil');

  // Profil & Pajak States
  const [storeNama, setStoreNama] = useState('');
  const [storeAlamat, setStoreAlamat] = useState('');
  const [storePPN, setStorePPN] = useState('');
  const [storeService, setStoreService] = useState('');
  const [receiptHeader, setReceiptHeader] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [storeSuccess, setStoreSuccess] = useState('');

  // Password Security States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState('');

  // Supabase Sync States
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [syncSuccess, setSyncSuccess] = useState('');
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  // Cash / Shift Reconciliation States
  const [cashRegister, setCashRegister] = useState('');
  const [shiftSuccess, setShiftSuccess] = useState('');
  const [shiftError, setShiftError] = useState('');

  useEffect(() => {
    if (store) {
      setStoreNama(store.nama);
      setStoreAlamat(store.alamat);
      setStorePPN(store.PPN.toString());
      setStoreService(store.service_charge.toString());
      setReceiptHeader(store.receipt_header);
      setReceiptFooter(store.receipt_footer);
      setSupabaseUrl(store.supabase_url);
      setSupabaseKey(store.supabase_anon_key);
      setSyncEnabled(store.sync_enabled === 1);
    }
  }, [store]);

  // Update Store info
  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setStoreSuccess('');

    const PPN = parseFloat(storePPN);
    const serviceCharge = parseFloat(storeService);

    if (!storeNama || isNaN(PPN) || isNaN(serviceCharge)) {
      alert('Harap isi form pajak dan nama dengan benar');
      return;
    }

    try {
      await db.stores.update(store!.id!, {
        nama: storeNama,
        alamat: storeAlamat,
        PPN,
        service_charge: serviceCharge,
        receipt_header: receiptHeader,
        receipt_footer: receiptFooter
      });
      setStoreSuccess('Pengaturan profil toko berhasil diperbarui!');
      await refreshStore();
    } catch (e) {
      alert('Gagal menyimpan profil toko');
    }
  };

  // Change Password Security
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError('');
    setSecuritySuccess('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setSecurityError('Semua field sandi wajib diisi');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityError('Konfirmasi kata sandi baru tidak cocok');
      return;
    }

    try {
      const dbUser = await db.users.get(user!.id!);
      if (!dbUser) return;

      const oldHash = await hashPassword(oldPassword);
      if (dbUser.password_hash !== oldHash) {
        setSecurityError('Kata sandi lama salah');
        return;
      }

      const newHash = await hashPassword(newPassword);
      await db.users.update(user!.id!, { password_hash: newHash });

      setSecuritySuccess('Kata sandi berhasil diubah! Jangan gunakan sandi default kembali.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      setSecurityError('Gagal memperbarui kata sandi');
    }
  };

  // Save Supabase Sync parameters
  const handleSaveSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncError('');
    setSyncSuccess('');

    try {
      await db.stores.update(store!.id!, {
        supabase_url: supabaseUrl,
        supabase_anon_key: supabaseKey,
        sync_enabled: syncEnabled ? 1 : 0
      });
      
      setSyncSuccess('Pengaturan sinkronisasi berhasil disimpan!');
      await refreshStore();

      // Trigger test sync immediately if enabled
      if (syncEnabled && supabaseUrl && supabaseKey) {
        setIsSyncingNow(true);
        const res = await SyncService.syncAll();
        setIsSyncingNow(false);
        if (res.success) {
          setSyncSuccess(`Sinkronisasi aktif! Berhasil mengunggah ${res.syncedCount} baris data.`);
        }
      }
    } catch (err) {
      setSyncError('Gagal menyimpan kredensial Supabase');
    }
  };

  // Close shift cashier and reconcile balance
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setShiftError('');
    setShiftSuccess('');

    const kasAkhir = parseFloat(cashRegister);
    if (isNaN(kasAkhir) || kasAkhir < 0) {
      setShiftError('Masukkan saldo kas laci akhir yang valid');
      return;
    }

    // Expected cash = modal_awal + total_penjualan_tunai
    const expectedCash = currentShift!.modal_awal + currentShift!.total_penjualan_tunai;
    const variance = kasAkhir - expectedCash;

    try {
      await db.shifts.update(currentShift!.id!, {
        waktu_tutup: new Date().toISOString(),
        kas_akhir: kasAkhir,
        selisih_kas: variance,
        status: 'CLOSED',
        sync_status: 'PENDING'
      });

      setShiftSuccess(`Shift kasir berhasil ditutup. Selisih Kas: ${formatRupiah(variance)}`);
      setCashRegister('');
      await refreshShift();

      // Also trigger cloud sync since shift closed
      SyncService.syncAll().catch(e => console.error(e));
    } catch (e) {
      setShiftError('Gagal melakukan penutupan laci kasir');
    }
  };

  return (
    <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
      
      {/* Settings layout header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Pengaturan Sistem</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Kelola profil, lisensi, sinkronisasi, dan shift laci</p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <NeumorphicButton 
            size="sm"
            active={isHighContrast}
            onClick={toggleHighContrast}
          >
            ♿ High Contrast
          </NeumorphicButton>

          <NeumorphicButton size="sm" onClick={logoutUser} style={{ color: 'var(--accent-red)' }}>
            Keluar (Logout)
          </NeumorphicButton>
        </div>
      </div>

      {/* Tabs navigation panel */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <NeumorphicButton active={activeSubTab === 'profil'} onClick={() => setActiveSubTab('profil')}>
          <Settings size={16} /> Profil & Pajak
        </NeumorphicButton>
        <NeumorphicButton active={activeSubTab === 'keamanan'} onClick={() => setActiveSubTab('keamanan')}>
          <Key size={16} /> Keamanan Sandi
        </NeumorphicButton>
        <NeumorphicButton active={activeSubTab === 'sync'} onClick={() => setActiveSubTab('sync')}>
          <Cloud size={16} /> Sinkronisasi
        </NeumorphicButton>
        <NeumorphicButton active={activeSubTab === 'shift'} onClick={() => setActiveSubTab('shift')}>
          <FolderLock size={16} /> Rekonsiliasi Shift
        </NeumorphicButton>
      </div>

      {/* 1. SHOP PROFILE & TAX TABS */}
      {activeSubTab === 'profil' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' }}>
          {canInstall && (
            <NeumorphicCard>
              <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '8px' }}>Instal Aplikasi Mokundo POS</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
                Pasang aplikasi ini langsung di layar utama HP/tablet Anda untuk berjalan mandiri di layar penuh (full-screen) dan lebih stabil.
              </p>
              <NeumorphicButton variant="primary" onClick={installApp} style={{ width: '100%' }}>
                Instal Sekarang
              </NeumorphicButton>
            </NeumorphicCard>
          )}

          <NeumorphicCard style={{ width: '100%' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px' }}>Pengaturan Toko & Struk</h3>
            
            <form onSubmit={handleSaveStore} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <NeumorphicInput
                label="Nama Toko"
                value={storeNama}
                onChange={(e) => setStoreNama(e.target.value)}
                required
              />
              <NeumorphicInput
                label="Alamat Toko"
                value={storeAlamat}
                onChange={(e) => setStoreAlamat(e.target.value)}
                required
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <NeumorphicInput
                  label="Pajak PPN (%)"
                  type="number"
                  value={storePPN}
                  onChange={(e) => setStorePPN(e.target.value)}
                  required
                />
                <NeumorphicInput
                  label="Service Charge (%)"
                  type="number"
                  value={storeService}
                  onChange={(e) => setStoreService(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Header Struk</label>
                <textarea
                  value={receiptHeader}
                  onChange={(e) => setReceiptHeader(e.target.value)}
                  rows={3}
                  className="nm-input"
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    border: 'var(--border-width-hc) solid var(--border-high-contrast)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Footer Struk</label>
                <textarea
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  rows={3}
                  className="nm-input"
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    border: 'var(--border-width-hc) solid var(--border-high-contrast)'
                  }}
                />
              </div>

              {storeSuccess && (
                <div style={{ color: 'var(--accent-green)', fontSize: '12px', fontWeight: 600 }}>
                  ✓ {storeSuccess}
                </div>
              )}

              <NeumorphicButton type="submit" variant="primary" style={{ marginTop: '8px' }}>
                Simpan Profil Toko
              </NeumorphicButton>
            </form>
          </NeumorphicCard>
        </div>
      )}

      {/* 2. CHANGE PASSWORD SECURITY TABS */}
      {activeSubTab === 'keamanan' && (
        <NeumorphicCard style={{ maxWidth: '480px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '8px' }}>Ganti Kata Sandi</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Amankan akses kasir Anda dengan mengganti kredensial default <code>admin</code> atau <code>kasir</code>.
          </p>

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <NeumorphicInput
              label="Kata Sandi Lama"
              type="password"
              placeholder="Kata sandi saat ini"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
            <NeumorphicInput
              label="Kata Sandi Baru"
              type="password"
              placeholder="Min 5 karakter"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <NeumorphicInput
              label="Konfirmasi Kata Sandi Baru"
              type="password"
              placeholder="Ulangi kata sandi baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {securityError && (
              <div style={{ color: 'var(--accent-red)', fontSize: '12px', fontWeight: 600 }}>
                ⚠️ {securityError}
              </div>
            )}
            {securitySuccess && (
              <div style={{ color: 'var(--accent-green)', fontSize: '12px', fontWeight: 600 }}>
                ✓ {securitySuccess}
              </div>
            )}

            <NeumorphicButton type="submit" variant="primary" style={{ marginTop: '8px' }}>
              Perbarui Kata Sandi
            </NeumorphicButton>
          </form>
        </NeumorphicCard>
      )}

      {/* 3. SUPABASE SYNC CONFIG TABS */}
      {activeSubTab === 'sync' && (
        <NeumorphicCard style={{ maxWidth: '540px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>Koneksi Cloud (Supabase)</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Simpan data offline Anda secara aman di server database cloud pribadi Anda (Gratis).
          </p>

          {/* Sync safety note */}
          <div 
            className="nm-inset"
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-inset)',
              marginBottom: '16px',
              lineHeight: 1.4
            }}
          >
            🔒 <b>Catatan Keamanan RLS:</b> Kunci public anon key bersifat aman dibagikan di browser. Proteksi database Anda bergantung pada pengaturan <b>Row Level Security (RLS)</b> pada PostgreSQL Supabase Anda.
          </div>

          <form onSubmit={handleSaveSync} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <NeumorphicInput
              label="Supabase URL"
              placeholder="https://your-project.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
            />
            <NeumorphicInput
              label="Supabase Public Anon Key"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
            />

            {/* Sync Toggle Switch */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700 }}>Aktifkan Sinkronisasi Otomatis</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Unggah otomatis ke database saat online</div>
              </div>
              
              <NeumorphicButton 
                size="sm"
                active={syncEnabled} 
                onClick={() => setSyncEnabled(!syncEnabled)}
                style={{ width: '48px', padding: '6px 0' }}
              >
                <Power size={16} color={syncEnabled ? 'var(--accent-green)' : 'var(--text-muted)'} />
              </NeumorphicButton>
            </div>

            {syncError && (
              <div style={{ color: 'var(--accent-red)', fontSize: '12px', fontWeight: 600 }}>
                ⚠️ {syncError}
              </div>
            )}
            {syncSuccess && (
              <div style={{ color: 'var(--accent-green)', fontSize: '12px', fontWeight: 600 }}>
                ✓ {syncSuccess}
              </div>
            )}

            <NeumorphicButton type="submit" variant="primary" disabled={isSyncingNow} style={{ marginTop: '8px' }}>
              {isSyncingNow ? 'Sinkronisasi Uji Coba...' : 'Simpan & Hubungkan'}
            </NeumorphicButton>
          </form>
        </NeumorphicCard>
      )}

      {/* 4. CASH RECONCILIATIONS TABS */}
      {activeSubTab === 'shift' && (
        <NeumorphicCard style={{ maxWidth: '500px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>Kas drawer & Rekonsiliasi Kasir</h3>
          
          {currentShift ? (
            <div>
              {/* Active shift metrics summary */}
              <div 
                className="nm-inset" 
                style={{
                  padding: '16px', 
                  borderRadius: 'var(--radius-md)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '8px',
                  marginBottom: '20px',
                  fontSize: '13px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Kasir Aktif:</span>
                  <span style={{ fontWeight: 700 }}>{currentShift.kasir_nama}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Waktu Buka Shift:</span>
                  <span>{new Date(currentShift.waktu_buka).toLocaleString('id-ID')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--text-muted)', paddingTop: '8px', marginTop: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Modal Awal Laci:</span>
                  <span style={{ fontWeight: 700 }}>{formatRupiah(currentShift.modal_awal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--accent-green)' }}>+ Penjualan Tunai:</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{formatRupiah(currentShift.total_penjualan_tunai)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>+ Penjualan Non-Tunai:</span>
                  <span>{formatRupiah(currentShift.total_penjualan_non_tunai)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--text-muted)', paddingTop: '8px', fontSize: '14px', fontWeight: 800 }}>
                  <span>Ekspektasi Kas Laci (Tunai):</span>
                  <span style={{ color: 'var(--accent-blue)' }}>{formatRupiah(currentShift.modal_awal + currentShift.total_penjualan_tunai)}</span>
                </div>
              </div>

              {/* Shift reconciliation form */}
              <form onSubmit={handleCloseShift} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <NeumorphicInput
                  label="Jumlah Uang Tunai Fisik di Laci Akhir (Rp)"
                  placeholder="Hitung uang tunai di laci Anda..."
                  type="number"
                  value={cashRegister}
                  onChange={(e) => setCashRegister(e.target.value)}
                  required
                />
                
                {shiftError && (
                  <div style={{ color: 'var(--accent-red)', fontSize: '12px', fontWeight: 600 }}>
                    ⚠️ {shiftError}
                  </div>
                )}
                
                <NeumorphicButton type="submit" variant="danger" style={{ padding: '12px' }}>
                  Tutup Shift Kasir & Cetak Rekonsiliasi
                </NeumorphicButton>
              </form>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-secondary)' }}>
              <AlertTriangle size={36} color="var(--accent-orange)" style={{ margin: '0 auto 12px auto' }} />
              <p style={{ fontWeight: 700, fontSize: '14px' }}>Laci Kasir Belum Dibuka</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>Silakan buka menu <b>Transaksi (POS)</b> untuk membuka laci kasir dan memulai penjualan.</p>
            </div>
          )}

          {shiftSuccess && (
            <div 
              style={{ 
                color: 'var(--accent-green)', 
                fontSize: '12px', 
                fontWeight: 600, 
                marginTop: '16px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid var(--accent-green)'
              }}
            >
              ✓ {shiftSuccess}
            </div>
          )}
        </NeumorphicCard>
      )}

    </div>
  );
};
