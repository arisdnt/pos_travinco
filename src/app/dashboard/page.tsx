'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/auth-provider';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';
import { DashboardReports } from '@/components/dashboard/dashboard-reports';
import { TrendingUp, ShoppingCart, Package, BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { StatCard, StatCardVariants } from '@/components/ui/stat-card';
import type { 
  DashboardStats, 
  TopProduct as DashboardTopProduct, 
  MonthlyTrend,
  LaporanPenjualan,
  PemakaianBahanWithCost,
  StokTersedia
} from '@/types/dashboard';
import type { TopProduct, StockData } from '@/components/dashboard/dashboard-charts';

// Color utilities
const colors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];

export default function DashboardPage() {
  const { user } = useAuth();
  
  // Dashboard state
  const [stats, setStats] = useState<DashboardStats>({
    totalBahanBaku: 0,
    totalProdukJadi: 0,
    penjualanBulanIni: 0,
    pembelianBulanIni: 0,
    stokRendah: 0,
    produkTerlaris: 0
  });
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [loading, setLoading] = useState(true);

  // Reports state
  const [laporanPenjualan, setLaporanPenjualan] = useState<LaporanPenjualan[]>([]);
  const [laporanPemakaianBahan, setLaporanPemakaianBahan] = useState<PemakaianBahanWithCost[]>([]);
  const [stokTersedia, setStokTersedia] = useState<StokTersedia[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch basic stats
      const [bahanBakuRes, produkJadiRes, penjualanRes] = await Promise.all([
        supabase.from('bahan_baku').select('*', { count: 'exact' }),
        supabase.from('produk_jadi').select('*', { count: 'exact' }),
        supabase.from('penjualan').select('total_harga').gte('tanggal_penjualan', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      ]);

      // Calculate stats
      const totalBahanBaku = bahanBakuRes.count || 0;
      const totalProdukJadi = produkJadiRes.count || 0;
      const penjualanBulanIni = penjualanRes.data?.reduce((sum, item) => sum + (item.total_harga || 0), 0) || 0;
      
      // Check low stock - get all bahan baku and filter in JavaScript
      const { data: allProductsData } = await supabase
        .from('bahan_baku')
        .select('stok_tersedia, min_stok');
      
      const stokRendah = allProductsData?.filter(item => 
        (item.stok_tersedia || 0) < (item.min_stok || 0)
      ).length || 0;

      // Fetch top products
      const { data: topProductsData } = await supabase
        .from('penjualan')
        .select(`
          produk_jadi_id,
          jumlah,
          produk_jadi!inner (
            nama_produk_jadi,
            harga_jual
          )
        `)
        .limit(10);

      if (topProductsData) {
        const productSales = topProductsData.reduce((acc: any, item) => {
          const productId = item.produk_jadi_id;
          const produkJadi = Array.isArray(item.produk_jadi) ? item.produk_jadi[0] : item.produk_jadi;
          const productName = produkJadi?.nama_produk_jadi || 'Unknown';
          const price = produkJadi?.harga_jual || 0;
          
          if (!acc[productId]) {
            acc[productId] = {
              nama_produk_jadi: productName,
              total_terjual: 0,
              total_pendapatan: 0,
              color: getRandomColor()
            };
          }
          
          acc[productId].total_terjual += item.jumlah || 0;
          acc[productId].total_pendapatan += (item.jumlah || 0) * price;
          
          return acc;
        }, {});

        const sortedProducts = Object.values(productSales)
          .sort((a: any, b: any) => b.total_terjual - a.total_terjual)
          .slice(0, 5) as TopProduct[];

        setTopProducts(sortedProducts);
      }

      // Fetch stock data for pie chart
      const { data: stockChartData } = await supabase
        .from('bahan_baku')
        .select('nama_bahan_baku, stok_tersedia, min_stok');

      if (stockChartData) {
        const stockWithStatus = stockChartData.map(item => {
          let status_stok = 'Aman';
          let color = '#10B981';
          
          if (item.stok_tersedia <= item.min_stok) {
            status_stok = 'Rendah';
            color = '#EF4444';
          } else if (item.stok_tersedia <= item.min_stok * 1.5) {
            status_stok = 'Sedang';
            color = '#F59E0B';
          }
          
          return {
            nama_bahan_baku: item.nama_bahan_baku,
            stok: item.stok_tersedia,
            status_stok,
            color
          };
        });

        setStockData(stockWithStatus);
      }

      // Fetch monthly trends
      const { data: trendsData } = await supabase
        .from('penjualan')
        .select('tanggal_penjualan, total_harga')
        .gte('tanggal_penjualan', new Date(new Date().getFullYear(), 0, 1).toISOString())
        .order('tanggal_penjualan');

      if (trendsData) {
        const monthlyData = trendsData.reduce((acc: any, item) => {
          const month = new Date(item.tanggal_penjualan).getMonth();
          const monthName = new Date(2024, month).toLocaleDateString('id-ID', { month: 'short' });
          
          if (!acc[month]) {
            acc[month] = {
              month: monthName,
              sales: 0,
              purchases: 0
            };
          }
          
          acc[month].sales += item.total_harga;
          
          return acc;
        }, {});

        const trends = Object.values(monthlyData) as MonthlyTrend[];
        setMonthlyTrends(trends);
      }

      // Fetch pembelian data for current month
      const { data: pembelianData } = await supabase
        .from('pembelian')
        .select('harga_beli, jumlah')
        .gte('tanggal', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
      
      const pembelianBulanIni = pembelianData?.reduce((sum, item) => 
        sum + ((item.harga_beli || 0) * (item.jumlah || 0)), 0
      ) || 0;
      
      const produkTerlaris = topProductsData?.length || 0;

      setStats({
        totalBahanBaku,
        totalProdukJadi,
        penjualanBulanIni,
        pembelianBulanIni,
        stokRendah,
        produkTerlaris
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch reports data
  const fetchReportsData = async () => {
    try {
      setReportsLoading(true);
      
      // Fetch sales report
      const { data: salesData, error: salesError } = await supabase
        .from('penjualan')
        .select(`
          jumlah,
          total_harga,
          tanggal,
          produk_jadi:produk_jadi_id (
            nama_produk_jadi,
            sku,
            harga_jual
          ),
          user_id
        `);

      if (salesError) throw salesError;

      if (salesData) {
        const salesReport = salesData.reduce((acc: any, item) => {
          const produkJadi = Array.isArray(item.produk_jadi) ? item.produk_jadi[0] : item.produk_jadi;
          const productName = produkJadi?.nama_produk_jadi || 'Unknown';
          const sku = produkJadi?.sku || 'N/A';
          const price = produkJadi?.harga_jual || 0;
          const date = item.tanggal || new Date().toISOString();
          const userId = item.user_id || '';
          
          const key = `${productName}-${sku}`;
          
          if (!acc[key]) {
            acc[key] = {
              nama_produk_jadi: productName,
              sku,
              total_terjual: 0,
              total_pendapatan: 0,
              periode: date,
              user_id: userId
            };
          }
          
          acc[key].total_terjual += item.jumlah || 0;
          acc[key].total_pendapatan += item.total_harga || 0;
          
          return acc;
        }, {});

        setLaporanPenjualan(Object.values(salesReport));
      }

      // Fetch material usage report - using resep and penjualan data
      const { data: materialData, error: materialError } = await supabase
        .from('resep')
        .select(`
          jumlah_dibutuhkan,
          bahan_baku:bahan_baku_id (
            nama_bahan_baku,
            unit_dasar:unit_dasar_id (
              nama_unit
            )
          ),
          produk_jadi:produk_jadi_id (
            nama_produk_jadi,
            penjualan (
              jumlah,
              tanggal
            )
          )
        `);

      if (materialError) throw materialError;

      if (materialData) {
        const materialReport = materialData.reduce((acc: any, item) => {
          const bahanBaku = Array.isArray(item.bahan_baku) ? item.bahan_baku[0] : item.bahan_baku;
          const unitDasar = Array.isArray(bahanBaku?.unit_dasar) ? bahanBaku?.unit_dasar[0] : bahanBaku?.unit_dasar;
          const materialName = bahanBaku?.nama_bahan_baku || 'Unknown';
          const unitName = unitDasar?.nama_unit || 'Unit';
          const category = 'Bahan Baku';
          const supplier = 'Unknown';
          
          const key = materialName;
          
          if (!acc[key]) {
            acc[key] = {
              nama_bahan_baku: materialName,
              nama_unit: unitName,
              total_terpakai: 0,
              periode: new Date().toISOString(),
              harga_per_unit: 0,
              total_biaya: 0,
              kategori: category,
              supplier
            };
          }
          
          // Calculate usage based on sales
          const produkJadi = Array.isArray(item.produk_jadi) ? item.produk_jadi[0] : item.produk_jadi;
          const penjualanData = produkJadi?.penjualan || [];
          const totalPenjualan = penjualanData.reduce((sum: number, p: any) => sum + (p.jumlah || 0), 0);
          const totalTerpakai = totalPenjualan * (item.jumlah_dibutuhkan || 0);
          
          acc[key].total_terpakai += totalTerpakai;
          
          return acc;
        }, {});

        setLaporanPemakaianBahan(Object.values(materialReport));
      }

      // Fetch available stock - using bahan_baku data
      const { data: stockData, error: stockError } = await supabase
        .from('bahan_baku')
        .select(`
          nama_bahan_baku,
          stok_tersedia,
          min_stok,
          harga_per_unit,
          kategori,
          unit_dasar:unit_dasar_id (
            nama_unit
          )
        `);

      if (stockError) throw stockError;

      if (stockData) {
        const stockWithStatus = stockData.map(item => {
          let status = 'Aman';
          
          if (item.stok_tersedia <= item.min_stok) {
            status = 'Rendah';
          } else if (item.stok_tersedia <= item.min_stok * 1.5) {
            status = 'Sedang';
          }
          
          return {
            nama_produk_jadi: item.nama_bahan_baku,
            sku: `BB-${item.nama_bahan_baku.substring(0, 3).toUpperCase()}`,
            stok_tersedia: item.stok_tersedia,
            min_stok: item.min_stok,
            harga_jual: item.harga_per_unit,
            kategori: item.kategori,
            status
          };
        });

        setStokTersedia(stockWithStatus);
      }

    } catch (error) {
      console.error('Error fetching reports data:', error);
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchReportsData();
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Key Metrics - Simplified */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Penjualan Bulan Ini"
            value={loading ? '...' : formatCurrency(stats.penjualanBulanIni)}
            subtitle="total penjualan"
            icon={TrendingUp}
            {...StatCardVariants.primary}
          />
          <StatCard
            title="Pembelian Bulan Ini"
            value={loading ? '...' : formatCurrency(stats.pembelianBulanIni)}
            subtitle="total pembelian"
            icon={ShoppingCart}
            {...StatCardVariants.warning}
          />
          <StatCard
            title="Total Bahan Baku"
            value={loading ? '...' : stats.totalBahanBaku.toLocaleString()}
            subtitle="jenis bahan"
            icon={Package}
            {...StatCardVariants.success}
          />
          <StatCard
            title="Stok Rendah"
            value={loading ? '...' : stats.stokRendah}
            subtitle="perlu restok"
            icon={BarChart3}
            {...StatCardVariants.danger}
          />
        </div>

        {/* Charts Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <DashboardCharts 
            topProducts={topProducts}
            stockData={stockData}
            monthlyTrend={monthlyTrends}
            loading={loading}
          />
        </div>

        {/* Reports Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <DashboardReports 
            laporanPenjualan={laporanPenjualan}
            laporanPemakaianBahan={laporanPemakaianBahan}
            stokTersedia={stokTersedia}
            loading={reportsLoading}
          />
        </div>
      </div>
    </div>
  );
}