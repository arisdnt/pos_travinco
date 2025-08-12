// =====================================================
// MASTER DATA TYPES
// =====================================================
// File ini berisi tipe data untuk master data aplikasi POS Travinco
// Termasuk: Supplier, Kategori, Unit Dasar, Kemasan, dan Reservasi Stok

// =====================================================
// CORE MASTER DATA ENTITIES
// =====================================================

export interface BaseEntity {
  id: string;
  user_id?: string;
  created_at?: string;
}

// =====================================================
// MASTER DATA TYPES
// =====================================================

export interface Supplier extends BaseEntity {
  nama_supplier: string;
  kontak?: string;
  alamat?: string;
}

export interface Kategori extends BaseEntity {
  nama_kategori: string;
  deskripsi?: string;
}

export interface UnitDasar extends BaseEntity {
  nama_unit: string; // 'Kilogram', 'Liter', 'Pieces', 'Gram', 'Meter'
  deskripsi?: string;
}

export interface Kemasan extends BaseEntity {
  nama_kemasan: string; // 'Botol 100ml', 'Jerigen 5L', 'Drum 25L'
  unit_dasar_id: string;
  nilai_konversi: number; // 100, 5000, 25000
  // Relasi
  unit_dasar?: UnitDasar;
}

// Produk untuk sistem POS
export interface Produk extends BaseEntity {
  nama_produk: string;
  kategori_id?: string;
  harga_jual: number;
  stok_tersedia: number;
  deskripsi?: string;
  // Relasi
  kategori?: Kategori;
}

// Reservasi Stok untuk produk
export interface ReservasiStok extends BaseEntity {
  produk_id: string;
  jumlah_reservasi: number;
  tanggal_reservasi: string;
  tanggal_kedaluwarsa?: string;
  harga_per_unit?: number;
  status: 'aktif' | 'selesai' | 'dibatalkan';
  keterangan?: string;
  // Relasi
  produk?: Produk;
}

// =====================================================
// RESERVASI STOK TYPES
// =====================================================

export interface ReservasiStokSupplier extends BaseEntity {
  bahan_baku_id: string;
  supplier_id: string;
  jumlah_reservasi: number; // Dalam satuan dasar
  kemasan_id?: string; // Kemasan yang digunakan saat input (untuk referensi)
  catatan?: string;
  updated_at?: string;
  // Relasi
  bahan_baku?: BahanBaku;
  suppliers?: Supplier;
  kemasan?: Kemasan;
}

// =====================================================
// UPDATED EXISTING TYPES
// =====================================================

// Update BahanBaku dengan kolom baru
export interface BahanBaku extends BaseEntity {
  nama_bahan_baku: string;
  stok: number;
  kategori_id?: string;
  unit_dasar_id?: string;
  // Relasi
  kategori?: Kategori;
  unit_dasar?: UnitDasar;
}

// Update Pembelian dengan kolom baru
export interface Pembelian extends BaseEntity {
  bahan_baku_id: string;
  jumlah: number;
  harga_beli: number;
  tanggal: string;
  catatan?: string;
  supplier_id?: string;
  asal_barang: 'langsung' | 'reservasi';
  kemasan_id?: string;
  // Relasi
  bahan_baku?: BahanBaku;
  supplier?: Supplier;
  kemasan?: Kemasan;
}

// =====================================================
// VIEW TYPES (untuk data yang sudah di-join)
// =====================================================

export interface ReservasiStokDetail {
  id: string;
  jumlah_reservasi: number;
  catatan?: string;
  created_at: string;
  updated_at: string;
  nama_bahan_baku: string;
  stok_gudang: number;
  nama_supplier: string;
  kontak_supplier?: string;
  nama_unit?: string;
  nama_kategori?: string;
  user_id?: string;
}

export interface BahanBakuDetail {
  id: string;
  nama_bahan_baku: string;
  stok: number;
  created_at: string;
  nama_unit?: string;
  nama_kategori?: string;
  user_id?: string;
}

export interface PembelianDetail {
  id: string;
  jumlah: number;
  harga_beli: number;
  tanggal: string;
  catatan?: string;
  asal_barang: 'langsung' | 'reservasi';
  nama_bahan_baku: string;
  nama_supplier?: string;
  nama_kemasan?: string;
  nilai_konversi?: number;
  nama_unit?: string;
  user_id?: string;
}

// =====================================================
// FORM TYPES
// =====================================================

export interface SupplierFormData {
  nama_supplier: string;
  kontak?: string;
  alamat?: string;
}

export interface KategoriFormData {
  nama_kategori: string;
  deskripsi?: string;
}

export interface UnitDasarFormData {
  nama_unit: string;
  deskripsi?: string;
}

export interface KemasanFormData {
  nama_kemasan: string;
  unit_dasar_id: string;
  nilai_konversi: number;
}

export interface ProdukFormData {
  nama_produk: string;
  kategori_id?: string;
  harga_jual: number;
  stok_tersedia: number;
  deskripsi?: string;
}

export interface ReservasiStokFormData {
  produk_id: string;
  jumlah_reservasi: number;
  tanggal_reservasi: string;
  tanggal_kedaluwarsa?: string;
  harga_per_unit?: number;
  status: 'aktif' | 'selesai' | 'dibatalkan';
  keterangan?: string;
}

export interface ReservasiFormData {
  bahan_baku_id: string;
  supplier_id: string;
  jumlah_reservasi: number;
  catatan?: string;
}

export interface BahanBakuFormData {
  nama_bahan_baku: string;
  stok: number;
  kategori_id?: string;
  unit_dasar_id?: string;
}

export interface PembelianFormData {
  bahan_baku_id: string;
  jumlah: number;
  harga_beli: number;
  tanggal: string;
  catatan?: string;
  supplier_id?: string;
  asal_barang: 'langsung' | 'reservasi';
  kemasan_id?: string;
}

// =====================================================
// SELECT OPTION TYPES
// =====================================================

export interface SelectOption {
  value: string;
  label: string;
}

export interface SupplierOption extends SelectOption {
  kontak?: string;
  alamat?: string;
}

export interface KategoriOption extends SelectOption {
  deskripsi?: string;
}

export interface UnitDasarOption extends SelectOption {
  deskripsi?: string;
}

export interface KemasanOption extends SelectOption {
  unit_dasar_id: string;
  nilai_konversi: number;
  nama_unit?: string;
}

export interface BahanBakuOption extends SelectOption {
  stok: number;
  nama_unit?: string;
  nama_kategori?: string;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// =====================================================
// FILTER & SEARCH TYPES
// =====================================================

export interface SupplierFilter {
  search?: string;
  sortBy?: 'nama_supplier' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface BahanBakuFilter {
  search?: string;
  kategori_id?: string;
  unit_dasar_id?: string;
  sortBy?: 'nama_bahan_baku' | 'stok' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface ReservasiFilter {
  search?: string;
  supplier_id?: string;
  bahan_baku_id?: string;
  sortBy?: 'created_at' | 'updated_at' | 'jumlah_reservasi';
  sortOrder?: 'asc' | 'desc';
}

export interface PembelianFilter {
  search?: string;
  supplier_id?: string;
  asal_barang?: 'langsung' | 'reservasi';
  tanggal_dari?: string;
  tanggal_sampai?: string;
  sortBy?: 'tanggal' | 'harga_beli' | 'jumlah';
  sortOrder?: 'asc' | 'desc';
}

// =====================================================
// DASHBOARD STATS TYPES
// =====================================================

export interface StokReservasiStats {
  total_supplier: number;
  total_reservasi: number;
  total_nilai_reservasi: number;
  bahan_baku_dengan_reservasi: number;
}

export interface SupplierStats {
  supplier_id: string;
  nama_supplier: string;
  total_reservasi: number;
  total_pembelian: number;
  nilai_pembelian: number;
}

// =====================================================
// UTILITY TYPES
// =====================================================

export type AsalBarang = 'langsung' | 'reservasi';

export type SortOrder = 'asc' | 'desc';

export type TableAction = 'view' | 'edit' | 'delete';

// =====================================================
// CONSTANTS
// =====================================================

export const ASAL_BARANG_OPTIONS: { value: AsalBarang; label: string }[] = [
  { value: 'langsung', label: 'Pembelian Langsung' },
  { value: 'reservasi', label: 'Dari Stok Reservasi' }
];

export const DEFAULT_UNITS = [
  'ml', 'gr', 'pcs', 'kg', 'liter'
];

export const DEFAULT_CATEGORIES = [
  'Bibit Parfum',
  'Kemasan', 
  'Bahan Tambahan',
  'Alat Produksi'
];

// =====================================================
// VALIDATION SCHEMAS (untuk form validation)
// =====================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// =====================================================
// EXPORT ALL TYPES
// =====================================================

export type {
  // Existing types yang sudah ada di project
  // Tambahkan di sini jika ada types lain yang perlu di-export
};