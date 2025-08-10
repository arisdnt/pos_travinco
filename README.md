# Aura Flow - Aplikasi Inventaris Parfum

Aplikasi manajemen inventaris internal yang modern dan profesional untuk bisnis parfum. Dibangun dengan Next.js 14, TypeScript, Supabase, dan Shadcn/UI.

## 🚀 Fitur Utama

- **Dashboard Analytics** - Overview bisnis dengan statistik real-time
- **Manajemen Bahan Baku** - Kelola stok bahan baku dengan sistem JIT
- **Manajemen Produk Jadi** - Katalog produk dengan SKU otomatis
- **Sistem Resep** - Definisi komposisi produk dari bahan baku
- **Transaksi Pembelian** - Pencatatan pembelian dengan update stok otomatis
- **Transaksi Penjualan** - Penjualan dengan pengurangan stok otomatis
- **Laporan & Ekspor** - Laporan komprehensif dengan ekspor PDF/Excel
- **Dark/Light Mode** - Tema yang dapat disesuaikan
- **Responsive Design** - Optimal di desktop, tablet, dan mobile

## 🛠️ Teknologi

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI Components**: Shadcn/UI, Radix UI
- **Backend**: Supabase (PostgreSQL)
- **State Management**: TanStack Query (React Query)
- **Form Handling**: React Hook Form + Zod
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## 📋 Prasyarat

- Node.js 18+ 
- npm atau yarn
- Akun Supabase

## 🚀 Instalasi

### 1. Clone Repository

```bash
git clone <repository-url>
cd aura-flow
```

### 2. Install Dependencies

```bash
npm install
# atau
yarn install
```

### 3. Setup Database (Supabase)

1. Buat project baru di [Supabase](https://supabase.com)
2. Buka SQL Editor di dashboard Supabase
3. Copy dan jalankan script dari file `database.sql`
4. Script akan membuat:
   - Semua tabel yang diperlukan
   - Trigger untuk otomasi stok
   - Function helper
   - View untuk laporan
   - Sample data (opsional)

### 4. Environment Variables

1. Copy file `.env.local.example` menjadi `.env.local`
2. Isi dengan kredensial Supabase Anda:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Jalankan Aplikasi

```bash
npm run dev
# atau
yarn dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

## 📊 Struktur Database

### Tabel Utama:

1. **bahan_baku** - Master data bahan baku
2. **produk_jadi** - Master data produk jadi
3. **resep** - Komposisi produk dari bahan baku
4. **pembelian** - Transaksi pembelian bahan baku
5. **penjualan** - Transaksi penjualan produk

### Otomasi Stok:

- **Pembelian**: Otomatis menambah stok bahan baku
- **Penjualan**: Otomatis mengurangi stok bahan baku sesuai resep
- **Validasi**: Cek ketersediaan stok sebelum penjualan

## 🎯 Cara Penggunaan

### 1. Setup Awal

1. **Tambah Bahan Baku**: Masukkan semua bahan baku dengan stok awal
2. **Tambah Produk Jadi**: Buat katalog produk dengan SKU dan harga
3. **Buat Resep**: Definisikan komposisi setiap produk

### 2. Operasional Harian

1. **Pembelian**: Catat pembelian bahan baku (stok otomatis bertambah)
2. **Penjualan**: Catat penjualan produk (stok otomatis berkurang)
3. **Monitor**: Pantau stok dan aktivitas di dashboard

### 3. Laporan

1. **Laporan Pemakaian**: Lihat konsumsi bahan baku per periode
2. **Laporan Penjualan**: Analisis performa produk
3. **Ekspor Data**: Download laporan dalam format PDF/Excel

## 🏗️ Struktur Folder

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── bahan-baku/     # Halaman bahan baku
│   │   ├── produk-jadi/    # Halaman produk jadi
│   │   ├── resep/          # Halaman resep
│   │   ├── pembelian/      # Halaman pembelian
│   │   ├── penjualan/      # Halaman penjualan
│   │   └── laporan/        # Halaman laporan
│   └── globals.css         # Global styles
├── components/             # React components
│   ├── ui/                 # Shadcn/UI components
│   ├── layout/             # Layout components
│   └── forms/              # Form components
├── lib/                    # Utilities
│   ├── supabase.ts         # Supabase client
│   └── utils.ts            # Helper functions
└── types/                  # TypeScript definitions
```

## 🔧 Development

### Scripts Tersedia:

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint check
```

### Menambah Fitur Baru:

1. Buat komponen di `src/components/`
2. Tambah route di `src/app/(dashboard)/`
3. Update types di `src/types/index.ts`
4. Tambah query/mutation dengan TanStack Query

## 🚀 Deployment

### Vercel (Recommended):

1. Push code ke GitHub
2. Connect repository di Vercel
3. Set environment variables
4. Deploy otomatis

### Manual Deployment:

```bash
npm run build
npm run start
```

## 🤝 Contributing

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Support

Jika ada pertanyaan atau masalah, silakan buat issue di repository ini.

---

**Aura Flow** - Solusi inventaris parfum yang elegan dan profesional 🌸