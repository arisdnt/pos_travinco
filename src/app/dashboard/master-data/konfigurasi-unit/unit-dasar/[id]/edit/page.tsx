'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/layout/navbar';
import { Save, Ruler } from 'lucide-react';
import { toast } from 'sonner';
import type { UnitDasar, UnitDasarFormData } from '@/types/master-data';

export default function EditUnitDasarPage() {
  const router = useRouter();
  const params = useParams();
  const unitId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [unit, setUnit] = useState<UnitDasar | null>(null);
  const [formData, setFormData] = useState<UnitDasarFormData>({
    nama_unit: '',
    deskripsi: ''
  });
  const [errors, setErrors] = useState<Partial<UnitDasarFormData>>({});

  const fetchUnit = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('unit_dasar')
      .select('*')
      .eq('id', unitId)
      .single();

    if (error) {
      console.error('Error fetching unit dasar:', error);
      toast.error('Gagal memuat data unit dasar');
      router.push('/dashboard/master-data/unit-dasar');
    } else {
      setUnit(data);
      setFormData({
        nama_unit: data.nama_unit || '',
        deskripsi: data.deskripsi || ''
      });
    }
    setInitialLoading(false);
  };

  const validateForm = async (): Promise<boolean> => {
    const newErrors: Partial<UnitDasarFormData> = {};

    if (!formData.nama_unit.trim()) {
      newErrors.nama_unit = 'Nama unit wajib diisi';
    } else if (formData.nama_unit.length < 2) {
      newErrors.nama_unit = 'Nama unit minimal 2 karakter';
    } else if (formData.nama_unit.length > 50) {
      newErrors.nama_unit = 'Nama unit maksimal 50 karakter';
    } else {
      // Check if nama_unit already exists globally (excluding current record)
      const supabase = createClient();
      const { data: existingUnit } = await supabase
        .from('unit_dasar')
        .select('id')
        .eq('nama_unit', formData.nama_unit.trim())
        .neq('id', unitId)
        .single();
      
      if (existingUnit) {
        newErrors.nama_unit = 'Unit dasar dengan nama tersebut sudah ada';
      }
    }

    if (formData.deskripsi && formData.deskripsi.length > 255) {
      newErrors.deskripsi = 'Deskripsi maksimal 255 karakter';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    
    const isValid = await validateForm();
    if (!isValid) {
      toast.error('Mohon perbaiki kesalahan pada form');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('Anda harus login untuk mengedit unit dasar');
      setLoading(false);
      return;
    }

    // First check if the unit belongs to the current user
    const { data: unitCheck, error: checkError } = await supabase
      .from('unit_dasar')
      .select('user_id')
      .eq('id', unitId)
      .single();

    if (checkError || !unitCheck || unitCheck.user_id !== user.id) {
      toast.error('Unit dasar tidak ditemukan atau Anda tidak memiliki akses');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('unit_dasar')
      .update({
        nama_unit: formData.nama_unit.trim(),
        deskripsi: formData.deskripsi?.trim() || null
      })
      .eq('id', unitId);

    if (error) {
      console.error('Error updating unit dasar:', error);
      if (error.code === '23505') {
        toast.error('Unit dasar dengan nama tersebut sudah ada');
      } else {
        toast.error('Gagal mengupdate unit dasar: ' + error.message);
      }
    } else {
      toast.success('Unit dasar berhasil diupdate');
      router.push('/dashboard/master-data/unit-dasar');
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
      label: 'Simpan Perubahan',
      onClick: () => {
        const form = document.getElementById('unit-dasar-form') as HTMLFormElement;
        if (form) {
          form.requestSubmit();
        }
      },
      icon: Save,
      variant: 'default' as const,
      disabled: loading
    }
  ];

  useEffect(() => {
    if (unitId) {
      fetchUnit();
    }
  }, [unitId]);

  if (initialLoading) {
    return (
      <div className="flex flex-col h-full">
        <Navbar 
          title="Edit Unit Dasar" 
          showBackButton={true}
          backUrl="/dashboard/master-data/unit-dasar"
        />
        <div className="flex-1 p-4 md:p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Memuat data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!unit) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      <Navbar 
        title={`Edit Unit Dasar: ${unit.nama_unit}`}
        showBackButton={true}
        backUrl="/dashboard/master-data/unit-dasar"
        actions={navbarActions}
      />
      
      <div className="flex-1 p-4 md:p-6">
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="w-5 h-5" />
              Informasi Unit Dasar
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                  placeholder="Contoh: Kilogram, Liter, Pieces"
                  className={`border-gray-300 dark:border-gray-600 ${
                    errors.nama_unit ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                  maxLength={50}
                />
                {errors.nama_unit && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.nama_unit}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formData.nama_unit.length}/50 karakter
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deskripsi" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Deskripsi
                </Label>
                <Input
                  id="deskripsi"
                  type="text"
                  value={formData.deskripsi}
                  onChange={(e) => handleInputChange('deskripsi', e.target.value)}
                  placeholder="Contoh: Satuan untuk mengukur berat bahan baku"
                  className={`border-gray-300 dark:border-gray-600 ${
                    errors.deskripsi ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                  maxLength={255}
                />
                {errors.deskripsi && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.deskripsi}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formData.deskripsi?.length || 0}/255 karakter
                </p>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                  ⚠️ Peringatan
                </h4>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Mengubah unit dasar dapat mempengaruhi data bahan baku dan kemasan yang sudah ada. 
                  Pastikan perubahan ini tidak akan mengganggu data yang sudah tersimpan.
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  💡 Tips Unit Dasar
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Unit dasar adalah satuan terkecil untuk mengukur bahan baku</li>
                  <li>• Contoh unit berat: kg, gram, ton</li>
                  <li>• Contoh unit volume: liter, ml, gallon</li>
                  <li>• Contoh unit jumlah: pcs, buah, lembar</li>
                  <li>• Berikan deskripsi yang jelas untuk memudahkan identifikasi</li>
                </ul>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}