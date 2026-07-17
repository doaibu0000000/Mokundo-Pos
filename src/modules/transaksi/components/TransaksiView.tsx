import React, { useEffect, useState } from 'react';
import { 
  Search, Trash2, Plus, Minus, Tag, CreditCard, 
  Share2, Printer, CheckCircle, ShoppingBag, ShoppingCart 
} from 'lucide-react';
import { useApp } from '../../../store/AppContext';
import { db, type Product, type Category, type Transaction, type TransactionItem } from '../../../shared/services/db';
import { PrintService } from '../../../shared/services/printService';
import { SyncService } from '../../../shared/services/syncService';
import { 
  NeumorphicCard, NeumorphicButton, NeumorphicInput, 
  NeumorphicBottomSheet, NeumorphicModal 
} from '../../../shared/components';

// Format currency helper
const formatRupiah = (number: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number);
};

export const TransaksiView: React.FC = () => {
  const {
    user,
    store,
    currentShift,
    refreshShift,
    cart,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    cartTotals,
    setDiscountAmount,
    platform,
    setPlatform
  } = useApp();

  // State Management
  const [categories, setCategories] = useState<Category[]>(() => {
    const cached = sessionStorage.getItem('mokundo_cached_categories');
    return cached ? JSON.parse(cached) : [];
  });
  const [products, setProducts] = useState<Product[]>(() => {
    const cached = sessionStorage.getItem('mokundo_cached_products');
    return cached ? JSON.parse(cached) : [];
  });
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  


  // Variant Modal
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [selectedVarian, setSelectedVarian] = useState('Normal');
  const [itemNotes, setItemNotes] = useState('');

  // Mobile layout state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);



  // Payment State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'QRIS' | 'DANA' | 'GoPay' | 'OVO' | 'Bank'>('Tunai');
  const [cashPaid, setCashPaid] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [paymentSubmitAttempted, setPaymentSubmitAttempted] = useState(false);
  
  // Receipt State
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null);
  const [completedItems, setCompletedItems] = useState<TransactionItem[]>([]);

  
  // Discount State
  const [discountType, setDiscountType] = useState<'Rp' | '%'>('Rp');
  const [rawDiscountInput, setRawDiscountInput] = useState('');

  // Sync discount
  useEffect(() => {
    const raw = parseFloat(rawDiscountInput) || 0;
    if (discountType === 'Rp') {
      setDiscountAmount(raw);
    } else {
      setDiscountAmount((raw / 100) * cartTotals.subtotal);
    }
  }, [rawDiscountInput, discountType, cartTotals.subtotal, setDiscountAmount]);
  
  // Wake Lock State
  const [wakeLock, setWakeLock] = useState<any>(null);

  // --- Global History Back Logic for Popups ---
  const hasPopup = isCartOpen || isPaymentOpen || !!variantProduct || !!completedTx;
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
        setIsPaymentOpen(false);
        setIsCartOpen(false);
        setVariantProduct(null);
        setCompletedTx(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  // ----------------------------------------------


  // Track window resizing
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch initial categories and products
  useEffect(() => {
    loadCategories();
    loadProducts();
  }, [selectedCategory, searchQuery]);

  // Auto-refresh when master data is pulled from Supabase
  useEffect(() => {
    const handleMasterDataUpdated = () => {
      loadCategories();
      loadProducts();
    };
    window.addEventListener('masterdata-updated', handleMasterDataUpdated);

    // Fallback: Poll Supabase products every 10 seconds in case Realtime doesn't fire
    const interval = setInterval(() => {
      SyncService.pullMasterData().then(ok => {
        if (ok) window.dispatchEvent(new CustomEvent('masterdata-updated'));
      });
    }, 10000);

    return () => {
      window.removeEventListener('masterdata-updated', handleMasterDataUpdated);
      clearInterval(interval);
    };
  }, [selectedCategory, searchQuery]);

  // Wake Lock API Activation
  useEffect(() => {
    requestWakeLock();
    return () => {
      releaseWakeLock();
    };
  }, []);

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        const lock = await (navigator as any).wakeLock.request('screen');
        setWakeLock(lock);
      } catch (err) {
        console.error('Failed to acquire wake lock:', err);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLock) {
      wakeLock.release().then(() => {
        setWakeLock(null);
      });
    }
  };

  const loadCategories = async () => {
    const cats = await db.categories.orderBy('urutan').toArray();
    setCategories(cats);
    sessionStorage.setItem('mokundo_cached_categories', JSON.stringify(cats));
  };

  const loadProducts = async () => {
    let q = db.products.toCollection();
    
    // Perform search filtering
    const items = await q.toArray();
    let filtered = items;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.kategori_id === selectedCategory);
    }

    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.nama.toLowerCase().includes(lower) || 
        p.sku.toLowerCase().includes(lower)
      );
    } else if (selectedCategory === 'all') {
      sessionStorage.setItem('mokundo_cached_products', JSON.stringify(items));
    }

    setProducts(filtered);
  };



  // Add Product to Cart flow
  const handleProductClick = (product: Product) => {
    // If product has variants, prompt modal
    if (product.varian && product.varian.length > 0) {
      setVariantProduct(product);
      setSelectedVarian(product.varian[0]);
      setItemNotes('');
    } else {
      addToCart(product, 'Normal', '');
    }
  };

  const submitVarianSelection = () => {
    if (variantProduct) {
      addToCart(variantProduct, selectedVarian, itemNotes);
      setVariantProduct(null);
    }
  };



  // Cash Payments calculators
  const changeValue = Math.max(0, (parseFloat(cashPaid) || 0) - cartTotals.total);
  
  const handleFastCash = (amount: number) => {
    setCashPaid(amount.toString());
  };

  const handleCheckoutSubmit = async () => {
    setPaymentSubmitAttempted(true);
    setCheckoutError('');

    // Validations
    if (cart.length === 0) return;
    if (paymentMethod === 'Tunai' && (parseFloat(cashPaid) || 0) < cartTotals.total) {
      return;
    }

    try {
      // 1. Double check stock levels
      for (const item of cart) {
        const prod = await db.products.get(item.product.id!);
        if (!prod || prod.stok < item.qty) {
          setCheckoutError(`Stok produk "${item.product.nama || (prod ? prod.nama : '')}" tidak mencukupi (Tersisa: ${prod?.stok || 0})`);
          return;
        }
      }

      // 2. Perform DB transaction updates
      const tId = await db.transaction('rw', [db.products, db.transactions, db.transaction_items, db.shifts, db.stock_logs], async () => {
        // Create transaction row first so we have the txId
        const txId = await db.transactions.add({
          kasir_id: user?.id || 0,
          kasir_nama: user?.nama_lengkap || 'Kasir',
          tanggal: new Date().toISOString(),
          subtotal: cartTotals.subtotal,
          diskon: cartTotals.discount,
          pajak: cartTotals.tax,
          service_charge: cartTotals.serviceCharge,
          total: cartTotals.total,
          cash_paid: paymentMethod === 'Tunai' ? parseFloat(cashPaid) : cartTotals.total,
          cash_change: paymentMethod === 'Tunai' ? changeValue : 0,
          metode_bayar: paymentMethod,
          status: 'COMPLETED',
          platform,
          sync_status: 'PENDING',
          shift_id: currentShift!.id!
        });

        const updatedProducts: any[] = [];
        
        // Decrease stocks & write logs
        for (const item of cart) {
          const prod = await db.products.get(item.product.id!);
          if (prod) {
            const newStock = prod.stok - item.qty;
            await db.products.update(item.product.id!, { stok: newStock });
            updatedProducts.push({ ...prod, stok: newStock });
          }
          
          await db.stock_logs.add({
            produk_id: item.product.id!,
            jenis: 'OUT',
            qty: item.qty,
            keterangan: `Transaksi Penjualan TRX-${txId}`,
            tanggal: new Date().toISOString(),
            sync_status: 'PENDING'
          });
        }

        // Insert transaction items
        for (const item of cart) {
          await db.transaction_items.add({
            transaksi_id: txId as number,
            produk_id: item.product.id!,
            nama_produk: item.product.nama,
            qty: item.qty,
            harga_satuan: item.product.harga,
            varian: item.selectedVarian,
            catatan: item.notes
          });
        }

        // Update shift accumulators
        const currentSalesTunai = currentShift!.total_penjualan_tunai;
        const currentSalesNonTunai = currentShift!.total_penjualan_non_tunai;
        
        if (paymentMethod === 'Tunai') {
          await db.shifts.update(currentShift!.id!, {
            total_penjualan_tunai: currentSalesTunai + cartTotals.total
          });
        } else {
          await db.shifts.update(currentShift!.id!, {
            total_penjualan_non_tunai: currentSalesNonTunai + cartTotals.total
          });
        }

        return { txId, updatedProducts };
      });

      const actualTxId = (tId as any).txId as number;
      const actualUpdatedProducts = (tId as any).updatedProducts as any[];

      // Push real-time stock updates instantly OUTSIDE of the Dexie transaction scope
      for (const prod of actualUpdatedProducts) {
         SyncService.directPush('products', 'UPDATE', prod.id!, prod).catch(console.error);
      }

      // Retrieve written transaction for real-time push and printing
      const txWritten = await db.transactions.get(actualTxId);
      const itemsWritten = await db.transaction_items.where('transaksi_id').equals(actualTxId).toArray();
      
      // Instantly push the transaction to Supabase to trigger realtime events immediately
      if (txWritten) {
          SyncService.directPush('transactions', 'INSERT', actualTxId, txWritten).then(async ok => {
              if (ok) {
                 await db.transactions.update(actualTxId, { sync_status: 'SYNCED' });
                 for (const itm of itemsWritten) {
                    SyncService.directPush('transaction_items', 'INSERT', itm.id!, itm).catch(console.error);
                 }
              }
          }).catch(console.error);
      }

      // Fallback sync for anything else (like stock logs)
      SyncService.syncAll().catch(console.error);

      // Refetch latest shift updates
      await refreshShift();

      // Retrieve written transaction for printing services (Already retrieved above)
      if (txWritten) {
        if (store) {
          if (PrintService.isBluetoothConnected()) {
            PrintService.printViaBluetooth(txWritten, itemsWritten, store).catch(e => {
              console.error('Auto Bluetooth Print Error:', e);
              // Fallback to browser print if bluetooth fails
              PrintService.printViaBrowser(txWritten, itemsWritten, store);
            });
          } else {
            // Otomatis trigger dialog print system browser saat sukses
            PrintService.printViaBrowser(txWritten, itemsWritten, store);
          }
        }
        setCompletedTx(txWritten);
        setCompletedItems(itemsWritten);
      }

      // Clear layout triggers
      clearCart();
      setIsPaymentOpen(false);
      setCashPaid('');
      
      // Refresh products to show updated stock
      await loadProducts();
    } catch (err: any) {
      console.error(err);
      alert('Error Checkout: ' + (err.message || JSON.stringify(err)));
      setCheckoutError('Gagal menyelesaikan transaksi checkout: ' + (err.message || 'Error internal'));
    }
  };



  // Render components
  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
      



      {/* LEFT COLUMN: Products catalog + search */}
      <div 
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden', 
          padding: '20px' 
        }}
      >
        {/* Search header & Barcode section */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '4px', flexWrap: 'wrap' }}>
          
          <div style={{ flex: 1, position: 'relative' }}>
            <NeumorphicInput
              placeholder="Cari menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={18} />}
            />
          </div>


        </div>



        {/* Categories Horizontal Tabs */}
        <div 
          style={{ 
            display: 'flex', 
            gap: '8px', 
            overflowX: 'auto', 
            marginBottom: '16px',
            paddingBottom: '4px',
            scrollbarWidth: 'none'
          }}
        >
          <NeumorphicButton
            size="sm"
            variant={selectedCategory === 'all' ? 'primary' : 'flat'}
            onClick={() => setSelectedCategory('all')}
            borderRadius="pill"
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            Semua Menu
          </NeumorphicButton>
          
          {categories.map(cat => (
            <NeumorphicButton
              key={cat.id}
              size="sm"
              variant={selectedCategory === cat.id ? 'primary' : 'flat'}
              onClick={() => setSelectedCategory(cat.id!)}
              borderRadius="pill"
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {cat.nama}
            </NeumorphicButton>
          ))}
        </div>

        {/* Products Grid Frame */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '16px',
            overflowY: 'auto',
            paddingRight: '6px',
            alignContent: 'start'
          }}
        >
          {products.map(prod => {
            const isLowStock = prod.stok <= prod.threshold_stok;
            return (
              <NeumorphicCard
                key={prod.id}
                hoverable={prod.stok > 0}
                onClick={prod.stok > 0 ? () => handleProductClick(prod) : undefined}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: prod.stok === 0 ? 'not-allowed' : 'pointer',
                  padding: '12px',
                  opacity: prod.stok === 0 ? 0.6 : 1,
                  position: 'relative'
                }}
              >
                {/* Product Photo */}
                <div
                  style={{
                    width: '100%',
                    paddingTop: '100%', // 1:1 aspect ratio
                    backgroundImage: `url(${prod.gambar_url || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=150'})`,
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
                  {prod.stok === 0 ? 'Habis' : `Stok: ${prod.stok}`}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.2, height: '32px', overflow: 'hidden' }}>
                    {prod.nama}
                  </h4>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '4px' }}>
                    {formatRupiah(prod.harga)}
                  </div>
                </div>
              </NeumorphicCard>
            );
          })}
        </div>

        {/* Floating Cart Button for Mobile viewport */}
        {isMobile && cart.length > 0 && (
          <div style={{ position: 'fixed', bottom: '80px', right: '20px', zIndex: 99 }}>
            <NeumorphicButton
              size="lg"
              borderRadius="pill"
              onClick={() => setIsCartOpen(true)}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShoppingCart size={28} color="var(--accent-blue)" />
              <span 
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: 'var(--accent-red)',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 800
                }}
              >
                {cart.reduce((sum, item) => sum + item.qty, 0)}
              </span>
            </NeumorphicButton>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN / MOBILE SHEET: Shopping Cart */}
      {(!isMobile ? (
        // Desktop Cart Panel View
        <div
          className="nm-flat"
          style={{
            width: '380px',
            borderLeft: 'var(--border-width-hc) solid var(--border-high-contrast)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: 'var(--bg-surface)'
          }}
        >
          {CartInnerContent()}
        </div>
      ) : (
        // Mobile Bottom Sheet Cart View
        <NeumorphicBottomSheet
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          title="Keranjang Belanja"
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {CartInnerContent()}
          </div>
        </NeumorphicBottomSheet>
      ))}

      {/* CHOOSE VARIAN OVERLAY MODAL */}
      <NeumorphicModal
        isOpen={!!variantProduct}
        onClose={() => {
          setVariantProduct(null);
          setItemNotes('');
        }}
        title="Pilih Varian"
      >
        {variantProduct && (
          <div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '8px',
                  backgroundImage: `url(${variantProduct.gambar_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              <div>
                <h4 style={{ fontWeight: 800, fontSize: '15px' }}>{variantProduct.nama}</h4>
                <div style={{ fontSize: '14px', color: 'var(--accent-blue)', fontWeight: 700 }}>
                  {formatRupiah(variantProduct.harga)}
                </div>
              </div>
            </div>

            {/* Varian Choices */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Pilihan Varian
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {variantProduct.varian.map(v => (
                  <NeumorphicButton
                    key={v}
                    size="sm"
                    active={selectedVarian === v}
                    onClick={() => setSelectedVarian(v)}
                  >
                    {v}
                  </NeumorphicButton>
                ))}
              </div>
            </div>

            {/* Add spacing for button */}
            <div style={{ marginBottom: '24px' }}></div>
            <NeumorphicButton variant="primary" onClick={submitVarianSelection} style={{ width: '100%' }}>
              Masukkan Keranjang
            </NeumorphicButton>
          </div>
        )}
      </NeumorphicModal>

      {/* CHECKOUT MODAL WINDOW */}
      <NeumorphicModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        title="Proses Pembayaran"
      >
        <div>
          {/* Price Tag Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Pembayaran</span>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '2px' }}>
              {formatRupiah(cartTotals.total)}
            </h2>
          </div>



          {/* Discount input row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <Tag size={16} />
              <span style={{ fontWeight: 700 }}>Diskon</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Type Switcher */}
              <div 
                style={{ 
                  display: 'flex', 
                  backgroundColor: 'var(--bg-inset)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px'
                }}
                className="nm-inset"
              >
                <button
                  type="button"
                  onClick={() => { setDiscountType('Rp'); setRawDiscountInput(''); }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontWeight: 800,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: discountType === 'Rp' ? 'var(--accent-blue)' : 'transparent',
                    color: discountType === 'Rp' ? '#ffffff' : 'var(--text-secondary)',
                    boxShadow: discountType === 'Rp' ? 'var(--shadow-sm)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  Rp
                </button>
                <button
                  type="button"
                  onClick={() => { setDiscountType('%'); setRawDiscountInput(''); }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontWeight: 800,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: discountType === '%' ? 'var(--accent-blue)' : 'transparent',
                    color: discountType === '%' ? '#ffffff' : 'var(--text-secondary)',
                    boxShadow: discountType === '%' ? 'var(--shadow-sm)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  %
                </button>
              </div>
              <div style={{ width: '100px' }}>
                <input
                  type="number"
                  placeholder="0"
                  value={rawDiscountInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setRawDiscountInput('');
                    } else {
                      setRawDiscountInput(Math.max(0, parseFloat(val)).toString());
                    }
                  }}
                  className="nm-input"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '14px',
                    fontWeight: 800,
                    textAlign: 'right',
                    border: '1px solid transparent'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Payment Method chips */}
          <div style={{ marginBottom: '18px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Metode Bayar</span>
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', 
                gap: '8px', 
                marginTop: '8px' 
              }}
            >
              {(['Tunai', 'QRIS', 'DANA', 'GoPay', 'OVO', 'Bank'] as const).map(m => (
                <NeumorphicButton
                  key={m}
                  size="sm"
                  active={paymentMethod === m}
                  onClick={() => {
                    setPaymentMethod(m);
                    if (m !== 'Tunai') setCashPaid('');
                  }}
                  style={{ padding: '8px 4px' }}
                >
                  {m}
                </NeumorphicButton>
              ))}
            </div>
          </div>


          {/* Cash Payment calculator inputs */}
          {paymentMethod === 'Tunai' && (
            <div style={{ marginBottom: '18px' }}>
              <NeumorphicInput
                label="Uang Dibayar (Rp)"
                placeholder="0"
                type="number"
                value={cashPaid}
                onChange={(e) => setCashPaid(e.target.value)}
                autoFocus
                error={paymentSubmitAttempted && (parseFloat(cashPaid) || 0) < cartTotals.total}
              />
              
              {/* Cash suggestion buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '10px' }}>
                <NeumorphicButton size="sm" onClick={() => handleFastCash(cartTotals.total)}>Pas</NeumorphicButton>
                <NeumorphicButton size="sm" onClick={() => handleFastCash(20000)}>20k</NeumorphicButton>
                <NeumorphicButton size="sm" onClick={() => handleFastCash(50000)}>50k</NeumorphicButton>
                <NeumorphicButton size="sm" onClick={() => handleFastCash(100000)}>100k</NeumorphicButton>
              </div>

            </div>
          )}


          {/* Cash Return Info */}
          {paymentMethod === 'Tunai' && (
            <div style={{ marginBottom: '18px' }}>
              <div 
                className="nm-inset"
                style={{ 
                  padding: '12px', 
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Kembalian:</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-green)' }}>
                  {formatRupiah(changeValue)}
                </span>
              </div>
            </div>
          )}

          {checkoutError && (
            <div style={{ color: 'var(--accent-red)', fontSize: '12px', marginBottom: '14px', fontWeight: 600 }}>
              ⚠️ {checkoutError}
            </div>
          )}

          {/* Checkout Triggers */}
          <NeumorphicButton 
            variant="primary" 
            onClick={handleCheckoutSubmit} 
            style={{ width: '100%', padding: '12px' }}
          >
            Bayar & Cetak Struk
          </NeumorphicButton>
        </div>
      </NeumorphicModal>

      {/* RECEIPT & SUCCESS POPUP DIALOG */}
      <NeumorphicModal
        isOpen={!!completedTx}
        onClose={() => setCompletedTx(null)}
      >
        {completedTx && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--accent-green)', display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <CheckCircle size={48} />
            </div>
            
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '2px' }}>Transaksi Selesai!</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>ID Transaksi: TRX-{completedTx.id}</p>

            <div 
              className="nm-inset"
              style={{
                margin: '20px 0',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span>Total Belanja:</span>
                <span style={{ fontWeight: 700 }}>{formatRupiah(completedTx.total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span>Bayar:</span>
                <span>{formatRupiah(completedTx.cash_paid)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderTop: '1px dashed var(--text-muted)', paddingTop: '6px' }}>
                <span>Kembalian:</span>
                <span style={{ fontWeight: 800, color: 'var(--accent-green)' }}>{formatRupiah(completedTx.cash_change)}</span>
              </div>
            </div>

            {/* Printing Options Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              <NeumorphicButton size="sm" onClick={() => PrintService.printViaBrowser(completedTx, completedItems, store!)}>
                <Printer size={16} /> Print Browser
              </NeumorphicButton>

              <NeumorphicButton size="sm" onClick={() => window.open(PrintService.shareWhatsAppReceipt(completedTx, completedItems, store!), '_blank')}>
                <Share2 size={16} /> Kirim WhatsApp
              </NeumorphicButton>

            </div>


          </div>
        )}
      </NeumorphicModal>

    </div>
  );

  // inner cart content sub-component
  function CartInnerContent() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, padding: '16px' }}>
        {/* Cart Header */}
        {!isMobile && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontWeight: 800, fontSize: '16px' }}>Keranjang Belanja</h3>
            {cart.length > 0 && (
              <NeumorphicButton size="sm" onClick={clearCart} style={{ color: 'var(--accent-red)' }}>
                <Trash2 size={14} /> Clear
              </NeumorphicButton>
            )}
          </div>
        )}

        {/* Platform choices */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {(['Dine-in', 'Take Away', 'GrabFood'] as const).map(p => (
              <NeumorphicButton
                key={p}
                size="sm"
                active={platform === p}
                onClick={() => setPlatform(p)}
                style={{ padding: '10px 4px', fontSize: '11px', fontWeight: 800 }}
              >
                {p}
              </NeumorphicButton>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {(['GoFood', 'ShopeeFood', 'TikTok'] as const).map(p => (
              <NeumorphicButton
                key={p}
                size="sm"
                active={platform === p}
                onClick={() => setPlatform(p)}
                style={{ padding: '10px 4px', fontSize: '11px', fontWeight: 800 }}
              >
                {p}
              </NeumorphicButton>
            ))}
          </div>
        </div>

        {/* Cart items list */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          marginBottom: '16px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px',
          padding: '16px',
          margin: '0 -16px'
        }}>
          {cart.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <ShoppingBag size={48} strokeWidth={1} style={{ marginBottom: '10px' }} />
              <p style={{ fontSize: '13px' }}>Keranjang belanja kosong</p>
            </div>
          ) : (
            cart.map(item => {
              const itemTotal = item.product.harga * item.qty;
              return (
                <NeumorphicCard
                  key={`${item.product.id}-${item.selectedVarian}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <h5 style={{ fontSize: '13px', fontWeight: 700 }}>
                        {item.product.nama}
                      </h5>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        Varian: {item.selectedVarian}
                      </span>
                      {item.notes && (
                        <div style={{ fontSize: '10px', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '2px' }}>
                          * {item.notes}
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.product.id!, item.selectedVarian)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '2px' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-blue)' }}>
                      {formatRupiah(itemTotal)}
                    </span>

                    {/* Quantity selectors */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <NeumorphicButton
                        size="sm"
                        onClick={() => updateCartQty(item.product.id!, item.selectedVarian, -1)}
                        style={{ width: '28px', height: '28px', padding: 0 }}
                      >
                        <Minus size={12} />
                      </NeumorphicButton>
                      <span style={{ fontSize: '13px', fontWeight: 700, width: '20px', textAlign: 'center' }}>
                        {item.qty}
                      </span>
                      <NeumorphicButton
                        size="sm"
                        onClick={() => updateCartQty(item.product.id!, item.selectedVarian, 1)}
                        style={{ width: '28px', height: '28px', padding: 0 }}
                      >
                        <Plus size={12} />
                      </NeumorphicButton>
                    </div>
                  </div>
                </NeumorphicCard>
              );
            })
          )}
        </div>
        
        {/* Pricing Math calculations - Fixed at bottom */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed var(--text-muted)', paddingTop: '14px', marginTop: 'auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Subtotal</span>
            <span style={{ fontWeight: 700 }}>{formatRupiah(cartTotals.subtotal)}</span>
          </div>



          {store?.service_charge ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Svc Charge (${store.service_charge}%)</span>
              <span style={{ fontWeight: 700 }}>{formatRupiah(cartTotals.serviceCharge)}</span>
            </div>
          ) : null}

          {/* Total Pay button */}
          <NeumorphicButton
            variant="primary"
            size="lg"
            disabled={cart.length === 0}
            onClick={() => {
              setIsCartOpen(false);
              setPaymentSubmitAttempted(false);
              setIsPaymentOpen(true);
            }}
            style={{ width: '100%', marginTop: '8px', padding: '12px' }}
          >
            <CreditCard size={18} />
            Bayar - {formatRupiah(cartTotals.total)}
          </NeumorphicButton>
        </div>
      </div>
    );
  }
};
