'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, TrendingUp, ShoppingCart, BarChart3, Activity } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface DashboardStats {
  totalBahanBaku: number;
  totalProdukJadi: number;
  penjualanBulanIni: number;
  pembelianBulanIni: number;
  stokRendah: number;
  produkTerlaris: number;
}

interface DashboardStatsProps {
  stats: DashboardStats;
  loading: boolean;
}

export function DashboardStatsCards({ stats, loading }: DashboardStatsProps) {
  const statsCards = [
    {
      title: "Total Bahan Baku",
      value: stats.totalBahanBaku,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      format: "number"
    },
    {
      title: "Total Produk Jadi",
      value: stats.totalProdukJadi,
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-50",
      format: "number"
    },
    {
      title: "Penjualan Bulan Ini",
      value: stats.penjualanBulanIni,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      format: "currency"
    },
    {
      title: "Pembelian Bulan Ini",
      value: stats.pembelianBulanIni,
      icon: ShoppingCart,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      format: "currency"
    },
    {
      title: "Stok Rendah",
      value: stats.stokRendah,
      icon: BarChart3,
      color: "text-red-600",
      bgColor: "bg-red-50",
      format: "number"
    },
    {
      title: "Produk Terlaris",
      value: stats.produkTerlaris,
      icon: Activity,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      format: "number"
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {statsCards.map((card, index) => {
        const Icon = card.icon;
        const formattedValue = card.format === "currency" 
          ? formatCurrency(card.value || 0)
          : (card.value || 0).toLocaleString();

        return (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {formattedValue}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Data terkini sistem
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export type { DashboardStats };