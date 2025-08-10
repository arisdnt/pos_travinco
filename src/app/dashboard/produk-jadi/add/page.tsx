'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Package } from 'lucide-react';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { toast } from 'sonner';
import { Navbar } from '@/components/layout/navbar';

export default function AddProdukJadiPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nama_produk_jadi: '',
    sku: '',
    harga_jual: 0
  });

  // Generate SKU otomatis berdasarkan nama produk
  const generateSKU = (namaProduk: string) => {
    if (!namaProduk) return '';
    
    // Ambil 3 huruf pertama dari nama produk, hapus spasi dan karakter khusus
    const prefix = namaProduk
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 3)
      .toUpperCase();
    
    // Generate timestamp untuk uniqueness
    const timestamp = Date.now().toString().slice(-6);
    
    return `${prefix}${timestamp}`;
  };

  // Auto-generate SKU ketika nama produk berubah
  useEffect(() => {
    if (formData.nama_produk_jadi) {
      const newSKU = generateSKU(formData.nama_produk_jadi);
      setFormData(prev => ({
        ...prev,
        sku: newSKU
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        sku: ''
      }));
    }
  }, [formData.nama_produk_jadi]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        .insert({
          nama_produk_jadi: formData.nama_produk_jadi,
          sku: formData.sku,
          harga_jual: formData.harga_jual,
          user_id: user.id
        });

      if (error) throw error;

      toast.success('Produk jadi berhasil ditambahkan!');
      router.push('/dashboard/produk-jadi');
    } catch (error: any) {
      console.error('Error adding produk jadi:', error);
      toast.error(error.message || 'Gagal menambahkan produk jadi');
    } finally {
      setLoading(false);
    }
  };

  const navbarActions = [
    {
      label: 'Simpan Produk',
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar 
        title="Tambah Produk Jadi" 
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
                  <Label htmlFor="sku">SKU * (Auto Generated)</Label>
                  <Input
                    id="sku"
                    name="sku"
                    value={formData.sku}
                    placeholder="SKU akan dibuat otomatis"
                    required
                    disabled
                    className="w-full bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                    readOnly
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
                  {loading ? 'Menyimpan...' : 'Simpan Produk'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}