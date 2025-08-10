'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Package, Loader2 } from 'lucide-react';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { toast } from 'sonner';

export default function EditBahanBakuPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState({
    nama_bahan_baku: '',
    kategori: '',
    satuan: '',
    harga_per_unit: 0,
    supplier: '',
    deskripsi: ''
  });

  useEffect(() => {
    if (id) {
      fetchBahanBaku();
    }
  }, [id]);

  const fetchBahanBaku = async () => {
    try {
      const { data, error } = await supabase
        .from('bahan_baku')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          nama_bahan_baku: data.nama_bahan_baku,
          kategori: data.kategori,
          satuan: data.satuan,
          harga_per_unit: data.harga_per_unit,
          supplier: data.supplier,
          deskripsi: ''
        });
      }
    } catch (error: any) {
      console.error('Error fetching bahan baku:', error);
      toast.error('Gagal memuat data bahan baku');
      router.push('/dashboard/bahan-baku');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'harga_per_unit' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
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
        .from('bahan_baku')
        .update({
          nama_bahan_baku: formData.nama_bahan_baku,
          kategori: formData.kategori,
          satuan: formData.satuan,
          harga_per_unit: formData.harga_per_unit,
          supplier: formData.supplier
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Bahan baku berhasil diperbarui!');
      router.push('/dashboard/bahan-baku');
    } catch (error: any) {
      console.error('Error updating bahan baku:', error);
      toast.error(error.message || 'Gagal memperbarui bahan baku');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Memuat data...</span>
        </div>
      </div>
    );
  }

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
          <Package className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Edit Bahan Baku
          </h1>
        </div>
      </div>

      {/* Form */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Informasi Bahan Baku
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nama_bahan_baku">Nama Bahan Baku *</Label>
                <Input
                  id="nama_bahan_baku"
                  name="nama_bahan_baku"
                  value={formData.nama_bahan_baku}
                  onChange={handleInputChange}
                  placeholder="Masukkan nama bahan baku"
                  required
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kategori">Kategori *</Label>
                <Select
                  value={formData.kategori}
                  onValueChange={(value) => handleSelectChange('kategori', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="essential_oil">Essential Oil</SelectItem>
                    <SelectItem value="carrier_oil">Carrier Oil</SelectItem>
                    <SelectItem value="alcohol">Alcohol</SelectItem>
                    <SelectItem value="fixative">Fixative</SelectItem>
                    <SelectItem value="packaging">Packaging</SelectItem>
                    <SelectItem value="other">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="satuan">Satuan *</Label>
                <Select
                  value={formData.satuan}
                  onValueChange={(value) => handleSelectChange('satuan', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih satuan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ml">ml (mililiter)</SelectItem>
                    <SelectItem value="gram">gram</SelectItem>
                    <SelectItem value="kg">kg (kilogram)</SelectItem>
                    <SelectItem value="liter">liter</SelectItem>
                    <SelectItem value="pcs">pcs (pieces)</SelectItem>
                    <SelectItem value="bottle">bottle</SelectItem>
                  </SelectContent>
                </Select>
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

            <div className="space-y-2">
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Textarea
                id="deskripsi"
                name="deskripsi"
                value={formData.deskripsi}
                onChange={handleInputChange}
                placeholder="Masukkan deskripsi bahan baku (opsional)"
                rows={4}
                className="w-full"
              />
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
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}