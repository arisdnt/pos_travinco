-- Migration untuk implementasi fitur Supplier Eksklusif
-- File: migration_supplier_eksklusif.sql
-- Deskripsi: Menambahkan kolom supplier_eksklusif_id ke tabel bahan_baku
--           dan membuat fungsi validasi untuk laporan akuntabilitas

-- ========================================
-- 1. MENAMBAHKAN KOLOM SUPPLIER EKSKLUSIF
-- ========================================

-- Tambahkan kolom supplier_eksklusif_id ke tabel bahan_baku
ALTER TABLE public.bahan_baku 
ADD COLUMN supplier_eksklusif_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Tambahkan komentar untuk dokumentasi
COMMENT ON COLUMN public.bahan_baku.supplier_eksklusif_id IS 'ID supplier yang menjadi supplier eksklusif untuk bahan baku ini. Jika diisi, maka pembelian bahan baku ini hanya bisa dari supplier yang ditentukan.';

-- ========================================
-- 2. MEMBUAT INDEX UNTUK PERFORMA
-- ========================================

-- Index untuk query berdasarkan supplier eksklusif
CREATE INDEX IF NOT EXISTS idx_bahan_baku_supplier_eksklusif 
ON public.bahan_baku(supplier_eksklusif_id) 
WHERE supplier_eksklusif_id IS NOT NULL;

-- Index komposit untuk query laporan akuntabilitas
CREATE INDEX IF NOT EXISTS idx_bahan_baku_user_supplier_eksklusif 
ON public.bahan_baku(user_id, supplier_eksklusif_id);

-- ========================================
-- 3. FUNGSI VALIDASI SUPPLIER EKSKLUSIF
-- ========================================

-- Fungsi untuk memvalidasi pembelian dengan supplier eksklusif
CREATE OR REPLACE FUNCTION public.validate_supplier_eksklusif(
    p_bahan_baku_id UUID,
    p_supplier_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_supplier_eksklusif_id UUID;
BEGIN
    -- Ambil supplier eksklusif untuk bahan baku
    SELECT supplier_eksklusif_id 
    INTO v_supplier_eksklusif_id
    FROM public.bahan_baku 
    WHERE id = p_bahan_baku_id;
    
    -- Jika tidak ada supplier eksklusif, pembelian diizinkan dari supplier mana saja
    IF v_supplier_eksklusif_id IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Jika ada supplier eksklusif, hanya izinkan pembelian dari supplier tersebut
    RETURN v_supplier_eksklusif_id = p_supplier_id;
END;
$$;

-- Tambahkan komentar untuk dokumentasi
COMMENT ON FUNCTION public.validate_supplier_eksklusif(UUID, UUID) IS 'Memvalidasi apakah pembelian bahan baku dapat dilakukan dari supplier tertentu berdasarkan aturan supplier eksklusif.';

-- ========================================
-- 4. TRIGGER UNTUK VALIDASI OTOMATIS
-- ========================================

-- Fungsi trigger untuk validasi pembelian
CREATE OR REPLACE FUNCTION public.trigger_validate_pembelian_supplier_eksklusif()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validasi hanya untuk INSERT dan UPDATE
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        -- Validasi supplier eksklusif
        IF NOT public.validate_supplier_eksklusif(NEW.bahan_baku_id, NEW.supplier_id) THEN
            RAISE EXCEPTION 'Pembelian bahan baku ini hanya dapat dilakukan dari supplier eksklusif yang telah ditentukan.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Buat trigger pada tabel pembelian
DROP TRIGGER IF EXISTS trigger_validate_supplier_eksklusif ON public.pembelian;
CREATE TRIGGER trigger_validate_supplier_eksklusif
    BEFORE INSERT OR UPDATE ON public.pembelian
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_validate_pembelian_supplier_eksklusif();

-- ========================================
-- 5. VIEW UNTUK LAPORAN AKUNTABILITAS
-- ========================================

-- View untuk laporan akuntabilitas supplier eksklusif
CREATE OR REPLACE VIEW public.laporan_akuntabilitas_supplier_eksklusif AS
SELECT 
    bb.id as bahan_baku_id,
    bb.nama_bahan_baku,
    bb.stok,
    bb.user_id,
    s_eksklusif.id as supplier_eksklusif_id,
    s_eksklusif.nama_supplier as supplier_eksklusif_nama,
    s_eksklusif.kontak as supplier_eksklusif_kontak,
    s_eksklusif.alamat as supplier_eksklusif_alamat,
    -- Statistik pembelian dari supplier eksklusif
    COALESCE(stats_eksklusif.total_pembelian, 0) as total_pembelian_eksklusif,
    COALESCE(stats_eksklusif.total_jumlah, 0) as total_jumlah_eksklusif,
    COALESCE(stats_eksklusif.rata_rata_harga, 0) as rata_rata_harga_eksklusif,
    -- Statistik pembelian dari supplier lain (untuk deteksi pelanggaran)
    COALESCE(stats_lain.total_pembelian, 0) as total_pembelian_supplier_lain,
    COALESCE(stats_lain.total_jumlah, 0) as total_jumlah_supplier_lain,
    -- Status akuntabilitas
    CASE 
        WHEN bb.supplier_eksklusif_id IS NULL THEN 'TIDAK_ADA_SUPPLIER_EKSKLUSIF'
        WHEN COALESCE(stats_lain.total_pembelian, 0) = 0 THEN 'AKUNTABEL'
        ELSE 'PELANGGARAN_TERDETEKSI'
    END as status_akuntabilitas,
    bb.created_at
FROM public.bahan_baku bb
LEFT JOIN public.suppliers s_eksklusif ON bb.supplier_eksklusif_id = s_eksklusif.id
-- Statistik pembelian dari supplier eksklusif
LEFT JOIN (
    SELECT 
        p.bahan_baku_id,
        COUNT(*) as total_pembelian,
        SUM(p.jumlah) as total_jumlah,
        AVG(p.harga_beli) as rata_rata_harga
    FROM public.pembelian p
    INNER JOIN public.bahan_baku bb ON p.bahan_baku_id = bb.id
    WHERE p.supplier_id = bb.supplier_eksklusif_id
    GROUP BY p.bahan_baku_id
) stats_eksklusif ON bb.id = stats_eksklusif.bahan_baku_id
-- Statistik pembelian dari supplier lain (untuk deteksi pelanggaran)
LEFT JOIN (
    SELECT 
        p.bahan_baku_id,
        COUNT(*) as total_pembelian,
        SUM(p.jumlah) as total_jumlah
    FROM public.pembelian p
    INNER JOIN public.bahan_baku bb ON p.bahan_baku_id = bb.id
    WHERE bb.supplier_eksklusif_id IS NOT NULL 
      AND p.supplier_id != bb.supplier_eksklusif_id
    GROUP BY p.bahan_baku_id
) stats_lain ON bb.id = stats_lain.bahan_baku_id
ORDER BY bb.nama_bahan_baku;

-- Tambahkan komentar untuk dokumentasi
COMMENT ON VIEW public.laporan_akuntabilitas_supplier_eksklusif IS 'View untuk laporan akuntabilitas supplier eksklusif, menampilkan statistik pembelian dan deteksi pelanggaran aturan supplier eksklusif.';

-- ========================================
-- 6. FUNGSI UNTUK LAPORAN DETAIL
-- ========================================

-- Fungsi untuk mendapatkan detail pelanggaran supplier eksklusif
CREATE OR REPLACE FUNCTION public.get_pelanggaran_supplier_eksklusif(
    p_user_id UUID DEFAULT NULL,
    p_bahan_baku_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    bahan_baku_id UUID,
    nama_bahan_baku TEXT,
    supplier_eksklusif_nama TEXT,
    pembelian_id UUID,
    supplier_pelanggar_nama TEXT,
    jumlah DECIMAL,
    harga_beli DECIMAL,
    tanggal_pembelian TIMESTAMP,
    catatan TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bb.id as bahan_baku_id,
        bb.nama_bahan_baku,
        s_eksklusif.nama_supplier as supplier_eksklusif_nama,
        p.id as pembelian_id,
        s_pelanggar.nama_supplier as supplier_pelanggar_nama,
        p.jumlah,
        p.harga_beli,
        p.created_at as tanggal_pembelian,
        p.catatan
    FROM public.pembelian p
    INNER JOIN public.bahan_baku bb ON p.bahan_baku_id = bb.id
    INNER JOIN public.suppliers s_eksklusif ON bb.supplier_eksklusif_id = s_eksklusif.id
    INNER JOIN public.suppliers s_pelanggar ON p.supplier_id = s_pelanggar.id
    WHERE bb.supplier_eksklusif_id IS NOT NULL
      AND p.supplier_id != bb.supplier_eksklusif_id
      AND (p_user_id IS NULL OR bb.user_id = p_user_id)
      AND (p_bahan_baku_id IS NULL OR bb.id = p_bahan_baku_id)
      AND (p_start_date IS NULL OR p.created_at::DATE >= p_start_date)
      AND (p_end_date IS NULL OR p.created_at::DATE <= p_end_date)
    ORDER BY p.created_at DESC;
END;
$$;

-- Tambahkan komentar untuk dokumentasi
COMMENT ON FUNCTION public.get_pelanggaran_supplier_eksklusif(UUID, UUID, DATE, DATE) IS 'Mendapatkan detail pelanggaran aturan supplier eksklusif dengan filter opsional.';

-- ========================================
-- 7. POLICY KEAMANAN (RLS)
-- ========================================

-- Pastikan RLS aktif untuk tabel bahan_baku (jika belum)
-- ALTER TABLE public.bahan_baku ENABLE ROW LEVEL SECURITY;

-- Policy untuk akses supplier eksklusif (user hanya bisa melihat data mereka sendiri)
-- CREATE POLICY "Users can view their own bahan_baku supplier_eksklusif" ON public.bahan_baku
--     FOR SELECT USING (auth.uid() = user_id);

-- CREATE POLICY "Users can update their own bahan_baku supplier_eksklusif" ON public.bahan_baku
--     FOR UPDATE USING (auth.uid() = user_id);

-- ========================================
-- 8. GRANT PERMISSIONS
-- ========================================

-- Grant akses ke fungsi untuk authenticated users
GRANT EXECUTE ON FUNCTION public.validate_supplier_eksklusif(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pelanggaran_supplier_eksklusif(UUID, UUID, DATE, DATE) TO authenticated;

-- Grant akses ke view untuk authenticated users
GRANT SELECT ON public.laporan_akuntabilitas_supplier_eksklusif TO authenticated;

-- ========================================
-- 9. SAMPLE DATA (OPSIONAL - UNTUK TESTING)
-- ========================================

-- Uncomment baris di bawah untuk menambahkan sample data testing
/*
-- Update beberapa bahan baku dengan supplier eksklusif untuk testing
UPDATE public.bahan_baku 
SET supplier_eksklusif_id = (
    SELECT id FROM public.suppliers 
    WHERE nama_supplier ILIKE '%supplier%' 
    LIMIT 1
)
WHERE nama_bahan_baku ILIKE '%tepung%' 
   OR nama_bahan_baku ILIKE '%gula%'
LIMIT 2;
*/

-- ========================================
-- 10. VERIFICATION QUERIES
-- ========================================

-- Query untuk memverifikasi instalasi
-- SELECT 'Migration completed successfully' as status;

-- Query untuk melihat kolom baru
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'bahan_baku' AND column_name = 'supplier_eksklusif_id';

-- Query untuk melihat fungsi yang dibuat
-- SELECT routine_name, routine_type 
-- FROM information_schema.routines 
-- WHERE routine_name IN ('validate_supplier_eksklusif', 'get_pelanggaran_supplier_eksklusif');

-- Query untuk melihat view yang dibuat
-- SELECT table_name, table_type 
-- FROM information_schema.tables 
-- WHERE table_name = 'laporan_akuntabilitas_supplier_eksklusif';

SELECT 'Migration supplier eksklusif berhasil dijalankan!' as result;