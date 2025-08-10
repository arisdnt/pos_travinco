
# BLUEPRINT APLIKASI INVENTARIS PARFUM - "AURA FLOW"

**Versi: 1.0 (Final)**
**Tanggal: 10 Agustus 2025**

## 1. Filosofi & Tujuan Proyek

**Tujuan:** Mengembangkan aplikasi manajemen inventaris internal yang modern, efisien, dan profesional untuk bisnis parfum. Aplikasi ini akan melacak bahan baku, resep produk, pembelian, dan penjualan dengan model "Just-in-Time" (JIT) untuk memastikan data stok selalu akurat dan real-time.

**Filosofi Desain:**
- **Elegan & Modern:** Antarmuka yang bersih, minimalis, dan tidak berantakan.
- **Profesional:** Fokus pada fungsionalitas, kejelasan data, dan keandalan.
- **Intuitif:** Alur kerja yang mudah dipahami oleh pengguna tanpa memerlukan pelatihan ekstensif.

---

## 2. Arsitektur & Teknologi

Arsitektur yang dipilih adalah **Jamstack** modern yang mengedepankan kecepatan, keamanan, dan skalabilitas.

- **Frontend Framework:** **Next.js 14+ (App Router)**
  - **Alasan:** Struktur modern, performa tinggi (SSR & SSG), dan ekosistem yang matang. App Router memungkinkan layout yang lebih terorganisir.

- **Bahasa:** **TypeScript**
  - **Alasan:** Mencegah error, meningkatkan kualitas kode, dan mempermudah kolaborasi tim dengan adanya type safety.

- **Backend & Database:** **Supabase (PostgreSQL)**
  - **Alasan:** All-in-one solution (Database, Auth, Auto-generated APIs) yang mempercepat pengembangan. Menggunakan PostgreSQL yang powerful dan andal.

- **UI Component Library:** **Shadcn/UI**
  - **Alasan:** Pustaka komponen yang modern, elegan, dan sangat bisa dikustomisasi, dibangun di atas Tailwind CSS. Ini sangat sesuai dengan filosofi desain "elegan & profesional". Tidak mengikat pada satu gaya desain dan memberikan kontrol penuh.

- **Styling:** **Tailwind CSS**
  - **Alasan:** Utility-first CSS framework untuk membangun desain kustom dengan cepat. Terintegrasi sempurna dengan Shadcn/UI.

- **Manajemen Form:** **React Hook Form** & **Zod**
  - **Alasan:** Solusi standar industri untuk form yang performant dan validasi skema yang andal. Shadcn/UI sudah terintegrasi baik dengan keduanya.

- **Data Fetching:** **TanStack Query (React Query)**
  - **Alasan:** Mengelola server state dengan sangat baik, menyediakan caching, refetching otomatis, dan optimisme UI.

- **Fitur Ekspor Data:**
  - **Excel (.xlsx):** Library `SheetJS` atau `exceljs`.
  - **PDF (.pdf):** Library `jsPDF` dengan plugin `jsPDF-AutoTable`.

---

## 3. Struktur Database Final (PostgreSQL)

Ini adalah struktur final dari `Revisi 3` yang akan kita implementasikan.

- **Tabel 1: `bahan_baku`**
  - `id` (uuid, PK)
  - `nama_bahan_baku` (text, NOT NULL)
  - `stok` (numeric, NOT NULL, DEFAULT 0)
  - `unit` (text, NOT NULL) -- (e.g., 'ml', 'gr', 'buah')
  - `created_at` (timestamptz)

- **Tabel 2: `produk_jadi`**
  - `id` (uuid, PK)
  - `nama_produk_jadi` (text, NOT NULL)
  - `sku` (text, UNIQUE) -- Stock Keeping Unit
  - `harga_jual` (numeric, NOT NULL, DEFAULT 0)
  - `created_at` (timestamptz)

- **Tabel 3: `resep`**
  - `id` (uuid, PK)
  - `produk_jadi_id` (uuid, FK to `produk_jadi`)
  - `bahan_baku_id` (uuid, FK to `bahan_baku`)
  - `jumlah_dibutuhkan` (numeric, NOT NULL)

- **Tabel 4: `pembelian`**
  - `id` (uuid, PK)
  - `bahan_baku_id` (uuid, FK to `bahan_baku`)
  - `jumlah` (numeric, NOT NULL)
  - `harga_beli` (numeric)
  - `tanggal` (timestamptz, NOT NULL)
  - `catatan` (text)

- **Tabel 5: `penjualan`**
  - `id` (uuid, PK)
  - `produk_jadi_id` (uuid, FK to `produk_jadi`)
  - `jumlah` (numeric, NOT NULL)
  - `total_harga` (numeric) -- (jumlah * produk_jadi.harga_jual)
  - `tanggal` (timestamptz, NOT NULL)
  - `catatan` (text)

**Penting:** Semua trigger yang telah kita diskusikan di `Revisi 3` akan diimplementasikan di Supabase SQL Editor untuk otomatisasi stok.

---

## 4. Struktur Folder Proyek (Next.js App Router)

Struktur ini dirancang untuk skalabilitas dan keterbacaan.

```
/aura-flow
├── /src
│   ├── /app
│   │   ├── /api                 # Untuk route handlers (misal: webhook)
│   │   ├── /(auth)              # Grup rute untuk otentikasi
│   │   │   └── /login
│   │   │       └── page.tsx
│   │   ├── /(dashboard)         # Grup rute utama yang dilindungi
│   │   │   ├── /bahan-baku
│   │   │   ├── /pembelian
│   │   │   ├── /penjualan
│   │   │   ├── /produk-jadi
│   │   │   ├── /resep
│   │   │   ├── /laporan         # Halaman untuk laporan & ekspor data
│   │   │   ├── layout.tsx       # Layout utama dashboard (Sidebar + Header)
│   │   │   └── page.tsx         # Halaman utama dashboard
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   └── layout.tsx           # Root layout
│   ├── /components
│   │   ├── /auth                # Komponen khusus otentikasi
│   │   ├── /forms               # Komponen form (misal: FormPenjualan)
│   │   ├── /layout              # Komponen layout (Sidebar, Header, PageWrapper)
│   │   ├── /shared              # Komponen yang dipakai berulang (misal: Tombol Ekspor)
│   │   └── /ui                  # Komponen dari Shadcn/UI (Button, Input, Table, etc.)
│   ├── /hooks                   # Custom hooks (misal: useDebounce)
│   ├── /lib
│   │   ├── actions.ts           # Next.js Server Actions untuk mutasi data
│   │   ├── supabase.ts          # Inisialisasi Supabase client
│   │   └── utils.ts             # Fungsi helper umum
│   └── /types
│       └── index.ts             # Definisi tipe data TypeScript
├── .eslintrc.json
├── .gitignore
├── next.config.mjs
├── package.json
├── postcss.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## 5. Desain UI, Layout, dan Pengalaman Pengguna (UX)

### a. Layout Utama Dashboard
- **Sidebar (Kiri):** Navigasi utama yang bisa diciutkan (collapsible). Berisi link ke semua modul utama (Dashboard, Bahan Baku, Produk Jadi, Penjualan, dll).
- **Header (Atas):** Menampilkan nama halaman saat ini, breadcrumbs, dan menu profil pengguna (dengan tombol logout).
- **Content Area (Kanan):** Area konten utama tempat form, tabel, dan data ditampilkan. Setiap halaman akan memiliki judul yang jelas.

### b. Desain Halaman & Komponen
- **Tabel Data:**
  - Semua tabel data (misal: daftar bahan baku) akan menggunakan komponen `DataTable` dari Shadcn/UI yang dibangun di atas TanStack Table.
  - Fitur: Sorting per kolom, filter/pencarian global, dan paginasi.
  - Di atas setiap tabel, akan ada tombol aksi utama seperti **"Tambah Baru"** dan **"Ekspor"** (dengan pilihan format PDF/Excel).
- **Form Input:**
  - Desain form yang bersih, satu kolom, dengan label di atas input field (`stacked labels`).
  - Validasi error ditampilkan secara real-time di bawah input yang salah.
  - Tombol "Simpan" akan menjadi aksi primer, dengan tombol "Batal" sebagai aksi sekunder.
  - Untuk pemilihan item (misal: memilih bahan baku di form resep), akan digunakan komponen `Combobox` (searchable dropdown) untuk UX yang lebih baik.
- **Skema Warna & Tipografi:**
  - Menggunakan skema warna netral dan profesional (misal: abu-abu, biru tua sebagai aksen) untuk fokus pada data.
  - Mendukung **Light Mode** dan **Dark Mode** secara default (mudah diimplementasikan dengan Tailwind & Shadcn).
  - Font sans-serif yang mudah dibaca seperti Inter atau Geist.

### c. Alur Kerja Kunci
- **Membuat Produk Baru:**
  1. Pengguna masuk ke halaman "Produk Jadi", klik "Tambah Baru".
  2. Mengisi form (nama produk, SKU, harga jual).
  3. Setelah tersimpan, pengguna diarahkan ke halaman "Resep".
  4. Di halaman "Resep", pengguna memilih produk jadi yang baru dibuat, lalu menambahkan bahan baku satu per satu dari daftar `bahan_baku` yang ada.
- **Melakukan Penjualan:**
  1. Masuk ke halaman "Penjualan", klik "Buat Transaksi".
  2. Pengguna memilih "Produk Jadi" yang akan dijual dari combobox.
  3. Di bawahnya, aplikasi secara proaktif menampilkan informasi: "Stok bahan baku cukup untuk membuat X unit".
  4. Pengguna memasukkan jumlah yang dijual, lalu klik "Simpan".
  5. Sistem otomatis mengurangi stok bahan baku di backend.
- **Melihat Laporan:**
  1. Masuk ke halaman "Laporan".
  2. Pengguna bisa memilih jenis laporan (misal: "Laporan Pemakaian Bahan Baku").
  3. Aplikasi akan menampilkan tabel data (hasil dari query SQL yang kita diskusikan sebelumnya).
  4. Pengguna bisa memfilter berdasarkan rentang tanggal dan mengklik tombol **"Ekspor ke PDF"** atau **"Ekspor ke Excel"**.

---

Dokumen blueprint ini berfungsi sebagai panduan tunggal yang komprehensif. Dengan mengikuti panduan ini, proses pengembangan akan menjadi lebih terstruktur, dan produk akhir akan memenuhi standar kualitas profesional yang diharapkan.
