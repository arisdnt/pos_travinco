'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, ShoppingCart } from 'lucide-react';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { toast } from 'sonner';
import { Navbar } from '@/components/layout/navbar';

interface BahanBaku {
  id: string;
  nama_bahan_baku: string;
  unit_dasar?: {
    nama_unit: string;
  };
}

interface Supplier {
  id: string;
  nama_supplier: string;
  kontak?: string;
}

interface Kemasan {
  id: string;
  nama_kemasan: string;
  nilai_konversi: number;
  unit_dasar?: {
    nama_unit: string;
  };
}

interface Pembelian {
  id: string;
  bahan_baku_id: string;
  supplier_id?: string;
  kemasan_id?: string;
  jumlah: number;
  harga_beli: number;
  tanggal: string;
  catatan: string;
  asal_barang: 'langsung' | 'reservasi';
  bahan_baku: {
    nama_bahan_baku: string;
    unit_dasar?: {
      nama_unit: string;
    };
  };
  suppliers?: {
    nama_supplier: string;
  };
  kemasan?: {
    nama_kemasan: string;
    nilai_konversi: number;
  };
}

export default function EditPembelianPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [bahanBakuList, setBahanBakuList] = useState<BahanBaku[]>([]);
  const [supplierList, setSupplierList] = useState<Supplier[]>([]);
  const [kemasanList, setKemasanList] = useState<Kemasan[]>([]);
  const [selectedBahan, setSelectedBahan] = useState<BahanBaku | null>(null);
  const [formData, setFormData] = useState({
    bahan_baku_id: '',
    supplier_id: '',
    kemasan_id: '',
    jumlah: 0,
    harga_beli: 0,
    tanggal: new Date().toISOString().split('T')[0],
    catatan: '',
    asal_barang: 'langsung' as 'langsung' | 'reservasi'
  });

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Anda harus login terlebih dahulu');
        router.push('/auth/login');
        return;
      }

      // Fetch pembelian data with all relations
      const { data: pembelianData, error: pembelianError } = await supabase
        .from('pembelian')
        .select(`
          *,
          bahan_baku:bahan_baku_id(
            id,
            nama_bahan_baku,
            unit_dasar:unit_dasar_id(nama_unit)
          ),
          suppliers:supplier_id(
            id,
            nama_supplier
          ),
          kemasan:kemasan_id(
            id,
            nama_kemasan,
            nilai_konversi
          )
        `)
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (pembelianError) throw pembelianError;
      if (!pembelianData) {
        toast.error('Data pembelian tidak ditemukan');
        router.push('/dashboard/pembelian');
        return;
      }

      // Fetch all required lists
      const [bahanBakuResponse, supplierResponse] = await Promise.all([
        supabase
          .from('bahan_baku')
          .select(`
            id, 
            nama_bahan_baku, 
            unit_dasar:unit_dasar_id(nama_unit)
          `)
          .eq('user_id', user.id)
          .order('nama_bahan_baku'),
        supabase
          .from('suppliers')
          .select('id, nama_supplier, kontak')
          .eq('user_id', user.id)
          .order('nama_supplier')
      ]);

      if (bahanBakuResponse.error) throw bahanBakuResponse.error;
      if (supplierResponse.error) throw supplierResponse.error;

      // Process bahan baku data to handle unit_dasar array
      const processedBahanBaku = (bahanBakuResponse.data || []).map(item => ({
        ...item,
        unit_dasar: Array.isArray(item.unit_dasar) ? item.unit_dasar[0] : item.unit_dasar
      }));
      
      setBahanBakuList(processedBahanBaku);
      setSupplierList(supplierResponse.data || []);
      
      // Set selected bahan baku
      const selectedBahan = processedBahanBaku.find(b => b.id === pembelianData.bahan_baku_id);
      setSelectedBahan(selectedBahan || null);

      // Fetch kemasan for selected bahan baku
      if (pembelianData.bahan_baku_id) {
        const { data: kemasanData, error: kemasanError } = await supabase
          .from('kemasan')
          .select(`
            id,
            nama_kemasan,
            nilai_konversi,
            unit_dasar:unit_dasar_id(nama_unit)
          `)
          .eq('user_id', user.id)
          .order('nama_kemasan');

        if (!kemasanError) {
          // Process kemasan data to handle unit_dasar array
          const processedKemasan = (kemasanData || []).map(item => ({
            ...item,
            unit_dasar: Array.isArray(item.unit_dasar) ? item.unit_dasar[0] : item.unit_dasar
          }));
          
          setKemasanList(processedKemasan);
        }
      }

      setFormData({
        bahan_baku_id: pembelianData.bahan_baku_id,
        supplier_id: pembelianData.supplier_id || '',
        kemasan_id: pembelianData.kemasan_id || '',
        jumlah: pembelianData.jumlah,
        harga_beli: pembelianData.harga_beli,
        tanggal: pembelianData.tanggal.split('T')[0],
        catatan: pembelianData.catatan || '',
        asal_barang: pembelianData.asal_barang || 'langsung'
      });
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(error.message || 'Gagal memuat data');
      router.push('/dashboard/pembelian');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const numericValue = (name === 'jumlah' || name === 'harga_beli') ? parseFloat(value) || 0 : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: numericValue
    }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.bahan_baku_id) {
      toast.error('Pilih bahan baku terlebih dahulu');
      return;
    }

    // Validasi supplier eksklusif
    if (formData.supplier_id) {
      const selectedBahanBaku = bahanBakuList.find(b => b.id === formData.bahan_baku_id);
      if (selectedBahanBaku) {
        try {
          // Ambil data bahan baku dengan supplier eksklusif
          const { data: bahanBakuData, error } = await supabase
            .from('bahan_baku')
            .select('supplier_eksklusif_id, suppliers:supplier_eksklusif_id(nama_supplier)')
            .eq('id', formData.bahan_baku_id)
            .single();

          if (error) {
            console.error('Error checking supplier eksklusif:', error);
          } else if (bahanBakuData?.supplier_eksklusif_id && bahanBakuData.supplier_eksklusif_id !== formData.supplier_id) {
            const supplierEksklusif = bahanBakuData.suppliers?.nama_supplier || 'supplier yang ditentukan';
            const supplierDipilih = supplierList.find(s => s.id === formData.supplier_id)?.nama_supplier || 'supplier yang dipilih';
            toast.error(`Pembelian bahan baku "${selectedBahanBaku.nama_bahan_baku}" hanya dapat dilakukan dari supplier eksklusif: ${supplierEksklusif}. Anda memilih: ${supplierDipilih}`);
            return;
          }
        } catch (error) {
          console.error('Error validating supplier eksklusif:', error);
          toast.error('Terjadi kesalahan saat memvalidasi supplier eksklusif');
          return;
        }
      }
    }

    if (formData.jumlah <= 0) {
      toast.error('Jumlah harus lebih dari 0');
      return;
    }

    if (formData.harga_beli <= 0) {
      toast.error('Harga beli harus lebih dari 0');
      return;
    }

    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Anda harus login terlebih dahulu');
        return;
      }

      const updateData: any = {
        bahan_baku_id: formData.bahan_baku_id,
        jumlah: formData.jumlah,
        harga_beli: formData.harga_beli,
        tanggal: new Date(formData.tanggal).toISOString(),
        catatan: formData.catatan || null,
        asal_barang: formData.asal_barang
      };

      // Tambahkan supplier_id dan kemasan_id jika ada
      if (formData.supplier_id) {
        updateData.supplier_id = formData.supplier_id;
      } else {
        updateData.supplier_id = null;
      }
      
      if (formData.kemasan_id) {
        updateData.kemasan_id = formData.kemasan_id;
      } else {
        updateData.kemasan_id = null;
      }

      const { error } = await supabase
        .from('pembelian')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Pembelian berhasil diperbarui!');
      router.push('/dashboard/pembelian');
    } catch (error: any) {
      console.error('Error updating pembelian:', error);
      toast.error(error.message || 'Gagal memperbarui pembelian');
    } finally {
      setLoading(false);
    }
  };

  const navbarActions = [
    {
      label: 'Simpan Perubahan',
      onClick: () => {
        const form = document.getElementById('pembelian-form') as HTMLFormElement;
        if (form) {
          form.requestSubmit();
        }
      },
      icon: Save,
      variant: 'default' as const
    }
  ];

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <Navbar 
          title="Edit Pembelian" 
          showBackButton={true}
        />
        <div className="p-4 md:p-6">
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



  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navbar 
        title="Edit Pembelian" 
        showBackButton={true}
        actions={navbarActions}
      />
      
      <div className="p-4 md:p-6">
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Informasi Pembelian
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form id="pembelian-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="asal_barang">Asal Barang *</Label>
                  <select
                    id="asal_barang"
                    value={formData.asal_barang}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      asal_barang: e.target.value as 'langsung' | 'reservasi',
                      supplier_id: '', // Reset supplier saat ganti asal barang
                      kemasan_id: '' // Reset kemasan saat ganti asal barang
                    }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="langsung">Pembelian Langsung</option>
                    <option value="reservasi">Dari Reservasi Stok</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bahan_baku_id">Bahan Baku *</Label>
                  <Select
                    value={formData.bahan_baku_id}
                    onValueChange={(value) => {
                      handleSelectChange('bahan_baku_id', value);
                      setFormData(prev => ({ ...prev, kemasan_id: '' })); // Reset kemasan
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih bahan baku" />
                    </SelectTrigger>
                    <SelectContent>
                      {bahanBakuList.map((bahan) => (
                        <SelectItem key={bahan.id} value={bahan.id}>
                          {bahan.nama_bahan_baku}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedBahan && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Satuan: {selectedBahan.unit_dasar?.nama_unit || 'Tidak ada'}
                    </p>
                  )}
                </div>

                {formData.asal_barang === 'reservasi' && (
                  <div className="space-y-2">
                    <Label htmlFor="supplier_id">Supplier *</Label>
                    <Select
                      value={formData.supplier_id}
                      onValueChange={(value) => handleSelectChange('supplier_id', value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {supplierList.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.nama_supplier}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {kemasanList.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="kemasan_id">Kemasan (Opsional)</Label>
                    <Select
                      value={formData.kemasan_id}
                      onValueChange={(value) => handleSelectChange('kemasan_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Gunakan satuan dasar (${selectedBahan?.unit_dasar?.nama_unit || ''})`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Gunakan satuan dasar ({selectedBahan?.unit_dasar?.nama_unit || ''})</SelectItem>
                        {kemasanList.map((kemasan) => (
                          <SelectItem key={kemasan.id} value={kemasan.id}>
                            {kemasan.nama_kemasan} (1 {kemasan.nama_kemasan} = {kemasan.nilai_konversi} {selectedBahan?.unit_dasar?.nama_unit || ''})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="tanggal">Tanggal Pembelian *</Label>
                  <Input
                    id="tanggal"
                    name="tanggal"
                    type="date"
                    value={formData.tanggal}
                    onChange={handleInputChange}
                    required
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jumlah">Jumlah *</Label>
                  <Input
                    id="jumlah"
                    name="jumlah"
                    type="number"
                    value={formData.jumlah}
                    onChange={handleInputChange}
                    placeholder="Masukkan jumlah"
                    min="1"
                    step="0.01"
                    required
                    className="w-full"
                  />
                  {formData.kemasan_id && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Satuan: {kemasanList.find(k => k.id === formData.kemasan_id)?.nama_kemasan || ''}
                    </p>
                  )}
                  {!formData.kemasan_id && selectedBahan && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Satuan: {selectedBahan.unit_dasar?.nama_unit || ''}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="harga_beli">Harga Beli *</Label>
                  <Input
                    id="harga_beli"
                    name="harga_beli"
                    type="number"
                    value={formData.harga_beli}
                    onChange={handleInputChange}
                    placeholder="Masukkan harga beli"
                    required
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="catatan">Catatan</Label>
                  <Textarea
                    id="catatan"
                    name="catatan"
                    value={formData.catatan}
                    onChange={handleInputChange}
                    placeholder="Catatan tambahan (opsional)"
                    rows={3}
                    className="w-full"
                  />
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}