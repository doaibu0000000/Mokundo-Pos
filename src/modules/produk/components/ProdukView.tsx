import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Download, Upload, AlertCircle, Search, ChevronDown, Check } from 'lucide-react';
import { db, type Product, type Category } from '../../../shared/services/db';
import { NeumorphicCard, NeumorphicButton, NeumorphicInput, NeumorphicModal } from '../../../shared/components';

const formatRupiah = (number: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number);
};

export const ProdukView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'produk' | 'kategori'>('produk');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Products states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productSearch, setProductSearch] = useState('');
  
  // Product Form Modal States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodNama, setProdNama] = useState('');
  const [prodHarga, setProdHarga] = useState('');
  const [prodHPP, setProdHPP] = useState('');
  const [prodStok, setProdStok] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodVarianInput, setProdVarianInput] = useState('');
  const [prodGambarUrl, setProdGambarUrl] = useState('');
  const [prodThreshold, setProdThreshold] = useState('');
  const [prodKategoriId, setProdKategoriId] = useState<number>(0);
  const [prodError, setProdError] = useState('');

  // Category Form Modal States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catNama, setCatNama] = useState('');
  const [catUrutan, setCatUrutan] = useState('');
  const [catError, setCatError] = useState('');

  // Confirm Modal States
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, message: string, onConfirm: () => void}>({
    isOpen: false, 
    message: '', 
    onConfirm: () => {}
  });

  useEffect(() => {
    loadData();
  }, [productSearch]);

  const loadData = async () => {
    // Load categories
    const cats = await db.categories.orderBy('urutan').toArray();
    setCategories(cats);
    if (cats.length > 0 && prodKategoriId === 0) {
      setProdKategoriId(cats[0].id!);
    }

    // Load products
    const prods = await db.products.toArray();
    let filteredProds = prods;
    if (productSearch) {
      const lower = productSearch.toLowerCase();
      filteredProds = prods.filter(p => 
        p.nama.toLowerCase().includes(lower) || 
        p.sku.toLowerCase().includes(lower)
      );
    }
    setProducts(filteredProds);
  };

  // Open product form for edit/new
  const openProductForm = (p: Product | null = null) => {
    setEditingProduct(p);
    setProdError('');
    if (p) {
      setProdNama(p.nama);
      setProdHarga(p.harga.toString());
      setProdHPP(p.HPP.toString());
      setProdStok(p.stok.toString());
      setProdSku(p.sku);
      setProdVarianInput(p.varian.join(', '));
      setProdGambarUrl(p.gambar_url);
      setProdThreshold(p.threshold_stok.toString());
      setProdKategoriId(p.kategori_id);
    } else {
      setProdNama('');
      setProdHarga('');
      setProdHPP('');
      setProdStok('');
      setProdSku(new Date().getTime().toString().slice(-6)); // Generate mock sku
      setProdVarianInput('Normal');
      setProdGambarUrl('');
      setProdThreshold('5');
      if (categories.length > 0) setProdKategoriId(categories[0].id!);
    }
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdError('');

    const harga = parseFloat(prodHarga);
    const HPP = parseFloat(prodHPP);
    const stok = parseInt(prodStok);
    const threshold = parseInt(prodThreshold);

    if (!prodNama || isNaN(harga) || isNaN(HPP) || isNaN(stok) || isNaN(threshold) || !prodSku) {
      setProdError('Harap lengkapi semua field numerik dengan benar');
      return;
    }

    const varian = prodVarianInput
      ? prodVarianInput.split(',').map(v => v.trim()).filter(v => v.length > 0)
      : ['Normal'];

    const payload: Product = {
      nama: prodNama,
      kategori_id: prodKategoriId,
      harga,
      HPP,
      stok,
      sku: prodSku,
      varian,
      gambar_url: prodGambarUrl || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=150',
      threshold_stok: threshold,
    };

    try {
      if (editingProduct) {
        // Log changes if stock changes
        const oldProd = await db.products.get(editingProduct.id!);
        if (oldProd && oldProd.stok !== stok) {
          const type = stok > oldProd.stok ? 'IN' : 'OUT';
          const diff = Math.abs(stok - oldProd.stok);
          await db.stock_logs.add({
            produk_id: editingProduct.id!,
            jenis: type,
            qty: diff,
            keterangan: 'Penyesuaian stok manual',
            tanggal: new Date().toISOString(),
            sync_status: 'PENDING'
          });
        }
        await db.products.update(editingProduct.id!, payload as any);
      } else {
        const newId = await db.products.add(payload);
        // Write initial stock log
        await db.stock_logs.add({
          produk_id: newId as number,
          jenis: 'IN',
          qty: stok,
          keterangan: 'Inisialisasi produk baru',
          tanggal: new Date().toISOString(),
          sync_status: 'PENDING'
        });
      }
      setIsProductModalOpen(false);
      loadData();
    } catch (err: any) {
      setProdError(err.message || 'Gagal menyimpan produk. Periksa duplikasi Barcode.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setProdError("Ukuran gambar terlalu besar! Maksimal 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setProdGambarUrl(event.target.result as string);
        setProdError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const deleteProduct = (id: number) => {
    setConfirmConfig({
      isOpen: true,
      message: 'Apakah Anda yakin ingin menghapus produk ini?',
      onConfirm: async () => {
        await db.products.delete(id);
        loadData();
      }
    });
  };

  // Open category form for edit/new
  const openCategoryForm = (c: Category | null = null) => {
    setEditingCategory(c);
    setCatError('');
    if (c) {
      setCatNama(c.nama);
      setCatUrutan(c.urutan.toString());
    } else {
      setCatNama('');
      setCatUrutan((categories.length + 1).toString());
    }
    setIsCategoryModalOpen(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatError('');

    const urutan = parseInt(catUrutan);
    if (!catNama || isNaN(urutan)) {
      setCatError('Harap isi nama dan urutan dengan benar');
      return;
    }

    const payload: Category = {
      nama: catNama,
      urutan
    };

    try {
      if (editingCategory) {
        await db.categories.update(editingCategory.id!, payload);
      } else {
        await db.categories.add(payload);
      }
      setIsCategoryModalOpen(false);
      loadData();
    } catch (err: any) {
      setCatError('Gagal menyimpan kategori');
    }
  };

  const deleteCategory = (id: number) => {
    setConfirmConfig({
      isOpen: true,
      message: 'Apakah Anda yakin ingin menghapus kategori ini? Semua produk di dalamnya tidak akan terhapus namun kehilangan kategori.',
      onConfirm: async () => {
        await db.categories.delete(id);
        loadData();
      }
    });
  };

  // CSV Import/Export
  const handleExportCSV = () => {
    let csv = 'SKU,Nama,Harga,HPP,Stok,ThresholdStok,Varian,GambarUrl\n';
    products.forEach(p => {
      csv += `"${p.sku}","${p.nama}",${p.harga},${p.HPP},${p.stok},${p.threshold_stok},"${p.varian.join('|')}","${p.gambar_url}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Daftar_Produk_Mokundo_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        // skip header (lines[0])
        let addedCount = 0;
        let defaultCatId = categories.length > 0 ? categories[0].id! : 1;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Simple csv splitter
          const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          if (cols.length < 5) continue;

          const sku = cols[0].replace(/"/g, '').trim();
          const nama = cols[1].replace(/"/g, '').trim();
          const harga = parseFloat(cols[2]);
          const HPP = parseFloat(cols[3]);
          const stok = parseInt(cols[4]);
          const threshold = parseInt(cols[5]) || 5;
          const varianStr = cols[6] ? cols[6].replace(/"/g, '').trim() : 'Normal';
          const gambarUrl = cols[7] ? cols[7].replace(/"/g, '').trim() : '';

          const varian = varianStr.split('|').map(v => v.trim());

          const existing = await db.products.where('sku').equals(sku).first();
          const payload = {
            nama,
            kategori_id: defaultCatId,
            harga,
            HPP,
            stok,
            sku,
            varian,
            gambar_url: gambarUrl,
            threshold_stok: threshold
          };

          if (existing) {
            await db.products.update(existing.id!, payload);
          } else {
            await db.products.add(payload);
          }
          addedCount++;
        }

        alert(`Berhasil mengimpor/memperbarui ${addedCount} produk.`);
        loadData();
      } catch (err) {
        alert('Gagal memproses file CSV. Pastikan format kolom sesuai.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* Seeding Warning Alert */}
      {!isMobile && (
        <div 
          className="nm-inset"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid var(--accent-orange)',
            color: 'var(--accent-orange)',
            marginBottom: '20px',
            fontSize: '13px',
            fontWeight: 600
          }}
        >
          <AlertCircle size={20} />
          <div>
            <span>Pemberitahuan Keamanan:</span> Akun default <code>admin</code> dan <code>kasir</code> aktif. Silakan ubah password bawaan Anda di menu <b>Pengaturan</b>.
          </div>
        </div>
      )}

      {/* Navigation tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '16px',
          flexShrink: 0
        }}
      >
        <div 
          style={{ 
            display: 'flex', 
            gap: '8px',
            width: isMobile ? '100%' : 'auto',
            maxWidth: '100%'
          }}
        >
          {isMobile ? (
            <div style={{ position: 'relative', display: 'flex', flexShrink: 0 }}>
              <NeumorphicButton 
                active={true} 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 16px' }}
              >
                <span style={{ whiteSpace: 'nowrap', fontSize: '14px', fontWeight: 600 }}>
                  {activeSubTab === 'produk' ? 'Produk' : 'Kategori'}
                </span>
                <span style={{ fontSize: '10px', flexShrink: 0, marginLeft: '8px', transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
              </NeumorphicButton>
              
              {isDropdownOpen && (
                <>
                  <div 
                    style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 40 }}
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div 
                    className="nm-button anim-dropdown"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '12px',
                      padding: '8px',
                      borderRadius: 'var(--radius-lg)',
                      zIndex: 50,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      minWidth: '160px',
                      background: 'var(--bg-surface)',
                      boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2), var(--shadow-out)',
                      border: '1px solid rgba(0,0,0,0.08)'
                    }}
                  >
                    <NeumorphicButton 
                      className="anim-dropdown-item"
                      active={activeSubTab === 'produk'} 
                      onClick={() => {
                        setActiveSubTab('produk');
                        setIsDropdownOpen(false);
                      }}
                      style={{ padding: '10px 16px', justifyContent: 'center', animationDelay: '0ms' }}
                    >
                      Produk
                    </NeumorphicButton>
                    <NeumorphicButton 
                      className="anim-dropdown-item"
                      active={activeSubTab === 'kategori'} 
                      onClick={() => {
                        setActiveSubTab('kategori');
                        setIsDropdownOpen(false);
                      }}
                      style={{ padding: '10px 16px', justifyContent: 'center', animationDelay: '50ms' }}
                    >
                      Kategori
                    </NeumorphicButton>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <NeumorphicButton active={activeSubTab === 'produk'} onClick={() => setActiveSubTab('produk')} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                Kelola Produk
              </NeumorphicButton>
              <NeumorphicButton active={activeSubTab === 'kategori'} onClick={() => setActiveSubTab('kategori')} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                Kelola Kategori
              </NeumorphicButton>
            </>
          )}

          {activeSubTab === 'produk' && (
            <NeumorphicButton variant="success" onClick={() => openProductForm(null)} style={{ flex: isMobile ? 1 : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0, padding: isMobile ? '10px 8px' : undefined }}>
              <Plus size={16} style={{ flexShrink: 0 }} /> 
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: isMobile ? '13px' : 'inherit', marginLeft: '6px' }}>
                Tambah Produk
              </span>
            </NeumorphicButton>
          )}

          {activeSubTab === 'kategori' && (
            <NeumorphicButton variant="success" onClick={() => openCategoryForm(null)} style={{ flex: isMobile ? 1 : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0, padding: isMobile ? '10px 8px' : undefined }}>
              <Plus size={16} style={{ flexShrink: 0 }} /> 
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: isMobile ? '13px' : 'inherit', marginLeft: '6px' }}>
                Tambah Kategori
              </span>
            </NeumorphicButton>
          )}
        </div>

        {/* Action Button Row (Desktop Exports) */}
        {!isMobile && activeSubTab === 'produk' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <NeumorphicButton size="sm" onClick={handleExportCSV}>
              <Download size={14} /> Export CSV
            </NeumorphicButton>
            
            <label className="nm-button" style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '12px',
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer'
            }}>
              <Upload size={14} /> Import CSV
              <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
            </label>
          </div>
        )}
      </div>

      {/* PRODUCTS TAB VIEW */}
      {activeSubTab === 'produk' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ marginBottom: '16px', flexShrink: 0 }}>
            <NeumorphicInput
              icon={<Search size={18} color="var(--text-secondary)" />}
              placeholder="Cari Barcode/Produk..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
          </div>

          {/* Products List Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, paddingBottom: '20px', paddingRight: '4px', margin: '0 -4px' }}>
            {products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                Belum ada produk terdaftar. Tambahkan produk atau gunakan import CSV.
              </div>
            ) : (
              products.map(p => {
                const category = categories.find(c => c.id === p.kategori_id);
                const isLowStock = p.stok <= p.threshold_stok;
                return (
                  <NeumorphicCard
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '8px',
                          backgroundImage: `url(${p.gambar_url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundColor: 'var(--bg-inset)'
                        }}
                      />
                      <div>
                        <h4 style={{ fontWeight: 800, fontSize: '14px' }}>
                          {p.nama} <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>({p.sku})</span>
                        </h4>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', flexWrap: 'wrap' }}>
                          <span>Kategori: <b>{category?.nama || 'Uncategorized'}</b></span>
                          <span>HPP: <b>{formatRupiah(p.HPP)}</b></span>
                          <span>Jual: <b>{formatRupiah(p.harga)}</b></span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {/* Stock Level Warning indicators */}
                      <span 
                        className="nm-inset"
                        style={{
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-pill)',
                          fontSize: '11px',
                          fontWeight: 800,
                          backgroundColor: isLowStock ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-inset)',
                          border: isLowStock ? '1px solid var(--accent-red)' : 'none',
                          color: isLowStock ? 'var(--accent-red)' : 'var(--text-primary)'
                        }}
                      >
                        Stok: {p.stok}
                      </span>

                      {/* Edit Delete tools */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <NeumorphicButton size="sm" onClick={() => openProductForm(p)} style={{ width: '32px', height: '32px', padding: 0 }}>
                          <Edit2 size={12} />
                        </NeumorphicButton>
                        <NeumorphicButton size="sm" onClick={() => deleteProduct(p.id!)} style={{ width: '32px', height: '32px', padding: 0, color: 'var(--accent-red)' }}>
                          <Trash2 size={12} />
                        </NeumorphicButton>
                      </div>
                    </div>
                  </NeumorphicCard>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* CATEGORIES TAB VIEW */}
      {activeSubTab === 'kategori' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, paddingBottom: '20px', paddingRight: '4px', margin: '0 -4px' }}>
          {categories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              Belum ada kategori terdaftar. Klik "+ Tambah Kategori".
            </div>
          ) : (
            categories.map(c => (
              <NeumorphicCard
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px'
                }}
              >
                <div>
                  <h4 style={{ fontWeight: 800, fontSize: '15px' }}>{c.nama}</h4>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Urutan Tampil: #{c.urutan}</span>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <NeumorphicButton size="sm" onClick={() => openCategoryForm(c)} style={{ width: '32px', height: '32px', padding: 0 }}>
                    <Edit2 size={12} />
                  </NeumorphicButton>
                  <NeumorphicButton size="sm" onClick={() => deleteCategory(c.id!)} style={{ width: '32px', height: '32px', padding: 0, color: 'var(--accent-red)' }}>
                    <Trash2 size={12} />
                  </NeumorphicButton>
                </div>
              </NeumorphicCard>
            ))
          )}
        </div>
      )}

      {/* PRODUCT FORM MODAL */}
      <NeumorphicModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? 'Ubah Produk' : 'Tambah Produk Baru'}
      >
        <form onSubmit={handleProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {/* Image Uploader - Left Side */}
            <div style={{ flexShrink: 0 }}>
              <label 
                className="nm-inset"
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                  border: 'var(--border-width-hc) solid var(--border-high-contrast)',
                }}
              >
                {prodGambarUrl ? (
                  <img src={prodGambarUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <Upload size={24} />
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center', padding: '0 4px' }}>Foto Produk</span>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  style={{ display: 'none' }} 
                />
              </label>
            </div>

            {/* Right Side - Nama, Kategori, Barcode */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
              <NeumorphicInput
                label="Nama Produk"
                placeholder="Masukkan nama"
                value={prodNama}
                onChange={(e) => setProdNama(e.target.value)}
                required
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Kategori
                </label>
                <div
                  className="nm-input"
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '14px',
                    height: '42px',
                    border: 'var(--border-width-hc) solid var(--border-high-contrast)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {categories.find(c => c.id === prodKategoriId)?.nama || 'Pilih Kategori'}
                  </span>
                  <ChevronDown size={16} color="var(--text-secondary)" />
                </div>
                
                {isCategoryDropdownOpen && (
                  <>
                    <div 
                      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }} 
                      onClick={() => setIsCategoryDropdownOpen(false)} 
                    />
                    <div 
                      className="nm-button anim-dropdown"
                      style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: 0, 
                        right: 0, 
                        marginTop: '8px', 
                        zIndex: 1001,
                        borderRadius: 'var(--radius-lg)',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        padding: '8px',
                        background: 'var(--bg-surface)',
                        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2), var(--shadow-out)',
                        border: '1px solid rgba(0,0,0,0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      {categories.map((c, index) => (
                        <NeumorphicButton
                          className="anim-dropdown-item"
                          key={c.id}
                          active={prodKategoriId === c.id}
                          onClick={() => {
                            setProdKategoriId(c.id!);
                            setIsCategoryDropdownOpen(false);
                          }}
                          style={{
                            padding: '10px 12px',
                            justifyContent: 'space-between',
                            width: '100%',
                            animationDelay: `${index * 50}ms`
                          }}
                        >
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.nama}
                          </span>
                          {prodKategoriId === c.id && <Check size={16} color="currentColor" />}
                        </NeumorphicButton>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'flex-end' }}>
            <NeumorphicInput
              label="Harga Modal"
              type="number"
              placeholder="0"
              value={prodHPP}
              onChange={(e) => setProdHPP(e.target.value)}
              required
            />
            <NeumorphicInput
              label="Harga Jual"
              type="number"
              placeholder="0"
              value={prodHarga}
              onChange={(e) => setProdHarga(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'flex-end' }}>
            <NeumorphicInput
              label="Barcode"
              placeholder="Misal: 888001"
              value={prodSku}
              onChange={(e) => setProdSku(e.target.value)}
              required
            />
            <NeumorphicInput
              label="Jumlah Stok"
              type="number"
              placeholder="0"
              value={prodStok}
              onChange={(e) => setProdStok(e.target.value)}
              required
            />
          </div>



          <NeumorphicInput
            label="Daftar Varian (pisahkan koma)"
            placeholder="Misal: Normal, Less Sugar, Large"
            value={prodVarianInput}
            onChange={(e) => setProdVarianInput(e.target.value)}
          />

          {prodError && (
            <div style={{ color: 'var(--accent-red)', fontSize: '12px', fontWeight: 600 }}>
              ⚠️ {prodError}
            </div>
          )}

          <NeumorphicButton type="submit" variant="primary" style={{ marginTop: '10px' }}>
            Simpan Produk
          </NeumorphicButton>
        </form>
      </NeumorphicModal>

      {/* CATEGORY FORM MODAL */}
      <NeumorphicModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={editingCategory ? 'Ubah Kategori' : 'Tambah Kategori Baru'}
      >
        <form onSubmit={handleCategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <NeumorphicInput
            label="Nama Kategori"
            placeholder="Misal: Pasta, Dessert"
            value={catNama}
            onChange={(e) => setCatNama(e.target.value)}
            required
          />

          <NeumorphicInput
            label="Nomor Urutan Tampil"
            type="number"
            placeholder="1"
            value={catUrutan}
            onChange={(e) => setCatUrutan(e.target.value)}
            required
          />

          {catError && (
            <div style={{ color: 'var(--accent-red)', fontSize: '12px', fontWeight: 600 }}>
              ⚠️ {catError}
            </div>
          )}

          <NeumorphicButton type="submit" variant="primary" style={{ marginTop: '10px' }}>
            Simpan Kategori
          </NeumorphicButton>
        </form>
      </NeumorphicModal>

      {/* Confirmation Modal */}
      <NeumorphicModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        title="Konfirmasi"
        width="360px"
        hideCloseButton={true}
      >
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
          {confirmConfig.message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <NeumorphicButton
            onClick={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
            borderRadius="pill"
            style={{ minWidth: '100px' }}
          >
            Batal
          </NeumorphicButton>
          <NeumorphicButton
            variant="danger"
            borderRadius="pill"
            onClick={() => {
              confirmConfig.onConfirm();
              setConfirmConfig({ ...confirmConfig, isOpen: false });
            }}
            style={{ minWidth: '120px' }}
          >
            Ya, Hapus
          </NeumorphicButton>
        </div>
      </NeumorphicModal>

    </div>
  );
};
