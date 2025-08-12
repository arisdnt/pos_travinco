'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProdukJadiSearchInput } from '@/components/ui/produk-jadi-search-input';
import { ResepBahanBakuSearchInput } from '@/components/ui/resep-bahan-baku-search-input';
import { Save, ChefHat, Plus, Trash2 } from 'lucide-react';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { toast } from 'sonner';
import { Navbar } from '@/components/layout/navbar';

interface BahanBaku {
  id: string;
  nama_bahan_baku: string;
  unit: string;
}

interface ProdukJadi {
  id: string;
  nama_produk_jadi: string;
}

interface ResepItem {
  bahan_baku_id: string;
  jumlah_dibutuhkan: number;
}

export default function AddResepPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [bahanBakuList, setBahanBakuList] = useState<BahanBaku[]>([]);
  const [produkJadiList, setProdukJadiList] = useState<ProdukJadi[]>([]);
  const [formData, setFormData] = useState({
    produk_jadi_id: ''
  });
  const [resepItems, setResepItems] = useState<ResepItem[]>([
    { bahan_baku_id: '', jumlah_dibutuhkan: 0 }
  ]);
  const [existingResep, setExistingResep] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    fetchBahanBaku();
    fetchProdukJadi();
  }, []);

  const fetchBahanBaku = async () => {
    try {
      const { data, error } = await supabase
        .from('bahan_baku')
        .select('id, nama_bahan_baku, unit')
        .order('nama_bahan_baku');

      if (error) throw error;
      setBahanBakuList(data || []);
    } catch (error: any) {
      console.error('Error fetching bahan baku:', error);
      toast.error('Gagal memuat data bahan baku');
    }
  };

  const fetchProdukJadi = async () => {
    try {
      const { data, error } = await supabase
        .from('produk_jadi')
        .select('id, nama_produk_jadi')
        .order('nama_produk_jadi');

      if (error) throw error;
      setProdukJadiList(data || []);
    } catch (error: any) {
      console.error('Error fetching produk jadi:', error);
      toast.error('Gagal memuat data produk jadi');
    }
  };

  const handleSelectChange = async (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Jika produk dipilih, cek apakah sudah ada resep
    if (field === 'produk_jadi_id') {
      if (value) {
        await fetchExistingResep(value);
      } else {
        // Reset form jika produk tidak dipilih
        setExistingResep([]);
        setIsEditMode(false);
        setResepItems([{ bahan_baku_id: '', jumlah_dibutuhkan: 0 }]);
      }
    }
  };

  const fetchExistingResep = async (produkJadiId: string) => {
    try {
      const { data, error } = await supabase
        .from('resep')
        .select(`
          id,
          bahan_baku_id,
          jumlah_dibutuhkan,
          bahan_baku:bahan_baku_id(
            id,
            nama_bahan_baku,
            unit
          )
        `)
        .eq('produk_jadi_id', produkJadiId);

      if (error) throw error;

      if (data && data.length > 0) {
        setExistingResep(data);
        setIsEditMode(true);
        // Populate form dengan data existing
        const existingItems = data.map(item => ({
          bahan_baku_id: item.bahan_baku_id,
          jumlah_dibutuhkan: item.jumlah_dibutuhkan
        }));
        setResepItems(existingItems);
        toast.info('Resep untuk produk ini sudah ada. Anda dapat mengeditnya di sini.');
      } else {
        setExistingResep([]);
        setIsEditMode(false);
        setResepItems([{ bahan_baku_id: '', jumlah_dibutuhkan: 0 }]);
      }
    } catch (error: any) {
      console.error('Error fetching existing resep:', error);
      toast.error('Gagal memuat resep yang ada');
    }
  };

  const handleResepItemChange = (index: number, field: keyof ResepItem, value: string | number) => {
    setResepItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const addResepItem = () => {
    setResepItems(prev => [...prev, { bahan_baku_id: '', jumlah_dibutuhkan: 0 }]);
  };

  const removeResepItem = (index: number) => {
    if (resepItems.length > 1) {
      setResepItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted!');
    console.log('Form data:', formData);
    console.log('Resep items:', resepItems);
    
    if (!formData.produk_jadi_id) {
      console.log('Error: No product selected');
      toast.error('Pilih produk jadi terlebih dahulu');
      return;
    }

    const validResepItems = resepItems.filter(item => 
      item.bahan_baku_id && item.jumlah_dibutuhkan > 0
    );
    console.log('Valid resep items:', validResepItems);

    if (validResepItems.length === 0) {
      console.log('Error: No valid resep items');
      toast.error('Tambahkan minimal satu bahan baku');
      return;
    }

    // Check for duplicate bahan_baku_id
    const bahanBakuIds = validResepItems.map(item => item.bahan_baku_id);
    const uniqueBahanBakuIds = Array.from(new Set(bahanBakuIds));
    console.log('Bahan baku IDs:', bahanBakuIds);
    console.log('Unique bahan baku IDs:', uniqueBahanBakuIds);
    if (bahanBakuIds.length !== uniqueBahanBakuIds.length) {
      console.log('Error: Duplicate bahan baku detected');
      toast.error('Tidak boleh ada bahan baku yang sama dalam satu resep');
      return;
    }

    console.log('Starting form submission process...');
    setLoading(true);
    try {
      console.log('Getting current user...');
      const user = await getCurrentUser();
      if (!user) {
        console.log('Error: User not logged in');
        toast.error('Anda harus login terlebih dahulu');
        return;
      }
      console.log('User found:', user.id);

      if (isEditMode) {
        // Mode edit - update resep yang sudah ada
        try {
          // Hapus resep lama
          const { error: deleteError } = await supabase
            .from('resep')
            .delete()
            .eq('produk_jadi_id', formData.produk_jadi_id);

          if (deleteError) throw deleteError;

          // Insert resep baru
          const resepData = validResepItems.map(item => ({
            produk_jadi_id: formData.produk_jadi_id,
            bahan_baku_id: item.bahan_baku_id,
            jumlah_dibutuhkan: item.jumlah_dibutuhkan,
            user_id: user.id
          }));

          const { error: insertError } = await supabase
            .from('resep')
            .insert(resepData);

          if (insertError) throw insertError;

          toast.success('Resep berhasil diperbarui!');
          router.push('/dashboard/resep');
          return;
        } catch (error: any) {
          console.error('Error updating resep:', error);
          toast.error('Gagal memperbarui resep');
          return;
        }
      }

      // Check if recipe already exists for this product (untuk mode tambah baru)
      console.log('Checking for existing recipe...');
      const { data: existingResepCheck, error: checkError } = await supabase
        .from('resep')
        .select('id')
        .eq('produk_jadi_id', formData.produk_jadi_id)
        .limit(1);
      console.log('Existing resep check result:', existingResepCheck, checkError);

      if (checkError) throw checkError;

      if (existingResepCheck && existingResepCheck.length > 0) {
        toast.warning('Resep untuk produk ini sudah ada. Silakan pilih produk lain atau edit resep yang sudah ada.');
        return;
      }

      const resepData = validResepItems.map(item => ({
        produk_jadi_id: formData.produk_jadi_id,
        bahan_baku_id: item.bahan_baku_id,
        jumlah_dibutuhkan: item.jumlah_dibutuhkan,
        user_id: user.id
      }));
      console.log('Resep data to insert:', resepData);

      console.log('Inserting resep data to database...');
      const { error } = await supabase
        .from('resep')
        .insert(resepData);
      console.log('Insert result - error:', error);

      if (error) {
        // Handle specific constraint violation errors
        if (error.code === '23505' && error.message.includes('resep_produk_jadi_id_bahan_baku_id_key')) {
          toast.error('Kombinasi produk dan bahan baku sudah ada dalam resep. Periksa kembali data yang dimasukkan.');
          return;
        }
        throw error;
      }

      toast.success('Resep berhasil ditambahkan!');
      router.push('/dashboard/resep');
    } catch (error: any) {
      console.error('Error adding resep:', error);
      if (error.code === '23505') {
        toast.error('Data duplikat terdeteksi. Periksa kembali resep yang akan ditambahkan.');
      } else {
        toast.error(error.message || 'Gagal menambahkan resep');
      }
    } finally {
      setLoading(false);
    }
  };

  const navbarActions = [
    {
      label: isEditMode ? 'Perbarui Resep' : 'Simpan Resep',
      onClick: () => {
        console.log('Save button clicked!');
        const form = document.getElementById('resep-form') as HTMLFormElement;
        console.log('Form element found:', form);
        if (form) {
          console.log('Submitting form...');
          form.requestSubmit();
        } else {
          console.log('Error: Form element not found!');
        }
      },
      icon: Save,
      variant: 'default' as const,
      disabled: loading
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar 
        title={isEditMode ? "Edit Resep" : "Tambah Resep"} 
        showBackButton={true}
        actions={navbarActions}
      />
      
      <div className="p-4 md:p-6">
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="w-5 h-5" />
              {isEditMode ? 'Edit Resep' : 'Informasi Resep'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditMode && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Mode Edit:</span> Anda sedang mengedit resep yang sudah ada. 
                  Perubahan akan menggantikan resep sebelumnya.
                </p>
              </div>
            )}
            <form id="resep-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-1">
                <div className="space-y-2">
                  <Label htmlFor="produk_jadi_id">Produk Jadi *</Label>
                  <ProdukJadiSearchInput
                    produkJadiList={produkJadiList}
                    value={formData.produk_jadi_id}
                    onValueChange={(value) => handleSelectChange('produk_jadi_id', value)}
                    placeholder="Cari produk jadi..."
                    required
                  />
                </div>
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
                      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Bahan Baku *</Label>
                          <ResepBahanBakuSearchInput
                            bahanBakuList={bahanBakuList}
                            value={item.bahan_baku_id}
                            onValueChange={(value) => handleResepItemChange(index, 'bahan_baku_id', value)}
                            placeholder="Cari bahan baku..."
                            required
                            excludeIds={resepItems
                              .filter((_, i) => i !== index)
                              .map(item => item.bahan_baku_id)
                              .filter(id => id)
                            }
                          />
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
                                {selectedBahan.unit}
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

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/resep')}
                  className="flex-1 sm:flex-none"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 sm:flex-none flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {loading ? (isEditMode ? 'Memperbarui...' : 'Menyimpan...') : (isEditMode ? 'Perbarui Resep' : 'Simpan Resep')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}