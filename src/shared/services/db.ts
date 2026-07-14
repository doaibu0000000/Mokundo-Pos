import Dexie, { type Table } from 'dexie';

// Web Crypto SHA-256 Hashing helper
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface User {
  id?: number;
  username: string;
  password_hash: string;
  role: 'Admin' | 'Kasir' | 'Manajer';
  nama_lengkap: string;
}

export interface Store {
  id?: number;
  nama: string;
  alamat: string;
  logo: string;
  PPN: number; // default 11
  service_charge: number; // default 0
  receipt_header: string;
  receipt_footer: string;
  supabase_url: string;
  supabase_anon_key: string;
  sync_enabled: number; // 0 = false, 1 = true
  ukuran_kertas_struk?: string; // e.g. "80mm", "58mm"
  qr_barcode?: string; // Teks atau URL untuk QR Code di struk
  qr_promo_text?: string;
  qr_scan_text?: string;
  receipt_thankyou_text?: string;
  receipt_footer_brand?: string;
}

export interface Product {
  id?: number;
  nama: string;
  kategori_id: number;
  harga: number;
  HPP: number;
  stok: number;
  sku: string;
  varian: string[]; // e.g. ["Normal", "Large"]
  gambar_url: string;
  threshold_stok: number;
}

export interface Category {
  id?: number;
  nama: string;
  urutan: number;
}

export interface Transaction {
  id?: number;
  kasir_id: number;
  kasir_nama: string;
  tanggal: string; // ISO String
  subtotal: number;
  diskon: number; // nominal
  pajak: number; // nominal PPN
  service_charge: number; // nominal service charge
  total: number;
  cash_paid: number;
  cash_change: number;
  metode_bayar: 'Tunai' | 'QRIS' | 'Bank' | 'DANA' | 'GoPay' | 'OVO' | 'ShopeePay';
  status: 'COMPLETED' | 'VOIDED';
  platform: 'Dine-in' | 'Take Away' | 'GrabFood' | 'GoFood' | 'ShopeeFood' | 'TikTok';
  sync_status: 'PENDING' | 'SYNCED';
  void_reason?: string;
  shift_id: number;
}

export interface TransactionItem {
  id?: number;
  transaksi_id: number;
  produk_id: number;
  nama_produk: string;
  qty: number;
  harga_satuan: number;
  varian: string; // e.g. "Normal"
  catatan: string;
}

export interface Shift {
  id?: number;
  kasir_id: number;
  kasir_nama: string;
  waktu_buka: string; // ISO String
  waktu_tutup?: string; // ISO String
  modal_awal: number;
  kas_akhir?: number;
  total_penjualan_tunai: number;
  total_penjualan_non_tunai: number;
  selisih_kas?: number;
  status: 'OPEN' | 'CLOSED';
  sync_status: 'PENDING' | 'SYNCED';
}

export interface StockLog {
  id?: number;
  produk_id: number;
  jenis: 'IN' | 'OUT';
  qty: number;
  keterangan: string;
  tanggal: string; // ISO String
  sync_status: 'PENDING' | 'SYNCED';
}

export interface SyncQueue {
  id?: number;
  table_name: string;
  record_id: number;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: string; // JSON stringified
  timestamp: string; // ISO String
}

class MokundoDatabase extends Dexie {
  users!: Table<User>;
  stores!: Table<Store>;
  products!: Table<Product>;
  categories!: Table<Category>;
  transactions!: Table<Transaction>;
  transaction_items!: Table<TransactionItem>;
  shifts!: Table<Shift>;
  stock_logs!: Table<StockLog>;
  sync_queue!: Table<SyncQueue>;

  constructor() {
    super('MokundoPOSDatabase');
    this.version(1).stores({
      users: '++id, &username, role',
      stores: '++id, sync_enabled',
      products: '++id, nama, kategori_id, sku',
      categories: '++id, nama, urutan',
      transactions: '++id, tanggal, sync_status, metode_bayar, shift_id',
      transaction_items: '++id, transaksi_id, produk_id',
      shifts: '++id, waktu_buka, status, sync_status',
      stock_logs: '++id, produk_id, tanggal, sync_status',
      sync_queue: '++id, table_name, timestamp',
    });
  }
}

export const db = new MokundoDatabase();

// Database Seeding Logic
export async function seedDatabase() {
  const usersCount = await db.users.count();
  if (usersCount === 0) {
    // 1. Seed default accounts
    const adminHash = await hashPassword('admin');
    const kasirHash = await hashPassword('kasir');

    await db.users.bulkAdd([
      {
        username: 'admin',
        password_hash: adminHash,
        role: 'Admin',
        nama_lengkap: 'Administrator',
      },
      {
        username: 'kasir',
        password_hash: kasirHash,
        role: 'Kasir',
        nama_lengkap: 'Kasir Shift A',
      },
    ]);

    // 2. Seed default store info
    await db.stores.add({
      nama: 'Surantaka Coffee',
      alamat: 'Kp. Surantaka, RT.02/RW.01, Desa Kalijati Timur, Kecamatan Kalijati, Kabupaten Subang, Jawa Barat, 41271',
      logo: '',
      PPN: 11,
      service_charge: 0,
      receipt_header: 'Telp: 0812-3456-7890',
      receipt_footer: 'Mengunjungi kami kembali adalah\nkebahagiaan terbesar kami!',
      supabase_url: '',
      supabase_anon_key: '',
      sync_enabled: 0,
      ukuran_kertas_struk: '58mm',
    });

    // 3. Seed default categories
    const foodCat = await db.categories.add({ nama: 'Makanan', urutan: 1 });
    const drinkCat = await db.categories.add({ nama: 'Minuman', urutan: 2 });
    const snackCat = await db.categories.add({ nama: 'Snack', urutan: 3 });

    // 4. Seed default products
    await db.products.bulkAdd([
      {
        nama: 'Kopi Susu Gula Aren',
        kategori_id: drinkCat,
        harga: 18000,
        HPP: 8000,
        stok: 50,
        sku: '888001',
        varian: ['Normal', 'Less Sugar', 'Double Shot'],
        gambar_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=150',
        threshold_stok: 5,
      },
      {
        nama: 'Es Teh Manis',
        kategori_id: drinkCat,
        harga: 6000,
        HPP: 2000,
        stok: 100,
        sku: '888002',
        varian: ['Normal', 'Less Sugar'],
        gambar_url: 'https://images.unsplash.com/photo-1497515114629-f71d768fd07c?w=150',
        threshold_stok: 10,
      },
      {
        nama: 'Rice Bowl Chicken Teriyaki',
        kategori_id: foodCat,
        harga: 28000,
        HPP: 15000,
        stok: 30,
        sku: '888003',
        varian: ['Normal', 'Pedas'],
        gambar_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150',
        threshold_stok: 3,
      },
      {
        nama: 'French Fries',
        kategori_id: snackCat,
        harga: 15000,
        HPP: 7000,
        stok: 40,
        sku: '888004',
        varian: ['Original', 'Keju', 'Balado'],
        gambar_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=150',
        threshold_stok: 5,
      },
      {
        nama: 'Roti Bakar Cokelat',
        kategori_id: snackCat,
        harga: 12000,
        HPP: 5000,
        stok: 20,
        sku: '888005',
        varian: ['Normal', 'Keju Cokelat'],
        gambar_url: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=150',
        threshold_stok: 2,
      },
    ]);
  }
}


