import React, { useEffect, useState } from 'react';
import { Download, AlertTriangle, Eye } from 'lucide-react';
import { db, type Transaction, type TransactionItem } from '../../../shared/services/db';
import { NeumorphicCard, NeumorphicButton, NeumorphicModal, NeumorphicInput } from '../../../shared/components';

// Format currency helper
const formatRupiah = (number: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number);
};

export const LaporanView: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const cached = sessionStorage.getItem('mokundo_cached_laporan_tx');
    return cached ? JSON.parse(cached) : [];
  });
  const [filterRange, setFilterRange] = useState<'today' | '7days' | '30days'>('today');
  const [viewMode, setViewMode] = useState<'riwayat' | 'terlaris'>('riwayat');
  
  // Best sellers
  const [bestSellers, setBestSellers] = useState<Array<{ name: string, qty: number, revenue: number }>>(() => {
    const cached = sessionStorage.getItem('mokundo_cached_laporan_bestsellers');
    return cached ? JSON.parse(cached) : [];
  });
  
  // Detail Modal States
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [selectedItems, setSelectedItems] = useState<TransactionItem[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voidError, setVoidError] = useState(false);
  const [voidTxId, setVoidTxId] = useState<number | null>(null);

  // --- Sequential Modal History Logic ---
  useEffect(() => {
    if (isDetailOpen) window.history.pushState({ modal: 'detail' }, '');
  }, [isDetailOpen]);

  useEffect(() => {
    if (isVoidModalOpen) window.history.pushState({ modal: 'void' }, '');
  }, [isVoidModalOpen]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const stateModal = e.state?.modal;
      if (!stateModal) {
        setIsVoidModalOpen(false);
        setIsDetailOpen(false);
      } else if (stateModal === 'detail') {
        setIsVoidModalOpen(false);
        setIsDetailOpen(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  // ----------------------------------------


  useEffect(() => {
    loadReportData();
  }, [filterRange]);

  const loadReportData = async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (filterRange === '7days') {
      start.setDate(start.getDate() - 6);
    } else if (filterRange === '30days') {
      start.setDate(start.getDate() - 29);
    }
    const startStr = start.toISOString();

    // Query active transactions
    const txList = await db.transactions
      .where('tanggal')
      .aboveOrEqual(startStr)
      .reverse()
      .toArray();

    setTransactions(txList);

    const itemsMap = new Map<string, { qty: number, revenue: number }>();

    for (const tx of txList) {
      if (tx.status === 'COMPLETED') {
        const items = await db.transaction_items.where('transaksi_id').equals(tx.id!).toArray();
        for (const item of items) {
          // Group by name for best seller computation
          const existing = itemsMap.get(item.nama_produk) || { qty: 0, revenue: 0 };
          itemsMap.set(item.nama_produk, {
            qty: existing.qty + item.qty,
            revenue: existing.revenue + (item.qty * item.harga_satuan)
          });
        }
      }
    }

    // Best sellers sorting
    const sortedBest = Array.from(itemsMap.entries())
      .map(([name, val]) => ({ name, qty: val.qty, revenue: val.revenue }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
      
    setBestSellers(sortedBest);
    sessionStorage.setItem('mokundo_cached_laporan_bestsellers', JSON.stringify(sortedBest));

    const sortedTx = txList.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    setTransactions(sortedTx);
    sessionStorage.setItem('mokundo_cached_laporan_tx', JSON.stringify(sortedTx));
  };

  const viewTransactionDetails = async (tx: Transaction) => {
    const items = await db.transaction_items.where('transaksi_id').equals(tx.id!).toArray();
    setSelectedTx(tx);
    setSelectedItems(items);
    setIsDetailOpen(true);
  };

  // Void transaction control
  const handleVoidTransactionClick = (txId: number) => {
    setVoidTxId(txId);
    setVoidReason('');
    setVoidError(false);
    setIsVoidModalOpen(true);
  };

  const confirmVoidTransaction = async () => {
    if (!voidReason.trim()) {
      setVoidError(true);
      return;
    }
    if (voidTxId === null) return;

    try {
      await db.transaction('rw', [db.products, db.transactions, db.stock_logs, db.shifts], async () => {
        const tx = await db.transactions.get(voidTxId);
        if (!tx || tx.status === 'VOIDED') return;

        // Restore stocks
        const items = await db.transaction_items.where('transaksi_id').equals(voidTxId).toArray();
        for (const item of items) {
          const prod = await db.products.get(item.produk_id);
          if (prod) {
            await db.products.update(item.produk_id, { stok: prod.stok + item.qty });
            
            await db.stock_logs.add({
              produk_id: item.produk_id,
              jenis: 'IN',
              qty: item.qty,
              keterangan: `Pembatalan (Void) TRX-${voidTxId}`,
              tanggal: new Date().toISOString(),
              sync_status: 'PENDING'
            });
          }
        }

        // Update transaction status
        await db.transactions.update(voidTxId, {
          status: 'VOIDED',
          void_reason: voidReason,
          sync_status: 'PENDING'
        });

        // Decrement shift values
        const shift = await db.shifts.get(tx.shift_id);
        if (shift) {
          if (tx.metode_bayar === 'Tunai') {
            await db.shifts.update(tx.shift_id, {
              total_penjualan_tunai: Math.max(0, shift.total_penjualan_tunai - tx.total)
            });
          } else {
            await db.shifts.update(tx.shift_id, {
              total_penjualan_non_tunai: Math.max(0, shift.total_penjualan_non_tunai - tx.total)
            });
          }
        }
      });

      alert('Transaksi berhasil dibatalkan (Void) dan stok dikembalikan.');
      setIsDetailOpen(false);
      loadReportData();
    } catch (e) {
      alert('Gagal membatalkan transaksi');
    }
  };

  const handleExportCSV = () => {
    let csv = 'ID,Tanggal,Kasir,Subtotal,Diskon,Pajak,Total,MetodeBayar,Status,KeteranganVoid\n';
    transactions.forEach(t => {
      const displayStatus = t.status === 'COMPLETED' ? 'SUCCESS' : t.status;
      csv += `${t.id},"${new Date(t.tanggal).toLocaleString('id-ID')}","${t.kasir_nama}",${t.subtotal},${t.diskon},${t.pajak},${t.total},"${t.metode_bayar}","${displayStatus}","${t.void_reason || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Laporan_Transaksi_Mokundo_${filterRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
      
      {/* Header Panel */}
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
          <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Laporan Penjualan</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Analisis detail keuangan toko Anda</p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <NeumorphicButton size="sm" onClick={handleExportCSV}>
            <Download size={14} /> Export CSV
          </NeumorphicButton>

          <NeumorphicButton active={filterRange === 'today'} onClick={() => setFilterRange('today')} size="sm">
            Hari Ini
          </NeumorphicButton>
          <NeumorphicButton active={filterRange === '7days'} onClick={() => setFilterRange('7days')} size="sm">
            7 Hari
          </NeumorphicButton>
          <NeumorphicButton active={filterRange === '30days'} onClick={() => setFilterRange('30days')} size="sm">
            30 Hari
          </NeumorphicButton>
        </div>
      </div>

      {/* View Mode Toggle Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <NeumorphicButton 
          active={viewMode === 'riwayat'} 
          onClick={() => setViewMode('riwayat')}
          style={{ flex: 1, padding: '12px' }}
        >
          Riwayat Transaksi
        </NeumorphicButton>
        <NeumorphicButton 
          active={viewMode === 'terlaris'} 
          onClick={() => setViewMode('terlaris')}
          style={{ flex: 1, padding: '12px' }}
        >
          Menu Terlaris
        </NeumorphicButton>
      </div>

      <div style={{ marginBottom: '20px' }}>
        
        {viewMode === 'riwayat' && (
        <NeumorphicCard style={{ padding: '20px', minWidth: 0 }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>Riwayat Transaksi</h3>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '500px' }}>
              <thead>
                <tr style={{ borderBottom: '1px dashed var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>TRX ID</th>
                  <th style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>Tanggal</th>
                  <th style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>Kasir</th>
                  <th style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>Bayar</th>
                  <th style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>Total</th>
                  <th style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>Status</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>Aksi</th>
                </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    Tidak ada riwayat transaksi ditemukan
                  </td>
                </tr>
              ) : (
                transactions.map(t => (
                  <tr 
                    key={t.id} 
                    style={{ 
                      borderBottom: '1px solid rgba(0,0,0,0.05)',
                      opacity: t.status === 'VOIDED' ? 0.5 : 1
                    }}
                  >
                    <td style={{ padding: '12px 8px', fontWeight: 700 }}>TRX-{t.id}</td>
                    <td style={{ padding: '12px 8px' }}>{new Date(t.tanggal).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: 'numeric', month: 'short' })}</td>
                    <td style={{ padding: '12px 8px' }}>{t.kasir_nama}</td>
                    <td style={{ padding: '12px 8px' }}>{t.metode_bayar}</td>
                    <td style={{ padding: '12px 8px', fontWeight: 700, color: t.status === 'VOIDED' ? 'var(--text-muted)' : 'var(--accent-blue)' }}>
                      {formatRupiah(t.total)}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <span 
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-pill)',
                          backgroundColor: t.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: t.status === 'COMPLETED' ? 'var(--accent-green)' : 'var(--accent-red)'
                        }}
                      >
                        {t.status === 'COMPLETED' ? 'SUCCESS' : t.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <NeumorphicButton size="sm" onClick={() => viewTransactionDetails(t)} style={{ width: '28px', height: '28px', padding: 0 }}>
                        <Eye size={12} />
                      </NeumorphicButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </NeumorphicCard>
        )}

        {viewMode === 'terlaris' && (
        <NeumorphicCard style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>Menu Terlaris</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {bestSellers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                Data tidak tersedia
              </div>
            ) : (
              bestSellers.map((item, idx) => (
                <div 
                  key={item.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: idx < bestSellers.length - 1 ? '1px dashed var(--text-muted)' : 'none'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>
                      {idx + 1}. {item.name}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Total Omset: {formatRupiah(item.revenue)}
                    </span>
                  </div>
                  <span 
                    className="nm-inset"
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '11px',
                      fontWeight: 800,
                      color: 'var(--accent-blue)'
                    }}
                  >
                    Terjual: {item.qty}
                  </span>
                </div>
              ))
            )}
          </div>
        </NeumorphicCard>
        )}
      </div>

      {/* TRANSACTION DETAIL MODAL */}
      <NeumorphicModal
        isOpen={isDetailOpen}
        onClose={() => window.history.back()}
        title="Detail Transaksi"
      >
        {selectedTx && (
          <div>
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '12px' }}>
              <div>
                <div>No. Invoice: <b>TRX-{selectedTx.id}</b></div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {new Date(selectedTx.tanggal).toLocaleString('id-ID')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div>Kasir: <b>{selectedTx.kasir_nama}</b></div>
                <span 
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: selectedTx.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: selectedTx.status === 'COMPLETED' ? 'var(--accent-green)' : 'var(--accent-red)'
                  }}
                >
                  {selectedTx.status === 'COMPLETED' ? 'SUCCESS' : selectedTx.status}
                </span>
              </div>
            </div>

            {selectedTx.status === 'VOIDED' && (
              <div 
                className="nm-inset"
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid var(--accent-red)',
                  color: 'var(--accent-red)',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '16px'
                }}
              >
                ⚠️ Batal (Void) Alasan: "{selectedTx.void_reason}"
              </div>
            )}

            {/* Items table */}
            <div style={{ margin: '16px 0', borderBottom: '1px dashed var(--text-muted)', paddingBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Item Pembelian</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {selectedItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <div>
                      <div><b>{item.nama_produk}</b>{item.varian !== 'Normal' ? ` (${item.varian})` : ''}</div>
                      {item.catatan && <span style={{ fontSize: '11px', fontStyle: 'italic', color: 'var(--text-muted)' }}>* {item.catatan}</span>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div>{item.qty} x {formatRupiah(item.harga_satuan)}</div>
                      <div style={{ fontWeight: 700 }}>{formatRupiah(item.qty * item.harga_satuan)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Finance totals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', borderBottom: '1px dashed var(--text-muted)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>{formatRupiah(selectedTx.subtotal)}</span>
              </div>
              {selectedTx.diskon > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Diskon:</span>
                  <span>-{formatRupiah(selectedTx.diskon)}</span>
                </div>
              )}
              {selectedTx.pajak > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Pajak PPN:</span>
                  <span>{formatRupiah(selectedTx.pajak)}</span>
                </div>
              )}
              {selectedTx.service_charge > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Svc Charge:</span>
                  <span>{formatRupiah(selectedTx.service_charge)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 800, color: 'var(--accent-blue)' }}>
                <span>TOTAL:</span>
                <span>{formatRupiah(selectedTx.total)}</span>
              </div>
            </div>

            {/* Cash payments */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Metode Pembayaran:</span>
                <span style={{ fontWeight: 700 }}>{selectedTx.metode_bayar}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Jumlah Dibayar:</span>
                <span>{formatRupiah(selectedTx.cash_paid)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Kembalian:</span>
                <span>{formatRupiah(selectedTx.cash_change)}</span>
              </div>
            </div>

            {/* Void trigger button (Admin/Manager role ONLY) */}
            {selectedTx.status === 'COMPLETED' && (
              <NeumorphicButton 
                variant="danger" 
                onClick={() => handleVoidTransactionClick(selectedTx.id!)}
                style={{ width: '100%' }}
              >
                <AlertTriangle size={16} /> Batalkan Transaksi (Void)
              </NeumorphicButton>
            )}
          </div>
        )}
      </NeumorphicModal>

      {/* Void Modal */}
      <NeumorphicModal
        isOpen={isVoidModalOpen}
        onClose={() => window.history.back()}
        title="Batalkan Transaksi (Void)"
      >
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Masukkan alasan pembatalan transaksi ini:
          </p>
          <NeumorphicInput
            id="voidReasonInput"
            placeholder="Contoh: Salah input pesanan"
            value={voidReason}
            onChange={(e: any) => setVoidReason(e.target.value)}
            error={voidError && !voidReason.trim()}
          />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <NeumorphicButton 
            variant="flat" 
            onClick={() => window.history.back()}
            style={{ flex: 1 }}
          >
            Kembali
          </NeumorphicButton>
          <NeumorphicButton 
            variant="danger" 
            onClick={confirmVoidTransaction}
            style={{ flex: 1 }}
          >
            Konfirmasi
          </NeumorphicButton>
        </div>
      </NeumorphicModal>
    </div>
  );
};
