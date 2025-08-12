// =====================================================
// APPLICATION CONFIGURATION
// =====================================================
// File ini berisi konfigurasi aplikasi dan utility functions
// untuk mengelola data master, cache, dan konfigurasi dinamis

import { createClient } from '@/lib/supabase/client';
import type {
  KategoriOption,
  UnitDasarOption,
  KemasanOption,
  SupplierOption,
  BahanBakuOption
} from '@/types/master-data';

// =====================================================
// APP CONFIGURATION
// =====================================================

export const APP_CONFIG = {
  // Currency
  defaultCurrency: 'IDR',
  currencySymbol: 'Rp',
  
  // Pagination
  itemsPerPage: 10,
  maxItemsPerPage: 100,
  
  // File Upload
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  
  // Date Format
  dateFormat: 'dd/MM/yyyy',
  dateTimeFormat: 'dd/MM/yyyy HH:mm',
  
  // Validation
  minPasswordLength: 8,
  maxTextLength: 255,
  maxDescriptionLength: 1000,
  
  // Business Rules
  minStokAlert: 10, // Alert ketika stok di bawah nilai ini
  maxReservasiDays: 90, // Maksimal hari untuk reservasi
  
  // UI
  defaultPageSize: 10,
  debounceDelay: 300, // ms untuk search input
  toastDuration: 3000, // ms
  
  // API
  apiTimeout: 30000, // 30 seconds
  retryAttempts: 3,
} as const;

// =====================================================
// MASTER DATA CACHE CONFIGURATION
// =====================================================

export const CACHE_CONFIG = {
  // Cache duration in milliseconds
  kategori: 5 * 60 * 1000, // 5 minutes
  unitDasar: 10 * 60 * 1000, // 10 minutes
  kemasan: 5 * 60 * 1000, // 5 minutes
  supplier: 2 * 60 * 1000, // 2 minutes
  bahanBaku: 1 * 60 * 1000, // 1 minute
} as const;

// =====================================================
// CACHE STORAGE
// =====================================================

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class MasterDataCache {
  private cache = new Map<string, CacheItem<any>>();

  set<T>(key: string, data: T, duration: number): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiry: now + duration
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, item] of Array.from(this.cache.entries())) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

export const masterDataCache = new MasterDataCache();

// =====================================================
// MASTER DATA FETCHERS
// =====================================================

export async function getKategoriOptions(): Promise<KategoriOption[]> {
  const cacheKey = 'kategori-options';
  const cached = masterDataCache.get<KategoriOption[]>(cacheKey);
  
  if (cached) {
    return cached;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('kategori')
    .select('id, nama_kategori, deskripsi')
    .order('nama_kategori');

  if (error) {
    console.error('Error fetching kategori:', error);
    return [];
  }

  const options: KategoriOption[] = data.map(item => ({
    value: item.id,
    label: item.nama_kategori,
    deskripsi: item.deskripsi
  }));

  masterDataCache.set(cacheKey, options, CACHE_CONFIG.kategori);
  return options;
}

export async function getUnitDasarOptions(): Promise<UnitDasarOption[]> {
  const cacheKey = 'unit-dasar-options';
  const cached = masterDataCache.get<UnitDasarOption[]>(cacheKey);
  
  if (cached) {
    return cached;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('unit_dasar')
    .select('id, nama_unit, deskripsi')
    .order('nama_unit');

  if (error) {
    console.error('Error fetching unit dasar:', error);
    return [];
  }

  const options: UnitDasarOption[] = data.map(item => ({
    value: item.id,
    label: item.nama_unit,
    deskripsi: item.deskripsi
  }));

  masterDataCache.set(cacheKey, options, CACHE_CONFIG.unitDasar);
  return options;
}

export async function getKemasanOptions(unitDasarId?: string): Promise<KemasanOption[]> {
  const cacheKey = `kemasan-options-${unitDasarId || 'all'}`;
  const cached = masterDataCache.get<KemasanOption[]>(cacheKey);
  
  if (cached) {
    return cached;
  }

  const supabase = createClient();
  let query = supabase
    .from('kemasan')
    .select(`
      id,
      nama_kemasan,
      unit_dasar_id,
      nilai_konversi,
      unit_dasar:unit_dasar_id(nama_unit)
    `)
    .order('nama_kemasan');

  if (unitDasarId) {
    query = query.eq('unit_dasar_id', unitDasarId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching kemasan:', error);
    return [];
  }

  const options: KemasanOption[] = data.map(item => ({
    value: item.id,
    label: item.nama_kemasan,
    unit_dasar_id: item.unit_dasar_id,
    nilai_konversi: item.nilai_konversi,
    nama_unit: Array.isArray(item.unit_dasar) ? item.unit_dasar[0]?.nama_unit : (item.unit_dasar as any)?.nama_unit
  }));

  masterDataCache.set(cacheKey, options, CACHE_CONFIG.kemasan);
  return options;
}

export async function getSupplierOptions(): Promise<SupplierOption[]> {
  const cacheKey = 'supplier-options';
  const cached = masterDataCache.get<SupplierOption[]>(cacheKey);
  
  if (cached) {
    return cached;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, nama_supplier, kontak, alamat')
    .order('nama_supplier');

  if (error) {
    console.error('Error fetching suppliers:', error);
    return [];
  }

  const options: SupplierOption[] = data.map(item => ({
    value: item.id,
    label: item.nama_supplier,
    kontak: item.kontak,
    alamat: item.alamat
  }));

  masterDataCache.set(cacheKey, options, CACHE_CONFIG.supplier);
  return options;
}

export async function getBahanBakuOptions(): Promise<BahanBakuOption[]> {
  const cacheKey = 'bahan-baku-options';
  const cached = masterDataCache.get<BahanBakuOption[]>(cacheKey);
  
  if (cached) {
    return cached;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('view_bahan_baku_detail')
    .select('id, nama_bahan_baku, stok, nama_unit, nama_kategori')
    .order('nama_bahan_baku');

  if (error) {
    console.error('Error fetching bahan baku:', error);
    return [];
  }

  const options: BahanBakuOption[] = data.map(item => ({
    value: item.id,
    label: item.nama_bahan_baku,
    stok: item.stok,
    nama_unit: item.nama_unit,
    nama_kategori: item.nama_kategori
  }));

  masterDataCache.set(cacheKey, options, CACHE_CONFIG.bahanBaku);
  return options;
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatNumber(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

export function calculateKonversi(jumlah: number, nilaiKonversi: number): number {
  return jumlah * nilaiKonversi;
}

export function calculateFromKonversi(jumlahDasar: number, nilaiKonversi: number): number {
  return jumlahDasar / nilaiKonversi;
}

// =====================================================
// VALIDATION HELPERS
// =====================================================

export function validateRequired(value: any, fieldName: string): string | null {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} wajib diisi`;
  }
  return null;
}

export function validateNumber(value: any, fieldName: string, min?: number, max?: number): string | null {
  const num = Number(value);
  if (isNaN(num)) {
    return `${fieldName} harus berupa angka`;
  }
  if (min !== undefined && num < min) {
    return `${fieldName} minimal ${min}`;
  }
  if (max !== undefined && num > max) {
    return `${fieldName} maksimal ${max}`;
  }
  return null;
}

export function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Format email tidak valid';
  }
  return null;
}

export function validatePhone(phone: string): string | null {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  if (!phoneRegex.test(phone)) {
    return 'Format nomor telepon tidak valid';
  }
  return null;
}

// =====================================================
// CACHE MANAGEMENT
// =====================================================

export function clearMasterDataCache(type?: keyof typeof CACHE_CONFIG): void {
  if (type) {
    masterDataCache.clear(`${type}-options`);
  } else {
    masterDataCache.clear();
  }
}

export function refreshMasterDataCache(): void {
  masterDataCache.clearExpired();
}

// Auto-refresh cache setiap 5 menit
if (typeof window !== 'undefined') {
  setInterval(refreshMasterDataCache, 5 * 60 * 1000);
}

// =====================================================
// RE-EXPORT UTILITIES
// =====================================================
// Import utilities from utils.ts to maintain backward compatibility

export {
  AppError,
  handleSupabaseError,
  ROUTES,
  TABLE_NAMES
} from './utils';