'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  unit: string;
}

function AddPembelianPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [bahanBakuList, setBahanBakuList] = useState<BahanBaku[]>([]);
  const [formData, setFormData] = useState({
    bahan_baku_id: '',
    jumlah: 0,
    harga_beli: 0,
    tanggal: new Date().toISOString().split('T')[0],
    catatan: ''
  });

  useEffect(() => {
    fetchBahanBaku();
  }, []);

  const fetchBahanBaku = async () => {
    try {
      const { data, error } = await supabase
        .from('bahan_baku')
        .select('id, nama_bahan_baku, unit')
        .order('nama_bahan_baku');

      if (error) throw error;
      setBahanBakuList(data || []);
    } catch (error) {
      console.error('Error fetching bahan baku:', error);
      toast.error('Gagal memuat data bahan baku');
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

      const { error } = await supabase
        .from('pembelian')
        .insert({
          bahan_baku_id: formData.bahan_baku_id,
          jumlah: formData.jumlah,
          harga_beli: formData.harga_beli,
          tanggal: new Date(formData.tanggal).toISOString(),
          catatan: formData.catatan || null,
          user_id: user.id
        });

      if (error) throw error;

      toast.success('Pembelian berhasil ditambahkan!');
      router.push('/dashboard/pembelian');
    } catch (error: any) {
      console.error('Error adding pembelian:', error);
      toast.error(error.message || 'Gagal menambahkan pembelian');
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

  const selectedBahan = bahanBakuList.find(b => b.id === formData.bahan_baku_id);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
              <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bahan_baku_id">Bahan Baku *</Label>
                  <Select
                    value={formData.bahan_baku_id}
                    onValueChange={(value) => handleSelectChange('bahan_baku_id', value)}
                    required
                  >
                    <SelectTrigger className="w-full">
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
                </div>

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
              </div>

              <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
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
                  {selectedBahan && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Satuan: {selectedBahan.unit}
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

export default AddPembelianPage;