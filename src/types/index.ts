// =====================================================
// CORE APPLICATION TYPES
// =====================================================
// File ini berisi tipe data utama untuk aplikasi POS Travinco
// Untuk tipe data master data dan konfigurasi, lihat ./master-data.ts

// =====================================================
// MAIN ENTITY TYPES
// =====================================================

export interface BahanBaku {
  id: string;
  nama_bahan_baku: string;
  stok: number;
  kategori_id?: string;
  unit_dasar_id?: string;
  user_id?: string;
  created_at: string;
  // Relasi
  kategori?: import('./master-data').Kategori;
  unit_dasar?: import('./master-data').UnitDasar;
}

export interface ProdukJadi {
  id: string;
  nama_produk_jadi: string;
  sku: string;
  harga_jual: number;
  kategori_id?: string;
  user_id?: string;
  created_at: string;
  // Relasi
  kategori?: import('./master-data').Kategori;
}

export interface Resep {
  id: string;
  produk_jadi_id: string;
  bahan_baku_id: string;
  jumlah_dibutuhkan: number;
  user_id?: string;
  created_at?: string;
  // Relasi
  produk_jadi?: ProdukJadi;
  bahan_baku?: BahanBaku;
}

export interface Pembelian {
  id: string;
  bahan_baku_id: string;
  jumlah: number;
  harga_beli: number;
  tanggal: string;
  catatan?: string;
  supplier_id?: string;
  asal_barang?: 'langsung' | 'reservasi';
  kemasan_id?: string;
  user_id?: string;
  created_at?: string;
  // Relasi
  bahan_baku?: BahanBaku;
  supplier?: import('./master-data').Supplier;
  kemasan?: import('./master-data').Kemasan;
}

export interface Penjualan {
  id: string;
  produk_jadi_id: string;
  jumlah: number;
  total_harga: number;
  tanggal: string;
  catatan?: string;
  user_id?: string;
  created_at?: string;
  // Relasi
  produk_jadi?: ProdukJadi;
}

// =====================================================
// FORM TYPES
// =====================================================

export interface BahanBakuForm {
  nama_bahan_baku: string;
  stok: number;
  kategori_id?: string;
  unit_dasar_id?: string;
}

export interface ProdukJadiForm {
  nama_produk_jadi: string;
  sku: string;
  harga_jual: number;
  kategori_id?: string;
}

export interface ResepForm {
  produk_jadi_id: string;
  bahan_baku_id: string;
  jumlah_dibutuhkan: number;
}

export interface PembelianForm {
  bahan_baku_id: string;
  jumlah: number;
  harga_beli: number;
  tanggal: string;
  catatan?: string;
  supplier_id?: string;
  asal_barang?: 'langsung' | 'reservasi';
  kemasan_id?: string;
}

export interface PenjualanForm {
  produk_jadi_id: string;
  jumlah: number;
  tanggal: string;
  catatan?: string;
}

// =====================================================
// DASHBOARD & ANALYTICS TYPES
// =====================================================

export interface DashboardStats {
  total_bahan_baku: number;
  total_produk_jadi: number;
  total_penjualan_bulan_ini: number;
  total_pembelian_bulan_ini: number;
  low_stock_items: number;
  pending_reservations: number;
}

// =====================================================
// REPORT TYPES
// =====================================================

export interface LaporanPemakaianBahanBaku {
  nama_bahan_baku: string;
  nama_unit: string;
  total_terpakai: number;
  periode: string;
  kategori?: string;
}

export interface LaporanPenjualan {
  nama_produk_jadi: string;
  sku: string;
  total_terjual: number;
  total_pendapatan: number;
  periode: string;
  kategori?: string;
}

// =====================================================
// UTILITY TYPES
// =====================================================

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type SortOrder = 'asc' | 'desc';

export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

// Re-export master data types for convenience
export type {
  Supplier,
  Kategori,
  UnitDasar,
  Kemasan,
  ReservasiStok,
  SupplierFormData,
  KategoriFormData,
  UnitDasarFormData,
  KemasanFormData,
  ReservasiStokFormData,
  AsalBarang
} from './master-data';