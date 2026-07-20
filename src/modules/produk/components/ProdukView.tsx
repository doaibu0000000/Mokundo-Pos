import React, { useEffect, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, Download, Upload, Search, ChevronDown, Check } from 'lucide-react';
import { db, type Product, type Category } from '../../../shared/services/db';
import { SyncService } from '../../../shared/services/syncService';
import { NeumorphicCard, NeumorphicButton, NeumorphicInput, NeumorphicModal } from '../../../shared/components';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}
import { getCroppedImg } from '../../../utils/cropImage';

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
  const [products, setProducts] = useState<Product[]>(() => {
    const cached = sessionStorage.getItem('mokundo_cached_products');
    return cached ? JSON.parse(cached) : [];
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    const cached = sessionStorage.getItem('mokundo_cached_categories');
    return cached ? JSON.parse(cached) : [];
  });
  const [productSearch, setProductSearch] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(() => {
    return !sessionStorage.getItem('mokundo_cached_products');
  });
  
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

  // Crop states
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [imageSrcToCrop, setImageSrcToCrop] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

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


  // Validation States
  const [focusedErrorField, setFocusedErrorField] = useState<string | null>(null);
  const [focusedCatErrorField, setFocusedCatErrorField] = useState<string | null>(null);

  // --- Global History Back Logic for Popups ---
  const hasPopup = isProductModalOpen || isCropModalOpen || isCategoryModalOpen || confirmConfig.isOpen;
  const prevHasPopup = React.useRef(false);

  useEffect(() => {
    if (hasPopup && !prevHasPopup.current) {
      window.history.pushState({ popupOpen: true }, '');
      prevHasPopup.current = true;
    } else if (!hasPopup && prevHasPopup.current) {
      prevHasPopup.current = false;
      setTimeout(() => {
        if (window.history.state?.popupOpen) {
          window.history.back();
        }
      }, 50);
    }
  }, [hasPopup]);

  useEffect(() => {
    const handlePopState = () => {
      if (prevHasPopup.current) {
        setIsProductModalOpen(false);
        setIsCropModalOpen(false);
        setIsCategoryModalOpen(false);
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  // ----------------------------------------------


  useEffect(() => {
    loadData();
  }, [productSearch]);

  // Auto-refresh when master data is pulled from Supabase (silent, no loading spinner)
  useEffect(() => {
    const handleMasterDataUpdated = () => {
      // Read fresh data from IndexedDB silently (no spinner = no flicker)
      db.categories.orderBy('urutan').toArray().then(cats => {
        setCategories(cats);
        sessionStorage.setItem('mokundo_cached_categories', JSON.stringify(cats));
      });
      db.products.toArray().then(prods => {
        let filteredProds = prods;
        if (productSearch) {
          const lower = productSearch.toLowerCase();
          filteredProds = prods.filter(p =>
            p.nama.toLowerCase().includes(lower) ||
            p.sku.toLowerCase().includes(lower)
          );
        } else {
          sessionStorage.setItem('mokundo_cached_products', JSON.stringify(prods));
        }
        setProducts(filteredProds);
      });
    };
    window.addEventListener('masterdata-updated', handleMasterDataUpdated);

    // Fallback: Poll Supabase every 10 seconds in case Realtime doesn't fire
    const interval = setInterval(() => {
      SyncService.pullMasterData().then(ok => {
        if (ok) window.dispatchEvent(new CustomEvent('masterdata-updated'));
      });
    }, 10000);

    return () => {
      window.removeEventListener('masterdata-updated', handleMasterDataUpdated);
      clearInterval(interval);
    };
  }, [productSearch]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      // Load categories
      const cats = await db.categories.orderBy('urutan').toArray();
      setCategories(cats);
      sessionStorage.setItem('mokundo_cached_categories', JSON.stringify(cats));
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
      } else {
        sessionStorage.setItem('mokundo_cached_products', JSON.stringify(prods));
      }
      setProducts(filteredProds);
    } finally {
      setIsLoadingData(false);
    }
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
    setFocusedErrorField(null);
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdError('');

    const harga = parseFloat(prodHarga);
    const HPP = parseFloat(prodHPP);
    const stok = parseInt(prodStok);
    const threshold = parseInt(prodThreshold);

    if (!prodNama) {
      setFocusedErrorField('nama');
      return;
    }
    if (prodHPP === '' || isNaN(HPP)) {
      setFocusedErrorField('hpp');
      return;
    }
    if (prodHarga === '' || isNaN(harga)) {
      setFocusedErrorField('harga');
      return;
    }
    if (!prodSku) {
      setFocusedErrorField('sku');
      return;
    }
    if (prodStok === '' || isNaN(stok)) {
      setFocusedErrorField('stok');
      return;
    }
    setFocusedErrorField(null);

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
        // Direct push = instant Supabase Realtime trigger, no queue delay
        SyncService.directPush('products', 'UPDATE', editingProduct.id!, { id: editingProduct.id, ...payload }).catch(console.error);
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
        // Direct push = instant Supabase Realtime trigger, no queue delay
        SyncService.directPush('products', 'INSERT', newId as number, { id: newId, ...payload }).catch(console.error);
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

    if (file.size > 5 * 1024 * 1024) {
      setProdError("Ukuran gambar terlalu besar! Maksimal 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageSrcToCrop(event.target.result as string);
        setIsCropModalOpen(true);
        setProdError('');
        e.target.value = ''; // Reset input so same file can be chosen again
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCrop = async () => {
    if (!imgRef.current || !completedCrop) {
      setProdError('Pilih area gambar yang ingin dipotong.');
      return;
    }

    try {
      const croppedImage = await getCroppedImg(imgRef.current, completedCrop);
      setProdGambarUrl(croppedImage);
      setIsCropModalOpen(false);
    } catch (e) {
      console.error(e);
      setProdError('Gagal memotong gambar.');
    }
  };

  const deleteProduct = (id: number) => {
    setConfirmConfig({
      isOpen: true,
      message: 'Apakah Anda yakin ingin menghapus produk ini?',
      onConfirm: async () => {
        await db.products.delete(id);
        loadData();
        // Direct push = instant Supabase Realtime trigger, no queue delay
        SyncService.directPush('products', 'DELETE', id).catch(console.error);
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
    setFocusedCatErrorField(null);
    setIsCategoryModalOpen(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatError('');

    const urutan = parseInt(catUrutan);
    if (!catNama) {
      setFocusedCatErrorField('nama');
      return;
    }
    if (catUrutan === '' || isNaN(urutan)) {
      setFocusedCatErrorField('urutan');
      return;
    }
    setFocusedCatErrorField(null);

    const payload: Category = {
      nama: catNama,
      urutan
    };

    try {
      if (editingCategory) {
        await db.categories.update(editingCategory.id!, payload);
        // Direct push = instant Supabase Realtime trigger, no queue delay
        SyncService.directPush('categories', 'UPDATE', editingCategory.id!, { id: editingCategory.id, ...payload }).catch(console.error);
      } else {
        const newId = await db.categories.add(payload);
        // Direct push = instant Supabase Realtime trigger, no queue delay
        SyncService.directPush('categories', 'INSERT', newId as number, { id: newId, ...payload }).catch(console.error);
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
        // Direct push = instant Supabase Realtime trigger, no queue delay
        SyncService.directPush('categories', 'DELETE', id).catch(console.error);
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
            SyncService.directPush('products', 'UPDATE', existing.id!, { id: existing.id, ...payload }).catch(console.error);
          } else {
            const newId = await db.products.add(payload);
            SyncService.directPush('products', 'INSERT', newId as number, { id: newId, ...payload }).catch(console.error);
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
            <NeumorphicButton 
              variant="success" 
              onClick={() => openProductForm(null)} 
              style={isMobile ? { flex: 1, padding: '10px 8px', minWidth: 0 } : { whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              <Plus size={isMobile ? 16 : 18} style={{ flexShrink: 0 }} /> 
              {isMobile ? (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }}>
                  Tambah Produk
                </span>
              ) : (
                <span>Tambah Produk</span>
              )}
            </NeumorphicButton>
          )}

          {activeSubTab === 'kategori' && (
            <NeumorphicButton 
              variant="success" 
              onClick={() => openCategoryForm(null)} 
              style={isMobile ? { flex: 1, padding: '10px 8px', minWidth: 0 } : { whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              <Plus size={isMobile ? 16 : 18} style={{ flexShrink: 0 }} /> 
              {isMobile ? (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }}>
                  Tambah Kategori
                </span>
              ) : (
                <span>Tambah Kategori</span>
              )}
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
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
            gap: '16px', 
            overflowY: 'auto', 
            flex: 1, 
            padding: '16px', /* Add padding all around so shadows aren't clipped */
            margin: '-16px', /* Compensate margin to align with parent if needed, or leave it inside */
            paddingBottom: '32px', 
            alignContent: 'start',
            backgroundColor: 'var(--bg-surface)' /* Ensure background matches cards for full Neumorphism */
          }}>
            {isLoadingData ? (
              <></>
            ) : products.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
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
                      flexDirection: 'column',
                      padding: '12px',
                      position: 'relative'
                    }}
                  >
                    {/* Product Photo */}
                    <div
                      style={{
                        width: '100%',
                        paddingTop: '100%', // 1:1 aspect ratio
                        backgroundImage: `url(${p.gambar_url || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=150'})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '10px'
                      }}
                    />

                    {/* Stock Indicator */}
                    <div 
                      style={{ 
                        position: 'absolute', 
                        top: '18px', 
                        right: '18px',
                        fontSize: '9px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-pill)',
                        backgroundColor: isLowStock ? 'var(--accent-red)' : 'var(--bg-inset)',
                        color: isLowStock ? '#fff' : 'var(--text-secondary)'
                      }}
                    >
                      Stok: {p.stok}
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.2, height: '32px', overflow: 'hidden' }}>
                        {p.nama}
                      </h4>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        ({p.sku})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        <span>Kat: {category?.nama || '-'}</span>
                        <span>M: {formatRupiah(p.HPP)}</span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '4px' }}>
                        J: {formatRupiah(p.harga)}
                      </div>
                    </div>

                    {/* Action buttons at bottom */}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '12px', justifyContent: 'flex-end' }}>
                      <NeumorphicButton size="sm" onClick={() => openProductForm(p)} style={{ width: '32px', height: '32px', padding: 0 }}>
                        <Edit2 size={12} />
                      </NeumorphicButton>
                      <NeumorphicButton size="sm" onClick={() => deleteProduct(p.id!)} style={{ width: '32px', height: '32px', padding: 0, color: 'var(--accent-red)' }}>
                        <Trash2 size={12} />
                      </NeumorphicButton>
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
          {isLoadingData ? (
            <></>
          ) : categories.length === 0 ? (
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
        <form noValidate onSubmit={handleProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
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
                error={focusedErrorField === 'nama'}
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
              error={focusedErrorField === 'hpp'}
            />
            <NeumorphicInput
              label="Harga Jual"
              type="number"
              placeholder="0"
              value={prodHarga}
              onChange={(e) => setProdHarga(e.target.value)}
              error={focusedErrorField === 'harga'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'flex-end' }}>
            <NeumorphicInput
              label="Barcode"
              placeholder="Misal: 888001"
              value={prodSku}
              onChange={(e) => setProdSku(e.target.value)}
              error={focusedErrorField === 'sku'}
            />
            <NeumorphicInput
              label="Jumlah Stok"
              type="number"
              placeholder="0"
              value={prodStok}
              onChange={(e) => setProdStok(e.target.value)}
              error={focusedErrorField === 'stok'}
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
        <form noValidate onSubmit={handleCategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <NeumorphicInput
            label="Nama Kategori"
            placeholder="Misal: Pasta, Dessert"
            value={catNama}
            onChange={(e) => setCatNama(e.target.value)}
            error={focusedCatErrorField === 'nama'}
          />

          <NeumorphicInput
            label="Nomor Urutan Tampil"
            type="number"
            placeholder="1"
            value={catUrutan}
            onChange={(e) => setCatUrutan(e.target.value)}
            error={focusedCatErrorField === 'urutan'}
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

      {/* Crop Modal */}
      <NeumorphicModal isOpen={isCropModalOpen} onClose={() => setIsCropModalOpen(false)} title="Potong Gambar" hideCloseButton>
        <div style={{ width: '100%', maxHeight: '400px', display: 'flex', justifyContent: 'center', background: '#333', borderRadius: 'var(--radius-md)', overflow: 'auto', padding: '10px' }}>
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={1}
            circularCrop={false}
          >
            <img 
              ref={imgRef} 
              src={imageSrcToCrop} 
              alt="Crop" 
              style={{ maxHeight: '350px', objectFit: 'contain' }} 
              crossOrigin="anonymous" 
              onLoad={(e) => {
                const { width, height } = e.currentTarget;
                setCrop(centerAspectCrop(width, height, 1));
              }}
            />
          </ReactCrop>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <NeumorphicButton style={{ flex: 1, justifyContent: 'center' }} onClick={() => setIsCropModalOpen(false)}>
            Batal
          </NeumorphicButton>
          <NeumorphicButton variant="primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSaveCrop}>
            Simpan
          </NeumorphicButton>
        </div>
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
