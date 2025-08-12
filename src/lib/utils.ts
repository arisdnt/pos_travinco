import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Jakarta', // GMT+7
  }).format(dateObj)
}

export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta', // GMT+7
  }).format(dateObj)
}

// Helper function to get current date/time in GMT+7
export function getCurrentDateTimeGMT7(): Date {
  return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
}

// Helper function to format date for database insertion (ISO string in GMT+7)
export function formatDateForDB(date?: Date): string {
  const dateObj = date || getCurrentDateTimeGMT7();
  return dateObj.toISOString();
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num)
}

export function generateSKU(productName: string): string {
  const prefix = productName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 3)
  
  const timestamp = Date.now().toString().slice(-6)
  return `${prefix}${timestamp}`
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function calculateStokTersedia(
  resep: Array<{ bahan_baku: { stok: number }, jumlah_dibutuhkan: number }>
): number {
  if (resep.length === 0) return 0
  
  return Math.min(
    ...resep.map(r => Math.floor(r.bahan_baku.stok / r.jumlah_dibutuhkan))
  )
}

// =====================================================
// VALIDATION UTILITIES
// =====================================================

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^(\+62|62|0)[0-9]{9,13}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}

export function validateSKU(sku: string): boolean {
  const skuRegex = /^[A-Z]{2,4}[0-9]{4,8}$/;
  return skuRegex.test(sku);
}

// =====================================================
// DATA TRANSFORMATION UTILITIES
// =====================================================

export function convertToSelectOptions<T extends Record<string, any>>(
  items: T[],
  valueKey: keyof T,
  labelKey: keyof T
): Array<{ value: string; label: string }> {
  return items.map(item => ({
    value: String(item[valueKey]),
    label: String(item[labelKey])
  }));
}

export function groupBy<T, K extends keyof T>(
  array: T[],
  key: K
): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

// =====================================================
// ERROR HANDLING UTILITIES
// =====================================================

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleSupabaseError(error: any): AppError {
  if (error?.code === 'PGRST116') {
    return new AppError('Data tidak ditemukan', 'NOT_FOUND', 404);
  }
  if (error?.code === '23505') {
    return new AppError('Data sudah ada', 'DUPLICATE', 409);
  }
  if (error?.code === '23503') {
    return new AppError('Data terkait dengan data lain', 'FOREIGN_KEY', 400);
  }
  return new AppError(error?.message || 'Terjadi kesalahan', 'UNKNOWN', 500);
}

// =====================================================
// CONSTANTS
// =====================================================

export const ROUTES = {
  dashboard: '/dashboard',
  bahanBaku: '/dashboard/bahan-baku',
  produkJadi: '/dashboard/produk-jadi',
  resep: '/dashboard/resep',
  pembelian: '/dashboard/pembelian',
  penjualan: '/dashboard/penjualan',
  laporan: '/dashboard/laporan',
  masterData: {
    base: '/dashboard/master-data',
    supplier: '/dashboard/master-data/supplier',
    kategori: '/dashboard/master-data/kategori',
    konfigurasiUnit: '/dashboard/master-data/konfigurasi-unit',
    reservasiStok: '/dashboard/master-data/reservasi-stok'
  }
} as const;

export const TABLE_NAMES = {
  suppliers: 'suppliers',
  kategori: 'kategori',
  unitDasar: 'unit_dasar',
  kemasan: 'kemasan',
  reservasiStok: 'reservasi_stok',
  bahanBaku: 'bahan_baku',
  produkJadi: 'produk_jadi',
  resep: 'resep',
  pembelian: 'pembelian',
  penjualan: 'penjualan'
} as const;