# Mokundo POS (Point of Sale)

Mokundo POS adalah aplikasi kasir berbasis web yang dirancang sebagai **Progressive Web App (PWA)** dengan pendekatan *offline-first*. Aplikasi ini dioptimalkan untuk perangkat Android (HP dan Tablet) dengan shell responsif serta mode tampilan desktop admin.

---

## 🛠️ Langkah Menjalankan Aplikasi Secara Lokal

### 1. Jalankan Mode Pengembangan
Untuk mulai menjalankan aplikasi di komputer Anda secara lokal:
```bash
npm run dev
```
Setelah berjalan, buka alamat yang muncul di browser Chrome/Brave (misalnya: `http://localhost:5173/Mokundo-Pos/`).

### 2. Kredensial Default Login (Offline IndexedDB)
*   **Sebagai Owner/Admin (Akses Penuh):**
    *   Username: `admin` | Password: `admin`
*   **Sebagai Kasir (Akses Transaksi & Produk):**
    *   Username: `kasir` | Password: `kasir`

### 3. Mengompilasi Kode Produksi
Untuk melakukan build final yang siap dideploy (menghasilkan folder `dist/` berisi aset web terkompresi dan file Service Worker):
```bash
npm run build
```

### 4. Menjalankan Unit Test (Vitest)
Untuk menjalankan suite pengujian kalkulasi finansial:
```bash
npm run test
```

---

## ☁️ Deployment ke GitHub Pages

Aplikasi ini menggunakan **GitHub Actions** untuk kompilasi dan deployment otomatis. 

1. Buat repositori baru bernama `Mokundo-Pos` di GitHub.
2. Push kode Anda ke branch `main`.
3. Masuk ke **Settings > Actions > General**, gulir ke paling bawah ke bagian **Workflow permissions**, pilih **Read and write permissions**, lalu klik **Save**.
4. Di tab **Settings > Pages**, atur **Source** ke `Deploy from a branch`, lalu pilih branch **`gh-pages`** dan folder **`/ (root)`** sebagai target tayang. Klik **Save**.
5. Website Anda akan segera online di `https://USERNAME.github.io/Mokundo-Pos/`.

---

## 📱 PWA Debugging Checklist (Penyelesaian Masalah Instalasi)

Jika tombol instalasi atau ikon instalasi di address bar browser tidak muncul, silakan lakukan pemeriksaan dengan Chrome DevTools (tekan tombol `F12` atau klik kanan > Inspect):

### 1. Periksa Kesalahan pada Manifest
Aplikasi harus mendaftarkan file manifest dengan benar agar dikenali sebagai aplikasi yang dapat di-install.
*   **Cara Cek**: Buka DevTools > pilih tab **Application** di atas > klik menu **Manifest** di sidebar kiri.
*   **Harus Dipastikan**:
    *   Tidak ada pesan error/warning berwarna kuning/merah.
    *   Field `name` dan `short_name` terisi.
    *   `start_url` dan `scope` terisi dengan path repositori Anda (contoh: `/Mokundo-Pos/`).
    *   `display` bernilai `standalone`.
    *   Bagian **Icons** mendeteksi 3 ikon terdaftar (192px any, 512px any, dan 512px maskable) dan gambarnya tidak 404 (tidak pecah).

### 2. Periksa Status Service Worker
Service Worker bertugas untuk meng-cache aset web agar aplikasi dapat berjalan stabil saat offline.
*   **Cara Cek**: Buka DevTools > pilih tab **Application** > klik **Service Workers** di sidebar kiri.
*   **Harus Dipastikan**:
    *   Status bertuliskan **"activated and running"** dengan bulatan berwarna hijau.
    *   Kotak centang *Bypass for network* tidak tercentang saat menguji fungsionalitas offline.

### 3. Jalankan Audit Lighthouse PWA
Untuk mendapatkan analisis mendalam mengapa aplikasi belum memenuhi kriteria installable:
*   **Cara Cek**: Buka DevTools > pilih tab **Lighthouse** di atas.
*   **Langkah**:
    1. Centang kategori **"Progressive Web App"** saja.
    2. Pilih Device **"Mobile"** atau **"Desktop"** sesuai keinginan.
    3. Klik **Generate report**.
    4. Lighthouse akan memberikan laporan checklist berwarna hijau. Jika ada kriteria installability yang gagal, ikuti petunjuk yang diberikan untuk memperbaikinya.
