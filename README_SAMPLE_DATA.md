# Panduan Import Sampel Data CSV ke Supabase

File-file CSV ini berisi sampel data untuk sistem POS Travinco yang dapat diimpor ke database Supabase melalui dashboard.

## ⚠️ PENTING - UUID SUDAH DIPERBAIKI (UPDATE TERBARU)

**Tanggal Perbaikan Terakhir:** 2025-01-27

Semua UUID dalam file CSV telah diperbaiki untuk mengatasi error foreign key constraint dan invalid syntax. Perbaikan meliputi:

1. **Format UUID:** Dari format tidak valid menjadi format UUID standar (8-4-4-4-12 karakter heksadesimal)
2. **Konsistensi Relasi:** UUID antar tabel sudah konsisten untuk menghindari foreign key constraint error
3. **Validitas PostgreSQL:** Semua UUID menggunakan karakter heksadesimal yang valid (0-9, a-f)

File yang telah diperbaiki:
- ✅ `sample_data_bahan_baku_lengkap.csv` (81 records)
- ✅ `sample_data_bahan_baku.csv` (30 records)
- ✅ `sample_data_produk_jadi.csv` (20 records)
- ✅ `sample_data_resep.csv` (20 records)
- ✅ `sample_data_pembelian.csv` (25 records)
- ✅ `sample_data_penjualan.csv` (39 records)

**Status:** Semua file sekarang dapat diimpor ke Supabase tanpa error "invalid syntax for type uuid" atau foreign key constraint violations.

## File yang Tersedia

### 1. `sample_data_bahan_baku.csv`
- **Tabel Target**: `bahan_baku`
- **Jumlah Record**: 30 bahan baku
- **Kolom**: `id`, `nama_bahan_baku`, `stok`, `unit`, `user_id`, `created_at`
- **Deskripsi**: Data master bahan baku parfum dengan stok awal (30 item pertama)

### 2. `sample_data_bahan_baku_lengkap.csv`
- **Tabel Target**: `bahan_baku`
- **Jumlah Record**: 82 bahan baku
- **Kolom**: `id`, `nama_bahan_baku`, `stok`, `unit`, `user_id`, `created_at`
- **Deskripsi**: Data master bahan baku parfum lengkap (semua 82 item dari bahan_baku.csv)

### 3. `sample_data_produk_jadi.csv`
- **Tabel Target**: `produk_jadi`
- **Jumlah Record**: 15 produk parfum
- **Kolom**: `id`, `nama_produk`, `sku`, `harga_jual`, `user_id`, `created_at`
- **Deskripsi**: Data master produk jadi dengan harga jual

### 4. `sample_data_resep.csv`
- **Tabel Target**: `resep`
- **Jumlah Record**: 20 resep
- **Kolom**: `id`, `produk_jadi_id`, `bahan_baku_id`, `jumlah_dibutuhkan`, `user_id`
- **Deskripsi**: Resep yang menghubungkan produk jadi dengan bahan baku yang dibutuhkan

### 5. `sample_data_pembelian.csv`
- **Tabel Target**: `pembelian`
- **Jumlah Record**: 25 transaksi pembelian
- **Kolom**: `id`, `bahan_baku_id`, `jumlah`, `harga_beli`, `tanggal`, `catatan`, `user_id`
- **Deskripsi**: Data pembelian bahan baku untuk periode Mei-Juli 2025

### 6. `sample_data_penjualan.csv`
- **Tabel Target**: `penjualan`
- **Jumlah Record**: 39 transaksi penjualan
- **Kolom**: `id`, `produk_jadi_id`, `jumlah`, `total_harga`, `tanggal`, `catatan`, `user_id`
- **Deskripsi**: Data penjualan produk untuk periode Mei-Juli 2025

## Informasi User ID

**User ID yang digunakan**: `3798ff14-acf7-40bd-a6bd-819f8479b880`

Semua data menggunakan user_id yang sama sesuai dengan data yang sudah ada di database.

## Urutan Import yang Disarankan

**PENTING**: Import harus dilakukan dalam urutan berikut untuk menghindari error foreign key:

1. **Pertama**: `sample_data_bahan_baku.csv` ATAU `sample_data_bahan_baku_lengkap.csv` → Tabel `bahan_baku`
   - Gunakan `sample_data_bahan_baku.csv` untuk testing cepat (30 item)
   - Gunakan `sample_data_bahan_baku_lengkap.csv` untuk data lengkap (82 item)
2. **Kedua**: `sample_data_produk_jadi.csv` → Tabel `produk_jadi`
3. **Ketiga**: `sample_data_resep.csv` → Tabel `resep`
4. **Keempat**: `sample_data_pembelian.csv` → Tabel `pembelian`
5. **Kelima**: `sample_data_penjualan.csv` → Tabel `penjualan`

## Cara Import di Supabase Dashboard

### Langkah-langkah:

1. **Login ke Supabase Dashboard**
   - Buka https://supabase.com
   - Login ke project Anda

2. **Masuk ke Table Editor**
   - Klik menu "Table Editor" di sidebar kiri
   - Pilih tabel yang akan diimport

3. **Import CSV**
   - Klik tombol "Insert" → "Import data from CSV"
   - Upload file CSV yang sesuai
   - Pastikan mapping kolom sudah benar
   - Klik "Import"

4. **Verifikasi Data**
   - Periksa apakah data berhasil diimport
   - Cek jumlah record sesuai dengan yang diharapkan

## Periode Data

- **Pembelian**: Mei 2025 - Juli 2025
- **Penjualan**: Mei 2025 - Juli 2025
- **Created Date**: April 2025 (untuk master data)

## Catatan Penting

1. **Backup Database**: Selalu backup database sebelum import
2. **Test Environment**: Disarankan test di environment development terlebih dahulu
3. **Foreign Key**: Pastikan urutan import sesuai dengan dependency antar tabel
4. **UUID Format**: Semua ID menggunakan format UUID yang valid
5. **Timestamp**: Menggunakan format PostgreSQL timestamp with timezone

## Troubleshooting

### Error "Foreign Key Constraint"
- Pastikan import dilakukan sesuai urutan yang disarankan
- Periksa apakah data parent sudah ada sebelum import data child

### Error "Duplicate Key"
- Periksa apakah data dengan ID yang sama sudah ada
- Hapus data lama atau gunakan ID yang berbeda

### Error "Invalid UUID"
- Pastikan format UUID sudah benar
- Gunakan UUID generator jika perlu membuat ID baru

## Kontak

Jika ada pertanyaan atau masalah dalam import data, silakan hubungi tim development.