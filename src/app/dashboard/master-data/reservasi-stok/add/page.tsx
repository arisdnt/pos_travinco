'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Navbar } from '@/components/layout/navbar';
import { ArrowLeft, Save, Package, Building2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { BahanBaku, Supplier, Kemasan, UnitDasar } from '@/types/master-data';

interface ReservasiStokSupplierFormData {
  bahan_baku_id: string;
  supplier_id: string;
  jumlah_reservasi: number;
  kemasan_id?: string;
  catatan?: string;
}

export default function AddReservasiStokPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [bahanBakus, setBahanBakus] = useState<BahanBaku[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [kemasans, setKemasans] = useState<Kemasan[]>([]);
  const [formData, setFormData] = useState<ReservasiStokSupplierFormData>({
    bahan_baku_id: '',
    supplier_id: '',
    jumlah_reservasi: 0,
    kemasan_id: '',
    catatan: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [exclusiveSupplier, setExclusiveSupplier] = useState<{ id: string; nama: string } | null>(null);

  const fetchBahanBakus = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bahan_baku')
      .select(`
        *,
        kategori (
          nama_kategori
        ),
        unit_dasar (
          id,
          nama_unit
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

  const fetchKemasans = async (unitDasarId?: string) => {
    if (!unitDasarId) {
      setKemasans([]);
      return;
    }
    
    const supabase = createClient();
    const { data, error } = await supabase
      .from('kemasan')
      .select(`
        *,
        unit_dasar (
          id,
          nama_unit
        )
      `)
      .eq('unit_dasar_id', unitDasarId)
      .order('nama_kemasan');

    if (error) {
      console.error('Error fetching kemasans:', error);
      toast.error('Gagal memuat data kemasan');
    } else {
      setKemasans(data || []);
    }
  };

  // Enforce supplier eksklusif awareness when bahan baku changes
  useEffect(() => {
    const run = async () => {
      if (!formData.bahan_baku_id) {
        setExclusiveSupplier(null);
        return;
      }
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('bahan_baku')
          .select('supplier_eksklusif_id, suppliers:supplier_eksklusif_id(nama_supplier)')
          .eq('id', formData.bahan_baku_id)
          .single();
        if (error) {
          setExclusiveSupplier(null);
          return;
        }
        if (data?.supplier_eksklusif_id) {
          const nama = (data.suppliers as any)?.nama_supplier || 'Supplier Eksklusif';
          setExclusiveSupplier({ id: data.supplier_eksklusif_id, nama });
          // Auto-select enforced supplier
          setFormData(prev => ({ ...prev, supplier_id: data.supplier_eksklusif_id }));
        } else {
          setExclusiveSupplier(null);
        }
      } catch {
        setExclusiveSupplier(null);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.bahan_baku_id]);

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
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Anda harus login untuk menambah reservasi stok');
        return;
      }

      // Hitung jumlah dalam satuan dasar
      let jumlahDalamSatuanDasar = formData.jumlah_reservasi;
      
      if (formData.kemasan_id) {
        const selectedKemasan = kemasans.find(k => k.id === formData.kemasan_id);
        if (selectedKemasan) {
          jumlahDalamSatuanDasar = formData.jumlah_reservasi * selectedKemasan.nilai_konversi;
        }
      }

      // Client-side guard for supplier eksklusif
      if (exclusiveSupplier && formData.supplier_id !== exclusiveSupplier.id) {
        toast.error(`Bahan baku eksklusif. Pilih supplier: ${exclusiveSupplier.nama}.`);
        return;
      }

      const { error } = await supabase
        .from('reservasi_stok_supplier')
        .insert({
          bahan_baku_id: formData.bahan_baku_id,
          supplier_id: formData.supplier_id,
          jumlah_reservasi: jumlahDalamSatuanDasar, // Simpan dalam satuan dasar
          kemasan_id: formData.kemasan_id || null, // PENTING: Simpan kemasan_id untuk tracking
          catatan: formData.catatan,
          user_id: user.id
        });

      if (error) {
        console.error('Error creating reservasi stok:', error);
        const msg = (error?.message || '').toLowerCase();
        if (msg.includes('supplier eksklusif')) {
          toast.error(`Reservasi ditolak: bahan baku ini eksklusif untuk ${exclusiveSupplier?.nama || 'supplier tertentu'}.`);
        } else {
          toast.error('Gagal menambah reservasi stok');
        }
        return;
      }

      toast.success('Reservasi stok berhasil ditambahkan');
      router.push('/dashboard/master-data/reservasi-stok');
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast.error('Terjadi kesalahan saat menyimpan data');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/master-data/reservasi-stok');
  };

  const selectedBahanBaku = bahanBakus.find(bb => bb.id === formData.bahan_baku_id);
  const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id);
  const selectedKemasan = kemasans.find(k => k.id === formData.kemasan_id);
  
  // Hitung jumlah dalam satuan dasar untuk preview
  const jumlahDalamSatuanDasar = selectedKemasan 
    ? formData.jumlah_reservasi * selectedKemasan.nilai_konversi 
    : formData.jumlah_reservasi;

  useEffect(() => {
    fetchBahanBakus();
    fetchSuppliers();
  }, []);
  
  // Load kemasan ketika bahan baku dipilih
  useEffect(() => {
    if (selectedBahanBaku?.unit_dasar_id) {
      fetchKemasans(selectedBahanBaku.unit_dasar_id);
      // Reset kemasan selection ketika bahan baku berubah
      setFormData(prev => ({ ...prev, kemasan_id: '' }));
    } else {
      setKemasans([]);
      setFormData(prev => ({ ...prev, kemasan_id: '' }));
    }
  }, [formData.bahan_baku_id, selectedBahanBaku?.unit_dasar_id]);

  return (
    <div className="flex h-full flex-col">
      <Navbar
        title="Tambah Reservasi Stok"
        actions={[
          {
            label: 'Kembali',
            onClick: handleCancel,
            icon: ArrowLeft,
            variant: 'outline'
          }
        ]}
      />
      
      <div className="flex-1 p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <Card className="shadow-sm border bg-white dark:bg-gray-900">
            <CardContent className="p-3">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Form Reservasi Stok
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Isi informasi reservasi stok supplier
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="bahan_baku_id">Bahan Baku *</Label>
                  <Select
                    value={formData.bahan_baku_id}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, bahan_baku_id: value }));
                      if (errors.bahan_baku_id) {
                        setErrors(prev => {
                          const { bahan_baku_id: _, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                  >
                    <SelectTrigger className={errors.bahan_baku_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Pilih bahan baku" />
                    </SelectTrigger>
                    <SelectContent>
                      {bahanBakus.map((bahanBaku) => (
                        <SelectItem key={bahanBaku.id} value={bahanBaku.id}>
                          <div>
                            <div className="font-medium">{bahanBaku.nama_bahan_baku}</div>
                            <div className="text-sm text-gray-500">
                              {bahanBaku.kategori?.nama_kategori || 'Tanpa kategori'} • Stok: {bahanBaku.stok} {bahanBaku.unit_dasar?.nama_unit || 'unit'}
                            </div>
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
                  <Label htmlFor="supplier_id">Supplier *</Label>
                  <Select
                    value={formData.supplier_id}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, supplier_id: value }));
                      if (errors.supplier_id) {
                        setErrors(prev => {
                          const { supplier_id: _, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                  >
                    <SelectTrigger className={errors.supplier_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Pilih supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {(exclusiveSupplier
                        ? suppliers.filter(s => s.id === exclusiveSupplier.id)
                        : suppliers
                      ).map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          <div>
                            <div className="font-medium">{supplier.nama_supplier}</div>
                            <div className="text-sm text-gray-500">
                              {supplier.kontak || 'Kontak tidak tersedia'}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {exclusiveSupplier ? (
                    <p className={`text-sm ${formData.supplier_id === exclusiveSupplier.id ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formData.supplier_id === exclusiveSupplier.id
                        ? `✓ Sesuai: bahan baku eksklusif untuk ${exclusiveSupplier.nama}`
                        : `⚠️ Bahan baku eksklusif untuk ${exclusiveSupplier.nama}. Pilih supplier tersebut.`}
                    </p>
                  ) : null}
                  {errors.supplier_id && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.supplier_id}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kemasan_id">Kemasan</Label>
                  <Select
                    value={formData.kemasan_id || 'satuan_dasar'}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, kemasan_id: value === 'satuan_dasar' ? undefined : value }));
                    }}
                    disabled={!selectedBahanBaku?.unit_dasar_id || kemasans.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedBahanBaku?.unit_dasar_id ? (kemasans.length > 0 ? "Pilih kemasan (opsional)" : "Tidak ada kemasan tersedia") : "Pilih bahan baku terlebih dahulu"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="satuan_dasar">
                        <div>
                          <div className="font-medium">Satuan Dasar</div>
                          <div className="text-sm text-gray-500">
                            {selectedBahanBaku?.unit_dasar?.nama_unit || 'Unit dasar'} (1:1)
                          </div>
                        </div>
                      </SelectItem>
                      {kemasans.map((kemasan) => (
                        <SelectItem key={kemasan.id} value={kemasan.id}>
                          <div>
                            <div className="font-medium">{kemasan.nama_kemasan}</div>
                            <div className="text-sm text-gray-500">
                              1 {kemasan.nama_kemasan} = {kemasan.nilai_konversi} {kemasan.unit_dasar?.nama_unit}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Pilih kemasan untuk konversi otomatis ke satuan dasar
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jumlah_reservasi">
                    Jumlah Reservasi * 
                    {selectedKemasan ? (
                      <span className="text-sm font-normal text-gray-500">
                        (dalam {selectedKemasan.nama_kemasan})
                      </span>
                    ) : (
                      <span className="text-sm font-normal text-gray-500">
                        (dalam {selectedBahanBaku?.unit_dasar?.nama_unit || 'satuan dasar'})
                      </span>
                    )}
                  </Label>
                  <Input
                    id="jumlah_reservasi"
                    type="number"
                    min="1"
                    step="0.01"
                    value={formData.jumlah_reservasi || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setFormData(prev => ({ ...prev, jumlah_reservasi: value }));
                      if (errors.jumlah_reservasi) {
                        setErrors(prev => {
                          const { jumlah_reservasi: _, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                    className={errors.jumlah_reservasi ? 'border-red-500' : ''}
                    placeholder={`Masukkan jumlah dalam ${selectedKemasan?.nama_kemasan || selectedBahanBaku?.unit_dasar?.nama_unit || 'satuan dasar'}`}
                  />
                  {selectedKemasan && formData.jumlah_reservasi > 0 && (
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      = {jumlahDalamSatuanDasar.toLocaleString('id-ID')} {selectedBahanBaku?.unit_dasar?.nama_unit} (satuan dasar)
                    </div>
                  )}
                  {errors.jumlah_reservasi && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.jumlah_reservasi}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="catatan">Catatan</Label>
                  <Textarea
                    id="catatan"
                    value={formData.catatan || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, catatan: e.target.value }))}
                    placeholder="Catatan tambahan (opsional)"
                    rows={3}
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {(formData.catatan || '').length}/500 karakter
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {loading ? 'Menyimpan...' : 'Simpan Reservasi'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Batal
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Information Section */}
          <div className="space-y-6">
            <Card className="shadow-sm border bg-white dark:bg-gray-900">
              <CardContent className="p-3">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Tips Reservasi Stok</h3>
                </div>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <p>• Pastikan bahan baku dan supplier sudah terdaftar dalam sistem</p>
                  <p>• Pilih kemasan yang sesuai untuk konversi otomatis ke satuan dasar</p>
                  <p>• Jumlah reservasi akan disimpan dalam satuan dasar untuk konsistensi stok</p>
                  <p>• Gunakan catatan untuk informasi tambahan seperti spesifikasi khusus</p>
                  <p>• Reservasi akan tercatat dengan tanggal pembuatan otomatis</p>
                </div>
              </CardContent>
            </Card>

            {(selectedBahanBaku || selectedSupplier) && (
              <Card className="shadow-sm border bg-white dark:bg-gray-900">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Pratinjau Reservasi</h3>
                  </div>
                  <div className="space-y-4">
                    {selectedBahanBaku && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Bahan Baku</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>{selectedBahanBaku.nama_bahan_baku}</strong><br />
                          Kategori: {selectedBahanBaku.kategori?.nama_kategori || 'Tanpa kategori'}<br />
                          Stok Tersedia: {selectedBahanBaku.stok.toLocaleString('id-ID')} {selectedBahanBaku.unit_dasar?.nama_unit || 'unit'}<br />
                          Unit Dasar: {selectedBahanBaku.unit_dasar?.nama_unit || 'Tidak tersedia'}
                        </p>
                      </div>
                    )}
                    {selectedSupplier && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Supplier</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>{selectedSupplier.nama_supplier}</strong><br />
                          Kontak: {selectedSupplier.kontak || 'Tidak tersedia'}<br />
                          Alamat: {selectedSupplier.alamat || 'Tidak tersedia'}
                        </p>
                      </div>
                    )}
                    {formData.jumlah_reservasi > 0 && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Jumlah Reservasi</h4>
                        <div className="space-y-2">
                          <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                            {formData.jumlah_reservasi.toLocaleString('id-ID')} {selectedKemasan?.nama_kemasan || selectedBahanBaku?.unit_dasar?.nama_unit || 'unit'}
                          </p>
                          {selectedKemasan && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex items-center gap-2">
                                <span>Kemasan:</span>
                                <span className="font-medium">{selectedKemasan.nama_kemasan}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span>Konversi:</span>
                                <span className="font-medium">
                                  1 {selectedKemasan.nama_kemasan} = {selectedKemasan.nilai_konversi} {selectedBahanBaku?.unit_dasar?.nama_unit}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 pt-1 border-t border-gray-200 dark:border-gray-600">
                                <span>Total dalam satuan dasar:</span>
                                <span className="font-semibold text-green-600 dark:text-green-400">
                                  {jumlahDalamSatuanDasar.toLocaleString('id-ID')} {selectedBahanBaku?.unit_dasar?.nama_unit}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
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
