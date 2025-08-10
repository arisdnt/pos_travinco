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