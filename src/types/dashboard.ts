// Dashboard Statistics Interface
export interface DashboardStats {
  totalBahanBaku: number;
  totalProdukJadi: number;
  penjualanBulanIni: number;
  pembelianBulanIni: number;
  stokRendah: number;
  produkTerlaris: number;
}

// Top Products Interface
export interface TopProduct {
  nama_produk_jadi: string;
  total_terjual: number;
  total_pendapatan: number;
  color: string;
}

// Stock Data Interface
export interface StockData {
  nama_produk_jadi: string;
  stok_tersedia: number;
  status: string;
  color: string;
}

// Monthly Trend Interface
export interface MonthlyTrend {
  month: string;
  sales: number;
  purchases: number;
}

// Sales Report Interface
export interface LaporanPenjualan {
  nama_produk_jadi: string;
  sku: string;
  total_terjual: number;
  total_pendapatan: number;
  periode: string;
  user_id: string;
}

// Material Usage Report Interface
export interface PemakaianBahanWithCost {
  nama_bahan_baku: string;
  nama_unit: string;
  total_terpakai: number;
  periode: string;
  harga_per_unit: number;
  total_biaya: number;
  kategori: string;
  supplier: string;
}

// Available Stock Interface
export interface StokTersedia {
  nama_produk_jadi: string;
  sku: string;
  stok_tersedia: number;
  status: string;
  min_stok: number;
  harga_jual: number;
  kategori: string;
}

// Chart Data Interfaces
export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface TrendDataPoint {
  month: string;
  sales: number;
  purchases: number;
}

// Component Props Interfaces
export interface DashboardStatsProps {
  stats: DashboardStats;
  topProducts: TopProduct[];
  loading: boolean;
}

export interface DashboardChartsProps {
  topProducts: TopProduct[];
  stockData: StockData[];
  monthlyTrends: MonthlyTrend[];
  loading: boolean;
}

export interface DashboardReportsProps {
  laporanPenjualan: LaporanPenjualan[];
  laporanPemakaianBahan: PemakaianBahanWithCost[];
  stokTersedia: StokTersedia[];
  loading: boolean;
}