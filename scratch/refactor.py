import re

filepath = 'src/modules/pengaturan/components/PengaturanView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace activeSubTab with activeScreen
content = content.replace(
    "const [activeSubTab, setActiveSubTab] = useState<'profil' | 'keamanan' | 'sync' | 'shift'>('profil');",
    "const [activeScreen, setActiveScreen] = useState<'menu' | 'profil' | 'printer' | 'keamanan' | 'sync' | 'shift'>('menu');"
)

# 2. Extract the main return part
# It starts at: `  return (\n    <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>`
# after the Kasir check block.
# Let's find the exact index.
main_return_start = content.find("  return (\n    <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>\n      \n      {/* Settings layout header */}")

if main_return_start == -1:
    print("Could not find main return block")
    exit(1)

new_render_logic = """
  const renderHeader = (title: string, subtitle: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
      <NeumorphicButton size="sm" onClick={() => setActiveScreen('menu')} style={{ padding: '8px 12px' }}>
        ← Kembali
      </NeumorphicButton>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 800 }}>{title}</h1>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{subtitle}</p>
      </div>
    </div>
  );

  if (activeScreen === 'menu') {
    return (
      <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
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
            onClick={() => setActiveScreen('profil')}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', cursor: 'pointer' }}
          >
            <div className="nm-inset" style={{ padding: '8px', borderRadius: '50%', color: 'var(--accent-blue)' }}><Settings size={20} /></div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>Profil & Pajak Toko</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ubah nama, alamat, pajak</div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard 
            className="nm-button"
            onClick={() => setActiveScreen('printer')}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', cursor: 'pointer' }}
          >
            <div className="nm-inset" style={{ padding: '8px', borderRadius: '50%', color: 'var(--text-primary)' }}><Settings size={20} /></div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>Printer Bluetooth</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Koneksi ke printer thermal</div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard 
            className="nm-button"
            onClick={() => setActiveScreen('keamanan')}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', cursor: 'pointer' }}
          >
            <div className="nm-inset" style={{ padding: '8px', borderRadius: '50%', color: 'var(--accent-orange)' }}><Key size={20} /></div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>Keamanan Sandi</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ganti kata sandi admin</div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard 
            className="nm-button"
            onClick={() => setActiveScreen('sync')}
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
            onClick={() => setActiveScreen('shift')}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', cursor: 'pointer' }}
          >
            <div className="nm-inset" style={{ padding: '8px', borderRadius: '50%', color: 'var(--accent-blue)' }}><FolderLock size={20} /></div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>Rekonsiliasi Shift</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tutup shift & hitung laci</div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard 
            className="nm-button"
            onClick={logoutUser}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', cursor: 'pointer' }}
          >
            <div className="nm-inset" style={{ padding: '8px', borderRadius: '50%', color: 'var(--accent-red)' }}><Power size={20} /></div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--accent-red)' }}>Keluar (Logout)</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Akhiri sesi Anda saat ini</div>
            </div>
          </NeumorphicCard>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
      
      {activeScreen === 'profil' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' }}>
          {renderHeader('Profil & Pajak Toko', 'Ubah nama, alamat, dan pajak')}
          
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <NeumorphicInput
                  label="Service Charge (%)"
                  type="number"
                  value={storeService}
                  onChange={(e) => setStoreService(e.target.value)}
                  required
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Ukuran Kertas Thermal</label>
                  <select
                    value={ukuranKertas}
                    onChange={(e) => setUkuranKertas(e.target.value)}
                    className="nm-input"
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: 'var(--bg-primary)',
                      boxShadow: 'inset 4px 4px 8px var(--shadow-dark), inset -4px -4px 8px var(--shadow-light)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      appearance: 'none'
                    }}
                  >
                    <option value="44mm">44 mm (Mini EDC / Bluetooth)</option>
                    <option value="48mm">48 mm (Kasir Kecil)</option>
                    <option value="57mm">57 mm (Standar Bluetooth)</option>
                    <option value="58mm">58 mm (Printer Warung/GrabFood)</option>
                    <option value="76mm">76 mm (Medium POS)</option>
                    <option value="80mm">80 mm (Restoran/Supermarket - Standar)</option>
                    <option value="112mm">112 mm (Laporan / EDC Besar)</option>
                  </select>
                </div>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>QR Code / Barcode (Opsional)</label>
                <textarea
                  value={qrBarcode}
                  onChange={(e) => setQrBarcode(e.target.value)}
                  placeholder="Masukkan Link URL (misal: wa.me/628... atau namatoko.com)"
                  rows={2}
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

          <NeumorphicCard style={{ width: '100%' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '12px' }}>Ekspor & Impor Data Produk (CSV)</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
              Ekspor daftar produk saat ini ke file spreadsheet CSV, atau impor dari file CSV untuk menambahkan produk baru secara massal.
            </p>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <NeumorphicButton size="sm" onClick={handleExportCSV} style={{ flex: 1, minWidth: '120px' }}>
                <Download size={14} style={{ marginRight: '6px' }} /> Ekspor ke CSV
              </NeumorphicButton>
              
              <label 
                className="nm-button" 
                style={{
                  flex: 1,
                  minWidth: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  boxShadow: '3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Upload size={14} /> Impor dari CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {csvError && (
              <div style={{ color: 'var(--accent-red)', fontSize: '12px', fontWeight: 600, marginTop: '12px' }}>
                ⚠️ {csvError}
              </div>
            )}
            {csvSuccess && (
              <div style={{ color: 'var(--accent-green)', fontSize: '12px', fontWeight: 600, marginTop: '12px' }}>
                ✓ {csvSuccess}
              </div>
            )}
          </NeumorphicCard>
        </div>
      )}

      {activeScreen === 'printer' && (
        <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
        <div style={{ maxWidth: '480px' }}>
          {renderHeader('Keamanan Sandi', 'Ganti kata sandi admin')}
          
          <NeumorphicCard>
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
        </div>
      )}

      {activeScreen === 'sync' && (
        <div style={{ maxWidth: '540px' }}>
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

              <NeumorphicButton type="submit" variant="primary" disabled={isSyncingNow} style={{ marginTop: '8px' }}>
                {isSyncingNow ? 'Sinkronisasi Uji Coba...' : 'Simpan & Hubungkan'}
              </NeumorphicButton>
            </form>
          </NeumorphicCard>
        </div>
      )}

      {activeScreen === 'shift' && (
        <div style={{ maxWidth: '500px' }}>
          {renderHeader('Rekonsiliasi Shift', 'Tutup shift & hitung laci')}
          
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

    </div>
  );
};
"""

content = content[:main_return_start] + new_render_logic

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Successfully refactored PengaturanView.tsx")
