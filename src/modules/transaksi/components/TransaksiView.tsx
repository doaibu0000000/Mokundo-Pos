import React, { useEffect, useState } from 'react';
import { 
  Search, Barcode, Trash2, Plus, Minus, Tag, CreditCard, 
  Smartphone, Share2, Printer, CheckCircle, FileText, Sun, ShoppingBag, ShoppingCart 
} from 'lucide-react';
import { useApp } from '../../../store/AppContext';
import { db, type Product, type Category, type Transaction, type TransactionItem } from '../../../shared/services/db';
import { PrintService } from '../../../shared/services/printService';
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
    discountAmount,
    setDiscountAmount,
    platform,
    setPlatform
  } = useApp();

  // State Management
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Barcode / Scanner States
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showScannerMock, setShowScannerMock] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  // Variant Modal
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [selectedVarian, setSelectedVarian] = useState('Normal');
  const [itemNotes, setItemNotes] = useState('');

  // Mobile layout state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Shift Modal State
  const [modalAwalInput, setModalAwalInput] = useState('');
  const [shiftError, setShiftError] = useState('');

  // Payment State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'QRIS' | 'Bank' | 'DANA' | 'GoPay' | 'OVO' | 'ShopeePay'>('Tunai');
  const [cashPaid, setCashPaid] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  
  // Receipt State
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null);
  const [completedItems, setCompletedItems] = useState<TransactionItem[]>([]);
  const [bluetoothName, setBluetoothName] = useState('');
  
  // Wake Lock State
  const [wakeLock, setWakeLock] = useState<any>(null);
  const [wakeLockStatus, setWakeLockStatus] = useState<'Active' | 'Inactive' | 'Unsupported'>('Inactive');

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
        setWakeLockStatus('Active');
        lock.addEventListener('release', () => {
          setWakeLockStatus('Inactive');
        });
      } catch (err) {
        console.error('Failed to acquire wake lock:', err);
        setWakeLockStatus('Inactive');
      }
    } else {
      setWakeLockStatus('Unsupported');
    }
  };

  const releaseWakeLock = () => {
    if (wakeLock) {
      wakeLock.release().then(() => {
        setWakeLock(null);
        setWakeLockStatus('Inactive');
      });
    }
  };

  const loadCategories = async () => {
    const cats = await db.categories.orderBy('urutan').toArray();
    setCategories(cats);
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
    }

    setProducts(filtered);
  };

  // Seeding open shifts
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const modalAwal = parseFloat(modalAwalInput);
    if (isNaN(modalAwal) || modalAwal < 0) {
      setShiftError('Masukkan modal awal yang valid');
      return;
    }

    try {
      await db.shifts.add({
        kasir_id: user?.id || 0,
        kasir_nama: user?.nama_lengkap || 'Kasir',
        waktu_buka: new Date().toISOString(),
        modal_awal: modalAwal,
        total_penjualan_tunai: 0,
        total_penjualan_non_tunai: 0,
        status: 'OPEN',
        sync_status: 'PENDING',
      });
      setShiftError('');
      await refreshShift();
    } catch (err) {
      setShiftError('Gagal membuka shift kasir');
    }
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

  // Barcode Scanning Simulation
  const handleBarcodeSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!barcodeInput) return;

    setScanMessage('');
    const product = await db.products.where('sku').equals(barcodeInput).first();
    
    if (product) {
      handleProductClick(product);
      setScanMessage(`✅ Scanned: ${product.nama}`);
      setBarcodeInput('');
    } else {
      setScanMessage('❌ SKU tidak ditemukan');
    }
  };

  // Cash Payments calculators
  const changeValue = Math.max(0, (parseFloat(cashPaid) || 0) - cartTotals.total);
  
  const handleFastCash = (amount: number) => {
    setCashPaid(amount.toString());
  };

  const handleCheckoutSubmit = async () => {
    setCheckoutError('');

    // Validations
    if (cart.length === 0) return;
    if (paymentMethod === 'Tunai' && (parseFloat(cashPaid) || 0) < cartTotals.total) {
      setCheckoutError('Uang tunai dibayarkan kurang dari total belanja');
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
        // Decrease stocks & write logs
        for (const item of cart) {
          const prod = await db.products.get(item.product.id!);
          if (prod) {
            const newStock = prod.stok - item.qty;
            await db.products.update(item.product.id!, { stok: newStock });
          }
          
          await db.stock_logs.add({
            produk_id: item.product.id!,
            jenis: 'OUT',
            qty: item.qty,
            keterangan: `Transaksi Penjualan TRX-${tId}`,
            tanggal: new Date().toISOString(),
            sync_status: 'PENDING'
          });
        }

        // Create transaction row
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

        return txId;
      });

      // Refetch latest shift updates
      await refreshShift();

      // Retrieve written transaction for printing services
      const txWritten = await db.transactions.get(tId as number);
      const itemsWritten = await db.transaction_items.where('transaksi_id').equals(tId as number).toArray();
      
      if (txWritten) {
        setCompletedTx(txWritten);
        setCompletedItems(itemsWritten);
      }

      // Clear layout triggers
      clearCart();
      setIsPaymentOpen(false);
      setCashPaid('');
    } catch (err) {
      console.error(err);
      setCheckoutError('Gagal menyelesaikan transaksi checkout');
    }
  };

  const handlePairBluetooth = async () => {
    try {
      const name = await PrintService.connectBluetoothPrinter();
      setBluetoothName(name);
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Render components
  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
      
      {/* SHIFT GATEWAY BLOCK (Force Modal) */}
      {!currentShift && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <NeumorphicCard
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '30px',
              textAlign: 'center'
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Buka Shift Kasir</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Masukkan jumlah saldo modal awal laci kasir (cash drawer) Anda hari ini.
            </p>
            
            <form onSubmit={handleOpenShift}>
              <NeumorphicInput
                label="Modal Awal (Rp)"
                placeholder="Misal: 50000"
                type="number"
                value={modalAwalInput}
                onChange={(e) => setModalAwalInput(e.target.value)}
                containerClassName="mb-5"
                required
              />
              {shiftError && (
                <div style={{ color: 'var(--accent-red)', fontSize: '12px', marginBottom: '12px', fontWeight: 600 }}>
                  ⚠️ {shiftError}
                </div>
              )}
              <NeumorphicButton type="submit" variant="primary" style={{ width: '100%' }}>
                Buka Laci & Mulai Shift
              </NeumorphicButton>
            </form>
          </NeumorphicCard>
        </div>
      )}

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
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          
          <div style={{ flex: 1, position: 'relative' }}>
            <NeumorphicInput
              placeholder="Cari menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={18} />}
            />
          </div>

          {/* Barcode scanner triggers */}
          {!isMobile && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <NeumorphicButton onClick={() => setShowScannerMock(!showScannerMock)}>
                <Barcode size={18} />
                <span className="hidden sm:inline">Scan SKU</span>
              </NeumorphicButton>
              
              {/* Wake Lock Status Badge */}
              <div
                className="nm-inset"
                title="Status Wake Lock (Screen Keep-Alive)"
                style={{
                  borderRadius: 'var(--radius-md)',
                  padding: '0 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: wakeLockStatus === 'Active' ? 'var(--accent-green)' : 'var(--text-secondary)'
                }}
              >
                <Sun size={14} className={wakeLockStatus === 'Active' ? 'animate-pulse' : ''} />
                <span className="hidden sm:inline">
                  {wakeLockStatus === 'Active' ? 'Stay-Awake: ON' : 'Stay-Awake: OFF'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Scan input mockup block if triggered */}
        {showScannerMock && (
          <NeumorphicCard style={{ padding: '12px', marginBottom: '16px' }}>
            <form onSubmit={handleBarcodeSubmit} style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <NeumorphicInput
                  placeholder="Simulasikan Scan SKU (Misal: 888001)"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  autoFocus
                />
              </div>
              <NeumorphicButton type="submit">Scan</NeumorphicButton>
            </form>
            {scanMessage && (
              <div style={{ fontSize: '12px', marginTop: '6px', fontWeight: 600 }}>{scanMessage}</div>
            )}
          </NeumorphicCard>
        )}

        {/* Categories Horizontal Tabs */}
        <div 
          style={{ 
            display: 'flex', 
            gap: '8px', 
            overflowX: 'auto', 
            paddingBottom: '12px',
            marginBottom: '16px',
            scrollSnapType: 'x mandatory'
          }}
        >
          <NeumorphicButton
            size="sm"
            active={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
            borderRadius="pill"
          >
            Semua Menu
          </NeumorphicButton>
          
          {categories.map(cat => (
            <NeumorphicButton
              key={cat.id}
              size="sm"
              active={selectedCategory === cat.id}
              onClick={() => setSelectedCategory(cat.id!)}
              borderRadius="pill"
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
                hoverable
                onClick={() => handleProductClick(prod)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  padding: '12px',
                  opacity: prod.stok === 0 ? 0.6 : 1,
                  position: 'relative'
                }}
              >
                {/* Product Photo */}
                <div
                  style={{
                    width: '100%',
                    paddingTop: '75%', // 4:3 aspect ratio
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
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 20px rgba(0,0,0,0.15), var(--shadow-out)',
              }}
            >
              <ShoppingCart size={36} color="var(--accent-blue)" />
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
          <CartInnerContent />
        </div>
      ) : (
        // Mobile Bottom Sheet Cart View
        <NeumorphicBottomSheet
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          title="Keranjang Belanja"
        >
          <div style={{ maxHeight: '70vh' }}>
            <CartInnerContent />
          </div>
        </NeumorphicBottomSheet>
      ))}

      {/* CHOOSE VARIAN OVERLAY MODAL */}
      <NeumorphicModal
        isOpen={!!variantProduct}
        onClose={() => setVariantProduct(null)}
        title="Pilih Varian & Catatan"
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

            {/* Notes input */}
            <div style={{ marginBottom: '24px' }}>
              <NeumorphicInput
                label="Catatan item (opsional)"
                placeholder="Misal: Gula dikit, Extra es"
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
              />
            </div>

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
              {(['Tunai', 'QRIS', 'Bank', 'DANA', 'GoPay', 'OVO', 'ShopeePay'] as const).map(m => (
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
              />
              
              {/* Cash suggestion buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '10px' }}>
                <NeumorphicButton size="sm" onClick={() => handleFastCash(cartTotals.total)}>Pas</NeumorphicButton>
                <NeumorphicButton size="sm" onClick={() => handleFastCash(20000)}>20k</NeumorphicButton>
                <NeumorphicButton size="sm" onClick={() => handleFastCash(50000)}>50k</NeumorphicButton>
                <NeumorphicButton size="sm" onClick={() => handleFastCash(100000)}>100k</NeumorphicButton>
              </div>

              {/* Cash Return Info */}
              <div 
                className="nm-inset"
                style={{ 
                  marginTop: '14px', 
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
            Bayar & Simpan Transaksi
          </NeumorphicButton>
        </div>
      </NeumorphicModal>

      {/* RECEIPT & SUCCESS POPUP DIALOG */}
      <NeumorphicModal
        isOpen={!!completedTx}
        onClose={() => setCompletedTx(null)}
        title="Pembayaran Berhasil"
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
              
              <NeumorphicButton 
                size="sm" 
                active={PrintService.isBluetoothConnected()}
                onClick={async () => {
                  if (!PrintService.isBluetoothConnected()) {
                    await handlePairBluetooth();
                  } else {
                    try {
                      await PrintService.printViaBluetooth(completedTx, completedItems, store!);
                    } catch (e: any) {
                      alert(e.message);
                    }
                  }
                }}
              >
                <Smartphone size={16} /> 
                {PrintService.isBluetoothConnected() ? 'Print Bluetooth' : 'Pair Bluetooth'}
              </NeumorphicButton>

              <NeumorphicButton size="sm" onClick={() => window.open(PrintService.shareWhatsAppReceipt(completedTx, completedItems, store!), '_blank')}>
                <Share2 size={16} /> Kirim WhatsApp
              </NeumorphicButton>

              <NeumorphicButton size="sm" onClick={() => PrintService.exportPDFReceipt(completedTx, completedItems, store!)}>
                <FileText size={16} /> Unduh PDF
              </NeumorphicButton>
            </div>

            {bluetoothName && (
              <div style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: 600, marginBottom: '16px' }}>
                Connected to: {bluetoothName}
              </div>
            )}

            <NeumorphicButton variant="primary" onClick={() => setCompletedTx(null)} style={{ width: '100%' }}>
              Transaksi Baru
            </NeumorphicButton>
          </div>
        )}
      </NeumorphicModal>

    </div>
  );

  // inner cart content sub-component
  function CartInnerContent() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px' }}>
        {/* Cart Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontWeight: 800, fontSize: '16px' }}>Keranjang Belanja</h3>
          {cart.length > 0 && (
            <NeumorphicButton size="sm" onClick={clearCart} style={{ color: 'var(--accent-red)' }}>
              <Trash2 size={14} /> Clear
            </NeumorphicButton>
          )}
        </div>

        {/* Platform choices */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginBottom: '14px' }}>
          {(['Dine-in', 'Take Away', 'GrabFood', 'GoFood', 'ShopeeFood'] as const).map(p => (
            <NeumorphicButton
              key={p}
              size="sm"
              active={platform === p}
              onClick={() => setPlatform(p)}
              style={{ padding: '6px 2px', fontSize: '9px', fontWeight: 800 }}
            >
              {p === 'Take Away' ? 'Take Away' : p}
            </NeumorphicButton>
          ))}
        </div>

        {/* Cart items list */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

        {/* Pricing Math calculations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed var(--text-muted)', paddingTop: '14px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Subtotal</span>
            <span style={{ fontWeight: 700 }}>{formatRupiah(cartTotals.subtotal)}</span>
          </div>

          {/* Discount input row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <Tag size={14} />
              <span style={{ fontWeight: 600 }}>Diskon (Rp)</span>
            </div>
            <div style={{ width: '100px' }}>
              <input
                type="number"
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="nm-input"
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 700,
                  textAlign: 'right',
                  border: '1px solid transparent'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>PPN (${store?.PPN || 11}%)</span>
            <span style={{ fontWeight: 700 }}>{formatRupiah(cartTotals.tax)}</span>
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
