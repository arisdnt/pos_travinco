export interface BahanBaku {
  id: string
  nama_bahan_baku: string
  stok: number
  unit: string
  created_at: string
}

export interface ProdukJadi {
  id: string
  nama_produk_jadi: string
  sku: string
  harga_jual: number
  created_at: string
}

export interface Resep {
  id: string
  produk_jadi_id: string
  bahan_baku_id: string
  jumlah_dibutuhkan: number
  produk_jadi?: ProdukJadi
  bahan_baku?: BahanBaku
}

export interface Pembelian {
  id: string
  bahan_baku_id: string
  jumlah: number
  harga_beli: number
  tanggal: string
  catatan?: string
  bahan_baku?: BahanBaku
}

export interface Penjualan {
  id: string
  produk_jadi_id: string
  jumlah: number
  total_harga: number
  tanggal: string
  catatan?: string
  produk_jadi?: ProdukJadi
}

// Form types
export interface BahanBakuForm {
  nama_bahan_baku: string
  stok: number
  unit: string
}

export interface ProdukJadiForm {
  nama_produk_jadi: string
  sku: string
  harga_jual: number
}

export interface ResepForm {
  produk_jadi_id: string
  bahan_baku_id: string
  jumlah_dibutuhkan: number
}

export interface PembelianForm {
  bahan_baku_id: string
  jumlah: number
  harga_beli: number
  tanggal: string
  catatan?: string
}

export interface PenjualanForm {
  produk_jadi_id: string
  jumlah: number
  tanggal: string
  catatan?: string
}

// Dashboard stats
export interface DashboardStats {
  total_bahan_baku: number
  total_produk_jadi: number
  total_penjualan_bulan_ini: number
  total_pembelian_bulan_ini: number
}

// Laporan types
export interface LaporanPemakaianBahanBaku {
  nama_bahan_baku: string
  unit: string
  total_terpakai: number
  periode: string
}

export interface LaporanPenjualan {
  nama_produk_jadi: string
  sku: string
  total_terjual: number
  total_pendapatan: number
  periode: string
}