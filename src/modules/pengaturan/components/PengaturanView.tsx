import React, { useEffect, useState } from 'react';
import { Settings, Key, Cloud, FolderLock, Power, AlertTriangle, Sun, Moon, Printer, ReceiptText, Download } from 'lucide-react';
import { useApp } from '../../../store/AppContext';
import { db, hashPassword } from '../../../shared/services/db';
import { SyncService } from '../../../shared/services/syncService';
import { NeumorphicCard, NeumorphicButton, NeumorphicInput, NeumorphicModal } from '../../../shared/components';

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
    logoutUser,
    canInstall,
    installApp,
    isDarkMode,
    toggleDarkMode
  } = useApp();

  const [activeScreen, setActiveScreen] = useState<'menu' | 'profil' | 'printer' | 'keamanan' | 'sync' | 'shift'>('menu');

  const navigateTo = (screen: 'menu' | 'profil' | 'printer' | 'keamanan' | 'sync' | 'shift') => {
    if (screen !== 'menu' && activeScreen === 'menu') {
      window.history.pushState({ screen }, '');
    }
    setActiveScreen(screen);
  };

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    const handlePopState = () => {
      if (activeScreen !== 'menu') {
        setActiveScreen('menu');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeScreen]);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Profil & Pajak States
  const [storeNama, setStoreNama] = useState(store?.nama || '');
  const formatPhone = (phone?: string) => {
    if (!phone) return '081234567890';
    return phone.replace(/Telp:\s*/i, '').replace(/-/g, '').trim();
  };

  const [storeAlamat, setStoreAlamat] = useState(store?.alamat || 'Kp. Surantaka, RT.02/RW.01, Desa Kalijati Timur, Kecamatan Kalijati, Kabupaten Subang, Jawa Barat, 41271');
  const [storeService, setStoreService] = useState(store?.service_charge?.toString() || '0');
  const [receiptHeader, setReceiptHeader] = useState(formatPhone(store?.receipt_header));
  const [receiptFooter, setReceiptFooter] = useState(store?.receipt_footer || '');
  const [ukuranKertas, setUkuranKertas] = useState(store?.ukuran_kertas_struk || '58mm');
  const [showPaperSizeModal, setShowPaperSizeModal] = useState(false);
  const paperSizeLabels: Record<string, string> = {
    '44mm': '44 mm (Mini EDC / Bluetooth)',
    '48mm': '48 mm (Kasir Kecil)',
    '57mm': '57 mm (Standar Bluetooth)',
    '58mm': '58 mm (Printer Warung/GrabFood)',
    '76mm': '76 mm (Medium POS)',
    '80mm': '80 mm (Restoran/Supermarket - Standar)',
    '112mm': '112 mm (Laporan / EDC Besar)'
  };
  const [qrBarcode, setQrBarcode] = useState(store?.qr_barcode || '');
  const [qrPromoText, setQrPromoText] = useState(store?.qr_promo_text || 'Mau pesan lagi tanpa antre atau\ntertarik punya bisnis kopi sendiri?');
  const [qrScanText, setQrScanText] = useState(store?.qr_scan_text || 'Pindai saya!');
  const [receiptThankYou, setReceiptThankYou] = useState(store?.receipt_thankyou_text || 'Thank you for your order!');
  const [receiptFooterBrand, setReceiptFooterBrand] = useState(store?.receipt_footer_brand || '— Surantaka Coffee —');
  const [storeSuccess, setStoreSuccess] = useState('');
  
  // Bluetooth Print State
  const [connectedBluetooth, setConnectedBluetooth] = useState<string | null>(null);
  const [bluetoothError, setBluetoothError] = useState('');
  const [isBluetoothConnecting, setIsBluetoothConnecting] = useState(false);

  // Profil Tab State
  const [profilTab, setProfilTab] = useState<'struk' | 'setting'>('struk');

  // Password Security States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState('');

  // Kasir Password Reset States (Admin only)

  const [selectedKasirId, setSelectedKasirId] = useState<number | ''>('');
  const [kasirNewPassword, setKasirNewPassword] = useState('');
  const [kasirConfirmPassword, setKasirConfirmPassword] = useState('');
  const [kasirPwError, setKasirPwError] = useState('');
  const [kasirPwSuccess, setKasirPwSuccess] = useState('');

  // Supabase Sync States
  const [supabaseUrl, setSupabaseUrl] = useState(store?.supabase_url || '');
  const [supabaseKey, setSupabaseKey] = useState(store?.supabase_anon_key || '');
  const [syncEnabled, setSyncEnabled] = useState(store?.sync_enabled === 1);
  const [syncError, setSyncError] = useState('');
  const [syncSuccess, setSyncSuccess] = useState('');
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  // Cash / Shift Reconciliation States
  const [cashRegister, setCashRegister] = useState('');
  const [shiftSuccess, setShiftSuccess] = useState('');
  const [shiftError, setShiftError] = useState('');


  useEffect(() => {
    import('../../../shared/services/printService').then(({ PrintService }) => {
      setConnectedBluetooth(PrintService.getConnectedBluetoothName());
    });
    
    if (store) {
      setStoreNama(store.nama);
      setStoreAlamat(store.alamat || 'Kp. Surantaka, RT.02/RW.01, Desa Kalijati Timur, Kecamatan Kalijati, Kabupaten Subang, Jawa Barat, 41271');
      setStoreService(store.service_charge?.toString() || '0');
      setReceiptHeader(formatPhone(store.receipt_header));
      setReceiptFooter(store.receipt_footer || '');
      setSupabaseUrl(store.supabase_url || '');
      setSupabaseKey(store.supabase_anon_key || '');
      setSyncEnabled(store.sync_enabled === 1);
      setUkuranKertas(store.ukuran_kertas_struk || '58mm');
      setQrBarcode(store.qr_barcode || '');
      setQrPromoText(store.qr_promo_text || 'Mau pesan lagi tanpa antre atau\ntertarik punya bisnis kopi sendiri?');
      setQrScanText(store.qr_scan_text || 'Pindai saya!');
      setReceiptThankYou(store.receipt_thankyou_text || 'Thank you for your order!');
      setReceiptFooterBrand(store.receipt_footer_brand || '— Surantaka Coffee —');
    }
  }, [store]);

  const handlePairBluetooth = async () => {
    setBluetoothError('');
    setIsBluetoothConnecting(true);
    try {
      const { PrintService } = await import('../../../shared/services/printService');
      const name = await PrintService.connectBluetoothPrinter();
      setConnectedBluetooth(name);
    } catch (e: any) {
      setBluetoothError(e.message);
    } finally {
      setIsBluetoothConnecting(false);
    }
  };

  // Update Store info
  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setStoreSuccess('');

    const serviceCharge = parseFloat(storeService);

    if (!storeNama || isNaN(serviceCharge)) {
      alert('Harap isi form nama dan alamat dengan benar');
      return;
    }

    try {
      await db.stores.update(store!.id!, {
        nama: storeNama,
        alamat: storeAlamat,
        PPN: 0,
        service_charge: serviceCharge,
        receipt_header: receiptHeader,
        receipt_footer: receiptFooter,
        ukuran_kertas_struk: ukuranKertas,
        qr_barcode: qrBarcode,
        qr_promo_text: qrPromoText,
        qr_scan_text: qrScanText,
        receipt_thankyou_text: receiptThankYou,
        receipt_footer_brand: receiptFooterBrand
      });
      if (profilTab === 'setting') {
        setStoreSuccess('Pengaturan kertas thermal berhasil diperbarui!');
      } else {
        setStoreSuccess('Pengaturan profil struk berhasil diperbarui!');
      }
      setTimeout(() => setStoreSuccess(''), 2500);
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

      // Push password baru ke Supabase agar sinkron ke semua device
      if (navigator.onLine) {
        const updatedUser = await db.users.get(user!.id!);
        if (updatedUser) {
          const { SyncService } = await import('../../../shared/services/syncService');
          await SyncService.directPush('users', 'UPDATE', updatedUser.id!, updatedUser);
        }
      }

      // Paksa logout admin agar harus login ulang dengan sandi baru
      localStorage.removeItem('mokundo_user');
      localStorage.removeItem('mokundo_cart');
      localStorage.removeItem('mokundo_platform');
      localStorage.removeItem('mokundo_activeTab');

      setSecuritySuccess('Kata sandi berhasil diubah! Anda wajib login ulang dengan sandi baru.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setSecuritySuccess('');
        window.location.reload(); // Reload agar otomatis diarahkan ke halaman login
      }, 3000);
    } catch (e) {
      setSecurityError('Gagal memperbarui kata sandi');
    }
  };

  // Load kasir list when admin opens keamanan screen
  const loadKasirList = async () => {
    try {
      // 1. Jika online, tarik data user terbaru dari Supabase dulu
      //    agar kasir yang dibuat di device lain masuk ke list lokal
      if (navigator.onLine) {
        try {
          const { SyncService } = await import('../../../shared/services/syncService');
          const supabaseConfig = await SyncService.getSupabaseConfig();
          if (supabaseConfig) {
            const { url: baseUrl, key } = supabaseConfig;
            const res = await fetch(
              `${baseUrl}/rest/v1/users?select=*`,
              { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } }
            );
            if (res.ok) {
              const remoteUsers = await res.json();
              if (Array.isArray(remoteUsers) && remoteUsers.length > 0) {
                for (const ru of remoteUsers) {
                  const localUser = await db.users.get(ru.id);
                  if (localUser) {
                    await db.users.update(ru.id, {
                      ...ru,
                      password_hash: ru.password_hash || localUser.password_hash
                    });
                  } else {
                    await db.users.put(ru);
                  }
                }
              }
            }
          }
        } catch (_) {
          // Gagal pull dari Supabase, lanjut dengan data lokal
        }
      }

      const allUsers = await db.users.toArray();
      const kasirs = allUsers
        .filter(u => u.role === 'Kasir')
        .map(u => ({ id: u.id!, nama_lengkap: u.nama_lengkap, username: u.username }));
      // Auto-select kasir pertama jika belum ada yang dipilih
      if (kasirs.length > 0 && !selectedKasirId) {
        setSelectedKasirId(kasirs[0].id);
      }
    } catch (e) {
      console.error('Gagal memuat daftar kasir', e);
    }
  };

  // Reset password kasir by admin
  const handleResetKasirPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setKasirPwError('');
    setKasirPwSuccess('');

    if (!kasirNewPassword || !kasirConfirmPassword) {
      setKasirPwError('Semua field wajib diisi');
      return;
    }
    if (kasirNewPassword.length < 5) {
      setKasirPwError('Kata sandi minimal 5 karakter');
      return;
    }
    if (kasirNewPassword !== kasirConfirmPassword) {
      setKasirPwError('Konfirmasi kata sandi tidak cocok');
      return;
    }
    let targetKasirId = selectedKasirId;
    if (!targetKasirId) {
      // Fallback: Cari kasir pertama di database lokal jika state belum terisi
      const firstKasir = await db.users.filter(u => u.role === 'Kasir').first();
      if (firstKasir && firstKasir.id) {
        targetKasirId = firstKasir.id;
      } else {
        setKasirPwError('Tidak ada akun kasir ditemukan di database');
        return;
      }
    }

    try {
      const newHash = await hashPassword(kasirNewPassword);
      await db.users.update(targetKasirId as number, { password_hash: newHash });
      
      // Push password baru ke Supabase agar sinkron ke semua device
      if (navigator.onLine) {
        const updatedUser = await db.users.get(targetKasirId as number);
        if (updatedUser) {
          await SyncService.directPush('users', 'UPDATE', updatedUser.id!, updatedUser);
        }
      }

      // Paksa logout kasir jika sedang login di browser yang sama
      const storedUserRaw = localStorage.getItem('mokundo_user');
      if (storedUserRaw) {
        const storedUser = JSON.parse(storedUserRaw);
        if (storedUser.id === targetKasirId) {
          localStorage.removeItem('mokundo_user');
          localStorage.removeItem('mokundo_cart');
          localStorage.removeItem('mokundo_platform');
          localStorage.removeItem('mokundo_activeTab');
        }
      }

      setKasirPwSuccess('Kata sandi kasir berhasil direset! Kasir wajib login ulang dengan sandi baru.');
      setSelectedKasirId('');
      setKasirNewPassword('');
      setKasirConfirmPassword('');
      // Re-load kasir agar auto-select tersedia kembali
      await loadKasirList();
      setTimeout(() => setKasirPwSuccess(''), 4000);
    } catch (e) {
      setKasirPwError('Gagal mereset kata sandi kasir');
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

  const handleManualPullSync = async () => {
    setSyncError('');
    setSyncSuccess('');
    setIsSyncingNow(true);
    
    try {
      const success = await SyncService.pullMasterData();
      if (success) {
        setSyncSuccess('Berhasil menarik data master terbaru dari server!');
        window.dispatchEvent(new CustomEvent('masterdata-updated'));
      } else {
        setSyncError('Gagal menarik data. Pastikan internet aktif dan konfigurasi benar.');
      }
    } catch (err) {
      setSyncError('Terjadi kesalahan saat menarik data.');
    } finally {
      setIsSyncingNow(false);
    }
  };

  // Push ALL local products & categories to Supabase (initial full sync)
  const handlePushAllData = async () => {
    setSyncError('');
    setSyncSuccess('');
    setIsSyncingNow(true);

    try {
      const storeConfig = await db.stores.toCollection().first();
      if (!storeConfig?.supabase_url || !storeConfig?.supabase_anon_key) {
        setSyncError('Isi URL dan Key Supabase terlebih dahulu.');
        setIsSyncingNow(false);
        return;
      }

      const url = storeConfig.supabase_url.replace(/\/$/, '');
      const key = storeConfig.supabase_anon_key;

      const upsert = async (tableName: string, payload: any) => {
        const res = await fetch(`${url}/rest/v1/${tableName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(payload)
        });
        return res.ok || res.status === 201;
      };

      const categories = await db.categories.toArray();
      const products = await db.products.toArray();

      let count = 0;
      for (const cat of categories) {
        if (await upsert('categories', cat)) count++;
      }
      for (const prod of products) {
        if (await upsert('products', prod)) count++;
      }

      // Clear sync queue for products and categories since everything is uploaded
      await db.sync_queue.where('table_name').anyOf(['products', 'categories']).delete();

      setSyncSuccess(`Berhasil mengupload ${count} data (produk + kategori) ke server!`);
    } catch (err) {
      setSyncError('Gagal mengupload data. Periksa koneksi internet.');
    } finally {
      setIsSyncingNow(false);
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
      SyncService.syncAll().catch((err: any) => console.error(err));
    } catch (e) {
      setShiftError('Gagal melakukan penutupan laci kasir');
    }
  };


  const renderHeader = (title: string, subtitle: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, marginBottom: '4px' }}>{title}</h1>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{subtitle}</p>
      </div>
    </div>
  );

  return (
    <div 
      key="pengaturan-container"
      style={{ padding: '20px', height: '100%', overflowY: 'auto', animation: 'fadeIn 0.2s ease-in-out' }}
    >
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
      
      {activeScreen === 'menu' ? (
        <div style={{ animation: 'fadeIn 0.2s ease-in-out' }}>
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div
              className="nm-inset"
              style={{
                width: '56px', height: '56px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent-blue)', padding: '6px'
              }}
            >
              <Settings size={28} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Profil & Pengaturan</h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{user?.nama_lengkap} ({user?.role})</p>
            </div>
          </div>
        )}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
          {canInstall && (
            <NeumorphicCard 
              className="nm-button"
              onClick={installApp}
              style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', cursor: 'pointer', border: '1px solid var(--accent-blue)' }}
            >
              <div className="nm-inset" style={{ padding: '8px', borderRadius: '50%', color: 'var(--accent-blue)' }}><Download size={20} /></div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontWeight: 800, fontSize: '15px' }}>Instal Aplikasi POS</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pasang di layar utama HP/Tablet</div>
              </div>
            </NeumorphicCard>
          )}

          <NeumorphicCard 
            className="nm-button"
            onClick={() => navigateTo('profil')}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', cursor: 'pointer' }}
          >
            <div className="nm-inset" style={{ padding: '8px', borderRadius: '50%', color: 'var(--accent-blue)' }}><ReceiptText size={20} /></div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>Tampilan Struk</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ubah nama dan alamat pada struk</div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard 
            className="nm-button"
            onClick={() => navigateTo('printer')}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', cursor: 'pointer' }}
          >
            <div className="nm-inset" style={{ padding: '8px', borderRadius: '50%', color: 'var(--text-primary)' }}><Printer size={20} /></div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>Printer Bluetooth</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Koneksi ke printer thermal</div>
            </div>
          </NeumorphicCard>

          {user?.role !== 'Kasir' && (
            <NeumorphicCard 
              className="nm-button"
              onClick={() => { navigateTo('keamanan'); loadKasirList(); }}
              style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', cursor: 'pointer' }}
            >
              <div className="nm-inset" style={{ padding: '8px', borderRadius: '50%', color: 'var(--accent-orange)' }}><Key size={20} /></div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontWeight: 800, fontSize: '15px' }}>Keamanan Sandi</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ganti kata sandi admin</div>
              </div>
            </NeumorphicCard>
          )}

          <NeumorphicCard 
            className="nm-button"
            onClick={() => navigateTo('sync')}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', cursor: 'pointer' }}
          >
            <div className="nm-inset" style={{ padding: '8px', borderRadius: '50%', color: 'var(--accent-green)' }}><Cloud size={20} /></div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>Sinkronisasi Cloud</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Backup data ke Supabase</div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard 
            className="nm-button"
            onClick={() => navigateTo('shift')}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', cursor: 'pointer' }}
          >
            <div className="nm-inset" style={{ padding: '8px', borderRadius: '50%', color: 'var(--accent-blue)' }}><FolderLock size={20} /></div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>Rekonsiliasi Shift</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tutup shift & hitung laci</div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800 }}>Akses & Tampilan</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <span style={{ fontSize: '13px' }}>Mode Gelap (Dark Mode)</span>
              <NeumorphicButton 
                size="sm"
                active={isDarkMode}
                onClick={toggleDarkMode}
                style={{ padding: '6px 12px' }}
              >
                {isDarkMode ? <Sun size={14} color="var(--accent-orange)" /> : <Moon size={14} />}
                <span style={{ marginLeft: '6px' }}>{isDarkMode ? 'ON' : 'OFF'}</span>
              </NeumorphicButton>
            </div>
            
            
          </NeumorphicCard>

          {isMobile && (
            <NeumorphicCard 
              className="nm-button"
              onClick={logoutUser}
              style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', cursor: 'pointer', marginTop: '8px' }}
            >
              <div className="nm-inset" style={{ padding: '8px', borderRadius: '50%', color: 'var(--accent-red)' }}><Power size={20} /></div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--accent-red)' }}>Keluar (Logout)</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Akhiri sesi Anda saat ini</div>
              </div>
            </NeumorphicCard>
          )}
        </div>
        </div>
      ) : (
        <>
      {activeScreen === 'profil' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '600px', animation: 'fadeIn 0.2s ease-in-out' }}>
          {renderHeader('Tampilan Struk', 'Ubah nama dan alamat')}
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
            <NeumorphicButton 
              active={profilTab === 'struk'} 
              onClick={() => {
                setProfilTab('struk');
                setStoreSuccess('');
              }}
              style={{ flex: 1, padding: '12px' }}
            >
              Struk
            </NeumorphicButton>
            <NeumorphicButton 
              active={profilTab === 'setting'} 
              onClick={() => {
                setProfilTab('setting');
                setStoreSuccess('');
              }}
              style={{ flex: 1, padding: '12px' }}
            >
              Setting
            </NeumorphicButton>
          </div>

          <NeumorphicCard style={{ width: '100%' }}>
            <form onSubmit={handleSaveStore} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {profilTab === 'struk' && (
                <>
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
              </>
              )}

              {profilTab === 'setting' && (

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Ukuran Kertas Thermal</label>
                  <div
                    onClick={() => setShowPaperSizeModal(true)}
                    className="nm-input"
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-primary)',
                      boxShadow: 'inset 4px 4px 8px var(--shadow-dark), inset -4px -4px 8px var(--shadow-light)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span>{paperSizeLabels[ukuranKertas] || ukuranKertas}</span>
                    <span style={{ fontSize: '10px', opacity: 0.5 }}>▼</span>
                  </div>
                </div>
              </div>
              )}

              {profilTab === 'struk' && (
                <>

              <NeumorphicInput
                label="NO TELP"
                value={receiptHeader}
                onChange={(e) => setReceiptHeader(e.target.value)}
                placeholder="Misal: 081234567890"
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>PROMO / KEMITRAAN</label>
                <textarea
                  value={qrPromoText}
                  onChange={(e) => setQrPromoText(e.target.value)}
                  placeholder="Misal: Mau pesan lagi tanpa antre?"
                  rows={3}
                  className="nm-input"
                  style={{
                    padding: '12px 12px 16px 12px',
                    lineHeight: '1.5',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    border: 'var(--border-width-hc) solid var(--border-high-contrast)',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>TEKS AJAKAN</label>
                <input
                  type="text"
                  value={qrScanText}
                  onChange={(e) => setQrScanText(e.target.value)}
                  placeholder="Misal: Pindai saya!"
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
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>BARCODE</label>
                <textarea
                  value={qrBarcode}
                  onChange={(e) => setQrBarcode(e.target.value)}
                  placeholder="Masukkan Link URL (misal: wa.me/628... atau namatoko.com)"
                  rows={2}
                  className="nm-input"
                  style={{
                    padding: '12px 12px 16px 12px',
                    lineHeight: '1.5',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    border: 'var(--border-width-hc) solid var(--border-high-contrast)',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>TEKS TERIMAKASIH</label>
                <textarea
                  value={receiptThankYou}
                  onChange={(e) => setReceiptThankYou(e.target.value)}
                  placeholder="Misal: Thank you for your order!"
                  rows={2}
                  className="nm-input"
                  style={{
                    padding: '12px 12px 16px 12px',
                    lineHeight: '1.5',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    border: 'var(--border-width-hc) solid var(--border-high-contrast)',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>FOOTER STRUK</label>
                <textarea
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  rows={3}
                  className="nm-input"
                  style={{
                    padding: '12px 12px 16px 12px',
                    lineHeight: '1.5',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    border: 'var(--border-width-hc) solid var(--border-high-contrast)',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>BRAND FOOTER (Opsional)</label>
                <input
                  type="text"
                  value={receiptFooterBrand}
                  onChange={(e) => setReceiptFooterBrand(e.target.value)}
                  placeholder="Misal: — Surantaka Coffee —"
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
              </>
              )}




              <NeumorphicButton type="submit" variant="primary" style={{ marginTop: '8px' }}>
                {profilTab === 'setting' ? 'Simpan Pengaturan Kertas' : 'Simpan Profil Struk'}
              </NeumorphicButton>
            </form>
          </NeumorphicCard>

        </div>
      )}

      {activeScreen === 'printer' && (
        <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeIn 0.2s ease-in-out' }}>
          {renderHeader('Printer Bluetooth', 'Koneksi ke printer thermal')}
          
          <NeumorphicCard>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
              Hubungkan printer thermal Bluetooth Anda. Jika sudah terhubung, struk dapat dicetak langsung tanpa popup konfirmasi browser.
            </p>
            {connectedBluetooth ? (
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--accent-green)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Status: <strong style={{ color: 'var(--accent-green)' }}>Terhubung</strong></div>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{connectedBluetooth}</div>
              </div>
            ) : null}
            {bluetoothError && (
              <div style={{ marginBottom: '16px', color: 'var(--accent-red)', fontSize: '12px', fontWeight: 600 }}>
                {bluetoothError}
              </div>
            )}
            <NeumorphicButton 
              onClick={handlePairBluetooth} 
              style={{ width: '100%', opacity: isBluetoothConnecting ? 0.7 : 1 }}
              disabled={isBluetoothConnecting}
            >
              {isBluetoothConnecting ? 'Sedang Menyandingkan...' : (connectedBluetooth ? 'Hubungkan Ulang Bluetooth' : 'Pair / Hubungkan Bluetooth Printer')}
            </NeumorphicButton>
          </NeumorphicCard>
        </div>
      )}

      {activeScreen === 'keamanan' && (
        <div style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeIn 0.2s ease-in-out' }}>
          {renderHeader('Keamanan Sandi', '')}
          
          <NeumorphicCard>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Key size={16} color="#fff" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14px' }}>Reset Kata Sandi Admin</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Atur ulang password akun admin</div>
                </div>
              </div>

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

          {/* Ganti Sandi Kasir — hanya untuk Admin */}
          {user?.role !== 'Kasir' && (
            <NeumorphicCard>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Key size={16} color="#fff" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14px' }}>Reset Kata Sandi Kasir</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Atur ulang password akun kasir</div>
                </div>
              </div>

              <form onSubmit={handleResetKasirPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                <NeumorphicInput
                  label="Kata Sandi Baru"
                  type="password"
                  placeholder="Min 5 karakter"
                  value={kasirNewPassword}
                  onChange={e => setKasirNewPassword(e.target.value)}
                  required
                />
                <NeumorphicInput
                  label="Konfirmasi Kata Sandi Baru"
                  type="password"
                  placeholder="Ulangi kata sandi baru"
                  value={kasirConfirmPassword}
                  onChange={e => setKasirConfirmPassword(e.target.value)}
                  required
                />

                {kasirPwError && (
                  <div style={{ color: 'var(--accent-red)', fontSize: '12px', fontWeight: 600 }}>⚠️ {kasirPwError}</div>
                )}
                {kasirPwSuccess && (
                  <div style={{ color: 'var(--accent-green)', fontSize: '12px', fontWeight: 600 }}>✓ {kasirPwSuccess}</div>
                )}

                <NeumorphicButton type="submit" style={{ marginTop: '4px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff' }}>
                  Reset Kata Sandi Kasir
                </NeumorphicButton>
              </form>
            </NeumorphicCard>
          )}
        </div>
      )}

      {activeScreen === 'sync' && (
        <div style={{ maxWidth: '540px', display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeIn 0.2s ease-in-out' }}>
          {renderHeader('Sinkronisasi Cloud', 'Backup data ke Supabase')}
          
          <NeumorphicCard>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Simpan data offline Anda secara aman di server database cloud pribadi Anda (Gratis).
            </p>

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

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <NeumorphicButton type="submit" variant="primary" disabled={isSyncingNow} style={{ flex: 1 }}>
                  {isSyncingNow ? 'Menyimpan...' : 'Simpan & Hubungkan'}
                </NeumorphicButton>
                
                <NeumorphicButton 
                  type="button" 
                  disabled={isSyncingNow || !syncEnabled} 
                  onClick={handleManualPullSync}
                  style={{ flex: 1 }}
                >
                  {isSyncingNow ? 'Menarik...' : 'Tarik Data Terbaru'}
                </NeumorphicButton>
              </div>
              {user?.role === 'Admin' && (
                <NeumorphicButton
                  type="button"
                  variant="success"
                  disabled={isSyncingNow || !syncEnabled}
                  onClick={handlePushAllData}
                  style={{ width: '100%', marginTop: '4px' }}
                >
                  {isSyncingNow ? 'Mengupload...' : '☁️ Upload Semua Produk ke Server'}
                </NeumorphicButton>
              )}
            </form>
          </NeumorphicCard>
        </div>
      )}

      {activeScreen === 'shift' && (
        <div style={{ maxWidth: '540px', display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeIn 0.2s ease-in-out' }}>
          {renderHeader('Rekonsiliasi Shift', 'Tutup shift & hitung uang laci')}
          
          <NeumorphicCard>
            {currentShift ? (
              <div>
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
        </div>
      )}
        </>
      )}

      {showPaperSizeModal && (
        <NeumorphicModal
          isOpen={showPaperSizeModal}
          onClose={() => setShowPaperSizeModal(false)}
          title="Pilih Ukuran Kertas"
          width="400px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(paperSizeLabels).map(([val, label]) => (
              <div
                key={val}
                className={ukuranKertas === val ? '' : 'nm-button'}
                onClick={() => {
                  setUkuranKertas(val);
                  setShowPaperSizeModal(false);
                }}
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  backgroundColor: ukuranKertas === val ? 'var(--accent-blue)' : 'var(--bg-primary)',
                  color: ukuranKertas === val ? 'white' : 'var(--text-primary)',
                  fontWeight: ukuranKertas === val ? 800 : 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>{label}</span>
                {ukuranKertas === val && <span style={{ color: 'white' }}>✓</span>}
              </div>
            ))}
          </div>
        </NeumorphicModal>
      )}

      <NeumorphicModal
        isOpen={!!storeSuccess}
        onClose={() => setStoreSuccess('')}
        hideCloseButton={true}
        width="340px"
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '24px 16px 8px 16px',
        }}>
          <div style={{
            width: '80px', height: '80px',
            borderRadius: '50%',
            border: '4px solid rgba(165, 220, 134, 0.2)',
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '24px'
          }}>
            <svg width="80" height="80" style={{ position: 'absolute', top: '-4px', left: '-4px' }}>
              <circle cx="40" cy="40" r="38" fill="none" stroke="#a5dc86" strokeWidth="4" 
                style={{
                  strokeDasharray: 240,
                  strokeDashoffset: 240,
                  animation: 'drawCircle 0.5s ease-in-out forwards',
                  transform: 'rotate(-45deg)',
                  transformOrigin: '50% 50%'
                }} />
            </svg>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#a5dc86" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ zIndex: 10 }}>
              <polyline points="20 6 9 17 4 12" style={{
                strokeDasharray: 50,
                strokeDashoffset: 50,
                animation: 'drawCheck 0.4s 0.3s ease-out forwards'
              }} />
            </svg>
          </div>
          
          <h2 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Sukses!
          </h2>
          <p style={{ margin: 0, fontWeight: 500, fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'center' }}>
            {storeSuccess}
          </p>
        </div>
        <style>{`
          @keyframes drawCircle { 
            0% { stroke-dashoffset: 240; } 
            100% { stroke-dashoffset: 0; } 
          }
          @keyframes drawCheck {
            0% { stroke-dashoffset: 50; }
            100% { stroke-dashoffset: 0; }
          }
        `}</style>
      </NeumorphicModal>

    </div>
  );
};
