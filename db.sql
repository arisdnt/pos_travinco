-- Database Schema untuk Sistem Parfum - Kompatibel dengan Supabase
-- Jalankan script ini di SQL Editor Supabase Dashboard

-- ============================================================================
-- 1. FUNCTIONS (harus dibuat sebelum tabel karena digunakan dalam trigger)
-- ============================================================================

-- Function untuk update stok setelah pembelian
CREATE OR REPLACE FUNCTION public.update_stok_pembelian() 
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Tambah stok bahan baku
    UPDATE public.bahan_baku 
    SET stok = stok + NEW.jumlah 
    WHERE id = NEW.bahan_baku_id;
    
    RETURN NEW;
END;
$$;

-- Function untuk update stok setelah penjualan
CREATE OR REPLACE FUNCTION public.update_stok_penjualan() 
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    resep_record RECORD;
BEGIN
    -- Loop through semua bahan baku yang dibutuhkan untuk produk ini
    FOR resep_record IN 
        SELECT bahan_baku_id, jumlah_dibutuhkan 
        FROM public.resep 
        WHERE produk_jadi_id = NEW.produk_jadi_id
    LOOP
        -- Kurangi stok bahan baku
        UPDATE public.bahan_baku 
        SET stok = stok - (resep_record.jumlah_dibutuhkan * NEW.jumlah)
        WHERE id = resep_record.bahan_baku_id;
    END LOOP;
    
    -- Set total_harga berdasarkan harga_jual produk
    UPDATE public.penjualan 
    SET total_harga = NEW.jumlah * (
        SELECT harga_jual 
        FROM public.produk_jadi 
        WHERE id = NEW.produk_jadi_id
    )
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$;

-- Function untuk check stok tersedia
CREATE OR REPLACE FUNCTION public.check_stok_tersedia(produk_id uuid, jumlah_jual numeric) 
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    resep_record RECORD;
    stok_tersedia NUMERIC;
BEGIN
    -- Loop through semua bahan baku yang dibutuhkan
    FOR resep_record IN 
        SELECT bb.stok, r.jumlah_dibutuhkan
        FROM public.resep r
        JOIN public.bahan_baku bb ON r.bahan_baku_id = bb.id
        WHERE r.produk_jadi_id = produk_id
    LOOP
        -- Hitung berapa unit yang bisa dibuat dengan stok saat ini
        stok_tersedia := FLOOR(resep_record.stok / resep_record.jumlah_dibutuhkan);
        
        -- Jika stok tidak cukup untuk jumlah yang diminta
        IF stok_tersedia < jumlah_jual THEN
            RETURN FALSE;
        END IF;
    END LOOP;
    
    RETURN TRUE;
END;
$$;

-- Function untuk hitung maksimal produksi
CREATE OR REPLACE FUNCTION public.hitung_max_produksi(produk_id uuid) 
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    min_stok NUMERIC := 999999;
    resep_record RECORD;
    stok_tersedia NUMERIC;
BEGIN
    -- Loop through semua bahan baku yang dibutuhkan
    FOR resep_record IN 
        SELECT bb.stok, r.jumlah_dibutuhkan
        FROM public.resep r
        JOIN public.bahan_baku bb ON r.bahan_baku_id = bb.id
        WHERE r.produk_jadi_id = produk_id
    LOOP
        -- Hitung berapa unit yang bisa dibuat dengan bahan baku ini
        stok_tersedia := FLOOR(resep_record.stok / resep_record.jumlah_dibutuhkan);
        
        -- Ambil nilai minimum (bottleneck)
        IF stok_tersedia < min_stok THEN
            min_stok := stok_tersedia;
        END IF;
    END LOOP;
    
    -- Jika tidak ada resep, return 0
    IF min_stok = 999999 THEN
        RETURN 0;
    END IF;
    
    RETURN min_stok;
END;
$$;

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- Tabel Bahan Baku
CREATE TABLE IF NOT EXISTS public.bahan_baku (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    nama_bahan_baku text NOT NULL,
    stok numeric DEFAULT 0 NOT NULL,
    unit text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now()
);

-- Tabel Produk Jadi
CREATE TABLE IF NOT EXISTS public.produk_jadi (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    nama_produk_jadi text NOT NULL,
    sku text NOT NULL UNIQUE,
    harga_jual numeric DEFAULT 0 NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now()
);

-- Tabel Resep
CREATE TABLE IF NOT EXISTS public.resep (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    produk_jadi_id uuid NOT NULL REFERENCES public.produk_jadi(id) ON DELETE CASCADE,
    bahan_baku_id uuid NOT NULL REFERENCES public.bahan_baku(id) ON DELETE CASCADE,
    jumlah_dibutuhkan numeric NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    UNIQUE(produk_jadi_id, bahan_baku_id)
);

-- Tabel Pembelian
CREATE TABLE IF NOT EXISTS public.pembelian (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    bahan_baku_id uuid NOT NULL REFERENCES public.bahan_baku(id) ON DELETE CASCADE,
    jumlah numeric NOT NULL,
    harga_beli numeric DEFAULT 0,
    tanggal timestamp with time zone DEFAULT now() NOT NULL,
    catatan text,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Tabel Penjualan
CREATE TABLE IF NOT EXISTS public.penjualan (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    produk_jadi_id uuid NOT NULL REFERENCES public.produk_jadi(id) ON DELETE CASCADE,
    jumlah numeric NOT NULL,
    total_harga numeric DEFAULT 0,
    tanggal timestamp with time zone DEFAULT now() NOT NULL,
    catatan text,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================================================
-- 3. TRIGGERS
-- ============================================================================

-- Trigger untuk update stok setelah pembelian
DROP TRIGGER IF EXISTS trigger_update_stok_pembelian ON public.pembelian;
CREATE TRIGGER trigger_update_stok_pembelian 
    AFTER INSERT ON public.pembelian 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_stok_pembelian();

-- Trigger untuk update stok setelah penjualan
DROP TRIGGER IF EXISTS trigger_update_stok_penjualan ON public.penjualan;
CREATE TRIGGER trigger_update_stok_penjualan 
    AFTER INSERT ON public.penjualan 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_stok_penjualan();

-- ============================================================================
-- 4. VIEWS
-- ============================================================================

-- View Laporan Pemakaian Bahan Baku
CREATE OR REPLACE VIEW public.laporan_pemakaian_bahan_baku AS
SELECT 
    bb.nama_bahan_baku,
    bb.unit,
    COALESCE(sum((r.jumlah_dibutuhkan * p.jumlah)), 0::numeric) AS total_terpakai,
    date_trunc('month', p.tanggal) AS periode,
    bb.user_id
FROM public.bahan_baku bb
LEFT JOIN public.resep r ON bb.id = r.bahan_baku_id
LEFT JOIN public.penjualan p ON r.produk_jadi_id = p.produk_jadi_id
GROUP BY bb.id, bb.nama_bahan_baku, bb.unit, bb.user_id, date_trunc('month', p.tanggal)
ORDER BY date_trunc('month', p.tanggal) DESC, total_terpakai DESC;

-- View Laporan Penjualan
CREATE OR REPLACE VIEW public.laporan_penjualan AS
SELECT 
    pj.nama_produk_jadi,
    pj.sku,
    COALESCE(sum(p.jumlah), 0::numeric) AS total_terjual,
    COALESCE(sum(p.total_harga), 0::numeric) AS total_pendapatan,
    date_trunc('month', p.tanggal) AS periode,
    pj.user_id
FROM public.produk_jadi pj
LEFT JOIN public.penjualan p ON pj.id = p.produk_jadi_id
GROUP BY pj.id, pj.nama_produk_jadi, pj.sku, pj.user_id, date_trunc('month', p.tanggal)
ORDER BY date_trunc('month', p.tanggal) DESC, total_pendapatan DESC;

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS pada semua tabel
ALTER TABLE public.bahan_baku ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produk_jadi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resep ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pembelian ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penjualan ENABLE ROW LEVEL SECURITY;

-- Policies untuk tabel bahan_baku
CREATE POLICY "Users can view own bahan_baku" ON public.bahan_baku
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bahan_baku" ON public.bahan_baku
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bahan_baku" ON public.bahan_baku
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bahan_baku" ON public.bahan_baku
    FOR DELETE USING (auth.uid() = user_id);

-- Policies untuk tabel produk_jadi
CREATE POLICY "Users can view own produk_jadi" ON public.produk_jadi
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own produk_jadi" ON public.produk_jadi
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own produk_jadi" ON public.produk_jadi
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own produk_jadi" ON public.produk_jadi
    FOR DELETE USING (auth.uid() = user_id);

-- Policies untuk tabel resep
CREATE POLICY "Users can view own resep" ON public.resep
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resep" ON public.resep
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resep" ON public.resep
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own resep" ON public.resep
    FOR DELETE USING (auth.uid() = user_id);

-- Policies untuk tabel pembelian
CREATE POLICY "Users can view own pembelian" ON public.pembelian
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pembelian" ON public.pembelian
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pembelian" ON public.pembelian
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pembelian" ON public.pembelian
    FOR DELETE USING (auth.uid() = user_id);

-- Policies untuk tabel penjualan
CREATE POLICY "Users can view own penjualan" ON public.penjualan
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own penjualan" ON public.penjualan
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own penjualan" ON public.penjualan
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own penjualan" ON public.penjualan
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 6. SAMPLE DATA (Opsional - untuk testing)
-- ============================================================================

-- Insert sample data (ganti YOUR_USER_ID dengan UUID user yang valid)
-- Uncomment dan ganti dengan user ID yang sesuai setelah user terdaftar

/*
-- Sample Bahan Baku
INSERT INTO public.bahan_baku (nama_bahan_baku, stok, unit, user_id) VALUES
('Alkohol 96%', 1000, 'ml', 'YOUR_USER_ID'),
('Essential Oil Lavender', 250, 'ml', 'YOUR_USER_ID'),
('Essential Oil Rose', 200, 'ml', 'YOUR_USER_ID'),
('Botol Spray 50ml', 100, 'buah', 'YOUR_USER_ID'),
('Botol Spray 30ml', 150, 'buah', 'YOUR_USER_ID');

-- Sample Produk Jadi
INSERT INTO public.produk_jadi (nama_produk_jadi, sku, harga_jual, user_id) VALUES
('Parfum Lavender 50ml', 'LAV001', 150000, 'YOUR_USER_ID'),
('Parfum Rose 30ml', 'ROS001', 120000, 'YOUR_USER_ID');

-- Sample Resep (sesuaikan dengan ID produk dan bahan baku yang sudah ada)
-- Resep untuk Parfum Lavender 50ml
INSERT INTO public.resep (produk_jadi_id, bahan_baku_id, jumlah_dibutuhkan, user_id) VALUES
('PRODUK_LAVENDER_ID', 'ALKOHOL_ID', 40, 'YOUR_USER_ID'),
('PRODUK_LAVENDER_ID', 'LAVENDER_OIL_ID', 10, 'YOUR_USER_ID'),
('PRODUK_LAVENDER_ID', 'BOTOL_50ML_ID', 1, 'YOUR_USER_ID');

-- Resep untuk Parfum Rose 30ml
INSERT INTO public.resep (produk_jadi_id, bahan_baku_id, jumlah_dibutuhkan, user_id) VALUES
('PRODUK_ROSE_ID', 'ALKOHOL_ID', 25, 'YOUR_USER_ID'),
('PRODUK_ROSE_ID', 'ROSE_OIL_ID', 5, 'YOUR_USER_ID'),
('PRODUK_ROSE_ID', 'BOTOL_30ML_ID', 1, 'YOUR_USER_ID');
*/

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions untuk functions
GRANT EXECUTE ON FUNCTION public.update_stok_pembelian() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_stok_penjualan() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_stok_tersedia(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hitung_max_produksi(uuid) TO authenticated;

-- Grant select permissions untuk views
GRANT SELECT ON public.laporan_pemakaian_bahan_baku TO authenticated;
GRANT SELECT ON public.laporan_penjualan TO authenticated;