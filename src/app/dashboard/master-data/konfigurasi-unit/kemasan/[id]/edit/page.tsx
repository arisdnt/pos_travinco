'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { UnitDasar, Kemasan, KemasanFormData } from '@/types/master-data';

export default function EditKemasanPage() {
  const router = useRouter();
  const params = useParams();
  const kemasanId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [unitDasars, setUnitDasars] = useState<UnitDasar[]>([]);
  const [formData, setFormData] = useState<KemasanFormData>({
    nama_kemasan: '',
    unit_dasar_id: '',
    nilai_konversi: 1
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchKemasan = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('kemasan')
      .select(`
        *,
        unit_dasar (
          id,
          nama_unit,
          deskripsi
        )
      `)
      .eq('id', kemasanId)
      .single();

    if (error) {
      console.error('Error fetching kemasan:', error);
      toast.error('Gagal memuat data kemasan');
      router.push('/dashboard/master-data/kemasan');
    } else if (data) {
      setFormData({
        nama_kemasan: data.nama_kemasan,
        unit_dasar_id: data.unit_dasar_id,
        nilai_konversi: data.nilai_konversi
      });
    }
    setInitialLoading(false);
  };

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
      toast.error('Anda harus login untuk mengedit kemasan');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('kemasan')
      .update({
        nama_kemasan: formData.nama_kemasan.trim(),
        unit_dasar_id: formData.unit_dasar_id,
        nilai_konversi: formData.nilai_konversi
      })
      .eq('id', kemasanId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating kemasan:', error);
      if (error.code === '23505') {
        toast.error('Kemasan dengan nama tersebut sudah ada');
      } else if (error.code === '23503') {
        toast.error('Unit dasar yang dipilih tidak valid');
      } else {
        toast.error('Gagal memperbarui kemasan');
      }
    } else {
      toast.success('Kemasan berhasil diperbarui');
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
    if (kemasanId) {
      fetchKemasan();
      fetchUnitDasars();
    }
  }, [kemasanId]);

  const selectedUnit = unitDasars.find(unit => unit.id === formData.unit_dasar_id);

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Card className="max-w-2xl">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex justify-end space-x-3 pt-6">
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/dashboard/master-data/kemasan')}
          className="border-gray-300 dark:border-gray-600"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Edit Kemasan
        </h2>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900 dark:text-white">
            Informasi Kemasan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
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

            <div className="space-y-2">
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

            <div className="space-y-2">
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

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                ⚠️ Peringatan
              </h4>
              <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                <li>• Mengubah unit dasar akan mempengaruhi konversi yang sudah ada</li>
                <li>• Mengubah nilai konversi akan mempengaruhi perhitungan stok</li>
                <li>• Pastikan perubahan tidak mengganggu transaksi yang sedang berjalan</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
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
                    Simpan Perubahan
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}