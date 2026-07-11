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
  private static generateReceiptHtml(transaction: Transaction, items: TransactionItem[], store: Store, paperWidth: '58mm' | '80mm'): string {
    const itemsHtml = items.map(item => {
      const varianStr = item.varian && item.varian !== 'Normal' ? ` (${item.varian})` : '';
      return `
        <div class="item-name">${item.nama_produk}${varianStr}</div>
        <div class="item-detail">
          <span>${item.qty} x ${formatRupiah(item.harga_satuan)}</span>
          <span>${formatRupiah(item.qty * item.harga_satuan)}</span>
        </div>
        ${item.catatan ? `<div class="item-notes">* ${item.catatan}</div>` : ''}
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Struk TRX-${transaction.id}</title>
        <style>
          @page {
            size: ${paperWidth} auto;
            margin: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            line-height: 1.3;
            color: #000;
            background: #fff;
            width: ${paperWidth === '58mm' ? '48mm' : '70mm'};
            padding: 4mm 4mm 10mm 4mm;
            box-sizing: border-box;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .bold { font-weight: bold; }
          .header-name { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .item-name { font-weight: bold; margin-top: 4px; }
          .item-detail { display: flex; justify-content: space-between; }
          .item-notes { font-style: italic; font-size: 9px; padding-left: 2mm; }
          .totals-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .totals-row.grand { font-size: 12px; font-weight: bold; margin-top: 4px; }
          .meta-row { display: flex; justify-content: space-between; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="header-name">${store.nama}</div>
          <div>${store.alamat.replace(/\n/g, '<br>')}</div>
        </div>
        
        <div class="divider"></div>
        
        <div class="meta-row"><span>Tgl:</span> <span>${new Date(transaction.tanggal).toLocaleString('id-ID')}</span></div>
        <div class="meta-row"><span>No :</span> <span>TRX-${transaction.id}</span></div>
        <div class="meta-row"><span>Kasir:</span> <span>${transaction.kasir_nama}</span></div>
        <div class="meta-row"><span>Tipe :</span> <span>${transaction.platform}</span></div>
        
        <div class="divider"></div>
        
        ${itemsHtml}
        
        <div class="divider"></div>
        
        <div class="totals-row"><span>Subtotal:</span> <span>${formatRupiah(transaction.subtotal)}</span></div>
        ${transaction.diskon > 0 ? `<div class="totals-row"><span>Diskon:</span> <span>-${formatRupiah(transaction.diskon)}</span></div>` : ''}
        ${transaction.pajak > 0 ? `<div class="totals-row"><span>PPN (${store.PPN}%):</span> <span>${formatRupiah(transaction.pajak)}</span></div>` : ''}
        ${transaction.service_charge > 0 ? `<div class="totals-row"><span>Svc Charge:</span> <span>${formatRupiah(transaction.service_charge)}</span></div>` : ''}
        
        <div class="totals-row grand"><span>TOTAL:</span> <span>${formatRupiah(transaction.total)}</span></div>
        
        <div class="divider"></div>
        
        <div class="totals-row"><span>Bayar (Tunai):</span> <span>${formatRupiah(transaction.cash_paid)}</span></div>
        <div class="totals-row"><span>Kembali:</span> <span>${formatRupiah(transaction.cash_change)}</span></div>
        <div class="totals-row"><span>Metode:</span> <span>${transaction.metode_bayar}</span></div>
        
        <div class="divider"></div>
        
        <div class="center" style="white-space: pre-line; margin-top: 8px;">
          ${store.receipt_footer}
        </div>
      </body>
      </html>
    `;
  }
}
