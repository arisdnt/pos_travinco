'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BahanBakuSearchInput } from '@/components/ui/bahan-baku-search-input';
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

interface ReservasiStok {
  id: string;
  jumlah_reservasi: number;
  kemasan_id?: string;
  bahan_baku: BahanBaku;
  suppliers: Supplier;
  kemasan?: {
    id: string;
    nama_kemasan: string;
    nilai_konversi: number;
  };
}

function AddPembelianPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [bahanBakuList, setBahanBakuList] = useState<BahanBaku[]>([]);
  const [supplierList, setSupplierList] = useState<Supplier[]>([]);
  const [kemasanList, setKemasanList] = useState<Kemasan[]>([]);
  const [reservasiList, setReservasiList] = useState<ReservasiStok[]>([]);
  const [selectedBahan, setSelectedBahan] = useState<BahanBaku | null>(null);
  const [exclusiveSupplier, setExclusiveSupplier] = useState<{ id: string; nama: string } | null>(null);
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
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (formData.asal_barang === 'reservasi') {
      fetchReservasiStok();
    }
  }, [formData.asal_barang]);

  useEffect(() => {
    if (formData.bahan_baku_id) {
      fetchKemasan(formData.bahan_baku_id);
      const selected = bahanBakuList.find(b => b.id === formData.bahan_baku_id);
      setSelectedBahan(selected || null);
      // Fetch supplier eksklusif info for awareness
      (async () => {
        try {
          const { data } = await supabase
            .from('bahan_baku')
            .select('supplier_eksklusif_id, suppliers:supplier_eksklusif_id(nama_supplier)')
            .eq('id', formData.bahan_baku_id)
            .single();
          if (data?.supplier_eksklusif_id) {
            setExclusiveSupplier({ id: data.supplier_eksklusif_id, nama: (data.suppliers as any)?.nama_supplier || 'Supplier Eksklusif' });
          } else {
            setExclusiveSupplier(null);
          }
        } catch {
          setExclusiveSupplier(null);
        }
      })();
    } else {
      setSelectedBahan(null);
      setKemasanList([]);
      setExclusiveSupplier(null);
    }
  }, [formData.bahan_baku_id, bahanBakuList]);

  // Reset bahan baku ketika supplier berubah (untuk mode reservasi)
  useEffect(() => {
    if (formData.asal_barang === 'reservasi' && formData.supplier_id) {
      setFormData(prev => ({
        ...prev,
        bahan_baku_id: '',
        kemasan_id: '',
        jumlah: 0,
        harga_beli: 0
      }));
    }
  }, [formData.supplier_id, formData.asal_barang]);

  // Reset kemasan ketika bahan baku berubah (untuk mode reservasi)
  useEffect(() => {
    if (formData.asal_barang === 'reservasi' && formData.bahan_baku_id) {
      setFormData(prev => ({
        ...prev,
        kemasan_id: '',
        jumlah: 0,
        harga_beli: 0
      }));
    }
  }, [formData.bahan_baku_id, formData.asal_barang]);

  // Filter bahan baku berdasarkan supplier yang dipilih (untuk mode reservasi)
  const getFilteredBahanBaku = () => {
    if (formData.asal_barang === 'reservasi' && formData.supplier_id) {
      // Filter bahan baku berdasarkan yang tersedia di reservasi supplier
      const availableBahanBaku = reservasiList
        .filter(r => r.suppliers.id === formData.supplier_id && r.jumlah_reservasi > 0)
        .map(r => r.bahan_baku);
      
      // Remove duplicates berdasarkan id
      const uniqueBahanBaku = availableBahanBaku.filter((bahan, index, self) => 
        index === self.findIndex(b => b.id === bahan.id)
      );
      
      return uniqueBahanBaku;
    }
    return bahanBakuList;
  };

  // Fungsi untuk mendapatkan kemasan yang tersedia berdasarkan reservasi
  const getFilteredKemasan = () => {
    if (formData.asal_barang === 'reservasi' && formData.supplier_id && formData.bahan_baku_id) {
      // Ambil semua reservasi untuk kombinasi supplier dan bahan baku ini
      const reservasiTersedia = reservasiList.filter(r => 
        r.suppliers.id === formData.supplier_id && 
        r.bahan_baku.id === formData.bahan_baku_id &&
        r.jumlah_reservasi > 0
      );
      
      // Jika ada reservasi dengan kemasan spesifik, hanya tampilkan kemasan tersebut
      const kemasanReservasi = reservasiTersedia
        .filter(r => r.kemasan_id)
        .map(r => r.kemasan)
        .filter(k => k !== null && k !== undefined);
      
      // Jika ada reservasi tanpa kemasan (satuan dasar), tambahkan opsi "tanpa kemasan"
      const adaReservasiSatuanDasar = reservasiTersedia.some(r => !r.kemasan_id);
      
      if (kemasanReservasi.length > 0) {
        // Remove duplicates berdasarkan id
        const uniqueKemasan = kemasanReservasi.filter((kemasan, index, self) => 
          index === self.findIndex(k => k?.id === kemasan?.id)
        );
        return uniqueKemasan.filter(k => k !== null);
      } else if (adaReservasiSatuanDasar) {
        // Jika hanya ada reservasi satuan dasar, return empty array (tidak ada kemasan)
        return [];
      }
    }
    return kemasanList;
  };

  const fetchInitialData = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const [bahanBakuResponse, supplierResponse] = await Promise.all([
        supabase
          .from('bahan_baku')
          .select(`
            id, 
            nama_bahan_baku, 
            unit_dasar:unit_dasar_id!inner(nama_unit)
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
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Gagal memuat data');
    }
  };

  const fetchReservasiStok = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('reservasi_stok_supplier')
        .select(`
          id,
          jumlah_reservasi,
          kemasan_id,
          bahan_baku:bahan_baku_id(
            id,
            nama_bahan_baku,
            unit_dasar:unit_dasar_id(nama_unit)
          ),
          suppliers:supplier_id(
            id,
            nama_supplier,
            kontak
          ),
          kemasan:kemasan_id(
            id,
            nama_kemasan,
            nilai_konversi
          )
        `)
        .eq('user_id', user.id)
        .gt('jumlah_reservasi', 0)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Process reservasi data to handle array relations
      const processedReservasi = (data || []).map(item => ({
        ...item,
        bahan_baku: Array.isArray(item.bahan_baku) ? {
          ...item.bahan_baku[0],
          unit_dasar: Array.isArray(item.bahan_baku[0]?.unit_dasar) ? item.bahan_baku[0].unit_dasar[0] : item.bahan_baku[0]?.unit_dasar
        } : item.bahan_baku,
        suppliers: Array.isArray(item.suppliers) ? item.suppliers[0] : item.suppliers,
        kemasan: Array.isArray(item.kemasan) ? item.kemasan[0] : item.kemasan
      }));
      
      setReservasiList(processedReservasi);
      
      // Update supplier list dengan supplier yang memiliki reservasi
      const uniqueSuppliers = processedReservasi?.reduce((acc: Supplier[], curr) => {
        const existingSupplier = acc.find(s => s.id === curr.suppliers.id);
        if (!existingSupplier) {
          acc.push(curr.suppliers);
        }
        return acc;
      }, []) || [];
      
      if (formData.asal_barang === 'reservasi') {
        setSupplierList(uniqueSuppliers);
      }
    } catch (error) {
      console.error('Error fetching reservasi stok:', error);
      toast.error('Gagal memuat data reservasi stok');
    }
  };

  const fetchKemasan = async (bahanBakuId: string) => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      // Get unit_dasar_id from selected bahan baku
      const selected = bahanBakuList.find(b => b.id === bahanBakuId);
      if (!selected?.unit_dasar) return;

      const { data, error } = await supabase
        .from('kemasan')
        .select(`
          id,
          nama_kemasan,
          nilai_konversi,
          unit_dasar:unit_dasar_id(nama_unit)
        `)
        .eq('user_id', user.id)
        .order('nama_kemasan');

      if (error) throw error;
      
      // Process kemasan data to handle unit_dasar array
      const processedKemasan = (data || []).map(item => ({
        ...item,
        unit_dasar: Array.isArray(item.unit_dasar) ? item.unit_dasar[0] : item.unit_dasar
      }));
      
      setKemasanList(processedKemasan);
    } catch (error) {
      console.error('Error fetching kemasan:', error);
      toast.error('Gagal memuat data kemasan');
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

    if (formData.asal_barang === 'reservasi' && !formData.supplier_id) {
      toast.error('Pilih supplier untuk pembelian dari reservasi');
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
            const supplierEksklusif = (bahanBakuData.suppliers as any)?.nama_supplier || 'supplier yang ditentukan';
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

    // Validasi stok reservasi jika pembelian dari reservasi
    if (formData.asal_barang === 'reservasi') {
      // Cari reservasi yang sesuai dengan bahan baku, supplier, dan kemasan
      const reservasi = reservasiList.find(r => 
        r.bahan_baku.id === formData.bahan_baku_id && 
        r.suppliers.id === formData.supplier_id &&
        r.kemasan_id === formData.kemasan_id // Kemasan harus sama dengan yang direservasi
      );
      
      if (!reservasi) {
        // Cek apakah ada reservasi dengan kemasan berbeda
        const reservasiLain = reservasiList.find(r => 
          r.bahan_baku.id === formData.bahan_baku_id && 
          r.suppliers.id === formData.supplier_id
        );
        
        if (reservasiLain) {
          const kemasanReservasi = reservasiLain.kemasan?.nama_kemasan || 'satuan dasar';
          const kemasanDipilih = formData.kemasan_id 
            ? kemasanList.find(k => k.id === formData.kemasan_id)?.nama_kemasan || 'tidak diketahui'
            : 'satuan dasar';
          toast.error(`Kemasan tidak sesuai dengan reservasi. Reservasi menggunakan kemasan: ${kemasanReservasi}, Anda memilih: ${kemasanDipilih}`);
        } else {
          toast.error('Tidak ada stok reservasi untuk kombinasi bahan baku dan supplier ini');
        }
        return;
      }
      
      // Validasi jumlah - untuk reservasi dengan kemasan spesifik, validasi langsung tanpa konversi
      // karena jumlah_reservasi sudah disimpan dalam satuan dasar
      let jumlahDalamSatuanDasar = formData.jumlah;
      if (formData.kemasan_id && reservasi.kemasan) {
        jumlahDalamSatuanDasar = formData.jumlah * reservasi.kemasan.nilai_konversi;
      }
      
      if (jumlahDalamSatuanDasar > reservasi.jumlah_reservasi) {
        const satuanTampil = reservasi.kemasan?.nama_kemasan || reservasi.bahan_baku.unit_dasar?.nama_unit || '';
        const jumlahTersedia = reservasi.kemasan 
          ? (reservasi.jumlah_reservasi / reservasi.kemasan.nilai_konversi).toFixed(2)
          : reservasi.jumlah_reservasi.toString();
        toast.error(`Stok reservasi tidak mencukupi. Tersedia: ${jumlahTersedia} ${satuanTampil}`);
        return;
      }
    }

    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Anda harus login terlebih dahulu');
        return;
      }

      const insertData: any = {
        bahan_baku_id: formData.bahan_baku_id,
        jumlah: formData.jumlah,
        harga_beli: formData.harga_beli,
        tanggal: new Date(formData.tanggal).toISOString(),
        catatan: formData.catatan || null,
        user_id: user.id,
        asal_barang: formData.asal_barang
      };

      // Tambahkan supplier_id dan kemasan_id jika ada
      if (formData.supplier_id) {
        insertData.supplier_id = formData.supplier_id;
      }
      if (formData.kemasan_id) {
        insertData.kemasan_id = formData.kemasan_id;
      }

      const { error } = await supabase
        .from('pembelian')
        .insert(insertData);


      if (error) throw error;

      toast.success('Pembelian berhasil ditambahkan!');
      router.push('/dashboard/pembelian');
    } catch (error: any) {
      console.error('Error adding pembelian:', error);
      const msg = (error?.message || '').toLowerCase();
      if (msg.includes('supplier eksklusif')) {
        const info = exclusiveSupplier?.nama ? ` Hanya dari: ${exclusiveSupplier.nama}.` : '';
        toast.error(`Transaksi dibatalkan: bahan baku ini memiliki supplier eksklusif.${info} Pilih supplier yang sesuai.`);
      } else if (msg.includes('kemasan tidak sesuai')) {
        toast.error('Transaksi dibatalkan: kemasan pembelian tidak sesuai dengan kemasan pada reservasi.');
      } else {
        toast.error(error.message || 'Gagal menambahkan pembelian');
      }
    } finally {
      setLoading(false);
    }
  };

  const navbarActions = [
    {
      label: 'Simpan Pembelian',
      onClick: () => {
        const form = document.getElementById('pembelian-form') as HTMLFormElement;
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
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navbar 
        title="Tambah Pembelian" 
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
              {/* Header Section - Full Width */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="asal_barang">Asal Barang *</Label>
                  <select
                    id="asal_barang"
                    value={formData.asal_barang}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      asal_barang: e.target.value as 'langsung' | 'reservasi',
                      supplier_id: '', // Reset supplier saat ganti asal barang
                      bahan_baku_id: '', // Reset bahan baku saat ganti asal barang
                      kemasan_id: '' // Reset kemasan saat ganti asal barang
                    }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="langsung">Pembelian Langsung</option>
                    <option value="reservasi">Dari Reservasi Stok</option>
                  </select>
                </div>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Item Selection */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                    Pilih Item
                  </h3>
                  {exclusiveSupplier && (
                    <div className={`p-3 rounded-md border ${formData.asal_barang === 'reservasi' && formData.supplier_id && formData.supplier_id !== exclusiveSupplier.id ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                      <p className={`text-sm ${formData.asal_barang === 'reservasi' && formData.supplier_id && formData.supplier_id !== exclusiveSupplier.id ? 'text-red-700' : 'text-amber-700'}`}>
                        {formData.asal_barang === 'reservasi' && formData.supplier_id
                          ? (formData.supplier_id === exclusiveSupplier.id
                              ? `✓ Supplier sesuai aturan eksklusif: ${exclusiveSupplier.nama}`
                              : `Bahan ini memiliki supplier eksklusif: ${exclusiveSupplier.nama}. Pilih supplier tersebut agar pembelian dapat diproses.`)
                          : `Bahan ini memiliki supplier eksklusif: ${exclusiveSupplier.nama}.`}
                      </p>
                    </div>
                  )}
                  
                  {formData.asal_barang === 'reservasi' && (
                    <div className="space-y-2">
                      <Label htmlFor="supplier_id">Supplier *</Label>
                      <select
                        id="supplier_id"
                        value={formData.supplier_id}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          supplier_id: e.target.value,
                          bahan_baku_id: '', // Reset bahan baku saat ganti supplier
                          kemasan_id: '' // Reset kemasan saat ganti supplier
                        }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      >
                        <option value="">Pilih Supplier</option>
                        {supplierList.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.nama_supplier}
                          </option>
                        ))}
                      </select>
                      {formData.supplier_id && !exclusiveSupplier && (
                        <p className="text-sm text-green-600 dark:text-green-400">
                          ✓ Supplier dipilih. Silakan pilih bahan baku yang tersedia.
                        </p>
                      )}
                      {formData.supplier_id && exclusiveSupplier && (
                        <p className={`text-sm ${formData.supplier_id === exclusiveSupplier.id ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formData.supplier_id === exclusiveSupplier.id
                            ? '✓ Supplier sesuai dengan aturan eksklusif'
                            : '⚠️ Supplier tidak sesuai aturan eksklusif untuk bahan yang dipilih'}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="bahan_baku_id">Bahan Baku *</Label>
                    {formData.asal_barang === 'reservasi' && !formData.supplier_id ? (
                      <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500">
                        Pilih supplier terlebih dahulu
                      </div>
                    ) : (
                      <BahanBakuSearchInput
                        bahanBakuList={getFilteredBahanBaku()}
                        value={formData.bahan_baku_id}
                        onSelect={(value) => setFormData(prev => ({ 
                          ...prev, 
                          bahan_baku_id: value,
                          kemasan_id: '' // Reset kemasan saat ganti bahan baku
                        }))}
                        placeholder={formData.asal_barang === 'reservasi' ? "Pilih dari bahan baku yang tersedia..." : "Cari bahan baku..."}
                        className="w-full"
                      />
                    )}
                    {selectedBahan && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Satuan: {selectedBahan.unit_dasar?.nama_unit || 'Tidak ada'}
                      </p>
                    )}
                  </div>

                  {formData.asal_barang === 'reservasi' && formData.supplier_id && formData.bahan_baku_id && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Stok Reservasi Tersedia:</p>
                      {reservasiList
                        .filter(r => r.bahan_baku.id === formData.bahan_baku_id && r.suppliers.id === formData.supplier_id)
                        .map((reservasi) => {
                          const satuanTampil = reservasi.kemasan?.nama_kemasan || reservasi.bahan_baku.unit_dasar?.nama_unit || 'unit';
                          const jumlahTampil = reservasi.kemasan 
                            ? (reservasi.jumlah_reservasi / reservasi.kemasan.nilai_konversi).toFixed(2)
                            : reservasi.jumlah_reservasi.toString();
                          
                          return (
                            <div key={reservasi.id} className="text-sm text-blue-700 dark:text-blue-300 mb-1">
                              📦 {jumlahTampil} {satuanTampil}
                              {reservasi.kemasan && (
                                <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">
                                  (= {reservasi.jumlah_reservasi} {reservasi.bahan_baku.unit_dasar?.nama_unit || 'unit dasar'})
                                </span>
                              )}
                            </div>
                          );
                        })
                      }
                    </div>
                  )}

                  {(formData.asal_barang === 'langsung' ? kemasanList.length > 0 : getFilteredKemasan().length > 0 || (formData.asal_barang === 'reservasi' && formData.supplier_id && formData.bahan_baku_id)) && (
                    <div className="space-y-2">
                      <Label htmlFor="kemasan_id">
                        Kemasan {formData.asal_barang === 'reservasi' ? '(Harus sesuai reservasi)' : '(Opsional)'}
                      </Label>
                      <select
                        id="kemasan_id"
                        value={formData.kemasan_id}
                        onChange={(e) => handleSelectChange('kemasan_id', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={formData.asal_barang === 'reservasi' && (!formData.supplier_id || !formData.bahan_baku_id)}
                      >
                        <option value="">
                          {formData.asal_barang === 'reservasi' 
                            ? 'Pilih sesuai reservasi' 
                            : `Gunakan satuan dasar (${selectedBahan?.unit_dasar?.nama_unit || ''})`
                          }
                        </option>
                        {(formData.asal_barang === 'langsung' ? kemasanList : getFilteredKemasan()).map((kemasan) => (
                          <option key={kemasan.id} value={kemasan.id}>
                            {kemasan.nama_kemasan} (1 {kemasan.nama_kemasan} = {kemasan.nilai_konversi} {selectedBahan?.unit_dasar?.nama_unit || ''})
                          </option>
                        ))}
                        {formData.asal_barang === 'reservasi' && formData.supplier_id && formData.bahan_baku_id && (
                          reservasiList.some(r => 
                            r.suppliers.id === formData.supplier_id && 
                            r.bahan_baku.id === formData.bahan_baku_id && 
                            !r.kemasan_id &&
                            r.jumlah_reservasi > 0
                          ) && (
                            <option value="">Satuan Dasar ({selectedBahan?.unit_dasar?.nama_unit || 'unit'})</option>
                          )
                        )}
                      </select>
                      {formData.asal_barang === 'reservasi' && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          ⚠️ Kemasan harus sama dengan yang direservasi
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column - Purchase Details */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                    Detail Pembelian
                  </h3>
                  
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
                      min="0"
                      step="0.01"
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
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AddPembelianPage;
