import { jsPDF } from 'jspdf';
import type { Transaction, TransactionItem, Store } from './db';

// Format currency as IDR
const formatRupiah = (number: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number);
};

export class PrintService {
  private static bluetoothDevice: any = null;
  private static bluetoothCharacteristic: any = null;

  // Web Bluetooth Printer Pairing
  public static async connectBluetoothPrinter(): Promise<string> {
    if (!(navigator as any).bluetooth) {
      throw new Error('Web Bluetooth tidak didukung oleh browser ini. Gunakan Chrome di Android/Desktop.');
    }

    try {
      this.bluetoothDevice = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '0000ff00-0000-1000-8000-00805f9b34fb']
      });

      const server = await this.bluetoothDevice.gatt.connect();
      
      // Try standard raw printing services
      const services = await server.getPrimaryServices();
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            this.bluetoothCharacteristic = char;
            break;
          }
        }
        if (this.bluetoothCharacteristic) break;
      }

      if (!this.bluetoothCharacteristic) {
        throw new Error('Karakteristik write tidak ditemukan pada printer Bluetooth ini.');
      }

      return this.bluetoothDevice.name || 'Printer Bluetooth';
    } catch (error: any) {
      console.error('Bluetooth connection error:', error);
      throw new Error(error.message || 'Gagal menyambungkan ke printer Bluetooth.');
    }
  }

  public static isBluetoothConnected(): boolean {
    return !!this.bluetoothCharacteristic;
  }

  public static disconnectBluetooth(): void {
    if (this.bluetoothDevice && this.bluetoothDevice.gatt.connected) {
      this.bluetoothDevice.gatt.disconnect();
    }
    this.bluetoothDevice = null;
    this.bluetoothCharacteristic = null;
  }

  // Print via window.print() fallback using a hidden iframe
  public static printViaBrowser(transaction: Transaction, items: TransactionItem[], store: Store, paperWidth: '58mm' | '80mm' = '58mm'): void {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    const receiptHtml = this.generateReceiptHtml(transaction, items, store, paperWidth);
    doc.write(receiptHtml);
    doc.close();

    // Wait for assets (if any) and trigger printer dial
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 500);
    }, 250);
  }

  // Send raw text to Bluetooth ESC/POS printer
  public static async printViaBluetooth(transaction: Transaction, items: TransactionItem[], store: Store): Promise<void> {
    if (!this.bluetoothCharacteristic) {
      throw new Error('Printer Bluetooth belum tersambung.');
    }

    // ESC/POS Commands
    const ESC = 27;
    const INIT = [ESC, 64];
    const CENTER = [ESC, 97, 1];
    const LEFT = [ESC, 97, 0];
    const BOLD_ON = [ESC, 69, 1];
    const BOLD_OFF = [ESC, 69, 0];
    const FEED_3 = [ESC, 100, 3];

    const encoder = new TextEncoder();
    
    // Command sender helper
    const sendCommand = async (bytes: number[]) => {
      await this.bluetoothCharacteristic.writeValue(new Uint8Array(bytes));
    };

    const sendText = async (text: string) => {
      await this.bluetoothCharacteristic.writeValue(encoder.encode(text));
    };

    // Print body
    await sendCommand(INIT);
    
    // Header
    await sendCommand(CENTER);
    await sendCommand(BOLD_ON);
    await sendText(`${store.nama}\n`);
    await sendCommand(BOLD_OFF);
    await sendText(`${store.alamat}\n`);
    await sendText('--------------------------------\n');
    
    // Transaction Details
    await sendCommand(LEFT);
    await sendText(`Tgl: ${new Date(transaction.tanggal).toLocaleString('id-ID')}\n`);
    await sendText(`No : TRX-${transaction.id}\n`);
    await sendText(`Kasir: ${transaction.kasir_nama}\n`);
    await sendText(`Tipe : ${transaction.platform}\n`);
    await sendText('--------------------------------\n');

    // Items
    for (const item of items) {
      const varianStr = item.varian && item.varian !== 'Normal' ? ` (${item.varian})` : '';
      await sendText(`${item.nama_produk}${varianStr}\n`);
      
      const qtyPrice = `  ${item.qty} x ${formatRupiah(item.harga_satuan)}`;
      const totalItem = formatRupiah(item.qty * item.harga_satuan);
      // Align total to the right (assuming 32 characters total width for 58mm printer)
      const spaces = 32 - qtyPrice.length - totalItem.length;
      const spacesStr = spaces > 0 ? ' '.repeat(spaces) : ' ';
      
      await sendText(`${qtyPrice}${spacesStr}${totalItem}\n`);
      if (item.catatan) {
        await sendText(`  * ${item.catatan}\n`);
      }
    }
    await sendText('--------------------------------\n');

    // Totals
    const writeTotalRow = async (label: string, value: number) => {
      const valStr = formatRupiah(value);
      const spaces = 32 - label.length - valStr.length;
      const spacesStr = spaces > 0 ? ' '.repeat(spaces) : ' ';
      await sendText(`${label}${spacesStr}${valStr}\n`);
    };

    await writeTotalRow('Subtotal', transaction.subtotal);
    if (transaction.diskon > 0) {
      await writeTotalRow('Diskon', -transaction.diskon);
    }
    if (transaction.pajak > 0) {
      await writeTotalRow(`PPN (${store.PPN}%)`, transaction.pajak);
    }
    if (transaction.service_charge > 0) {
      await writeTotalRow('Svc Charge', transaction.service_charge);
    }
    
    await sendCommand(BOLD_ON);
    await writeTotalRow('TOTAL', transaction.total);
    await sendCommand(BOLD_OFF);
    
    await sendText('--------------------------------\n');
    await writeTotalRow('Bayar (Tunai)', transaction.cash_paid);
    await writeTotalRow('Kembali', transaction.cash_change);
    await sendText(`Metode: ${transaction.metode_bayar}\n`);
    await sendText('--------------------------------\n');

    // Footer
    await sendCommand(CENTER);
    await sendText(`${store.receipt_footer}\n`);
    
    // Feed and cut
    await sendCommand(FEED_3);
  }

  // Generate Digital PDF Receipt to download
  public static exportPDFReceipt(transaction: Transaction, items: TransactionItem[], store: Store): void {
    // 58mm width converted to pt (approx 164 pt)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [58, 150 + items.length * 15] // dynamic height
    });

    doc.setFont('courier');
    doc.setFontSize(8);
    
    let y = 10;
    const centerText = (text: string) => {
      const splitText = doc.splitTextToSize(text, 50);
      splitText.forEach((line: string) => {
        const textWidth = doc.getTextWidth(line);
        const x = (58 - textWidth) / 2;
        doc.text(line, x, y);
        y += 4;
      });
    };

    const leftRightText = (left: string, right: string) => {
      doc.text(left, 4, y);
      const rWidth = doc.getTextWidth(right);
      doc.text(right, 54 - rWidth, y);
      y += 4;
    };

    // Header
    doc.setFont('courier', 'bold');
    centerText(store.nama);
    doc.setFont('courier', 'normal');
    centerText(store.alamat);
    centerText('--------------------------------');

    // Metadata
    doc.text(`Tgl: ${new Date(transaction.tanggal).toLocaleString('id-ID')}`, 4, y); y += 4;
    doc.text(`No : TRX-${transaction.id}`, 4, y); y += 4;
    doc.text(`Kasir: ${transaction.kasir_nama}`, 4, y); y += 4;
    doc.text(`Tipe : ${transaction.platform}`, 4, y); y += 4;
    centerText('--------------------------------');

    // Items
    items.forEach(item => {
      const varianStr = item.varian && item.varian !== 'Normal' ? ` (${item.varian})` : '';
      doc.text(`${item.nama_produk}${varianStr}`, 4, y);
      y += 4;
      leftRightText(
        `  ${item.qty} x ${formatRupiah(item.harga_satuan)}`,
        formatRupiah(item.qty * item.harga_satuan)
      );
      if (item.catatan) {
        doc.text(`  * ${item.catatan}`, 4, y);
        y += 4;
      }
    });
    centerText('--------------------------------');

    // Total math
    leftRightText('Subtotal:', formatRupiah(transaction.subtotal));
    if (transaction.diskon > 0) {
      leftRightText('Diskon:', `-${formatRupiah(transaction.diskon)}`);
    }
    if (transaction.pajak > 0) {
      leftRightText(`PPN (${store.PPN}%):`, formatRupiah(transaction.pajak));
    }
    if (transaction.service_charge > 0) {
      leftRightText('Service Charge:', formatRupiah(transaction.service_charge));
    }
    
    doc.setFont('courier', 'bold');
    leftRightText('TOTAL:', formatRupiah(transaction.total));
    doc.setFont('courier', 'normal');
    centerText('--------------------------------');

    leftRightText('Bayar:', formatRupiah(transaction.cash_paid));
    leftRightText('Kembali:', formatRupiah(transaction.cash_change));
    doc.text(`Metode: ${transaction.metode_bayar}`, 4, y); y += 6;

    // Footer
    centerText(store.receipt_footer);

    doc.save(`Struk_Mokundo_TRX-${transaction.id}.pdf`);
  }

  // Generate shareable WhatsApp text template
  public static shareWhatsAppReceipt(transaction: Transaction, items: TransactionItem[], store: Store): string {
    let text = `*🧾 STRUK BELANJA - ${store.nama}*\n`;
    text += `${store.alamat}\n`;
    text += `================================\n`;
    text += `📅 Tanggal : ${new Date(transaction.tanggal).toLocaleString('id-ID')}\n`;
    text += `🆔 Transaksi: TRX-${transaction.id}\n`;
    text += `👤 Kasir    : ${transaction.kasir_nama}\n`;
    text += `🛍️ Platform : ${transaction.platform}\n`;
    text += `================================\n\n`;

    items.forEach(item => {
      const varianStr = item.varian && item.varian !== 'Normal' ? ` (${item.varian})` : '';
      text += `*${item.nama_produk}${varianStr}*\n`;
      text += `   ${item.qty} x ${formatRupiah(item.harga_satuan)} = ${formatRupiah(item.qty * item.harga_satuan)}\n`;
      if (item.catatan) {
        text += `   _(Catatan: ${item.catatan})_\n`;
      }
    });

    text += `\n================================\n`;
    text += `Subtotal  : ${formatRupiah(transaction.subtotal)}\n`;
    if (transaction.diskon > 0) {
      text += `Diskon    : -${formatRupiah(transaction.diskon)}\n`;
    }
    if (transaction.pajak > 0) {
      text += `PPN (${store.PPN}%) : ${formatRupiah(transaction.pajak)}\n`;
    }
    if (transaction.service_charge > 0) {
      text += `Biaya Svc : ${formatRupiah(transaction.service_charge)}\n`;
    }
    text += `*TOTAL     : ${formatRupiah(transaction.total)}*\n`;
    text += `================================\n`;
    text += `Bayar     : ${formatRupiah(transaction.cash_paid)}\n`;
    text += `Kembali   : ${formatRupiah(transaction.cash_change)}\n`;
    text += `Metode    : ${transaction.metode_bayar}\n\n`;
    text += `_${store.receipt_footer.replace(/\n/g, ' ')}_`;

    const encodedText = encodeURIComponent(text);
    return `https://api.whatsapp.com/send?text=${encodedText}`;
  }

  // Internally formats HTML for print media widths
  private static generateReceiptHtml(transaction: Transaction, items: TransactionItem[], store: Store, _paperWidth: '58mm' | '80mm'): string {
    const padZero = (n: number) => n.toString().padStart(2, '0');
    const dateObj = new Date(transaction.tanggal);
    const dateStr = `${padZero(dateObj.getDate())}/${padZero(dateObj.getMonth() + 1)}/${dateObj.getFullYear()} ${padZero(dateObj.getHours())}:${padZero(dateObj.getMinutes())}`;

    // Format angka polos tanpa simbol mata uang: 165.000
    const fmtNum = (n: number) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

    const itemsHtml = items.map(item => {
      const varianStr = item.varian && item.varian !== 'Normal' ? ` (${item.varian})` : '';
      return `
        <div class="item-row">
          <span class="qty-name">${item.qty} x ${item.nama_produk}${varianStr}</span>
          <span class="price">${fmtNum(item.qty * item.harga_satuan)}</span>
        </div>
      `;
    }).join('');

    const paperSize = store.ukuran_kertas_struk || '80mm';
  // Untuk layar (preview), kurangi margin (misal potong 8mm).
  // Di print media, biarkan full sesuai paperSize.
  let containerWidth = '72mm'; 
  let baseFontSize = '11px';
  let printBaseFontSize = '10px';

  if (paperSize === '44mm') { containerWidth = '36mm'; baseFontSize = '8px'; printBaseFontSize = '7px'; }
  if (paperSize === '48mm') { containerWidth = '40mm'; baseFontSize = '8.5px'; printBaseFontSize = '7.5px'; }
  if (paperSize === '57mm') { containerWidth = '49mm'; baseFontSize = '9px'; printBaseFontSize = '8px'; }
  if (paperSize === '58mm') { containerWidth = '50mm'; baseFontSize = '9px'; printBaseFontSize = '8px'; }
  if (paperSize === '76mm') { containerWidth = '68mm'; baseFontSize = '10.5px'; printBaseFontSize = '9.5px'; }
  if (paperSize === '80mm') { containerWidth = '72mm'; baseFontSize = '11px'; printBaseFontSize = '10px'; }
  if (paperSize === '112mm') { containerWidth = '104mm'; baseFontSize = '13px'; printBaseFontSize = '12px'; }

  return `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Struk - ${store.nama}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

  :root {
    --base-font: ${baseFontSize};
    --print-base-font: ${printBaseFontSize};
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #2b2b2b;
    font-family: 'Poppins', sans-serif;
    display: flex;
    justify-content: center;
    padding: 40px 10px;
    margin: 0;
  }

  .receipt {
    background: #fff;
    width: ${containerWidth};
    padding: 4mm 3mm;
    position: relative;
    color: #1a1a1a;
    font-size: var(--base-font);
    line-height: 1.4;
  }

  /* zigzag top & bottom (hanya untuk preview layar) */
  .receipt::before,
  .receipt::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    height: 12px;
    background:
      linear-gradient(135deg, #fff 50%, transparent 50%) 0 0/16px 16px,
      linear-gradient(-135deg, #fff 50%, transparent 50%) 0 0/16px 16px;
    background-repeat: repeat-x;
    background-color: #2b2b2b;
  }
  .receipt::before { top: -12px; }
  .receipt::after   { bottom: -12px; transform: rotate(180deg); }

  h1 {
    text-align: center;
    font-size: calc(var(--base-font) * 1.45);
    letter-spacing: 1px;
    margin: 0 0 6px;
    text-transform: uppercase;
    font-weight: 700;
  }

  .addr {
    text-align: justify;
    text-align-last: center;
    font-size: calc(var(--base-font) * 0.8);
    line-height: 1.4;
    margin-bottom: 2px;
  }

  .phone {
    text-align: center;
    font-size: calc(var(--base-font) * 0.8);
    line-height: 1.4;
    margin-bottom: 8px;
  }

  .divider {
    border: none;
    border-top: 1px dashed #555;
    margin: 8px 0;
  }

  .info-row {
    display: flex;
    font-size: calc(var(--base-font) * 0.9);
    margin-bottom: 2px;
  }
  .info-row .label { width: 35%; flex-shrink: 0; }
  .info-row .colon { width: 10px; flex-shrink: 0; }
  .info-row .value { flex: 1; }

  .items {
    font-size: calc(var(--base-font) * 0.9);
  }
  .item-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 3px;
  }
  .item-row .qty-name { padding-right: 6px; flex: 1; }
  .item-row .price { white-space: nowrap; text-align: right; }

  .totals {
    font-size: calc(var(--base-font) * 0.9);
  }
  .totals .row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 3px;
  }
  .totals .grand {
    font-weight: bold;
    font-size: calc(var(--base-font) * 1.1);
  }

  .payment {
    font-size: calc(var(--base-font) * 0.9);
  }
  .payment .row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 3px;
  }

  .promo {
    text-align: center;
    font-size: calc(var(--base-font) * 0.8);
    line-height: 1.4;
    margin: 4px 0 8px;
  }
  .promo strong {
    display: block;
    margin-top: 4px;
  }

  .qr-box {
    width: 60%;
    aspect-ratio: 1;
    margin: 0 auto 4px;
    border: 1px solid #333;
    background-color: #f9f9f9;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: calc(var(--base-font) * 0.7);
    color: #666;
    text-align: center;
  }

  .scan-text {
    text-align: center;
    font-size: calc(var(--base-font) * 0.7);
    color: #555;
    margin-bottom: 8px;
  }

  .thankyou {
    text-align: center;
    font-size: var(--base-font);
    font-weight: bold;
    margin-bottom: 8px;
  }

  .footer-msg {
    text-align: center;
    font-size: calc(var(--base-font) * 0.8);
    line-height: 1.4;
    white-space: pre-wrap;
  }
  .footer-msg .brand {
    font-style: italic;
    margin-top: 2px;
  }

  /* ===== THERMAL PRINTER PRINT STYLES ===== */
  @page {
    margin: 0;
  }

  @media print {
    html, body {
      width: ${paperSize};
      background: none;
      padding: 0;
      margin: 0;
    }
    .receipt {
      background: #fff;
      color: #000;
      width: 100%;
      max-width: ${paperSize};
      padding: 2mm 2mm;
      box-shadow: none;
      font-size: var(--print-base-font);
    }
    h1 { font-size: calc(var(--print-base-font) * 1.4); }
    .addr, .phone, .promo, .footer-msg { font-size: calc(var(--print-base-font) * 0.8); }
    .info-row, .items, .totals, .payment { font-size: calc(var(--print-base-font) * 0.9); }
    .totals .grand { font-size: calc(var(--print-base-font) * 1.1); }
    .thankyou { font-size: var(--print-base-font); }
    .scan-text { font-size: calc(var(--print-base-font) * 0.7); }
    .divider {
      border-top: 1px dashed #000;
    }
    .qr-box {
      border-color: #000;
      color: #000;
    }
    .receipt::before, .receipt::after {
      display: none;
    }
  }
</style>
</head>
<body>

<div class="receipt">
  <h1>${store.nama || 'SURANTAKA COFFEE'}</h1>
  <div class="addr">${store.alamat || 'Kp. Surantaka, RT.02/RW.01, Desa Kalijati Timur, Kecamatan Kalijati, Kabupaten Subang, Jawa Barat, 41271'}</div>
  <div class="phone">${store.receipt_header || 'Telp: 0812-3456-7890'}</div>

  <hr class="divider">

  <div class="info-row"><span class="label">Order ID</span><span class="colon">:</span><span class="value">TRX-${transaction.id}</span></div>
  <div class="info-row"><span class="label">Tanggal</span><span class="colon">:</span><span class="value">${dateStr}</span></div>
  <div class="info-row"><span class="label">Kasir</span><span class="colon">:</span><span class="value">${transaction.kasir_nama || '-'}</span></div>
  <div class="info-row"><span class="label">Platform</span><span class="colon">:</span><span class="value">${transaction.platform || '-'}</span></div>

  <hr class="divider">

  <div class="items">
    ${itemsHtml}
  </div>

  <hr class="divider">

  <div class="totals">
    <div class="row"><span>Total</span><span>${fmtNum(transaction.subtotal)}</span></div>
    ${transaction.diskon > 0 ? `<div class="row"><span>Diskon${transaction.subtotal > 0 ? ` (${Math.round(transaction.diskon / transaction.subtotal * 100)}%)` : ''}</span><span>-${fmtNum(transaction.diskon)}</span></div>` : ''}
    ${transaction.pajak > 0 ? `<div class="row"><span>PPN</span><span>${fmtNum(transaction.pajak)}</span></div>` : ''}
    ${transaction.service_charge > 0 ? `<div class="row"><span>Service</span><span>${fmtNum(transaction.service_charge)}</span></div>` : ''}
    <div class="row grand"><span>Grand Total</span><span>${fmtNum(transaction.total)}</span></div>
  </div>

  <hr class="divider">

  <div class="payment">
    <div class="row"><span>Payment (${transaction.metode_bayar})</span><span>${fmtNum(transaction.cash_paid || transaction.total)}</span></div>
    ${transaction.metode_bayar === 'Tunai' ? `<div class="row"><span>Kembalian</span><span>${fmtNum(transaction.cash_change || 0)}</span></div>` : ''}
  </div>

  <hr class="divider">

  <div class="promo">
    Mau pesan lagi tanpa antre atau<br>
    tertarik punya bisnis kopi sendiri?<br>
    <strong>Pindai saya!</strong>
  </div>

  <div class="qr-box">[ QR Code ]</div>
  <div class="scan-text">Scan untuk bayar</div>

  <div class="thankyou">Thank you for your order!</div>

  <hr class="divider">

  <div class="footer-msg">
    ${store.receipt_footer ? store.receipt_footer.replace(/\\n/g, '<br>') : 'Mengunjungi kami kembali adalah<br>kebahagiaan terbesar kami!'}
    <div class="brand">— ${store.nama || 'Surantaka Coffee'} —</div>
  </div>
</div>

</body>
</html>
    `;
  }
}
