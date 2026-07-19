# Mokundo POS (Point of Sale)

Mokundo POS adalah aplikasi kasir berbasis web yang dirancang sebagai **Progressive Web App (PWA)** dengan pendekatan *offline-first*. Aplikasi ini dioptimalkan untuk perangkat Android (HP dan Tablet) dengan tampilan responsif, serta mendukung mode tampilan **desktop admin** (sidebar) pada layar lebar (≥ 1024px).

---

## 🏗️ Arsitektur & Struktur Proyek

```
Mokundo-Pos/
├── public/                        # Aset statis PWA
│   ├── brand-icon.png             # Ikon branding aplikasi
│   ├── pwa-192x192.png            # Ikon PWA 192px
│   ├── pwa-512x512.png            # Ikon PWA 512px (any)
│   └── pwa-512x512-maskable.png   # Ikon PWA 512px (maskable)
│
├── src/
│   ├── main.tsx                   # Entry point React
│   ├── App.tsx                    # Root component & layout switcher
│   │
│   ├── app/
│   │   ├── layout-mobile/         # Layout HP/Tablet (< 1024px)
│   │   │   └── layout-mobile.tsx  # Bottom nav bar, home GoPay-style
│   │   └── layout-web/            # Layout Desktop (≥ 1024px)
│   │       └── layout-web.tsx     # Left sidebar navigation
│   │
│   ├── modules/                   # Fitur utama aplikasi (modular)
│   │   ├── auth/                  # Login & autentikasi
│   │   ├── dashboard/             # Statistik & grafik omset
│   │   ├── transaksi/             # Layar POS (kasir)
│   │   ├── produk/                # Manajemen produk & stok
│   │   ├── laporan/               # Laporan keuangan & riwayat
│   │   └── pengaturan/            # Profil toko, sinkronisasi, printer
│   │
│   ├── shared/
│   │   ├── components/            # Komponen UI Neumorphic reusable
│   │   ├── design-system/         # CSS Design Tokens (light/dark/HC)
│   │   ├── lib/                   # Utilitas murni (math.ts)
│   │   ├── services/
│   │   │   ├── db.ts              # IndexedDB via Dexie (offline storage)
│   │   │   ├── syncService.ts     # Sinkronisasi ke Supabase + Realtime
│   │   │   └── printService.ts    # Cetak struk (Bluetooth & PDF)
│   │   └── config.ts              # Konfigurasi Supabase default
│   │
│   ├── store/
│   │   └── AppContext.tsx         # Global state (React Context)
│   │
│   └── utils/
│       └── cropImage.ts           # Helper crop foto produk
│
├── supabase/
│   └── migrations/                # SQL schema database Supabase
│       ├── 001_initial_setup.sql  # Skema awal semua tabel
│       ├── 002_rls_policies.sql   # Row Level Security
│       ├── 003_enable_realtime.sql
│       ├── 004_simplify_schema.sql
│       ├── 005_drop_foreign_keys.sql
│       └── 006_fix_missing_transactions.sql
│
├── index.html
├── vite.config.ts                 # Vite + PWA plugin config
├── package.json
└── tsconfig.json
```

---

## ✨ Fitur Utama

| Modul | Fitur |
|---|---|
| **Transaksi (POS)** | Keranjang belanja, pilih varian produk, catatan item, diskon nominal, pilih platform (Dine-in/Take Away/GrabFood/GoFood/ShopeeFood/TikTok), 7 metode bayar (Tunai/QRIS/Bank/DANA/GoPay/OVO/ShopeePay), service charge, hitung kembalian |
| **Produk & Stok** | CRUD produk, multi-varian, foto produk dengan crop, SKU, HPP, batas stok minimum (threshold), manajemen kategori |
| **Dashboard** | Statistik omset & profit hari ini, total transaksi, stok menipis, grafik 7/30 hari (Recharts ComposedChart) |
| **Laporan** | Riwayat transaksi (hari ini / 7 hari / 30 hari), produk terlaris, detail per transaksi, ekspor laporan |
| **Pengaturan** | Edit profil toko, service charge, header/footer struk, ukuran kertas (44–80mm), manajemen pengguna, ganti kata sandi, konfigurasi Supabase, buka/tutup shift, reset data |
| **Cetak Struk** | Bluetooth thermal printer (ESC/POS) & cetak PDF via jsPDF |
| **PWA** | Installable, offline-first, Service Worker (Workbox), auto-update |
| **Sinkronisasi Cloud** | Supabase Realtime (PostgreSQL CDC), sync queue offline, force-logout lintas perangkat |

---

## 👤 Sistem Peran (Role)

| Role | Akses |
|---|---|
| **Admin** | Semua fitur (Dashboard, Produk, POS, Laporan, Pengaturan) |
| **Manajer** | Dashboard, Produk, POS, Laporan, Pengaturan |
| **Kasir** | POS (Transaksi) & Pengaturan (profil saja) |

---

## 🛠️ Langkah Menjalankan Aplikasi Secara Lokal

### 1. Install Dependensi
```bash
npm install
```

### 2. Jalankan Mode Pengembangan
```bash
npm run dev
```
Buka alamat yang muncul di browser Chrome/Brave (misalnya: `http://localhost:5173/Mokundo-Pos/`).

### 3. Kredensial Default Login (Offline — IndexedDB)
*   **Admin (Akses Penuh):**
    *   Username: `admin` | Password: `admin`
*   **Kasir (Akses POS & Profil):**
    *   Username: `kasir` | Password: `kasir`

> Kata sandi disimpan sebagai hash SHA-256 via Web Crypto API. Tidak ada plaintext password yang tersimpan.

### 4. Build Produksi
```bash
npm run build
```
Menghasilkan folder `dist/` berisi aset terkompresi dan Service Worker siap deploy.

### 5. Menjalankan Unit Test (Vitest)
```bash
npm run test
```
Menjalankan suite pengujian kalkulasi finansial di `src/shared/lib/__tests__/`.

---

## 🗄️ Database & Penyimpanan

### Offline — IndexedDB (Dexie.js)
Seluruh data disimpan lokal di browser menggunakan **Dexie** (wrapper IndexedDB). Tabel yang tersedia:

| Tabel | Keterangan |
|---|---|
| `users` | Akun pengguna (Admin/Kasir/Manajer) |
| `stores` | Konfigurasi toko (nama, alamat, PPN, service charge, struk, dsb.) |
| `products` | Produk dengan varian, stok, HPP, SKU |
| `categories` | Kategori produk |
| `transactions` | Header transaksi (total, metode bayar, platform, shift, dsb.) |
| `transaction_items` | Detail item per transaksi |
| `shifts` | Data shift kasir (buka/tutup, modal, total penjualan) |
| `stock_logs` | Log perubahan stok (IN/OUT) |
| `sync_queue` | Antrian sinkronisasi ke Supabase |

### Cloud — Supabase (Opsional)
Sinkronisasi cloud ke **Supabase** (PostgreSQL + Realtime) diaktifkan melalui halaman Pengaturan → Sinkronisasi. Fitur:
- **Push**: Data transaksi, shift, log stok, produk, kategori diunggah saat online.
- **Pull**: Master data (produk, kategori, pengguna, konfigurasi toko) diunduh dari server.
- **Realtime**: Perubahan data dari perangkat lain langsung diterapkan via Supabase Postgres CDC.
- **Force Logout**: Admin dapat memaksa logout kasir lain secara instan via Broadcast channel.

Konfigurasi Supabase URL dan Anon Key dapat diatur dari halaman Pengaturan tanpa perlu *rebuild*.

---

## ☁️ Deployment ke GitHub Pages

Aplikasi menggunakan **GitHub Actions** untuk kompilasi dan deployment otomatis.

1. Buat repositori bernama `Mokundo-Pos` di GitHub dan push kode ke branch `main`.
2. Masuk ke **Settings → Actions → General**, aktifkan **Read and write permissions** di bagian *Workflow permissions*.
3. Di **Settings → Pages**, atur Source ke **Deploy from a branch**, pilih branch **`gh-pages`** dan folder **`/ (root)`**, lalu klik **Save**.
4. Website akan online di: `https://USERNAME.github.io/Mokundo-Pos/`

---

## 🎨 Design System

Aplikasi menggunakan desain **Neumorphic** dengan sistem token CSS yang mendukung:
- **Light Mode** — background `#E6E9EF`, bayangan lembut dua arah
- **Dark Mode** — background `#1a1a1a`, surface `#2c2c2c`
- **High Contrast Mode** — border tebal, bayangan dihapus (aksesibilitas)

Font utama: **Inter** (Google Fonts). Komponen reusable: `NeumorphicCard`, `NeumorphicButton`, `NeumorphicInput`, `NeumorphicModal`, `NeumorphicBottomSheet`.

---

## 🖨️ Cetak Struk

| Metode | Keterangan |
|---|---|
| **Bluetooth Thermal** | Koneksi via Web Bluetooth API (Chrome Android/Desktop), mendukung berbagai ukuran kertas: 44mm, 48mm, 57mm, 58mm, 72mm, 76mm, 80mm |
| **PDF (jsPDF)** | Download struk sebagai file PDF |
| **Browser Print** | Cetak via dialog print browser |

---

## 🧪 Tech Stack

| Teknologi | Versi | Fungsi |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | ~6 | Type safety |
| Vite | 8 | Build tool & dev server |
| Dexie.js | 4 | IndexedDB (offline storage) |
| Supabase JS | 2 | Cloud sync & Realtime |
| Recharts | 3 | Grafik dashboard |
| jsPDF | 4 | Generate PDF struk |
| lucide-react | 1 | Ikon |
| react-image-crop | 11 | Crop foto produk |
| qrcode | 1.5 | Generate QR Code di struk |
| vite-plugin-pwa | 1 | Service Worker & manifest |
| Vitest | 4 | Unit testing |
| oxlint | 1 | Linting |

---

## 📱 PWA Debugging Checklist

Jika tombol instalasi tidak muncul, periksa via Chrome DevTools (`F12`):

### 1. Periksa Manifest
Buka **Application → Manifest** di DevTools:
- Tidak ada error/warning merah/kuning
- `start_url` dan `scope` sesuai path repositori (`/Mokundo-Pos/`)
- `display` bernilai `standalone`
- Ikon 192px dan 512px (any & maskable) terdeteksi tanpa error 404

### 2. Periksa Service Worker
Buka **Application → Service Workers** di DevTools:
- Status **"activated and running"** (bulat hijau)
- Pastikan *Bypass for network* tidak tercentang saat uji offline

### 3. Audit Lighthouse
Buka **Lighthouse → Progressive Web App → Generate report** untuk analisis mendalam kriteria installability.
