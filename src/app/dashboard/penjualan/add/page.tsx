'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, ShoppingCart, Plus, Trash2 } from 'lucide-react';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { toast } from 'sonner';
import { Navbar } from '@/components/layout/navbar';
import { formatCurrency } from '@/lib/utils';

interface ProdukJadi {
  id: string;
  nama_produk_jadi: string;
  harga_jual: number;
}

interface PenjualanItem {
  id: string;
  produk_jadi_id: string;
  jumlah: number;
  harga_satuan: number;
  total_harga: number;
}

function AddPenjualanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [produkJadiList, setProdukJadiList] = useState<ProdukJadi[]>([]);
  const [items, setItems] = useState<PenjualanItem[]>([{
    id: '1',
    produk_jadi_id: '',
    jumlah: 1,
    harga_satuan: 0,
    total_harga: 0
  }]);
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    catatan: ''
  });

  useEffect(() => {
    fetchProdukJadi();
  }, []);

  const fetchProdukJadi = async () => {
    try {
      const { data, error } = await supabase
        .from('produk_jadi')
        .select('id, nama_produk_jadi, harga_jual')
        .order('nama_produk_jadi');

      if (error) throw error;
      setProdukJadiList(data || []);
    } catch (error) {
      console.error('Error fetching produk jadi:', error);
      toast.error('Gagal memuat data produk');
    }
  };

  const addItem = () => {
    const newId = (items.length + 1).toString();
    setItems(prev => [...prev, {
      id: newId,
      produk_jadi_id: '',
      jumlah: 1,
      harga_satuan: 0,
      total_harga: 0
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof PenjualanItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Update harga_satuan and total_harga when produk changes
        if (field === 'produk_jadi_id') {
          const selectedProduk = produkJadiList.find(p => p.id === value);
          if (selectedProduk) {
            updatedItem.harga_satuan = selectedProduk.harga_jual;
            updatedItem.total_harga = selectedProduk.harga_jual * updatedItem.jumlah;
          }
        }
        
        // Update total_harga when jumlah changes
        if (field === 'jumlah') {
          updatedItem.total_harga = updatedItem.harga_satuan * (value as number);
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate items
    const validItems = items.filter(item => item.produk_jadi_id && item.jumlah > 0);
    
    if (validItems.length === 0) {
      toast.error('Tambahkan minimal satu item dengan produk dan jumlah yang valid');
      return;
    }

    // Check for duplicate products
    const productIds = validItems.map(item => item.produk_jadi_id);
    const uniqueProductIds = new Set(productIds);
    if (productIds.length !== uniqueProductIds.size) {
      toast.error('Tidak boleh ada produk yang sama dalam satu transaksi');
      return;
    }

    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Anda harus login terlebih dahulu');
        return;
      }

      // Check stok for all items
      for (const item of validItems) {
        const { data: stokCheck, error: stokError } = await supabase
          .rpc('check_stok_tersedia', {
            produk_id: item.produk_jadi_id,
            jumlah_jual: item.jumlah
          });

        if (stokError) {
          console.error('Error checking stock:', stokError);
          toast.error('Gagal memeriksa stok');
          return;
        }

        if (!stokCheck) {
          const produk = produkJadiList.find(p => p.id === item.produk_jadi_id);
          toast.error(`Stok bahan baku tidak mencukupi untuk produksi ${produk?.nama_produk_jadi}`);
          return;
        }
      }

      // Calculate total harga for each item
      const penjualanData = validItems.map(item => ({
        produk_jadi_id: item.produk_jadi_id,
        jumlah: item.jumlah,
        total_harga: item.total_harga,
        tanggal: new Date(formData.tanggal).toISOString(),
        catatan: formData.catatan || null,
        user_id: user.id
      }));

      const { error } = await supabase
        .from('penjualan')
        .insert(penjualanData);

      if (error) throw error;

      toast.success(`${validItems.length} item penjualan berhasil ditambahkan!`);
      router.push('/dashboard/penjualan');
    } catch (error: any) {
      console.error('Error adding penjualan:', error);
      toast.error(error.message || 'Gagal menambahkan penjualan');
    } finally {
      setLoading(false);
    }
  };

  const navbarActions = [
    {
      label: 'Simpan Penjualan',
      onClick: () => {
        const form = document.getElementById('penjualan-form') as HTMLFormElement;
        if (form) {
          form.requestSubmit();
        }
      },
      icon: Save,
      variant: 'default' as const,
      disabled: loading
    }
  ];

  const grandTotal = items.reduce((sum, item) => sum + item.total_harga, 0);
  const validItemsCount = items.filter(item => item.produk_jadi_id && item.jumlah > 0).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar 
        title="Tambah Penjualan" 
        showBackButton={true}
        actions={navbarActions}
      />
      
      <div className="p-4 md:p-6">
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Informasi Penjualan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form id="penjualan-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Header Info */}
              <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tanggal">Tanggal Penjualan *</Label>
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
                  <Label>Ringkasan</Label>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {validItemsCount} item valid
                    </p>
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                      Total: {formatCurrency(grandTotal)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Item Penjualan</Label>
                  <Button
                    type="button"
                    onClick={addItem}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Item
                  </Button>
                </div>

                {items.map((item, index) => {
                  const selectedProduk = produkJadiList.find(p => p.id === item.produk_jadi_id);
                  
                  return (
                    <Card key={item.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-4">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            Item #{index + 1}
                          </h4>
                          {items.length > 1 && (
                            <Button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>Produk *</Label>
                            <Select
                              value={item.produk_jadi_id}
                              onValueChange={(value) => updateItem(item.id, 'produk_jadi_id', value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Pilih produk" />
                              </SelectTrigger>
                              <SelectContent>
                                {produkJadiList.map((produk) => (
                                  <SelectItem key={produk.id} value={produk.id}>
                                    {produk.nama_produk_jadi} - {formatCurrency(produk.harga_jual)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                          </div>

                          <div className="space-y-2">
                            <Label>Jumlah *</Label>
                            <Input
                              type="number"
                              value={item.jumlah}
                              onChange={(e) => updateItem(item.id, 'jumlah', parseFloat(e.target.value) || 1)}
                              placeholder="Jumlah"
                              min="1"
                              step="1"
                              className="w-full"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Total Harga</Label>
                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border">
                              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                                {formatCurrency(item.total_harga)}
                              </p>
                              {selectedProduk && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {item.jumlah} × {formatCurrency(selectedProduk.harga_jual)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
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
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AddPenjualanPage;