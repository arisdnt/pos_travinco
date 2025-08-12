'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Save, Loader2 } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { toast } from 'sonner';

export default function EditBahanBakuPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [kategoris, setKategoris] = useState<any[]>([]);
  const [unitDasars, setUnitDasars] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    nama_bahan_baku: '',
    stok: 0,
    kategori_id: '',
    unit_dasar_id: ''
  });

  useEffect(() => {
    if (id) {
      fetchBahanBaku();
      fetchKategoris();
      fetchUnitDasars();
    }
  }, [id]);

  const fetchKategoris = async () => {
    try {
      const { data, error } = await supabase
        .from('kategori')
        .select('*')
        .order('nama_kategori');

      if (error) throw error;
      setKategoris(data || []);
    } catch (error: any) {
      console.error('Error fetching kategoris:', error);
    }
  };

  const fetchUnitDasars = async () => {
    try {
      const { data, error } = await supabase
        .from('unit_dasar')
        .select('*')
        .order('nama_unit');

      if (error) throw error;
      setUnitDasars(data || []);
    } catch (error: any) {
      console.error('Error fetching unit dasars:', error);
    }
  };

  const fetchBahanBaku = async () => {
    try {
      const { data, error } = await supabase
        .from('view_bahan_baku_detail')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          nama_bahan_baku: data.nama_bahan_baku,
          stok: data.stok,
          kategori_id: data.kategori_id || '',
          unit_dasar_id: data.unit_dasar_id || ''
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'stok' ? parseFloat(value) || 0 : value
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

      // Validasi unit_dasar_id required
      if (!formData.unit_dasar_id) {
        toast.error('Unit dasar harus dipilih');
        return;
      }

      const updateData: any = {
        nama_bahan_baku: formData.nama_bahan_baku,
        stok: formData.stok,
        unit_dasar_id: formData.unit_dasar_id
      };

      // Only include kategori_id if it has value
      if (formData.kategori_id) {
        updateData.kategori_id = formData.kategori_id;
      }

      const { error } = await supabase
        .from('bahan_baku')
        .update(updateData)
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

  const navbarActions = [
    {
      label: "Simpan",
      onClick: () => {
        const form = document.getElementById('bahan-baku-form') as HTMLFormElement;
        if (form) form.requestSubmit();
      },
      icon: Save,
      variant: "default" as const
    }
  ];

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
    <div className="flex flex-col h-full">
      <Navbar 
        title="Edit Bahan Baku" 
        showBackButton={true}
        backUrl="/dashboard/bahan-baku"
        actions={navbarActions}
      />

      <div className="flex-1 p-4 md:p-6 space-y-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
        {/* Form Card */}
        <Card className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Informasi Bahan Baku
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form id="bahan-baku-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nama_bahan_baku" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nama Bahan Baku *
                  </Label>
                  <Input
                    id="nama_bahan_baku"
                    name="nama_bahan_baku"
                    value={formData.nama_bahan_baku}
                    onChange={handleInputChange}
                    placeholder="Masukkan nama bahan baku"
                    required
                    className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stok" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Stok *
                  </Label>
                  <Input
                    id="stok"
                    name="stok"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.stok}
                    onChange={handleInputChange}
                    placeholder="Masukkan stok"
                    required
                    className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>



                <div className="space-y-2">
                  <Label htmlFor="kategori_id" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Kategori
                  </Label>
                  <Select
                    value={formData.kategori_id}
                    onValueChange={(value) => handleSelectChange('kategori_id', value)}
                  >
                    <SelectTrigger className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <SelectValue placeholder="Pilih kategori (opsional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {kategoris.map((kategori) => (
                        <SelectItem key={kategori.id} value={kategori.id}>
                          {kategori.nama_kategori}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit_dasar_id" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Unit Dasar *
                  </Label>
                  <Select
                    value={formData.unit_dasar_id}
                    onValueChange={(value) => handleSelectChange('unit_dasar_id', value)}
                    required
                  >
                    <SelectTrigger className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <SelectValue placeholder="Pilih unit dasar" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitDasars.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.nama_unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/bahan-baku')}
                  disabled={loading}
                  className="px-6 py-2 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Simpan Perubahan
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}