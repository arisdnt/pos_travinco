'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Navbar } from '@/components/layout/navbar';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { BahanBaku, Supplier, ReservasiStokSupplier, Kemasan } from '@/types/master-data';

interface ReservasiStokSupplierFormData {
  bahan_baku_id: string;
  supplier_id: string;
  jumlah_reservasi: number;
  kemasan_id?: string;
  catatan?: string;
}

export default function EditReservasiStokPage() {
  const router = useRouter();
  const params = useParams();
  const reservasiId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [bahanBakus, setBahanBakus] = useState<BahanBaku[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [kemasans, setKemasans] = useState<Kemasan[]>([]);
  const [reservasiStok, setReservasiStok] = useState<ReservasiStokSupplier | null>(null);
  const [formData, setFormData] = useState<ReservasiStokSupplierFormData>({
    bahan_baku_id: '',
    supplier_id: '',
    jumlah_reservasi: 0,
    kemasan_id: '',
    catatan: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchReservasiStok = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('reservasi_stok_supplier')
      .select(`
        *,
        bahan_baku (
          id,
          nama_bahan_baku,
          stok,
          unit_dasar_id,
          kategori (
            nama_kategori
          ),
          unit_dasar (
            nama_unit
          )
        ),
        suppliers (
          id,
          nama_supplier,
          kontak,
          alamat
        ),
        kemasan (
          id,
          nama_kemasan,
          nilai_konversi
        )
      `)
      .eq('id', reservasiId)
      .single();

    if (error) {
      console.error('Error fetching reservasi stok:', error);
      toast.error('Gagal memuat data reservasi stok');
      router.push('/dashboard/master-data/reservasi-stok');
    } else if (data) {
      setReservasiStok(data);
      setFormData({
        bahan_baku_id: data.bahan_baku_id,
        supplier_id: data.supplier_id,
        jumlah_reservasi: data.jumlah_reservasi,
        kemasan_id: data.kemasan_id || '',
        catatan: data.catatan || ''
      });
    }
    setInitialLoading(false);
  };

  const fetchBahanBakus = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bahan_baku')
      .select(`
        *,
        kategori (
          nama_kategori
        )
      `)
      .order('nama_bahan_baku');

    if (error) {
      console.error('Error fetching bahan bakus:', error);
      toast.error('Gagal memuat data bahan baku');
    } else {
      setBahanBakus(data || []);
    }
  };

  const fetchSuppliers = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('nama_supplier');

    if (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Gagal memuat data supplier');
    } else {
      setSuppliers(data || []);
    }
  };

  const fetchKemasans = async (unitDasarId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('kemasan')
      .select('*')
      .eq('unit_dasar_id', unitDasarId)
      .order('nama_kemasan');

    if (error) {
      console.error('Error fetching kemasans:', error);
      toast.error('Gagal memuat data kemasan');
    } else {
      setKemasans(data || []);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.bahan_baku_id) {
      newErrors.bahan_baku_id = 'Bahan baku harus dipilih';
    }

    if (!formData.supplier_id) {
      newErrors.supplier_id = 'Supplier harus dipilih';
    }

    if (!formData.jumlah_reservasi || formData.jumlah_reservasi <= 0) {
      newErrors.jumlah_reservasi = 'Jumlah reservasi harus lebih dari 0';
    }

    if (formData.catatan && formData.catatan.length > 500) {
      newErrors.catatan = 'Catatan maksimal 500 karakter';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Mohon periksa kembali data yang diisi');
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      const { error } = await supabase
        .from('reservasi_stok_supplier')
        .update({
          bahan_baku_id: formData.bahan_baku_id,
          supplier_id: formData.supplier_id,
          jumlah_reservasi: formData.jumlah_reservasi,
          kemasan_id: formData.kemasan_id || null,
          catatan: formData.catatan || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', reservasiId);

      if (error) {
        console.error('Error updating reservasi stok:', error);
        toast.error('Gagal memperbarui reservasi stok');
        return;
      }

      toast.success('Reservasi stok berhasil diperbarui');
      router.push('/dashboard/master-data/reservasi-stok');
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast.error('Terjadi kesalahan saat menyimpan data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ReservasiStokSupplierFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (reservasiId) {
        await Promise.all([
          fetchReservasiStok(),
          fetchBahanBakus(),
          fetchSuppliers()
        ]);
      }
    };
    loadData();
  }, [reservasiId]);

  // Load kemasan ketika bahan baku dipilih atau berubah
  useEffect(() => {
    const selectedBahanBaku = bahanBakus.find(bb => bb.id === formData.bahan_baku_id);
    if (selectedBahanBaku?.unit_dasar_id) {
      fetchKemasans(selectedBahanBaku.unit_dasar_id);
    } else {
      setKemasans([]);
      setFormData(prev => ({ ...prev, kemasan_id: '' }));
    }
  }, [formData.bahan_baku_id, bahanBakus]);

  const selectedBahanBaku = bahanBakus.find(bb => bb.id === formData.bahan_baku_id);
  const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id);
  const selectedKemasan = kemasans.find(k => k.id === formData.kemasan_id);
  
  // Hitung jumlah dalam satuan dasar untuk preview
  const jumlahDalamSatuanDasar = selectedKemasan 
    ? formData.jumlah_reservasi * selectedKemasan.nilai_konversi 
    : formData.jumlah_reservasi;

  if (initialLoading) {
    return (
      <div className="flex h-full flex-col">
        <Navbar
          title="Edit Reservasi Stok"
          actions={[
            {
              label: 'Kembali',
              onClick: () => router.back(),
              icon: ArrowLeft,
              variant: 'outline'
            }
          ]}
        />
        
        <div className="flex-1 space-y-6 p-4 md:p-6">
          <Card className="max-w-2xl">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Informasi Reservasi</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-6">
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Navbar
        title="Edit Reservasi Stok"
        actions={[
          {
            label: 'Kembali',
            onClick: () => router.back(),
            icon: ArrowLeft,
            variant: 'outline'
          }
        ]}
      />
      
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <Card className="max-w-2xl">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Informasi Reservasi</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="bahan_baku_id" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Bahan Baku <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.bahan_baku_id}
                onValueChange={(value) => handleInputChange('bahan_baku_id', value)}
              >
                <SelectTrigger className={`border-gray-300 dark:border-gray-600 ${
                  errors.bahan_baku_id ? 'border-red-500 focus:border-red-500' : ''
                }`}>
                  <SelectValue placeholder="Pilih bahan baku" />
                </SelectTrigger>
                <SelectContent>
                  {bahanBakus.map((bahanBaku) => (
                    <SelectItem key={bahanBaku.id} value={bahanBaku.id}>
                      <div className="flex flex-col">
                        <span>{bahanBaku.nama_bahan_baku}</span>
                        <span className="text-xs text-gray-500">
                          {bahanBaku.kategori?.nama_kategori || 'Tanpa kategori'} • Stok: {bahanBaku.stok}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bahan_baku_id && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.bahan_baku_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_id" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Supplier <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.supplier_id}
                onValueChange={(value) => handleInputChange('supplier_id', value)}
              >
                <SelectTrigger className={`border-gray-300 dark:border-gray-600 ${
                  errors.supplier_id ? 'border-red-500 focus:border-red-500' : ''
                }`}>
                  <SelectValue placeholder="Pilih supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      <div className="flex flex-col">
                        <span>{supplier.nama_supplier}</span>
                        <span className="text-xs text-gray-500">
                          {supplier.kontak || 'Kontak tidak tersedia'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.supplier_id && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.supplier_id}</p>
              )}
            </div>

            {selectedBahanBaku && kemasans.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="kemasan_id" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Kemasan (Opsional)
                </Label>
                <Select
                  value={formData.kemasan_id || ''}
                  onValueChange={(value) => handleInputChange('kemasan_id', value)}
                >
                  <SelectTrigger className="border-gray-300 dark:border-gray-600">
                    <SelectValue placeholder="Pilih kemasan atau biarkan kosong untuk satuan dasar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">
                      <div className="flex flex-col">
                        <span>Satuan Dasar</span>
                        <span className="text-xs text-gray-500">
                          {selectedBahanBaku.unit_dasar?.nama_unit || 'Unit'}
                        </span>
                      </div>
                    </SelectItem>
                    {kemasans.map((kemasan) => (
                      <SelectItem key={kemasan.id} value={kemasan.id}>
                        <div className="flex flex-col">
                          <span>{kemasan.nama_kemasan}</span>
                          <span className="text-xs text-gray-500">
                            1 {kemasan.nama_kemasan} = {kemasan.nilai_konversi} {selectedBahanBaku.unit_dasar?.nama_unit || 'unit'}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Pilih kemasan yang digunakan saat input reservasi. Jika kosong, akan menggunakan satuan dasar.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="jumlah_reservasi" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Jumlah Reservasi <span className="text-red-500">*</span>
              </Label>
              <Input
                id="jumlah_reservasi"
                type="number"
                min="1"
                step="1"
                value={formData.jumlah_reservasi || ''}
                onChange={(e) => handleInputChange('jumlah_reservasi', parseInt(e.target.value) || 0)}
                placeholder={`Masukkan jumlah dalam ${selectedKemasan ? selectedKemasan.nama_kemasan : (selectedBahanBaku?.unit_dasar?.nama_unit || 'satuan dasar')}`}
                className={`border-gray-300 dark:border-gray-600 ${
                  errors.jumlah_reservasi ? 'border-red-500 focus:border-red-500' : ''
                }`}
              />
              {errors.jumlah_reservasi && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.jumlah_reservasi}</p>
              )}
              {selectedKemasan && formData.jumlah_reservasi > 0 && (
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  = {jumlahDalamSatuanDasar.toLocaleString('id-ID')} {selectedBahanBaku?.unit_dasar?.nama_unit || 'unit'} (satuan dasar)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="catatan" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Catatan (Opsional)
              </Label>
              <Textarea
                id="catatan"
                value={formData.catatan || ''}
                onChange={(e) => handleInputChange('catatan', e.target.value)}
                placeholder="Catatan tambahan (opsional)"
                className={`border-gray-300 dark:border-gray-600 min-h-[80px] ${
                  errors.catatan ? 'border-red-500 focus:border-red-500' : ''
                }`}
                maxLength={500}
                rows={3}
              />
              {errors.catatan && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.catatan}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {(formData.catatan || '').length}/500 karakter
              </p>
            </div>

            {(selectedBahanBaku || selectedSupplier) && formData.jumlah_reservasi > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  📋 Ringkasan Reservasi
                </h4>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  {selectedBahanBaku && (
                    <>
                      <div className="flex justify-between">
                        <span>Bahan Baku:</span>
                        <span className="font-medium">{selectedBahanBaku.nama_bahan_baku}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Stok Tersedia:</span>
                        <span className="font-medium">{selectedBahanBaku.stok.toLocaleString('id-ID')}</span>
                      </div>
                    </>
                  )}
                  {selectedSupplier && (
                    <div className="flex justify-between">
                      <span>Supplier:</span>
                      <span className="font-medium">{selectedSupplier.nama_supplier}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-blue-200 dark:border-blue-700 pt-1 mt-2">
                    <span>Jumlah Reservasi:</span>
                    <span className="font-medium">
                      {formData.jumlah_reservasi.toLocaleString('id-ID')} {selectedKemasan ? selectedKemasan.nama_kemasan : (selectedBahanBaku?.unit_dasar?.nama_unit || 'unit')}
                      {selectedKemasan && (
                        <span className="text-xs block text-blue-600 dark:text-blue-300">
                          = {jumlahDalamSatuanDasar.toLocaleString('id-ID')} {selectedBahanBaku?.unit_dasar?.nama_unit || 'unit'} (satuan dasar)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                ⚠️ Peringatan
              </h4>
              <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                <li>• Mengubah bahan baku akan mempengaruhi perhitungan stok</li>
                <li>• Mengubah supplier dapat mempengaruhi proses pengadaan</li>
                <li>• Mengubah jumlah reservasi dapat mempengaruhi ketersediaan stok</li>
                <li>• Pastikan perubahan tidak mengganggu operasional yang sedang berjalan</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
                className="border-gray-300 dark:border-gray-600"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={loading}
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
    </div>
  );
}