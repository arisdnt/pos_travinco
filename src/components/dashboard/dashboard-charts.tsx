'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { formatCurrency } from "@/lib/utils";

interface TopProduct {
  nama_produk_jadi: string;
  total_terjual: number;
  total_pendapatan: number;
}

interface StockData {
  nama_bahan_baku: string;
  stok: number;
  status_stok: string;
  color: string;
}

interface MonthlyTrend {
  month: string;
  sales: number;
  purchases: number;
}

interface DashboardChartsProps {
  topProducts: TopProduct[];
  stockData: StockData[];
  monthlyTrend: MonthlyTrend[];
  loading: boolean;
}

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

export function DashboardCharts({ topProducts, stockData, monthlyTrend, loading }: DashboardChartsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-gray-200 rounded w-32"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Products Chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Produk Terlaris</CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="nama_produk_jadi" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'total_pendapatan' ? formatCurrency(Number(value)) : value,
                    name === 'total_pendapatan' ? 'Total Pendapatan' : 'Total Terjual'
                  ]}
                />
                <Bar dataKey="total_terjual" fill="#3B82F6" name="total_terjual" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Tidak ada data produk terlaris
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Status Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Status Stok Bahan Baku</CardTitle>
        </CardHeader>
        <CardContent>
          {stockData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stockData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ nama_bahan_baku, percent }) => 
                    `${nama_bahan_baku} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="stok"
                >
                  {stockData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Stok']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Tidak ada data stok
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Tren Bulanan</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyTrend && monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value, name) => [
                    formatCurrency(Number(value)),
                    name === 'sales' ? 'Penjualan' : 'Pembelian'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="sales"
                />
                <Line 
                  type="monotone" 
                  dataKey="purchases" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  name="purchases"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Tidak ada data tren bulanan
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export type { TopProduct, StockData, MonthlyTrend };