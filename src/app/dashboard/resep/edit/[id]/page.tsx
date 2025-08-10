'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, ChefHat, Plus, Trash2 } from 'lucide-react';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { toast } from 'sonner';

interface BahanBaku {
  id: string;
  nama_bahan_baku: string;
  satuan: string;
}

interface ProdukJadi {
  id: string;
  nama_produk_jadi: string;
}

interface ResepItem {
  id?: string;
  bahan_baku_id: string;
  jumlah_dibutuhkan: number;
}

interface Resep {
  id: string;
  produk_jadi_id: string;
  bahan_baku_id: string;
  jumlah_dibutuhkan: number;
  produk_jadi: {
    nama_produk_jadi: string;
  };
  bahan_baku: {
    nama_bahan_baku: string;
    satuan: string;
  };
}

export default function EditResepPage() {
  const router = useRouter();
  const params = useParams();
  const produkJadiId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [bahanBakuList, setBahanBakuList] = useState<BahanBaku[]>([]);
  const [produkJadiList, setProdukJadiList] = useState<ProdukJadi[]>([]);
  const [formData, setFormData] = useState({
    produk_jadi_id: '',
    deskripsi: ''
  });
  const [resepItems, setResepItems] = useState<ResepItem[]>([]);
  const [existingResepIds, setExistingResepIds] = useState<string[]>([]);

  useEffect(() => {
    if (produkJadiId) {
      fetchData();
    }
  }, [produkJadiId]);

  const fetchData = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const [resepResponse, bahanBakuResponse, produkJadiResponse] = await Promise.all([
        supabase
          .from('resep')
          .select(`
            *,
            produk_jadi (
              nama_produk_jadi
            ),
            bahan_baku (
              nama_bahan_baku,
              satuan
            )
          `)
          .eq('produk_jadi_id', produkJadiId)
          .eq('user_id', user.id),
        supabase
          .from('bahan_baku')
          .select('id, nama_bahan_baku, satuan')
          .eq('user_id', user.id)
          .order('nama_bahan_baku'),
        supabase
          .from('produk_jadi')
          .select('id, nama_produk_jadi')
          .eq('user_id', user.id)
          .order('nama_produk_jadi')
      ]);

      if (resepResponse.error) throw resepResponse.error;
      if (bahanBakuResponse.error) throw bahanBakuResponse.error;
      if (produkJadiResponse.error) throw produkJadiResponse.error;

      const resepData = resepResponse.data as Resep[];
      setBahanBakuList(bahanBakuResponse.data || []);
      setProdukJadiList(produkJadiResponse.data || []);
      
      if (resepData.length > 0) {
        setFormData({
          produk_jadi_id: resepData[0].produk_jadi_id,
          deskripsi: ''
        });
        
        const items = resepData.map(item => ({
          id: item.id,
          bahan_baku_id: item.bahan_baku_id,
          jumlah_dibutuhkan: item.jumlah_dibutuhkan
        }));
        
        setResepItems(items);
        setExistingResepIds(resepData.map(item => item.id));
      } else {
        toast.error('Resep tidak ditemukan');
        router.push('/dashboard/resep');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data resep');
      router.push('/dashboard/resep');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleResepItemChange = (index: number, field: keyof ResepItem, value: string | number) => {
    setResepItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const addResepItem = () => {
    setResepItems(prev => [...prev, {
      bahan_baku_id: '',
      jumlah_dibutuhkan: 0
    }]);
  };

  const removeResepItem = (index: number) => {
    if (resepItems.length > 1) {
      setResepItems(prev => prev.filter((_, i) => i !== index));
    }
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

      // Validate resep items
      const validItems = resepItems.filter(item => 
        item.bahan_baku_id && item.jumlah_dibutuhkan > 0
      );

      if (validItems.length === 0) {
        toast.error('Minimal harus ada satu bahan baku dalam resep');
        return;
      }

      // Check for duplicate bahan_baku_id
      const bahanBakuIds = validItems.map(item => item.bahan_baku_id);
      const uniqueBahanBakuIds = Array.from(new Set(bahanBakuIds));
      if (bahanBakuIds.length !== uniqueBahanBakuIds.length) {
        toast.error('Tidak boleh ada bahan baku yang sama dalam satu resep');
        return;
      }

      // Delete existing resep items
      if (existingResepIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('resep')
          .delete()
          .in('id', existingResepIds);

        if (deleteError) throw deleteError;
      }

      // Insert new resep items
      const resepData = validItems.map(item => ({
        produk_jadi_id: formData.produk_jadi_id,
        bahan_baku_id: item.bahan_baku_id,
        jumlah_dibutuhkan: item.jumlah_dibutuhkan,
        user_id: user.id
      }));

      const { error } = await supabase
        .from('resep')
        .insert(resepData);

      if (error) throw error;

      toast.success('Resep berhasil diperbarui!');
      router.push('/dashboard/resep');
    } catch (error: any) {
      console.error('Error updating resep:', error);
      toast.error(error.message || 'Gagal memperbarui resep');
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
          <ChefHat className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Edit Resep
          </h1>
        </div>
      </div>

      {/* Form */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="w-5 h-5" />
            Informasi Resep
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="produk_jadi_id">Produk Jadi *</Label>
              <Select
                value={formData.produk_jadi_id}
                onValueChange={(value) => handleSelectChange('produk_jadi_id', value)}
                required
                disabled
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih produk jadi" />
                </SelectTrigger>
                <SelectContent>
                  {produkJadiList.map((produk) => (
                    <SelectItem key={produk.id} value={produk.id}>
                      {produk.nama_produk_jadi}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Produk jadi tidak dapat diubah saat mengedit resep
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Textarea
                id="deskripsi"
                name="deskripsi"
                value={formData.deskripsi}
                onChange={handleInputChange}
                placeholder="Masukkan deskripsi resep (opsional)"
                rows={3}
                className="w-full"
              />
            </div>

            {/* Resep Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Bahan-Bahan Resep *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addResepItem}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Bahan
                </Button>
              </div>

              {resepItems.map((item, index) => {
                const selectedBahan = bahanBakuList.find(b => b.id === item.bahan_baku_id);
                return (
                  <Card key={index} className="p-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Bahan Baku *</Label>
                        <Select
                          value={item.bahan_baku_id}
                          onValueChange={(value) => handleResepItemChange(index, 'bahan_baku_id', value)}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih bahan baku" />
                          </SelectTrigger>
                          <SelectContent>
                            {bahanBakuList
                              .filter(bahan => {
                                // Allow current selection or unselected items
                                const selectedBahanIds = resepItems
                                  .filter((_, i) => i !== index)
                                  .map(item => item.bahan_baku_id)
                                  .filter(id => id);
                                return !selectedBahanIds.includes(bahan.id);
                              })
                              .map((bahan) => (
                              <SelectItem key={bahan.id} value={bahan.id}>
                                {bahan.nama_bahan_baku}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Jumlah Dibutuhkan *</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.jumlah_dibutuhkan}
                            onChange={(e) => handleResepItemChange(index, 'jumlah_dibutuhkan', parseFloat(e.target.value) || 0)}
                            placeholder="Jumlah"
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

                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeResepItem(index)}
                          disabled={resepItems.length === 1}
                          className="w-full flex items-center gap-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                          Hapus
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
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
                {loading ? 'Menyimpan...' : 'Perbarui Resep'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}