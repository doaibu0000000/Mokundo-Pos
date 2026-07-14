import re

filepath = 'src/modules/laporan/components/LaporanView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add states
old_states = "  const [isDetailOpen, setIsDetailOpen] = useState(false);"
new_states = """  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voidError, setVoidError] = useState(false);
  const [voidTxId, setVoidTxId] = useState<number | null>(null);"""
content = content.replace(old_states, new_states)

# 2. Update hasPopup
old_has_popup = "  const hasPopup = isDetailOpen;"
new_has_popup = "  const hasPopup = isDetailOpen || isVoidModalOpen;"
content = content.replace(old_has_popup, new_has_popup)

# 3. Update handlePopState
old_popstate = """    const handlePopState = () => {
      if (prevHasPopup.current) {
        setIsDetailOpen(false);
      }
    };"""
new_popstate = """    const handlePopState = () => {
      if (prevHasPopup.current) {
        setIsDetailOpen(false);
        setIsVoidModalOpen(false);
      }
    };"""
content = content.replace(old_popstate, new_popstate)

# 4. Replace handleVoidTransaction
old_void_start = """  // Void transaction control
  const handleVoidTransaction = async (txId: number) => {
    const reason = prompt('Masukkan alasan pembatalan (Void) transaksi ini:');
    if (reason === null) return; // cancelled prompt
    if (!reason.trim()) {
      alert('Alasan pembatalan wajib diisi!');
      return;
    }

    try {
      await db.transaction('rw', [db.products, db.transactions, db.stock_logs, db.shifts], async () => {
        const tx = await db.transactions.get(txId);
        if (!tx || tx.status === 'VOIDED') return;

        // Restore stocks
        const items = await db.transaction_items.where('transaksi_id').equals(txId).toArray();"""

new_void_start = """  // Void transaction control
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
        const items = await db.transaction_items.where('transaksi_id').equals(voidTxId).toArray();"""
content = content.replace(old_void_start, new_void_start)

# 5. Replace usage in tx properties
# We need to change txId to voidTxId inside the function. Let's see the rest of the function.
old_void_middle_1 = """            await db.stock_logs.add({
              produk_id: item.produk_id,
              jenis: 'IN',
              qty: item.qty,
              keterangan: `Void transaksi #${txId}`,
              tanggal: new Date().toISOString(),
              sync_status: 'PENDING'
            });
          }
        }

        // Void the transaction
        await db.transactions.update(txId, {
          status: 'VOIDED',
          sync_status: 'PENDING'
        });

        // Deduct from shift if any
        if (tx.shift_id) {
          const s = await db.shifts.get(tx.shift_id);
          if (s) {
            await db.shifts.update(s.id!, {
              total_penjualan: s.total_penjualan - tx.total,
              sync_status: 'PENDING'
            });
          }
        }
      });
      loadTransactions();
      setIsDetailOpen(false); // Close modal
    } catch (error) {
      console.error('Error voiding tx:', error);
      alert('Gagal membatalkan transaksi.');
    }
  };"""

new_void_middle_1 = """            await db.stock_logs.add({
              produk_id: item.produk_id,
              jenis: 'IN',
              qty: item.qty,
              keterangan: `Void transaksi #${voidTxId} - ${voidReason}`,
              tanggal: new Date().toISOString(),
              sync_status: 'PENDING'
            });
          }
        }

        // Void the transaction
        await db.transactions.update(voidTxId, {
          status: 'VOIDED',
          sync_status: 'PENDING'
        });

        // Deduct from shift if any
        if (tx.shift_id) {
          const s = await db.shifts.get(tx.shift_id);
          if (s) {
            await db.shifts.update(s.id!, {
              total_penjualan: s.total_penjualan - tx.total,
              sync_status: 'PENDING'
            });
          }
        }
      });
      loadTransactions();
      setIsDetailOpen(false);
      setIsVoidModalOpen(false);
    } catch (error) {
      console.error('Error voiding tx:', error);
      alert('Gagal membatalkan transaksi.');
    }
  };"""
content = content.replace(old_void_middle_1, new_void_middle_1)


# 6. Button change
old_button = "onClick={() => handleVoidTransaction(selectedTx.id!)}"
new_button = "onClick={() => handleVoidTransactionClick(selectedTx.id!)}"
content = content.replace(old_button, new_button)

# 7. Add NeumorphicModal for voiding at the end of the return statement
old_end = """    </div>
  );
};"""
new_end = """      {/* Void Modal */}
      <NeumorphicModal
        isOpen={isVoidModalOpen}
        onClose={() => setIsVoidModalOpen(false)}
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
            onChange={(e) => setVoidReason(e.target.value)}
            error={voidError && !voidReason.trim()}
          />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <NeumorphicButton 
            variant="secondary" 
            onClick={() => setIsVoidModalOpen(false)}
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
};"""
content = content.replace(old_end, new_end)

# Also check for imports if NeumorphicInput is not imported
if "NeumorphicInput" not in content[:500]:
    content = content.replace("import { NeumorphicModal } from '../../../shared/components/NeumorphicModal';", "import { NeumorphicModal } from '../../../shared/components/NeumorphicModal';\nimport { NeumorphicInput } from '../../../shared/components/NeumorphicInput';")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated void modal")
