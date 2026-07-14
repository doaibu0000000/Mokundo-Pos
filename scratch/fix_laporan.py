import re

filepath = 'src/modules/laporan/components/LaporanView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix txId -> voidTxId
content = content.replace("`Void transaksi #${txId}`", "`Void transaksi #${voidTxId} - ${voidReason}`")
content = content.replace("await db.transactions.update(txId, {", "await db.transactions.update(voidTxId, {")

# Fix reason -> voidReason (if any left)
content = content.replace("reason", "voidReason") # Wait, this might be too greedy! Let's just fix the exact line if we can.
# Wait, let's just do it directly. Let's see if there is any `txId` or `reason` left.
