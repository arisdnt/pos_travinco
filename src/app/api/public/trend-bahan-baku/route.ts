import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Create Supabase client with service role for public access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bulan = searchParams.get('bulan');
    const tahun = searchParams.get('tahun');
    const kategori = searchParams.get('kategori');
    const search = searchParams.get('search');

    // Base query untuk trend pemakaian bahan baku
    let query = supabase
      .from('trend_pemakaian_bahan_baku')
      .select(`
        bahan_baku_id,
        nama_bahan_baku,
        unit,
        periode,
        bulan,
        tahun,
        total_terpakai,
        jumlah_transaksi
      `);

    // Apply filters
    if (bulan) {
      query = query.eq('bulan', parseInt(bulan));
    }
    
    if (tahun) {
      query = query.eq('tahun', parseInt(tahun));
    }

    if (search) {
      query = query.ilike('nama_bahan_baku', `%${search}%`);
    }

    // Order by total terpakai descending
    query = query.order('total_terpakai', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch data' },
        { status: 500 }
      );
    }

    // Add mock trend percentage and category for demo purposes
    const enrichedData = data?.map(item => ({
      ...item,
      trend_persentase: Math.random() * 30 - 10, // Random trend between -10% to 20%
      kategori: getCategoryFromName(item.nama_bahan_baku)
    })) || [];

    // Get summary statistics
    const totalTerpakai = enrichedData.reduce((sum, item) => sum + (item.total_terpakai || 0), 0);
    const totalTransaksi = enrichedData.reduce((sum, item) => sum + (item.jumlah_transaksi || 0), 0);
    const avgTrend = enrichedData.length > 0 
      ? enrichedData.reduce((sum, item) => sum + item.trend_persentase, 0) / enrichedData.length 
      : 0;
    const topBahan = enrichedData[0]?.nama_bahan_baku || '-';

    const response = {
      data: enrichedData,
      summary: {
        totalTerpakai,
        totalTransaksi,
        avgTrend,
        topBahan,
        jumlahBahan: enrichedData.length
      },
      filters: {
        bulan: bulan ? parseInt(bulan) : null,
        tahun: tahun ? parseInt(tahun) : null,
        kategori,
        search
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to categorize bahan baku based on name
function getCategoryFromName(nama: string): string {
  const namaLower = nama.toLowerCase();
  
  if (namaLower.includes('alkohol') || namaLower.includes('water') || namaLower.includes('air')) {
    return 'Base Material';
  }
  
  if (namaLower.includes('essential') || namaLower.includes('fragrance') || 
      namaLower.includes('lavender') || namaLower.includes('rose') || 
      namaLower.includes('vanilla') || namaLower.includes('citrus')) {
    return 'Fragrance';
  }
  
  if (namaLower.includes('glycerin') || namaLower.includes('vitamin') || 
      namaLower.includes('oil') && !namaLower.includes('essential')) {
    return 'Additive';
  }
  
  if (namaLower.includes('acid') || namaLower.includes('preservative') || 
      namaLower.includes('citric')) {
    return 'Preservative';
  }
  
  return 'Other';
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}