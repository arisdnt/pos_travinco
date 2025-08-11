'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Package, Loader2 } from 'lucide-react';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { toast } from 'sonner';
import { Navbar } from '@/components/layout/navbar';

export default function EditProdukJadiPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState({
    nama_produk_jadi: '',
    sku: '',
    harga_jual: 0
  });

  useEffect(() => {
    if (id) {
      fetchProdukJadi();
    }
  }, [id]);

  const fetchProdukJadi = async () => {
    try {
      const { data, error } = await supabase
        .from('produk_jadi')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          nama_produk_jadi: data.nama_produk_jadi,
          sku: data.sku,
          harga_jual: data.harga_jual
        });
      }
    } catch (error: any) {
      console.error('Error fetching produk jadi:', error);
      toast.error('Gagal memuat data produk jadi');
      router.push('/dashboard/produk-jadi');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'harga_jual' ? parseFloat(value) || 0 : value
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
        .from('produk_jadi')
        .update({
          nama_produk_jadi: formData.nama_produk_jadi,
          sku: formData.sku,
          harga_jual: formData.harga_jual
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Produk jadi berhasil diperbarui!');
      router.push('/dashboard/produk-jadi');
    } catch (error: any) {
      console.error('Error updating produk jadi:', error);
      toast.error(error.message || 'Gagal memperbarui produk jadi');
    } finally {
      setLoading(false);
    }
  };

  // Navbar actions
  const navbarActions = [
    {
      label: 'Simpan Perubahan',
      onClick: () => {
        const form = document.getElementById('produk-form') as HTMLFormElement;
        if (form) {
          form.requestSubmit();
        }
      },
      icon: Save,
      variant: 'default' as const,
      disabled: loading
    }
  ];

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar 
          title="Edit Produk Jadi" 
          showBackButton={true}
        />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Memuat data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar 
        title="Edit Produk Jadi" 
        showBackButton={true}
        actions={navbarActions}
      />
      
      <div className="p-4 md:p-6">
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Informasi Produk Jadi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form id="produk-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="nama_produk_jadi">Nama Produk Jadi *</Label>
                  <Input
                    id="nama_produk_jadi"
                    name="nama_produk_jadi"
                    value={formData.nama_produk_jadi}
                    onChange={handleInputChange}
                    placeholder="Masukkan nama produk jadi"
                    required
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    placeholder="Masukkan SKU produk"
                    required
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="harga_jual">Harga Jual *</Label>
                  <Input
                    id="harga_jual"
                    name="harga_jual"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.harga_jual}
                    onChange={handleInputChange}
                    placeholder="Masukkan harga jual"
                    required
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="w-full sm:flex-1"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}