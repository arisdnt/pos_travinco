'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Save, Plus } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { toast } from 'sonner';

export default function AddBahanBakuPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nama_bahan_baku: '',
    stok: 0,
    unit: ''
  });

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

      const { error } = await supabase
        .from('bahan_baku')
        .insert({
          nama_bahan_baku: formData.nama_bahan_baku,
          stok: formData.stok,
          unit: formData.unit,
          user_id: user.id
        });

      if (error) throw error;

      toast.success('Bahan baku berhasil ditambahkan!');
      router.push('/dashboard/bahan-baku');
    } catch (error: any) {
      console.error('Error adding bahan baku:', error);
      toast.error(error.message || 'Gagal menambahkan bahan baku');
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

  return (
    <div className="flex flex-col h-full">
      <Navbar 
        title="Tambah Bahan Baku" 
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
              <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
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
                    Stok Awal *
                  </Label>
                  <Input
                    id="stok"
                    name="stok"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.stok}
                    onChange={handleInputChange}
                    placeholder="Masukkan stok awal"
                    required
                    className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Unit/Satuan *
                  </Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => handleSelectChange('unit', value)}
                    required
                  >
                    <SelectTrigger className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <SelectValue placeholder="Pilih unit/satuan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ml">ml (mililiter)</SelectItem>
                      <SelectItem value="gram">gram</SelectItem>
                      <SelectItem value="kg">kg (kilogram)</SelectItem>
                      <SelectItem value="liter">liter</SelectItem>
                      <SelectItem value="pcs">pcs (pieces)</SelectItem>
                      <SelectItem value="bottle">bottle</SelectItem>
                      <SelectItem value="oz">oz (ounce)</SelectItem>
                      <SelectItem value="lb">lb (pound)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="w-full sm:flex-1 h-11 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:flex-1 h-11 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 transition-all duration-200"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Menyimpan...' : 'Simpan Bahan Baku'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}