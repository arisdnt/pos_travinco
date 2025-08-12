'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/layout/navbar';
import { ArrowLeft, Save, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface KategoriFormData {
  nama_kategori: string;
  deskripsi: string;
}

export default function AddKategoriPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<KategoriFormData>({
    nama_kategori: '',
    deskripsi: ''
  });
  const [errors, setErrors] = useState<Partial<KategoriFormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<KategoriFormData> = {};

    if (!formData.nama_kategori.trim()) {
      newErrors.nama_kategori = 'Nama kategori wajib diisi';
    } else if (formData.nama_kategori.length < 2) {
      newErrors.nama_kategori = 'Nama kategori minimal 2 karakter';
    } else if (formData.nama_kategori.length > 50) {
      newErrors.nama_kategori = 'Nama kategori maksimal 50 karakter';
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
      toast.error('Anda harus login untuk menambahkan kategori');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('kategori')
      .insert([{
        nama_kategori: formData.nama_kategori.trim(),
        deskripsi: formData.deskripsi?.trim() || null,
        user_id: user.id
      }]);

    if (error) {
      console.error('Error creating kategori:', error);
      if (error.code === '23505') {
        toast.error('Kategori dengan nama tersebut sudah ada');
      } else {
        toast.error('Gagal menambahkan kategori');
      }
    } else {
      toast.success('Kategori berhasil ditambahkan');
      router.push('/dashboard/master-data/kategori');
    }
    setLoading(false);
  };

  const handleInputChange = (field: keyof KategoriFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const navbarActions = [
    {
      label: 'Kembali',
      onClick: () => router.push('/dashboard/master-data/kategori'),
      icon: ArrowLeft,
      variant: 'outline' as const,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <Navbar 
        title="Tambah Kategori Baru" 
        actions={navbarActions}
      />
      <div className="flex-1 p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Form Section - Left Column */}
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium text-gray-900 dark:text-white">
                Informasi Kategori
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nama_kategori" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nama Kategori <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nama_kategori"
                    type="text"
                    value={formData.nama_kategori}
                    onChange={(e) => handleInputChange('nama_kategori', e.target.value)}
                    placeholder="Contoh: Minuman, Makanan, Snack"
                    className={`border-gray-300 dark:border-gray-600 ${
                      errors.nama_kategori ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                    maxLength={50}
                  />
                  {errors.nama_kategori && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.nama_kategori}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formData.nama_kategori.length}/50 karakter
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="deskripsi" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Deskripsi
                  </Label>
                  <Textarea
                    id="deskripsi"
                    value={formData.deskripsi}
                    onChange={(e) => handleInputChange('deskripsi', e.target.value)}
                    placeholder="Deskripsi kategori (opsional)"
                    className={`min-h-[100px] border-gray-300 dark:border-gray-600 ${
                      errors.deskripsi ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                    maxLength={200}
                  />
                  {errors.deskripsi && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.deskripsi}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formData.deskripsi.length}/200 karakter
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/dashboard/master-data/kategori')}
                    disabled={loading}
                    className="border-gray-300 dark:border-gray-600"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                        Menyimpan...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Save className="h-4 w-4 mr-2" />
                        Simpan Kategori
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
            <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50/80 to-green-50/80 dark:from-blue-900/20 dark:to-green-900/20 backdrop-blur-sm border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-100 flex items-center">
                  💡 Tips & Contoh Kategori
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {/* Tips Section */}
                <div>
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Tips:</h4>
                  <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                    <li className="flex items-start leading-tight">
                      <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                      <span>Gunakan nama kategori yang jelas dan mudah dipahami</span>
                    </li>
                    <li className="flex items-start leading-tight">
                      <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                      <span>Kategori membantu mengorganisir produk dengan lebih baik</span>
                    </li>
                    <li className="flex items-start leading-tight">
                      <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                      <span>Nama kategori harus unik dan tidak boleh sama</span>
                    </li>
                  </ul>
                </div>
                
                {/* Examples Section */}
                <div>
                  <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">Contoh:</h4>
                  <div className="grid grid-cols-1 gap-1.5">
                    <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded text-xs">
                      <span className="font-medium text-green-900 dark:text-green-100">Minuman</span>
                      <span className="text-green-700 dark:text-green-300 ml-2">- Air, Jus, Soda</span>
                    </div>
                    <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded text-xs">
                      <span className="font-medium text-green-900 dark:text-green-100">Makanan</span>
                      <span className="text-green-700 dark:text-green-300 ml-2">- Nasi, Mie, Roti</span>
                    </div>
                    <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded text-xs">
                      <span className="font-medium text-green-900 dark:text-green-100">Snack</span>
                      <span className="text-green-700 dark:text-green-300 ml-2">- Keripik, Biskuit</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview Card */}
            {formData.nama_kategori && (
              <Card className="shadow-lg border-0 bg-green-50/80 dark:bg-green-900/20 backdrop-blur-sm border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-green-900 dark:text-green-100 flex items-center">
                    👁️ Preview Kategori
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {formData.nama_kategori}
                    </div>
                    {formData.deskripsi && (
                      <div className="text-sm text-green-700 dark:text-green-300 mt-2">
                        {formData.deskripsi}
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