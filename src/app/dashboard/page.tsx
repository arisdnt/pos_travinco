'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar, createNavbarActions } from "@/components/layout/navbar"
import { Package, Users, TrendingUp, ShoppingCart, BarChart3, Activity, AlertTriangle, CheckCircle, Download, Settings } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { useEffect, useState } from 'react'
import { supabase, getCurrentUser } from '@/lib/supabase'
import { useAuth } from '@/components/auth/auth-provider'
import { toast } from '@/components/ui/use-toast'

interface DashboardStats {
  totalBahanBaku: number
  totalProdukJadi: number
  penjualanBulanIni: number
  pembelianBulanIni: number
  stokRendah: number
  produkTerlaris: number
}

interface TopProduct {
  nama_produk_jadi: string
  total_terjual: number
  total_pendapatan: number
}

interface StockData {
  nama_bahan_baku: string
  stok: number
  status_stok: string
  color: string
}

interface MonthlyTrend {
  month: string
  sales: number
  purchases: number
}

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

export default function DashboardPage() {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalBahanBaku: 0,
    totalProdukJadi: 0,
    penjualanBulanIni: 0,
    pembelianBulanIni: 0,
    stokRendah: 0,
    produkTerlaris: 0
  })
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [stockData, setStockData] = useState<StockData[]>([])
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch dashboard statistics
      await Promise.all([
        fetchDashboardStats(),
        fetchTopProducts(),
        fetchStockData(),
        fetchMonthlyTrend()
      ])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast({
        title: "Error",
        description: "Gagal memuat data dashboard",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchDashboardStats = async () => {
    // Get total bahan baku
    const { count: totalBahanBaku } = await supabase
      .from('bahan_baku')
      .select('*', { count: 'exact', head: true })

    // Get total produk jadi
    const { count: totalProdukJadi } = await supabase
      .from('produk_jadi')
      .select('*', { count: 'exact', head: true })

    // Get penjualan bulan ini
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
    const { data: penjualanData } = await supabase
      .from('penjualan')
      .select('total_harga')
      .gte('tanggal', `${currentMonth}-01`)
      .lt('tanggal', `${currentMonth}-32`)

    const penjualanBulanIni = penjualanData?.reduce((sum, item) => sum + (item.total_harga || 0), 0) || 0

    // Get pembelian bulan ini
    const { data: pembelianData } = await supabase
      .from('pembelian')
      .select('jumlah, harga_beli')
      .gte('tanggal', `${currentMonth}-01`)
      .lt('tanggal', `${currentMonth}-32`)

    const pembelianBulanIni = pembelianData?.reduce((sum, item) => sum + ((item.jumlah || 0) * (item.harga_beli || 0)), 0) || 0

    // Get stok rendah count
    const { count: stokRendah } = await supabase
      .from('dashboard_bahan_baku_terlaris')
      .select('*', { count: 'exact', head: true })
      .in('status_stok', ['Stok Rendah', 'Habis'])

    // Get produk terlaris count (produk dengan penjualan > 0)
    const { count: produkTerlaris } = await supabase
      .from('laporan_penjualan')
      .select('*', { count: 'exact', head: true })
      .gt('total_terjual', 0)
      .not('periode', 'is', null)

    setDashboardStats({
      totalBahanBaku: totalBahanBaku || 0,
      totalProdukJadi: totalProdukJadi || 0,
      penjualanBulanIni,
      pembelianBulanIni,
      stokRendah: stokRendah || 0,
      produkTerlaris: produkTerlaris || 0
    })
  }

  const fetchTopProducts = async () => {
    // Menggunakan view laporan_penjualan untuk mendapatkan data produk terlaris yang akurat
    const { data, error } = await supabase
      .from('laporan_penjualan')
      .select('nama_produk_jadi, total_terjual, total_pendapatan')
      .not('periode', 'is', null)
      .order('total_terjual', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching top products:', error)
      return
    }

    const formattedData = data?.map(item => ({
      nama_produk_jadi: item.nama_produk_jadi || 'Unknown',
      total_terjual: item.total_terjual || 0,
      total_pendapatan: item.total_pendapatan || 0
    })) || []

    setTopProducts(formattedData)
  }

  const fetchStockData = async () => {
    // Menggunakan view dashboard_bahan_baku_terlaris untuk mendapatkan data stok dengan status yang sudah dihitung
    const { data, error } = await supabase
      .from('dashboard_bahan_baku_terlaris')
      .select('nama_bahan_baku, stok_tersisa, status_stok, total_terpakai')
      .order('stok_tersisa', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching stock data:', error)
      return
    }

    const formattedData = data?.map(item => {
      const stok = item.stok_tersisa || 0
      let color = '#10B981' // Default: Stok Aman (hijau)
      
      // Mapping warna berdasarkan status_stok dari database
      switch (item.status_stok) {
        case 'Habis':
          color = '#DC2626' // Merah gelap
          break
        case 'Stok Rendah':
          color = '#EF4444' // Merah
          break
        case 'Stok Normal':
          color = '#F59E0B' // Kuning
          break
        case 'Stok Aman':
        default:
          color = '#10B981' // Hijau
          break
      }

      return {
        nama_bahan_baku: item.nama_bahan_baku || 'Unknown',
        stok,
        status_stok: item.status_stok || 'Unknown',
        color
      }
    }) || []

    setStockData(formattedData)
  }

  const fetchMonthlyTrend = async () => {
    try {
      // Get sales data from laporan_penjualan view (last 6 months)
      const { data: salesData, error: salesError } = await supabase
        .from('laporan_penjualan')
        .select('total_pendapatan, periode')
        .not('periode', 'is', null)
        .gte('periode', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('periode', { ascending: true })

      if (salesError) {
        console.error('Error fetching sales data:', salesError)
      }

      // Get purchases data aggregated by month (last 6 months)
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('pembelian')
        .select('jumlah, harga_beli, tanggal')
        .gte('tanggal', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('tanggal', { ascending: true })

      if (purchaseError) {
        console.error('Error fetching purchase data:', purchaseError)
      }

      // Process sales data by month
      const salesByMonth = new Map()
      salesData?.forEach(item => {
        if (item.periode) {
          const monthKey = new Date(item.periode).toISOString().slice(0, 7)
          const currentTotal = salesByMonth.get(monthKey) || 0
          salesByMonth.set(monthKey, currentTotal + (item.total_pendapatan || 0))
        }
      })

      // Process purchases data by month
      const purchasesByMonth = new Map()
      purchaseData?.forEach(item => {
        if (item.tanggal) {
          const monthKey = new Date(item.tanggal).toISOString().slice(0, 7)
          const currentTotal = purchasesByMonth.get(monthKey) || 0
          const purchaseAmount = (item.jumlah || 0) * (item.harga_beli || 0)
          purchasesByMonth.set(monthKey, currentTotal + purchaseAmount)
        }
      })

      // Generate last 6 months data
      const trendData = []
      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthKey = date.toISOString().slice(0, 7)
        const monthName = date.toLocaleDateString('id-ID', { month: 'short' })
        
        trendData.push({
          month: monthName,
          sales: salesByMonth.get(monthKey) || 0,
          purchases: purchasesByMonth.get(monthKey) || 0
        })
      }

      setMonthlyTrend(trendData)
    } catch (error) {
      console.error('Error in fetchMonthlyTrend:', error)
      // Fallback to empty data if error occurs
      setMonthlyTrend([])
    }
  }

  const navbarActions = [
    createNavbarActions.download(() => {
      // TODO: Implement dashboard export
      console.log("Export dashboard data")
    }, "Export Laporan"),
    {
      label: "Pengaturan",
      icon: Settings,
      onClick: () => {
        // TODO: Navigate to settings
        console.log("Open settings")
      },
      variant: "ghost" as const
    }
  ]

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Navbar 
          title="Dashboard" 
          actions={navbarActions}
        />
        <div className="flex-1 p-4 md:p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Memuat data dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Navbar 
        title="Dashboard" 
        actions={navbarActions}
      />
      
      <div className="flex-1 p-4 md:p-6 space-y-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
        {/* Stats Cards - 2 rows with 3 columns each */}
        <div className="space-y-4">
          {/* First Row - Standard Height */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Total Bahan Baku
                </CardTitle>
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Package className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{dashboardStats.totalBahanBaku.toLocaleString()}</div>
                <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +12% dari bulan lalu
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Total Produk Jadi
                </CardTitle>
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Users className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{dashboardStats.totalProdukJadi.toLocaleString()}</div>
                <p className="text-xs text-purple-600 dark:text-purple-400 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +8% dari bulan lalu
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                  Penjualan Bulan Ini
                </CardTitle>
                <div className="p-2 bg-green-500 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">Rp {(dashboardStats.penjualanBulanIni / 1000000).toFixed(1)}M</div>
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +15% dari bulan lalu
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Second Row - Reduced Height */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700 shadow-lg hover:shadow-xl transition-all duration-300 h-20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
                <CardTitle className="text-xs font-medium text-orange-700 dark:text-orange-300">
                  Pembelian Bulan Ini
                </CardTitle>
                <div className="p-1.5 bg-orange-500 rounded-lg">
                  <ShoppingCart className="h-3 w-3 text-white" />
                </div>
              </CardHeader>
              <CardContent className="pt-1 pb-2">
                <div className="text-lg font-bold text-orange-900 dark:text-orange-100">Rp {(dashboardStats.pembelianBulanIni / 1000000).toFixed(1)}M</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700 shadow-lg hover:shadow-xl transition-all duration-300 h-20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
                <CardTitle className="text-xs font-medium text-red-700 dark:text-red-300">
                  Stok Rendah
                </CardTitle>
                <div className="p-1.5 bg-red-500 rounded-lg">
                  <AlertTriangle className="h-3 w-3 text-white" />
                </div>
              </CardHeader>
              <CardContent className="pt-1 pb-2">
                <div className="text-lg font-bold text-red-900 dark:text-red-100">{dashboardStats.stokRendah.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border-indigo-200 dark:border-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 h-20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
                <CardTitle className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  Produk Terlaris
                </CardTitle>
                <div className="p-1.5 bg-indigo-500 rounded-lg">
                  <CheckCircle className="h-3 w-3 text-white" />
                </div>
              </CardHeader>
              <CardContent className="pt-1 pb-2">
                <div className="text-lg font-bold text-indigo-900 dark:text-indigo-100">{dashboardStats.produkTerlaris.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>
        </div>



        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Selling Products Bar Chart */}
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-white">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                Top 20 Produk Terlaris
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="nama_produk_jadi" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={10}
                      className="text-xs text-gray-600 dark:text-gray-400"
                    />
                    <YAxis 
                      fontSize={12} 
                      tickFormatter={(value) => `${(value as number)/1000}K`}
                      className="text-xs text-gray-600 dark:text-gray-400"
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'total_terjual' ? `${value} unit` : `Rp ${((value as number)/1000000).toFixed(1)}M`,
                        name === 'total_terjual' ? 'Terjual' : 'Pendapatan'
                      ]}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="total_terjual" 
                      fill="#3B82F6" 
                      radius={[4, 4, 0, 0]}
                      name="Terjual"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Menampilkan 10 produk terlaris berdasarkan data penjualan
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Trend */}
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-white">
                <Activity className="w-5 h-5 text-purple-500" />
                Tren Bulanan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrend} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="month" 
                      fontSize={12}
                      className="text-xs text-gray-600 dark:text-gray-400"
                    />
                    <YAxis 
                      fontSize={12} 
                      tickFormatter={(value) => `${(value as number)/1000000}M`}
                      className="text-xs text-gray-600 dark:text-gray-400"
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        `Rp ${((value as number)/1000000).toFixed(1)}M`,
                        name === 'sales' ? 'Penjualan' : 'Pembelian'
                      ]}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#10B981" 
                      strokeWidth={3} 
                      dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                      name="Penjualan"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="purchases" 
                      stroke="#F59E0B" 
                      strokeWidth={3} 
                      dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                      name="Pembelian"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stock Status and Trend Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Status Stok Terbanyak */}
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-white">
                <Package className="w-5 h-5 text-green-500" />
                Status Stok Terbanyak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stockData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: item.color }}></div>
                      <div>
                        <p className="font-medium text-sm text-gray-800 dark:text-white">{item.nama_bahan_baku}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.status_stok}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800 dark:text-white">{item.stok}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">unit</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Trend Pemakaian Bahan Baku Terpopuler */}
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-white">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Trend Pemakaian Bahan Baku Terpopuler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stockData.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: item.color }}></div>
                      <div>
                        <p className="font-medium text-sm text-gray-800 dark:text-white">{item.nama_bahan_baku}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Status: {item.status_stok}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm text-gray-800 dark:text-white">{item.stok.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">unit tersisa</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}