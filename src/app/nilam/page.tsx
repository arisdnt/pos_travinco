'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Package, Search, Calendar, Filter, BarChart3, PieChart as PieChartIcon, Activity, Eye, Loader2, Home, Download } from 'lucide-react';
import { StatCard, StatCardVariants } from '@/components/ui/stat-card';
import { formatCurrency, formatDate } from '@/lib/utils';

interface TrendBahanBaku {
  bahan_baku_id: string;
  nama_bahan_baku: string;
  unit: string;
  periode: string;
  bulan: number;
  tahun: number;
  total_terpakai: number;
  jumlah_transaksi: number;
  trend_persentase: number;
  kategori: string;
}

interface ApiResponse {
  data: TrendBahanBaku[];
  summary: {
    totalTerpakai: number;
    totalTransaksi: number;
    avgTrend: number;
    topBahan: string;
    jumlahBahan: number;
  };
  filters: {
    bulan: number | null;
    tahun: number | null;
    kategori: string | null;
    search: string | null;
  };
}



const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

const getBadgeVariant = (kategori: string) => {
  switch (kategori) {
    case 'Base Material':
      return 'default';
    case 'Fragrance':
      return 'secondary';
    case 'Additive':
      return 'outline';
    case 'Preservative':
      return 'destructive';
    default:
      return 'default';
  }
};

const getTrendColor = (trend: number) => {
  if (trend > 0) return 'text-green-600';
  if (trend < 0) return 'text-red-600';
  return 'text-gray-600';
};

const getTrendIcon = (trend: number) => {
  if (trend > 0) return '↗';
  if (trend < 0) return '↘';
  return '→';
};

export default function NilamPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedBulan, setSelectedBulan] = useState('');
  const [selectedTahun, setSelectedTahun] = useState('');

  const [data, setData] = useState<TrendBahanBaku[]>([]);
  const [summary, setSummary] = useState({
    totalTerpakai: 0,
    totalTransaksi: 0,
    avgTrend: 0,
    topBahan: '-',
    jumlahBahan: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize client-side state
  useEffect(() => {
    setIsClient(true);
    const currentDate = new Date();
    const currentMonth = (currentDate.getMonth() + 1).toString();
    const currentYear = currentDate.getFullYear().toString();
    
    setSelectedBulan(currentMonth);
    setSelectedTahun(currentYear);
  }, []);

  // Fetch data from API
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (selectedBulan) params.append('bulan', selectedBulan);
      if (selectedTahun) params.append('tahun', selectedTahun);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/public/trend-bahan-baku?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const result: ApiResponse = await response.json();
      setData(result.data);
      setSummary(result.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount and when filters change
  useEffect(() => {
    if (isClient && selectedBulan && selectedTahun) {
      fetchData();
    }
  }, [isClient, selectedBulan, selectedTahun, searchTerm]);

  // Data yang akan ditampilkan (tanpa filter kategori)
  const filteredData = data;

  // Data untuk chart
  const chartData = filteredData.map(item => ({
    nama: item.nama_bahan_baku.length > 15 
      ? item.nama_bahan_baku.substring(0, 15) + '...' 
      : item.nama_bahan_baku,
    nama_lengkap: item.nama_bahan_baku,
    total_terpakai: item.total_terpakai,
    unit: item.unit,
    kategori: item.kategori
  }));

  // Data untuk pie chart kategori
  const kategoriData = useMemo(() => {
    const kategoriMap = new Map();
    filteredData.forEach(item => {
      const current = kategoriMap.get(item.kategori) || 0;
      kategoriMap.set(item.kategori, current + item.total_terpakai);
    });
    
    return Array.from(kategoriMap.entries()).map(([kategori, total], index) => ({
      name: kategori,
      value: total,
      color: COLORS[index % COLORS.length]
    }));
  }, [filteredData]);

  // Fungsi export ke PDF
  const exportToPDF = async () => {
    try {
      // Import jsPDF secara dinamis
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(59, 130, 246); // Blue color
      doc.text('Laporan Trend Bahan Baku', 20, 30);
      
      // Subtitle
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      const currentDate = new Date().toLocaleDateString('id-ID');
      doc.text(`Tanggal Export: ${currentDate}`, 20, 40);
      
      // Filter info
      const bulanName = bulanOptions.find(b => b.value === selectedBulan)?.label || 'Semua';
      doc.text(`Periode: ${bulanName} ${selectedTahun}`, 20, 50);
      
      // Summary stats
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Ringkasan Data:', 20, 70);
      
      doc.setFontSize(10);
      doc.text(`Total Bahan Baku: ${filteredData.length} item`, 20, 80);
      doc.text(`Total Terpakai: ${summary.totalTerpakai.toLocaleString()}`, 20, 90);
      doc.text(`Total Transaksi: ${summary.totalTransaksi.toLocaleString()}`, 20, 100);
      doc.text(`Rata-rata Trend: ${summary.avgTrend.toFixed(1)}%`, 20, 110);
      
      // Table header
      doc.setFontSize(12);
      doc.text('Detail Bahan Baku:', 20, 130);
      
      // Table data
      let yPosition = 145;
      doc.setFontSize(8);
      
      // Table headers
      doc.setFont('helvetica', 'bold');
      doc.text('Nama Bahan Baku', 20, yPosition);
      doc.text('Kategori', 80, yPosition);
      doc.text('Total Terpakai', 120, yPosition);
      doc.text('Transaksi', 160, yPosition);
      doc.text('Trend', 180, yPosition);
      
      yPosition += 10;
      doc.setFont('helvetica', 'normal');
      
      // Table rows
      filteredData.forEach((item, index) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        
        const nama = item.nama_bahan_baku.length > 25 
          ? item.nama_bahan_baku.substring(0, 25) + '...' 
          : item.nama_bahan_baku;
        
        doc.text(nama, 20, yPosition);
        doc.text(item.kategori, 80, yPosition);
        doc.text(`${item.total_terpakai.toLocaleString()} ${item.unit}`, 120, yPosition);
        doc.text(`${item.jumlah_transaksi}x`, 160, yPosition);
        doc.text(`${item.trend_persentase.toFixed(1)}%`, 180, yPosition);
        
        yPosition += 8;
      });
      
      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Halaman ${i} dari ${pageCount}`, 160, 290);
        doc.text('Generated by POS Travinco', 20, 290);
      }
      
      // Save PDF
      const fileName = `laporan-bahan-baku-${selectedBulan}-${selectedTahun}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Gagal menggenerate PDF. Silakan coba lagi.');
    }
  };

  const bulanOptions = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ];



  // Prevent hydration mismatch by not rendering until client-side
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Memuat halaman...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter & Pencarian
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Cari bahan baku..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedBulan} onValueChange={setSelectedBulan}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Bulan" />
                </SelectTrigger>
                <SelectContent>
                  {bulanOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedTahun} onValueChange={setSelectedTahun}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="default"
                size="sm"
                onClick={exportToPDF}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-1" />
                Export PDF
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="w-full"
              >
                <Home className="h-4 w-4 mr-1" />
                Kembali ke Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card className="mb-8">
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Memuat data transparansi...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="mb-8 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardContent className="pt-6">
              <div className="text-center text-red-600 dark:text-red-400">
                <p className="font-medium">Gagal memuat data</p>
                <p className="text-sm mt-1">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchData}
                  className="mt-3"
                >
                  Coba Lagi
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Section */}
        {!loading && !error && (
          <div></div>
        )}

        {/* Main Content */}
        {!loading && !error && (
          <div className="w-full space-y-8">
            {/* Chart Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Grafik Penggunaan Bahan Baku
                  </span>
                  <Badge variant="outline">
                    {filteredData.length} item
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredData.length > 0 ? (
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis 
                          dataKey="nama" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          fontSize={12}
                        />
                        <YAxis fontSize={12} />
                        <Tooltip 
                          formatter={(value: any, name: any, props: any) => [
                            `${value} ${props.payload.unit}`,
                            'Total Terpakai'
                          ]}
                          labelFormatter={(label: any, payload: any) => {
                            if (payload && payload[0]) {
                              return payload[0].payload.nama_lengkap;
                            }
                            return label;
                          }}
                        />
                        <Bar 
                          dataKey="total_terpakai" 
                          fill="#3B82F6"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-96 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Tidak ada data untuk ditampilkan</p>
                      <p className="text-sm mt-1">Coba ubah filter atau periode waktu</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Table Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Tabel Detail Bahan Baku
                  </span>
                  <Badge variant="outline">
                    {filteredData.length} item
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama Bahan Baku</TableHead>
                          <TableHead className="text-right">Total Terpakai</TableHead>
                          <TableHead className="text-right">Transaksi</TableHead>
                          <TableHead className="text-right">Trend</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredData.map((item) => (
                          <TableRow key={item.bahan_baku_id}>
                            <TableCell className="font-medium">
                              {item.nama_bahan_baku}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-mono">
                                {item.total_terpakai.toLocaleString()} {item.unit}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-mono">
                                {item.jumlah_transaksi}x
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-mono ${getTrendColor(item.trend_persentase)}`}>
                                {getTrendIcon(item.trend_persentase)} {item.trend_persentase.toFixed(1)}%
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Tidak ada data untuk ditampilkan</p>
                    <p className="text-sm mt-1">Coba ubah filter atau periode waktu</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer Info */}
        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              <p className="mb-2">
                <strong>Transparansi Bisnis:</strong> Data ini dipublikasikan untuk memberikan transparansi 
                mengenai penggunaan bahan baku dalam proses produksi kami.
              </p>
              <p>
                Data diperbarui secara berkala dan mencerminkan trend penggunaan bahan baku 
                berdasarkan periode yang dipilih. Untuk informasi lebih lanjut, silakan hubungi tim kami.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}