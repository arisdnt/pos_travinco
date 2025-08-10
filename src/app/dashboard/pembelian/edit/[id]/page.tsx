'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, ShoppingCart } from 'lucide-react';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { toast } from 'sonner';
import { formatDateForDB } from '@/lib/utils';

interface BahanBaku {
  id: string;
  nama_bahan_baku: string;
  satuan: string;
  harga_per_unit: number;
}

interface Pembelian {
  id: string;
  bahan_baku_id: string;
  jumlah: number;
  harga_per_unit: number;
  total_harga: number;
  supplier: string;
  tanggal_pembelian: string;
  bahan_baku: {
    nama_bahan_baku: string;
    satuan: string;
  };
}

export default function EditPembelianPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [bahanBakuList, setBahanBakuList] = useState<BahanBaku[]>([]);
  const [formData, setFormData] = useState({
    bahan_baku_id: '',
    jumlah: 0,
    harga_per_unit: 0,
    total_harga: 0,
    supplier: '',
    tanggal_pembelian: ''
  });

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const [pembelianResponse, bahanBakuResponse] = await Promise.all([
        supabase
          .from('pembelian')
          .select(`
            *,
            bahan_baku (
              nama_bahan_baku,
              satuan
            )
          `)
          .eq('id', id)
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('bahan_baku')
          .select('id, nama_bahan_baku, satuan, harga_per_unit')
          .eq('user_id', user.id)
          .order('nama_bahan_baku')
      ]);

      if (pembelianResponse.error) throw pembelianResponse.error;
      if (bahanBakuResponse.error) throw bahanBakuResponse.error;

      const pembelian = pembelianResponse.data as Pembelian;
      setBahanBakuList(bahanBakuResponse.data || []);
      
      setFormData({
        bahan_baku_id: pembelian.bahan_baku_id,
        jumlah: pembelian.jumlah,
        harga_per_unit: pembelian.harga_per_unit,
        total_harga: pembelian.total_harga,
        supplier: pembelian.supplier,
        tanggal_pembelian: new Date(pembelian.tanggal_pembelian).toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data pembelian');
      router.push('/dashboard/pembelian');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericValue = (name === 'jumlah' || name === 'harga_per_unit') ? parseFloat(value) || 0 : value;
    
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: numericValue
      };
      
      // Auto calculate total_harga
      if (name === 'jumlah' || name === 'harga_per_unit') {
        updated.total_harga = updated.jumlah * updated.harga_per_unit;
      }
      
      return updated;
    });
  };

  const handleBahanBakuChange = (value: string) => {
    const selectedBahan = bahanBakuList.find(b => b.id === value);
    setFormData(prev => ({
      ...prev,
      bahan_baku_id: value,
      harga_per_unit: selectedBahan?.harga_per_unit || prev.harga_per_unit,
      total_harga: prev.jumlah * (selectedBahan?.harga_per_unit || prev.harga_per_unit)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Anda harus login terlebih dahulu');
        return;
      }

      const { error } = await supabase
        .from('pembelian')
        .update({
          bahan_baku_id: formData.bahan_baku_id,
          jumlah: formData.jumlah,
          harga_per_unit: formData.harga_per_unit,
          total_harga: formData.total_harga,
          supplier: formData.supplier,
          tanggal_pembelian: formatDateForDB(new Date(formData.tanggal_pembelian))
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Pembelian berhasil diperbarui!');
      router.push('/dashboard/pembelian');
    } catch (error: any) {
      console.error('Error updating pembelian:', error);
      toast.error(error.message || 'Gagal memperbarui pembelian');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="p-4 mx-auto max-w-4xl md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Memuat data...</p>
          </div>
        </div>
      </div>
    );
  }

  const selectedBahan = bahanBakuList.find(b => b.id === formData.bahan_baku_id);

  return (
    <div className="p-4 mx-auto max-w-4xl md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </Button>
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Edit Pembelian
          </h1>
        </div>
      </div>

      {/* Form */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Informasi Pembelian
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bahan_baku_id">Bahan Baku *</Label>
                <Select
                  value={formData.bahan_baku_id}
                  onValueChange={handleBahanBakuChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih bahan baku" />
                  </SelectTrigger>
                  <SelectContent>
                    {bahanBakuList.map((bahan) => (
                      <SelectItem key={bahan.id} value={bahan.id}>
                        {bahan.nama_bahan_baku} ({bahan.satuan})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier *</Label>
                <Input
                  id="supplier"
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleInputChange}
                  placeholder="Masukkan nama supplier"
                  required
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="jumlah">Jumlah *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="jumlah"
                    name="jumlah"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.jumlah}
                    onChange={handleInputChange}
                    placeholder="Masukkan jumlah"
                    required
                    className="flex-1"
                  />
                  {selectedBahan && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedBahan.satuan}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="harga_per_unit">Harga per Unit *</Label>
                <Input
                  id="harga_per_unit"
                  name="harga_per_unit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.harga_per_unit}
                  onChange={handleInputChange}
                  placeholder="Masukkan harga per unit"
                  required
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tanggal_pembelian">Tanggal Pembelian *</Label>
                <Input
                  id="tanggal_pembelian"
                  name="tanggal_pembelian"
                  type="date"
                  value={formData.tanggal_pembelian}
                  onChange={handleInputChange}
                  required
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_harga">Total Harga</Label>
                <Input
                  id="total_harga"
                  name="total_harga"
                  type="number"
                  value={formData.total_harga}
                  readOnly
                  className="w-full bg-gray-50 dark:bg-gray-800"
                  placeholder="Otomatis terhitung"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Menyimpan...' : 'Perbarui Pembelian'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}