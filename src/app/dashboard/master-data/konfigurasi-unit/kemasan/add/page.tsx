'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/layout/navbar';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { UnitDasar, KemasanFormData } from '@/types/master-data';

export default function AddKemasanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [unitDasars, setUnitDasars] = useState<UnitDasar[]>([]);
  const [formData, setFormData] = useState<KemasanFormData>({
    nama_kemasan: '',
    unit_dasar_id: '',
    nilai_konversi: 1
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchUnitDasars = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('unit_dasar')
      .select('*')
      .order('nama_unit');

    if (error) {
      console.error('Error fetching unit dasars:', error);
      toast.error('Gagal memuat data unit dasar');
    } else {
      setUnitDasars(data || []);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nama_kemasan.trim()) {
      newErrors.nama_kemasan = 'Nama kemasan wajib diisi';
    } else if (formData.nama_kemasan.length < 2) {
      newErrors.nama_kemasan = 'Nama kemasan minimal 2 karakter';
    } else if (formData.nama_kemasan.length > 50) {
      newErrors.nama_kemasan = 'Nama kemasan maksimal 50 karakter';
    }

    if (!formData.unit_dasar_id) {
      newErrors.unit_dasar_id = 'Unit dasar wajib dipilih';
    }

    if (!formData.nilai_konversi || formData.nilai_konversi <= 0) {
      newErrors.nilai_konversi = 'Nilai konversi harus lebih dari 0';
    } else if (formData.nilai_konversi > 999999) {
      newErrors.nilai_konversi = 'Nilai konversi terlalu besar';
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
      toast.error('Anda harus login untuk menambahkan kemasan');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('kemasan')
      .insert([{
        nama_kemasan: formData.nama_kemasan.trim(),
        unit_dasar_id: formData.unit_dasar_id,
        nilai_konversi: formData.nilai_konversi,
        user_id: user.id
      }]);

    if (error) {
      console.error('Error creating kemasan:', error);
      if (error.code === '23505') {
        toast.error('Kemasan dengan nama tersebut sudah ada');
      } else {
        toast.error('Gagal menambahkan kemasan');
      }
    } else {
      toast.success('Kemasan berhasil ditambahkan');
      router.push('/dashboard/master-data/kemasan');
    }
    setLoading(false);
  };

  const handleInputChange = (field: keyof KemasanFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const { [field]: removed, ...rest } = prev;
        return rest;
      });
    }
  };

  useEffect(() => {
    fetchUnitDasars();
  }, []);

  const selectedUnit = unitDasars.find(unit => unit.id === formData.unit_dasar_id);

  const navbarActions = [
    {
      label: 'Kembali',
      onClick: () => router.push('/dashboard/master-data/kemasan'),
      icon: ArrowLeft,
      variant: 'outline' as const,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <Navbar 
        title="Tambah Kemasan Baru" 
        actions={navbarActions}
      />
      <div className="flex-1 p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Form Section - Left Column */}
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium text-gray-900 dark:text-white">
                Informasi Kemasan
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nama_kemasan" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nama Kemasan <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nama_kemasan"
                type="text"
                value={formData.nama_kemasan}
                onChange={(e) => handleInputChange('nama_kemasan', e.target.value)}
                placeholder="Contoh: Dus, Karton, Botol"
                className={`border-gray-300 dark:border-gray-600 ${
                  errors.nama_kemasan ? 'border-red-500 focus:border-red-500' : ''
                }`}
                maxLength={50}
              />
              {errors.nama_kemasan && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.nama_kemasan}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formData.nama_kemasan.length}/50 karakter
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit_dasar_id" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Unit Dasar <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.unit_dasar_id}
                onValueChange={(value) => handleInputChange('unit_dasar_id', value)}
              >
                <SelectTrigger className={`border-gray-300 dark:border-gray-600 ${
                  errors.unit_dasar_id ? 'border-red-500 focus:border-red-500' : ''
                }`}>
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
              {errors.unit_dasar_id && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.unit_dasar_id}</p>
              )}
              {unitDasars.length === 0 && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  Belum ada unit dasar. Silakan tambahkan unit dasar terlebih dahulu.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nilai_konversi" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nilai Konversi <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nilai_konversi"
                type="number"
                min="0.01"
                step="0.01"
                value={formData.nilai_konversi}
                onChange={(e) => handleInputChange('nilai_konversi', parseFloat(e.target.value) || 0)}
                placeholder="Contoh: 12, 24, 1000"
                className={`border-gray-300 dark:border-gray-600 ${
                  errors.nilai_konversi ? 'border-red-500 focus:border-red-500' : ''
                }`}
              />
              {errors.nilai_konversi && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.nilai_konversi}</p>
              )}
              {selectedUnit && formData.nilai_konversi > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  1 {formData.nama_kemasan || 'kemasan'} = {formData.nilai_konversi} {selectedUnit.nama_unit}
                </p>
              )}
            </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/dashboard/master-data/kemasan')}
                    disabled={loading}
                    className="border-gray-300 dark:border-gray-600"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || unitDasars.length === 0}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                        Menyimpan...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Save className="h-4 w-4 mr-2" />
                        Simpan Kemasan
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Information Section - Right Column */}
          <div className="space-y-4">
            {/* Combined Tips & Examples Card */}
            <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50/80 to-green-50/80 dark:from-blue-900/20 dark:to-green-900/20 backdrop-blur-sm border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-100 flex items-center">
                  💡 Tips & Contoh Kemasan
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {/* Tips Section */}
                <div>
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Tips:</h4>
                  <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                    <li className="flex items-start leading-tight">
                      <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                      <span>Kemasan adalah satuan yang lebih besar dari unit dasar</span>
                    </li>
                    <li className="flex items-start leading-tight">
                      <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                      <span>Kemasan memudahkan pembelian dalam jumlah besar</span>
                    </li>
                    <li className="flex items-start leading-tight">
                      <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                      <span>Sistem akan otomatis mengkonversi ke unit dasar</span>
                    </li>
                  </ul>
                </div>
                
                {/* Examples Section */}
                <div>
                  <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">Contoh:</h4>
                  <div className="grid grid-cols-1 gap-1.5">
                    <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded text-xs">
                      <span className="font-medium text-green-900 dark:text-green-100">Dus Minuman</span>
                      <span className="text-green-700 dark:text-green-300 ml-2">= 24 Botol</span>
                    </div>
                    <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded text-xs">
                      <span className="font-medium text-green-900 dark:text-green-100">Karton Snack</span>
                      <span className="text-green-700 dark:text-green-300 ml-2">= 12 Pcs</span>
                    </div>
                    <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded text-xs">
                      <span className="font-medium text-green-900 dark:text-green-100">Pack Kecil</span>
                      <span className="text-green-700 dark:text-green-300 ml-2">= 6 Unit</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview Card */}
            {selectedUnit && formData.nilai_konversi > 0 && formData.nama_kemasan && (
              <Card className="shadow-lg border-0 bg-orange-50/80 dark:bg-orange-900/20 backdrop-blur-sm border-orange-200 dark:border-orange-800">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-orange-900 dark:text-orange-100 flex items-center">
                    👁️ Preview Konversi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                      1 {formData.nama_kemasan}
                    </div>
                    <div className="text-lg text-orange-700 dark:text-orange-300 mt-2">
                      = {formData.nilai_konversi} {selectedUnit.nama_unit}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}