'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar, createNavbarActions } from "@/components/layout/navbar"
import { Package, Users, TrendingUp, ShoppingCart, BarChart3, Activity, AlertTriangle, CheckCircle, Download, Settings } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

// Sample data for demonstration
const topSellingProducts = [
  { name: 'Lavender Dreams', sales: 145, revenue: 2175000 },
  { name: 'Rose Garden', sales: 132, revenue: 1980000 },
  { name: 'Vanilla Sunset', sales: 128, revenue: 1920000 },
  { name: 'Ocean Breeze', sales: 115, revenue: 1725000 },
  { name: 'Citrus Fresh', sales: 108, revenue: 1620000 },
  { name: 'Jasmine Night', sales: 95, revenue: 1425000 },
  { name: 'Sandalwood', sales: 87, revenue: 1305000 },
  { name: 'Mint Cool', sales: 82, revenue: 1230000 },
  { name: 'Cherry Blossom', sales: 78, revenue: 1170000 },
  { name: 'Pine Forest', sales: 72, revenue: 1080000 },
  { name: 'Amber Glow', sales: 68, revenue: 1020000 },
  { name: 'Eucalyptus', sales: 65, revenue: 975000 },
  { name: 'Bergamot', sales: 62, revenue: 930000 },
  { name: 'Patchouli', sales: 58, revenue: 870000 },
  { name: 'Ylang Ylang', sales: 55, revenue: 825000 },
  { name: 'Geranium', sales: 52, revenue: 780000 },
  { name: 'Lemongrass', sales: 48, revenue: 720000 },
  { name: 'Tea Tree', sales: 45, revenue: 675000 },
  { name: 'Frankincense', sales: 42, revenue: 630000 },
  { name: 'Cedarwood', sales: 38, revenue: 570000 }
];

const stockData = [
  { name: 'Lavender Oil', stock: 250, status: 'high', color: '#10B981' },
  { name: 'Rose Oil', stock: 180, status: 'medium', color: '#F59E0B' },
  { name: 'Vanilla Extract', stock: 45, status: 'low', color: '#EF4444' },
  { name: 'Citrus Oil', stock: 320, status: 'high', color: '#10B981' },
  { name: 'Jasmine Oil', stock: 75, status: 'low', color: '#EF4444' }
];

const monthlyTrend = [
  { month: 'Jan', sales: 4200000, purchases: 2800000 },
  { month: 'Feb', sales: 3800000, purchases: 2600000 },
  { month: 'Mar', sales: 5100000, purchases: 3200000 },
  { month: 'Apr', sales: 4700000, purchases: 2900000 },
  { month: 'May', sales: 5800000, purchases: 3500000 },
  { month: 'Jun', sales: 6200000, purchases: 3800000 }
];

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

export default function DashboardPage() {
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

  return (
    <div className="flex flex-col h-full">
      <Navbar 
        title="Dashboard" 
        actions={navbarActions}
      />
      
      <div className="flex-1 p-4 md:p-6 space-y-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Selamat Datang di Aura Flow</h1>
              <p className="text-blue-100">Kelola inventaris parfum Anda dengan mudah dan efisien</p>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Activity className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">1,247</div>
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
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">856</div>
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
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">Rp 6.2M</div>
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                +15% dari bulan lalu
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Pembelian Bulan Ini
              </CardTitle>
              <div className="p-2 bg-orange-500 rounded-lg">
                <ShoppingCart className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">Rp 3.8M</div>
              <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                +5% dari bulan lalu
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Top Selling Products Bar Chart */}
          <Card className="lg:col-span-2 shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-white">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                Top 20 Produk Terlaris
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSellingProducts.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'sales' ? `${value} unit` : `Rp ${value.toLocaleString()}`,
                        name === 'sales' ? 'Penjualan' : 'Revenue'
                      ]}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar dataKey="sales" fill="url(#colorGradient)" radius={[4, 4, 0, 0]} />
                    <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.7}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Stock Status */}
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-white">
                <Package className="w-5 h-5 text-green-500" />
                Status Stok Terbanyak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stockData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: item.color }}></div>
                      <div>
                        <p className="font-medium text-sm text-gray-800 dark:text-white">{item.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.status === 'high' ? 'Stok Aman' : item.status === 'medium' ? 'Stok Sedang' : 'Stok Rendah'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800 dark:text-white">{item.stock}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">unit</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trend and Summary */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly Trend */}
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-white">
                <Activity className="w-5 h-5 text-purple-500" />
                Tren Bulanan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(value) => `${(value as number)/1000000}M`} />
                    <Tooltip 
                      formatter={(value, name) => [
                        `Rp ${((value as number)/1000000).toFixed(1)}M`,
                        name === 'sales' ? 'Penjualan' : 'Pembelian'
                      ]}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Line type="monotone" dataKey="sales" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }} />
                    <Line type="monotone" dataKey="purchases" stroke="#F59E0B" strokeWidth={3} dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="space-y-4">
            <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Profit Margin</p>
                    <p className="text-2xl font-bold">38.7%</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Produk Aktif</p>
                    <p className="text-2xl font-bold">156</p>
                  </div>
                  <Package className="w-8 h-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm">Stok Rendah</p>
                    <p className="text-2xl font-bold">12</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-orange-200" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}