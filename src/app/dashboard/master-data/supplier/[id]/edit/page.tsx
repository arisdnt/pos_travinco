'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/layout/navbar';
import { ArrowLeft, Save, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Supplier, SupplierFormData } from '@/types/master-data';

export default function EditSupplierPage() {
  const router = useRouter();
  const params = useParams();
  const supplierId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>({
    nama_supplier: '',
    kontak: '',
    alamat: ''
  });
  const [errors, setErrors] = useState<Partial<SupplierFormData>>({});

  const fetchSupplier = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', supplierId)
      .single();

    if (error) {
      console.error('Error fetching supplier:', error);
      toast.error('Gagal memuat data supplier');
      router.push('/dashboard/master-data/supplier');
    } else {
      setSupplier(data);
      setFormData({
        nama_supplier: data.nama_supplier || '',
        kontak: data.kontak || '',
        alamat: data.alamat || ''
      });
    }
    setInitialLoading(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<SupplierFormData> = {};

    if (!formData.nama_supplier.trim()) {
      newErrors.nama_supplier = 'Nama supplier wajib diisi';
    } else if (formData.nama_supplier.length < 2) {
      newErrors.nama_supplier = 'Nama supplier minimal 2 karakter';
    } else if (formData.nama_supplier.length > 100) {
      newErrors.nama_supplier = 'Nama supplier maksimal 100 karakter';
    }

    if (formData.kontak && formData.kontak.length > 50) {
      newErrors.kontak = 'Kontak maksimal 50 karakter';
    }

    if (formData.alamat && formData.alamat.length > 255) {
      newErrors.alamat = 'Alamat maksimal 255 karakter';
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

    const { error } = await supabase
      .from('suppliers')
      .update({
        nama_supplier: formData.nama_supplier.trim(),
        kontak: formData.kontak?.trim() || null,
        alamat: formData.alamat?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', supplierId);

    if (error) {
      console.error('Error updating supplier:', error);
      if (error.code === '23505') {
        toast.error('Supplier dengan nama tersebut sudah ada');
      } else {
        toast.error('Gagal mengupdate supplier');
      }
    } else {
      toast.success('Supplier berhasil diupdate');
      router.push('/dashboard/master-data/supplier');
    }
    setLoading(false);
  };

  const handleInputChange = (field: keyof SupplierFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const navbarActions = [
    {
      label: 'Kembali',
      onClick: () => router.push('/dashboard/master-data/supplier'),
      icon: ArrowLeft,
      variant: 'outline' as const,
    },
  ];

  useEffect(() => {
    if (supplierId) {
      fetchSupplier();
    }
  }, [supplierId]);

  if (initialLoading) {
    return (
      <div className="flex flex-col h-full">
        <Navbar 
          title="Edit Supplier" 
          actions={navbarActions}
        />
        <div className="flex-1 p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm h-fit">
              <CardHeader className="pb-4">
                <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="space-y-4">
              <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50/80 to-purple-50/80 dark:from-blue-900/20 dark:to-purple-900/20 backdrop-blur-sm border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!supplier) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      <Navbar 
        title={`Edit Supplier: ${supplier.nama_supplier}`} 
        actions={navbarActions}
      />
      <div className="flex-1 p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Form Section - Left Column */}
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium text-gray-900 dark:text-white">
                Informasi Supplier
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nama_supplier" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nama Supplier <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nama_supplier"
                    type="text"
                    value={formData.nama_supplier}
                    onChange={(e) => handleInputChange('nama_supplier', e.target.value)}
                    placeholder="Contoh: PT. Sumber Makmur, Toko Bahan Kue"
                    className={`border-gray-300 dark:border-gray-600 ${
                      errors.nama_supplier ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                    maxLength={100}
                  />
                  {errors.nama_supplier && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.nama_supplier}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formData.nama_supplier.length}/100 karakter
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="kontak" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Kontak
                  </Label>
                  <Input
                    id="kontak"
                    type="text"
                    value={formData.kontak}
                    onChange={(e) => handleInputChange('kontak', e.target.value)}
                    placeholder="081234567890 atau email@supplier.com"
                    className={`border-gray-300 dark:border-gray-600 ${
                      errors.kontak ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                    maxLength={50}
                  />
                  {errors.kontak && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.kontak}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formData.kontak?.length || 0}/50 karakter
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="alamat" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Alamat
                  </Label>
                  <Textarea
                    id="alamat"
                    value={formData.alamat}
                    onChange={(e) => handleInputChange('alamat', e.target.value)}
                    placeholder="Alamat lengkap supplier (opsional)"
                    className={`min-h-[100px] border-gray-300 dark:border-gray-600 ${
                      errors.alamat ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                    maxLength={255}
                  />
                  {errors.alamat && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.alamat}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formData.alamat?.length || 0}/255 karakter
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/dashboard/master-data/supplier')}
                    disabled={loading}
                    className="border-gray-300 dark:border-gray-600"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                        Menyimpan...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Save className="h-4 w-4 mr-2" />
                        Update Supplier
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Information Section - Right Column */}
          <div className="space-y-4">
            {/* Tips & Examples Card */}
            <Card className="shadow-lg border-0 bg-gradient-to-br from-orange-50/80 to-yellow-50/80 dark:from-orange-900/20 dark:to-yellow-900/20 backdrop-blur-sm border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-100 flex items-center">
                  ✏️ Tips Edit Supplier
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {/* Tips Section */}
                <div>
                  <h4 className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-1">Tips:</h4>
                  <ul className="text-xs text-orange-800 dark:text-orange-200 space-y-1">
                    <li className="flex items-start leading-tight">
                      <span className="inline-block w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                      <span>Pastikan nama supplier tetap unik setelah diedit</span>
                    </li>
                    <li className="flex items-start leading-tight">
                      <span className="inline-block w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                      <span>Update informasi kontak jika ada perubahan</span>
                    </li>
                    <li className="flex items-start leading-tight">
                      <span className="inline-block w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                      <span>Perubahan akan mempengaruhi data pembelian terkait</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Current Data Card */}
            <Card className="shadow-lg border-0 bg-gray-50/80 dark:bg-gray-900/20 backdrop-blur-sm border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                  📋 Data Saat Ini
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Nama Supplier:</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">{supplier.nama_supplier}</div>
                  </div>
                  {supplier.kontak && (
                    <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Kontak:</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">{supplier.kontak}</div>
                    </div>
                  )}
                  {supplier.alamat && (
                    <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Alamat:</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">{supplier.alamat}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Preview Card */}
            {(formData.nama_supplier !== supplier.nama_supplier || 
              formData.kontak !== supplier.kontak || 
              formData.alamat !== supplier.alamat) && (
              <Card className="shadow-lg border-0 bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-sm border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-blue-900 dark:text-blue-100 flex items-center">
                    👁️ Preview Perubahan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100 flex items-center justify-center">
                      <Building2 className="h-6 w-6 mr-2" />
                      {formData.nama_supplier}
                    </div>
                    {formData.kontak && (
                      <div className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                        📞 {formData.kontak}
                      </div>
                    )}
                    {formData.alamat && (
                      <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        📍 {formData.alamat}
                      </div>
                    )}
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