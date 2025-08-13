import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client untuk browser
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Client untuk server-side
export const createServerClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey)
}

// Database types
export type Database = {
  public: {
    Tables: {
      bahan_baku: {
        Row: {
          id: string
          nama_bahan_baku: string
          stok: number
          kategori_id?: string
          unit_dasar_id?: string
          supplier_eksklusif_id?: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          nama_bahan_baku: string
          stok?: number
          kategori_id?: string
          unit_dasar_id?: string
          supplier_eksklusif_id?: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          nama_bahan_baku?: string
          stok?: number
          kategori_id?: string
          unit_dasar_id?: string
          supplier_eksklusif_id?: string
          user_id?: string
          created_at?: string
        }
      }
      produk_jadi: {
        Row: {
          id: string
          nama_produk_jadi: string
          sku: string
          harga_jual: number
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          nama_produk_jadi: string
          sku: string
          harga_jual?: number
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          nama_produk_jadi?: string
          sku?: string
          harga_jual?: number
          user_id?: string
          created_at?: string
        }
      }
      resep: {
        Row: {
          id: string
          produk_jadi_id: string
          bahan_baku_id: string
          jumlah_dibutuhkan: number
          user_id: string
        }
        Insert: {
          id?: string
          produk_jadi_id: string
          bahan_baku_id: string
          jumlah_dibutuhkan: number
          user_id: string
        }
        Update: {
          id?: string
          produk_jadi_id?: string
          bahan_baku_id?: string
          jumlah_dibutuhkan?: number
          user_id?: string
        }
      }
      pembelian: {
        Row: {
          id: string
          bahan_baku_id: string
          jumlah: number
          harga_beli: number
          tanggal: string
          catatan: string | null
          user_id: string
        }
        Insert: {
          id?: string
          bahan_baku_id: string
          jumlah: number
          harga_beli?: number
          tanggal?: string
          catatan?: string | null
          user_id: string
        }
        Update: {
          id?: string
          bahan_baku_id?: string
          jumlah?: number
          harga_beli?: number
          tanggal?: string
          catatan?: string | null
          user_id?: string
        }
      }
      penjualan: {
        Row: {
          id: string
          produk_jadi_id: string
          jumlah: number
          total_harga: number
          tanggal: string
          catatan: string | null
          user_id: string
        }
        Insert: {
          id?: string
          produk_jadi_id: string
          jumlah: number
          total_harga?: number
          tanggal?: string
          catatan?: string | null
          user_id: string
        }
        Update: {
          id?: string
          produk_jadi_id?: string
          jumlah?: number
          total_harga?: number
          tanggal?: string
          catatan?: string | null
          user_id?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          nama_supplier: string
          kontak?: string
          alamat?: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          nama_supplier: string
          kontak?: string
          alamat?: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          nama_supplier?: string
          kontak?: string
          alamat?: string
          user_id?: string
          created_at?: string
        }
      }
      kategori: {
        Row: {
          id: string
          nama_kategori: string
          deskripsi?: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          nama_kategori: string
          deskripsi?: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          nama_kategori?: string
          deskripsi?: string
          user_id?: string
          created_at?: string
        }
      }
      unit_dasar: {
        Row: {
          id: string
          nama_unit: string
          deskripsi?: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          nama_unit: string
          deskripsi?: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          nama_unit?: string
          deskripsi?: string
          user_id?: string
          created_at?: string
        }
      }
    }
    Functions: {
      check_stok_tersedia: {
        Args: {
          produk_id: string
          jumlah_jual: number
        }
        Returns: boolean
      }
      hitung_max_produksi: {
        Args: {
          produk_id: string
        }
        Returns: number
      }
    }
    Views: {
      laporan_pemakaian_bahan_baku: {
        Row: {
          nama_bahan_baku: string
          nama_unit: string
          total_terpakai: number
          periode: string
          user_id: string
        }
      }
      laporan_penjualan: {
        Row: {
          nama_produk_jadi: string
          sku: string
          total_terjual: number
          total_pendapatan: number
          periode: string
          user_id: string
        }
      }
    }
  }
}

// Helper functions for database operations
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const getBahanBaku = async () => {
  const { data, error } = await supabase
    .from('bahan_baku')
    .select(`
      *,
      kategori:kategori_id(nama_kategori),
      unit_dasar:unit_dasar_id(nama_unit),
      supplier_eksklusif:supplier_eksklusif_id(nama_supplier)
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const getProdukJadi = async () => {
  const { data, error } = await supabase
    .from('produk_jadi')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const getResep = async () => {
  const { data, error } = await supabase
    .from('resep')
    .select(`
      *,
      produk_jadi:produk_jadi_id(*),
      bahan_baku:bahan_baku_id(*)
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const getPembelian = async () => {
  const { data, error } = await supabase
    .from('pembelian')
    .select(`
      *,
      bahan_baku:bahan_baku_id(*)
    `)
    .order('tanggal', { ascending: false })
  
  if (error) throw error
  return data
}

export const getPenjualan = async () => {
  const { data, error } = await supabase
    .from('penjualan')
    .select(`
      *,
      produk_jadi:produk_jadi_id(*)
    `)
    .order('tanggal', { ascending: false })
  
  if (error) throw error
  return data
}

export const getLaporanPenjualan = async () => {
  const { data, error } = await supabase
    .from('laporan_penjualan')
    .select('*')
    .order('periode', { ascending: false })
  
  if (error) throw error
  return data
}

export const getLaporanPemakaianBahan = async () => {
  const { data, error } = await supabase
    .from('laporan_pemakaian_bahan_baku')
    .select('*')
    .order('periode', { ascending: false })
  
  if (error) throw error
  return data
}

// Bulk insert functions
export const insertBulkPenjualan = async (penjualanData: Database['public']['Tables']['penjualan']['Insert'][]) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')
  
  const dataWithUserId = penjualanData.map(item => ({
    ...item,
    user_id: user.id,
    tanggal: item.tanggal || new Date().toISOString()
  }))
  
  const { data, error } = await supabase
    .from('penjualan')
    .insert(dataWithUserId)
    .select()
  
  if (error) throw error
  return data
}