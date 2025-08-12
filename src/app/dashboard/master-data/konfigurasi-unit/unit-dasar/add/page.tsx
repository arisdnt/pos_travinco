'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Navbar } from '@/components/layout/navbar';
import { Save, Package, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import type { UnitDasarFormData } from '@/types/master-data';

export default function AddUnitDasarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UnitDasarFormData>({
    nama_unit: '',
    deskripsi: ''
  });
  const [errors, setErrors] = useState<Partial<UnitDasarFormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<UnitDasarFormData> = {};

    if (!formData.nama_unit.trim()) {
      newErrors.nama_unit = 'Nama unit wajib diisi';
    } else if (formData.nama_unit.length < 2) {
      newErrors.nama_unit = 'Nama unit minimal 2 karakter';
    } else if (formData.nama_unit.length > 50) {
      newErrors.nama_unit = 'Nama unit maksimal 50 karakter';
    }



    if (formData.deskripsi && formData.deskripsi.length > 255) {
      newErrors.deskripsi = 'Deskripsi maksimal 255 karakter';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Mohon perbaiki kesalahan pada form');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('Anda harus login untuk menambahkan unit dasar');
      return;
    }

    const { error } = await supabase
      .from('unit_dasar')
      .insert([{
        nama_unit: formData.nama_unit.trim(),
        deskripsi: formData.deskripsi?.trim() || null,
        user_id: user.id
      }]);

    if (error) {
      console.error('Error creating unit dasar:', error);
      if (error.code === '23505') {
        toast.error('Unit dasar dengan nama atau simbol tersebut sudah ada');
      } else {
        toast.error('Gagal menambahkan unit dasar');
      }
    } else {
      toast.success('Unit dasar berhasil ditambahkan');
      router.push('/dashboard/master-data/konfigurasi-unit');
    }
    setLoading(false);
  };

  const handleInputChange = (field: keyof UnitDasarFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const navbarActions = [
    {
      label: "Simpan",
      onClick: () => {
        const form = document.getElementById('unit-dasar-form') as HTMLFormElement;
        if (form) form.requestSubmit();
      },
      icon: Save,
      variant: "default" as const
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <Navbar 
        title="Tambah Unit Dasar" 
        showBackButton={true}
        backUrl="/dashboard/master-data/konfigurasi-unit"
        actions={navbarActions}
      />

      <div className="flex-1 p-4 md:p-6 space-y-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
        <Card className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white mb-6">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Informasi Unit Dasar
            </div>
            
            <form id="unit-dasar-form" onSubmit={handleSubmit} className="space-y-6">
               <div className="space-y-2">
                 <Label htmlFor="nama_unit" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                   Nama Unit <span className="text-red-500">*</span>
                 </Label>
                 <Input
                   id="nama_unit"
                   type="text"
                   value={formData.nama_unit}
                   onChange={(e) => handleInputChange('nama_unit', e.target.value)}
                   placeholder="Contoh: Kilogram, Liter, Pieces, Gram, Meter"
                   className={`h-11 ${errors.nama_unit ? 'border-red-500 focus:border-red-500' : ''}`}
                   maxLength={50}
                 />
                 <div className="flex justify-between items-center">
                   {errors.nama_unit && (
                     <p className="text-sm text-red-500">{errors.nama_unit}</p>
                   )}
                   <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                     {formData.nama_unit.length}/50
                   </span>
                 </div>
               </div>

              <div className="space-y-2">
                <Label htmlFor="deskripsi" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Deskripsi
                </Label>
                <Textarea
                  id="deskripsi"
                  value={formData.deskripsi}
                  onChange={(e) => handleInputChange('deskripsi', e.target.value)}
                  placeholder="Deskripsi tambahan untuk unit dasar (opsional)"
                  className={`min-h-[100px] resize-none ${errors.deskripsi ? 'border-red-500 focus:border-red-500' : ''}`}
                  maxLength={255}
                />
                <div className="flex justify-between items-center">
                  {errors.deskripsi && (
                    <p className="text-sm text-red-500">{errors.deskripsi}</p>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                    {formData.deskripsi?.length || 0}/255
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Tips Unit Dasar
                </h4>
                <div className="grid gap-2 text-sm text-blue-800 dark:text-blue-200">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                    <span>Unit dasar adalah satuan terkecil untuk mengukur bahan baku</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                    <span>Contoh unit berat: kg, gram, ton</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                    <span>Contoh unit volume: liter, ml, gallon</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                    <span>Contoh unit jumlah: pcs, buah, lembar</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                    <span>Gunakan simbol yang umum dan mudah dipahami</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                  className="w-full sm:w-auto border-gray-300 dark:border-gray-600 h-11"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white h-11 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Simpan Unit Dasar
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