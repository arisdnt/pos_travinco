--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.0

-- Started on 2025-08-13 07:44:55

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 13 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- TOC entry 3900 (class 0 OID 0)
-- Dependencies: 13
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 430 (class 1255 OID 17271)
-- Name: check_stok_tersedia(uuid, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_stok_tersedia(produk_id uuid, jumlah_jual numeric) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.check_stok_tersedia(produk_id uuid, jumlah_jual numeric) OWNER TO postgres;

--
-- TOC entry 437 (class 1255 OID 20125)
-- Name: get_pelanggaran_supplier_eksklusif(uuid, uuid, date, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_pelanggaran_supplier_eksklusif(p_user_id uuid DEFAULT NULL::uuid, p_bahan_baku_id uuid DEFAULT NULL::uuid, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date) RETURNS TABLE(bahan_baku_id uuid, nama_bahan_baku text, supplier_eksklusif_nama text, pembelian_id uuid, supplier_pelanggar_nama text, jumlah numeric, harga_beli numeric, tanggal_pembelian timestamp without time zone, catatan text)
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.get_pelanggaran_supplier_eksklusif(p_user_id uuid, p_bahan_baku_id uuid, p_start_date date, p_end_date date) OWNER TO postgres;

--
-- TOC entry 3903 (class 0 OID 0)
-- Dependencies: 437
-- Name: FUNCTION get_pelanggaran_supplier_eksklusif(p_user_id uuid, p_bahan_baku_id uuid, p_start_date date, p_end_date date); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_pelanggaran_supplier_eksklusif(p_user_id uuid, p_bahan_baku_id uuid, p_start_date date, p_end_date date) IS 'Mendapatkan detail pelanggaran aturan supplier eksklusif dengan filter opsional.';


--
-- TOC entry 432 (class 1255 OID 18772)
-- Name: handle_pembelian_stok(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_pembelian_stok() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    jumlah_dalam_satuan_dasar numeric;
    kemasan_record RECORD;
BEGIN
    -- Jika ada kemasan_id, konversi ke satuan dasar
    IF NEW.kemasan_id IS NOT NULL THEN
        SELECT nilai_konversi INTO jumlah_dalam_satuan_dasar
        FROM kemasan 
        WHERE id = NEW.kemasan_id;
        
        jumlah_dalam_satuan_dasar := NEW.jumlah * jumlah_dalam_satuan_dasar;
    ELSE
        -- Jika tidak ada kemasan, anggap sudah dalam satuan dasar
        jumlah_dalam_satuan_dasar := NEW.jumlah;
    END IF;

    -- Jika pembelian dari reservasi stok, kurangi stok di supplier
    IF NEW.asal_barang = 'reservasi' AND NEW.supplier_id IS NOT NULL THEN
        -- Validasi kemasan harus sesuai dengan reservasi
        IF NEW.kemasan_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM reservasi_stok_supplier r
                WHERE r.bahan_baku_id = NEW.bahan_baku_id 
                AND r.supplier_id = NEW.supplier_id
                AND (r.kemasan_id = NEW.kemasan_id OR r.kemasan_id IS NULL)
                AND r.jumlah_reservasi >= jumlah_dalam_satuan_dasar
            ) THEN
                RAISE EXCEPTION 'Kemasan tidak sesuai dengan reservasi atau stok reservasi tidak mencukupi';
            END IF;
        END IF;

        -- Kurangi stok reservasi
        UPDATE reservasi_stok_supplier
        SET jumlah_reservasi = jumlah_reservasi - jumlah_dalam_satuan_dasar,
            updated_at = NOW()
        WHERE bahan_baku_id = NEW.bahan_baku_id 
        AND supplier_id = NEW.supplier_id
        AND (kemasan_id = NEW.kemasan_id OR (kemasan_id IS NULL AND NEW.kemasan_id IS NULL));
    END IF;

    -- Tambah stok di gudang sendiri (selalu terjadi)
    UPDATE bahan_baku
    SET stok = stok + jumlah_dalam_satuan_dasar
    WHERE id = NEW.bahan_baku_id;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.handle_pembelian_stok() OWNER TO postgres;

--
-- TOC entry 3905 (class 0 OID 0)
-- Dependencies: 432
-- Name: FUNCTION handle_pembelian_stok(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.handle_pembelian_stok() IS 'Fungsi trigger untuk menangani pembelian stok dengan validasi kemasan yang ketat. 
Memastikan kemasan pembelian sesuai dengan kemasan reservasi.';


--
-- TOC entry 431 (class 1255 OID 17272)
-- Name: hitung_max_produksi(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.hitung_max_produksi(produk_id uuid) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.hitung_max_produksi(produk_id uuid) OWNER TO postgres;

--
-- TOC entry 436 (class 1255 OID 20118)
-- Name: trigger_validate_pembelian_supplier_eksklusif(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_validate_pembelian_supplier_eksklusif() RETURNS trigger
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


ALTER FUNCTION public.trigger_validate_pembelian_supplier_eksklusif() OWNER TO postgres;

--
-- TOC entry 433 (class 1255 OID 18774)
-- Name: update_reservasi_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_reservasi_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_reservasi_timestamp() OWNER TO postgres;

--
-- TOC entry 429 (class 1255 OID 17270)
-- Name: update_stok_penjualan(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_stok_penjualan() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.update_stok_penjualan() OWNER TO postgres;

--
-- TOC entry 434 (class 1255 OID 20028)
-- Name: validate_reservasi_consistency(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_reservasi_consistency() RETURNS TABLE(reservasi_id uuid, supplier_nama text, bahan_baku_nama text, kemasan_nama text, jumlah_reservasi numeric, masalah text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        s.nama_supplier,
        bb.nama_bahan_baku,
        COALESCE(k.nama_kemasan, 'Satuan Dasar'),
        r.jumlah_reservasi,
        CASE 
            WHEN r.jumlah_reservasi < 0 THEN 'Jumlah reservasi negatif'
            WHEN r.jumlah_reservasi = 0 THEN 'Jumlah reservasi kosong'
            WHEN r.kemasan_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM kemasan k2
                WHERE k2.id = r.kemasan_id 
                AND k2.unit_dasar_id = bb.unit_dasar_id
            ) THEN 'Kemasan tidak sesuai unit dasar'
            ELSE 'OK'
        END
    FROM reservasi_stok_supplier r
    JOIN suppliers s ON r.supplier_id = s.id
    JOIN bahan_baku bb ON r.bahan_baku_id = bb.id
    LEFT JOIN kemasan k ON r.kemasan_id = k.id;
END;
$$;


ALTER FUNCTION public.validate_reservasi_consistency() OWNER TO postgres;

--
-- TOC entry 3911 (class 0 OID 0)
-- Dependencies: 434
-- Name: FUNCTION validate_reservasi_consistency(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.validate_reservasi_consistency() IS 'Fungsi untuk validasi konsistensi data reservasi stok dan mendeteksi masalah.';


--
-- TOC entry 435 (class 1255 OID 20117)
-- Name: validate_supplier_eksklusif(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_supplier_eksklusif(p_bahan_baku_id uuid, p_supplier_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.validate_supplier_eksklusif(p_bahan_baku_id uuid, p_supplier_id uuid) OWNER TO postgres;

--
-- TOC entry 3913 (class 0 OID 0)
-- Dependencies: 435
-- Name: FUNCTION validate_supplier_eksklusif(p_bahan_baku_id uuid, p_supplier_id uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.validate_supplier_eksklusif(p_bahan_baku_id uuid, p_supplier_id uuid) IS 'Memvalidasi apakah pembelian bahan baku dapat dilakukan dari supplier tertentu berdasarkan aturan supplier eksklusif.';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 302 (class 1259 OID 17273)
-- Name: bahan_baku; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bahan_baku (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nama_bahan_baku text NOT NULL,
    stok numeric DEFAULT 0 NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    kategori_id uuid,
    unit_dasar_id uuid,
    supplier_eksklusif_id uuid
);


ALTER TABLE public.bahan_baku OWNER TO postgres;

--
-- TOC entry 3915 (class 0 OID 0)
-- Dependencies: 302
-- Name: COLUMN bahan_baku.supplier_eksklusif_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.bahan_baku.supplier_eksklusif_id IS 'ID supplier yang menjadi supplier eksklusif untuk bahan baku ini. Jika diisi, maka pembelian bahan baku ini hanya bisa dari supplier yang ditentukan.';


--
-- TOC entry 306 (class 1259 OID 17350)
-- Name: penjualan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.penjualan (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    produk_jadi_id uuid NOT NULL,
    jumlah numeric NOT NULL,
    total_harga numeric DEFAULT 0,
    tanggal timestamp with time zone DEFAULT now() NOT NULL,
    catatan text,
    user_id uuid
);


ALTER TABLE public.penjualan OWNER TO postgres;

--
-- TOC entry 303 (class 1259 OID 17288)
-- Name: produk_jadi; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.produk_jadi (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nama_produk_jadi text NOT NULL,
    sku text NOT NULL,
    harga_jual numeric DEFAULT 0 NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.produk_jadi OWNER TO postgres;

--
-- TOC entry 304 (class 1259 OID 17305)
-- Name: resep; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resep (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    produk_jadi_id uuid NOT NULL,
    bahan_baku_id uuid NOT NULL,
    jumlah_dibutuhkan numeric NOT NULL,
    user_id uuid
);


ALTER TABLE public.resep OWNER TO postgres;

--
-- TOC entry 310 (class 1259 OID 18680)
-- Name: unit_dasar; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.unit_dasar (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nama_unit text NOT NULL,
    deskripsi text,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.unit_dasar OWNER TO postgres;

--
-- TOC entry 316 (class 1259 OID 19966)
-- Name: bahan_baku_terlaris_detail; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.bahan_baku_terlaris_detail AS
 SELECT bb.id AS bahan_baku_id,
    bb.nama_bahan_baku,
    ud.nama_unit,
    bb.stok AS stok_tersisa,
    COALESCE(sum((r.jumlah_dibutuhkan * p.jumlah)), (0)::numeric) AS total_terpakai,
    count(DISTINCT pj.id) AS jumlah_produk_menggunakan,
    string_agg(DISTINCT pj.nama_produk_jadi, ', '::text ORDER BY pj.nama_produk_jadi) AS produk_yang_menggunakan,
    date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone) AS periode_bulan_ini,
    EXTRACT(month FROM CURRENT_DATE) AS bulan,
    EXTRACT(year FROM CURRENT_DATE) AS tahun,
    bb.user_id
   FROM ((((public.bahan_baku bb
     LEFT JOIN public.unit_dasar ud ON ((bb.unit_dasar_id = ud.id)))
     LEFT JOIN public.resep r ON ((bb.id = r.bahan_baku_id)))
     LEFT JOIN public.produk_jadi pj ON ((r.produk_jadi_id = pj.id)))
     LEFT JOIN public.penjualan p ON (((pj.id = p.produk_jadi_id) AND (date_trunc('month'::text, p.tanggal) = date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone)))))
  GROUP BY bb.id, bb.nama_bahan_baku, ud.nama_unit, bb.stok, bb.user_id
  ORDER BY COALESCE(sum((r.jumlah_dibutuhkan * p.jumlah)), (0)::numeric) DESC, bb.nama_bahan_baku;


ALTER VIEW public.bahan_baku_terlaris_detail OWNER TO postgres;

--
-- TOC entry 318 (class 1259 OID 19976)
-- Name: bahan_baku_terlaris_filter; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.bahan_baku_terlaris_filter AS
 SELECT bb.id AS bahan_baku_id,
    bb.nama_bahan_baku,
    ud.nama_unit,
    bb.stok AS stok_tersisa,
    COALESCE(sum((r.jumlah_dibutuhkan * p.jumlah)), (0)::numeric) AS total_terpakai,
    count(DISTINCT pj.id) AS jumlah_produk_menggunakan,
    string_agg(DISTINCT pj.nama_produk_jadi, ', '::text ORDER BY pj.nama_produk_jadi) AS produk_yang_menggunakan,
    date_trunc('month'::text, p.tanggal) AS periode,
    EXTRACT(month FROM date_trunc('month'::text, p.tanggal)) AS bulan,
    EXTRACT(year FROM date_trunc('month'::text, p.tanggal)) AS tahun,
    bb.user_id,
    lower(bb.nama_bahan_baku) AS nama_bahan_baku_lower,
    lower(string_agg(DISTINCT pj.nama_produk_jadi, ' '::text)) AS produk_search_text
   FROM ((((public.bahan_baku bb
     LEFT JOIN public.unit_dasar ud ON ((bb.unit_dasar_id = ud.id)))
     LEFT JOIN public.resep r ON ((bb.id = r.bahan_baku_id)))
     LEFT JOIN public.produk_jadi pj ON ((r.produk_jadi_id = pj.id)))
     LEFT JOIN public.penjualan p ON ((pj.id = p.produk_jadi_id)))
  WHERE (p.tanggal IS NOT NULL)
  GROUP BY bb.id, bb.nama_bahan_baku, ud.nama_unit, bb.stok, bb.user_id, (date_trunc('month'::text, p.tanggal))
  ORDER BY COALESCE(sum((r.jumlah_dibutuhkan * p.jumlah)), (0)::numeric) DESC, bb.nama_bahan_baku;


ALTER VIEW public.bahan_baku_terlaris_filter OWNER TO postgres;

--
-- TOC entry 317 (class 1259 OID 19971)
-- Name: bahan_baku_top20_chart; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.bahan_baku_top20_chart AS
 SELECT bb.nama_bahan_baku,
    ud.nama_unit,
    COALESCE(sum((r.jumlah_dibutuhkan * p.jumlah)), (0)::numeric) AS total_terpakai,
    row_number() OVER (ORDER BY COALESCE(sum((r.jumlah_dibutuhkan * p.jumlah)), (0)::numeric) DESC) AS ranking,
    bb.user_id
   FROM ((((public.bahan_baku bb
     LEFT JOIN public.unit_dasar ud ON ((bb.unit_dasar_id = ud.id)))
     LEFT JOIN public.resep r ON ((bb.id = r.bahan_baku_id)))
     LEFT JOIN public.produk_jadi pj ON ((r.produk_jadi_id = pj.id)))
     LEFT JOIN public.penjualan p ON (((pj.id = p.produk_jadi_id) AND (date_trunc('month'::text, p.tanggal) = date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone)))))
  GROUP BY bb.id, bb.nama_bahan_baku, ud.nama_unit, bb.user_id
  ORDER BY COALESCE(sum((r.jumlah_dibutuhkan * p.jumlah)), (0)::numeric) DESC
 LIMIT 20;


ALTER VIEW public.bahan_baku_top20_chart OWNER TO postgres;

--
-- TOC entry 320 (class 1259 OID 19986)
-- Name: dashboard_bahan_baku_terlaris; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.dashboard_bahan_baku_terlaris AS
 SELECT bahan_baku_id,
    nama_bahan_baku,
    nama_unit,
    stok_tersisa,
    total_terpakai,
    jumlah_produk_menggunakan,
    produk_yang_menggunakan,
    periode_bulan_ini,
    bulan,
    tahun,
    user_id
   FROM public.bahan_baku_terlaris_detail;


ALTER VIEW public.dashboard_bahan_baku_terlaris OWNER TO postgres;

--
-- TOC entry 309 (class 1259 OID 18663)
-- Name: kategori; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kategori (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nama_kategori text NOT NULL,
    deskripsi text,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.kategori OWNER TO postgres;

--
-- TOC entry 311 (class 1259 OID 18697)
-- Name: kemasan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kemasan (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nama_kemasan text NOT NULL,
    unit_dasar_id uuid NOT NULL,
    nilai_konversi numeric NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.kemasan OWNER TO postgres;

--
-- TOC entry 305 (class 1259 OID 17330)
-- Name: pembelian; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pembelian (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bahan_baku_id uuid NOT NULL,
    jumlah numeric NOT NULL,
    harga_beli numeric DEFAULT 0,
    tanggal timestamp with time zone DEFAULT now() NOT NULL,
    catatan text,
    user_id uuid,
    supplier_id uuid,
    kemasan_id uuid,
    asal_barang text DEFAULT 'langsung'::text NOT NULL,
    CONSTRAINT check_asal_barang CHECK ((asal_barang = ANY (ARRAY['langsung'::text, 'reservasi'::text])))
);


ALTER TABLE public.pembelian OWNER TO postgres;

--
-- TOC entry 308 (class 1259 OID 18648)
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nama_supplier text NOT NULL,
    kontak text,
    alamat text,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.suppliers OWNER TO postgres;

--
-- TOC entry 323 (class 1259 OID 20120)
-- Name: laporan_akuntabilitas_supplier_eksklusif; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.laporan_akuntabilitas_supplier_eksklusif AS
 SELECT bb.id AS bahan_baku_id,
    bb.nama_bahan_baku,
    bb.stok,
    bb.user_id,
    s_eksklusif.id AS supplier_eksklusif_id,
    s_eksklusif.nama_supplier AS supplier_eksklusif_nama,
    s_eksklusif.kontak AS supplier_eksklusif_kontak,
    s_eksklusif.alamat AS supplier_eksklusif_alamat,
    COALESCE(stats_eksklusif.total_pembelian, (0)::bigint) AS total_pembelian_eksklusif,
    COALESCE(stats_eksklusif.total_jumlah, (0)::numeric) AS total_jumlah_eksklusif,
    COALESCE(stats_eksklusif.rata_rata_harga, (0)::numeric) AS rata_rata_harga_eksklusif,
    COALESCE(stats_lain.total_pembelian, (0)::bigint) AS total_pembelian_supplier_lain,
    COALESCE(stats_lain.total_jumlah, (0)::numeric) AS total_jumlah_supplier_lain,
        CASE
            WHEN (bb.supplier_eksklusif_id IS NULL) THEN 'TIDAK_ADA_SUPPLIER_EKSKLUSIF'::text
            WHEN (COALESCE(stats_lain.total_pembelian, (0)::bigint) = 0) THEN 'AKUNTABEL'::text
            ELSE 'PELANGGARAN_TERDETEKSI'::text
        END AS status_akuntabilitas,
    bb.created_at
   FROM (((public.bahan_baku bb
     LEFT JOIN public.suppliers s_eksklusif ON ((bb.supplier_eksklusif_id = s_eksklusif.id)))
     LEFT JOIN ( SELECT p.bahan_baku_id,
            count(*) AS total_pembelian,
            sum(p.jumlah) AS total_jumlah,
            avg(p.harga_beli) AS rata_rata_harga
           FROM (public.pembelian p
             JOIN public.bahan_baku bb_1 ON ((p.bahan_baku_id = bb_1.id)))
          WHERE (p.supplier_id = bb_1.supplier_eksklusif_id)
          GROUP BY p.bahan_baku_id) stats_eksklusif ON ((bb.id = stats_eksklusif.bahan_baku_id)))
     LEFT JOIN ( SELECT p.bahan_baku_id,
            count(*) AS total_pembelian,
            sum(p.jumlah) AS total_jumlah
           FROM (public.pembelian p
             JOIN public.bahan_baku bb_1 ON ((p.bahan_baku_id = bb_1.id)))
          WHERE ((bb_1.supplier_eksklusif_id IS NOT NULL) AND (p.supplier_id <> bb_1.supplier_eksklusif_id))
          GROUP BY p.bahan_baku_id) stats_lain ON ((bb.id = stats_lain.bahan_baku_id)))
  ORDER BY bb.nama_bahan_baku;


ALTER VIEW public.laporan_akuntabilitas_supplier_eksklusif OWNER TO postgres;

--
-- TOC entry 3929 (class 0 OID 0)
-- Dependencies: 323
-- Name: VIEW laporan_akuntabilitas_supplier_eksklusif; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.laporan_akuntabilitas_supplier_eksklusif IS 'View untuk laporan akuntabilitas supplier eksklusif, menampilkan statistik pembelian dan deteksi pelanggaran aturan supplier eksklusif.';


--
-- TOC entry 315 (class 1259 OID 19961)
-- Name: laporan_pemakaian_bahan_baku; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.laporan_pemakaian_bahan_baku AS
 SELECT bb.nama_bahan_baku,
    ud.nama_unit,
    COALESCE(sum((r.jumlah_dibutuhkan * p.jumlah)), (0)::numeric) AS total_terpakai,
    date_trunc('month'::text, p.tanggal) AS periode,
    bb.user_id
   FROM (((public.bahan_baku bb
     LEFT JOIN public.unit_dasar ud ON ((bb.unit_dasar_id = ud.id)))
     LEFT JOIN public.resep r ON ((bb.id = r.bahan_baku_id)))
     LEFT JOIN public.penjualan p ON ((r.produk_jadi_id = p.produk_jadi_id)))
  GROUP BY bb.id, bb.nama_bahan_baku, ud.nama_unit, bb.user_id, (date_trunc('month'::text, p.tanggal))
  ORDER BY (date_trunc('month'::text, p.tanggal)) DESC, COALESCE(sum((r.jumlah_dibutuhkan * p.jumlah)), (0)::numeric) DESC;


ALTER VIEW public.laporan_pemakaian_bahan_baku OWNER TO postgres;

--
-- TOC entry 307 (class 1259 OID 17377)
-- Name: laporan_penjualan; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.laporan_penjualan AS
 SELECT pj.nama_produk_jadi,
    pj.sku,
    COALESCE(sum(p.jumlah), (0)::numeric) AS total_terjual,
    COALESCE(sum(p.total_harga), (0)::numeric) AS total_pendapatan,
    date_trunc('month'::text, p.tanggal) AS periode,
    pj.user_id
   FROM (public.produk_jadi pj
     LEFT JOIN public.penjualan p ON ((pj.id = p.produk_jadi_id)))
  GROUP BY pj.id, pj.nama_produk_jadi, pj.sku, pj.user_id, (date_trunc('month'::text, p.tanggal))
  ORDER BY (date_trunc('month'::text, p.tanggal)) DESC, COALESCE(sum(p.total_harga), (0)::numeric) DESC;


ALTER VIEW public.laporan_penjualan OWNER TO postgres;

--
-- TOC entry 312 (class 1259 OID 18719)
-- Name: reservasi_stok_supplier; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reservasi_stok_supplier (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bahan_baku_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    jumlah_reservasi numeric NOT NULL,
    catatan text,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    kemasan_id uuid
);


ALTER TABLE public.reservasi_stok_supplier OWNER TO postgres;

--
-- TOC entry 3933 (class 0 OID 0)
-- Dependencies: 312
-- Name: COLUMN reservasi_stok_supplier.kemasan_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.reservasi_stok_supplier.kemasan_id IS 'Reference to packaging unit used during input (for tracking purposes). The jumlah_reservasi is always stored in base unit.';


--
-- TOC entry 319 (class 1259 OID 19981)
-- Name: trend_pemakaian_bahan_baku; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.trend_pemakaian_bahan_baku AS
 SELECT bb.id AS bahan_baku_id,
    bb.nama_bahan_baku,
    ud.nama_unit,
    date_trunc('month'::text, p.tanggal) AS periode,
    EXTRACT(month FROM date_trunc('month'::text, p.tanggal)) AS bulan,
    EXTRACT(year FROM date_trunc('month'::text, p.tanggal)) AS tahun,
    COALESCE(sum((r.jumlah_dibutuhkan * p.jumlah)), (0)::numeric) AS total_terpakai,
    count(DISTINCT p.id) AS jumlah_transaksi,
    bb.user_id
   FROM ((((public.bahan_baku bb
     LEFT JOIN public.unit_dasar ud ON ((bb.unit_dasar_id = ud.id)))
     LEFT JOIN public.resep r ON ((bb.id = r.bahan_baku_id)))
     LEFT JOIN public.produk_jadi pj ON ((r.produk_jadi_id = pj.id)))
     LEFT JOIN public.penjualan p ON ((pj.id = p.produk_jadi_id)))
  WHERE (p.tanggal >= date_trunc('month'::text, (CURRENT_DATE - '3 mons'::interval)))
  GROUP BY bb.id, bb.nama_bahan_baku, ud.nama_unit, bb.user_id, (date_trunc('month'::text, p.tanggal))
  ORDER BY (date_trunc('month'::text, p.tanggal)) DESC, COALESCE(sum((r.jumlah_dibutuhkan * p.jumlah)), (0)::numeric) DESC;


ALTER VIEW public.trend_pemakaian_bahan_baku OWNER TO postgres;

--
-- TOC entry 321 (class 1259 OID 20023)
-- Name: v_reservasi_stok_monitoring; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_reservasi_stok_monitoring AS
 SELECT r.id,
    r.jumlah_reservasi,
    r.created_at,
    r.updated_at,
    bb.nama_bahan_baku,
    s.nama_supplier,
        CASE
            WHEN (r.kemasan_id IS NOT NULL) THEN k.nama_kemasan
            ELSE (ud.nama_unit || ' (Satuan Dasar)'::text)
        END AS kemasan_display,
        CASE
            WHEN (r.kemasan_id IS NOT NULL) THEN ((round((r.jumlah_reservasi / k.nilai_konversi), 2) || ' '::text) || k.nama_kemasan)
            ELSE ((r.jumlah_reservasi || ' '::text) || ud.nama_unit)
        END AS jumlah_display,
    r.catatan,
        CASE
            WHEN (r.jumlah_reservasi > (0)::numeric) THEN 'Aktif'::text
            ELSE 'Habis'::text
        END AS status
   FROM ((((public.reservasi_stok_supplier r
     JOIN public.bahan_baku bb ON ((r.bahan_baku_id = bb.id)))
     JOIN public.suppliers s ON ((r.supplier_id = s.id)))
     JOIN public.unit_dasar ud ON ((bb.unit_dasar_id = ud.id)))
     LEFT JOIN public.kemasan k ON ((r.kemasan_id = k.id)))
  ORDER BY r.updated_at DESC;


ALTER VIEW public.v_reservasi_stok_monitoring OWNER TO postgres;

--
-- TOC entry 3936 (class 0 OID 0)
-- Dependencies: 321
-- Name: VIEW v_reservasi_stok_monitoring; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_reservasi_stok_monitoring IS 'View untuk monitoring reservasi stok dengan informasi kemasan yang user-friendly.';


--
-- TOC entry 314 (class 1259 OID 19956)
-- Name: view_bahan_baku_detail; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.view_bahan_baku_detail AS
 SELECT bb.id,
    bb.nama_bahan_baku,
    bb.stok,
    bb.kategori_id,
    bb.unit_dasar_id,
    bb.user_id,
    bb.created_at,
    k.nama_kategori,
    ud.nama_unit
   FROM ((public.bahan_baku bb
     LEFT JOIN public.kategori k ON ((bb.kategori_id = k.id)))
     LEFT JOIN public.unit_dasar ud ON ((bb.unit_dasar_id = ud.id)));


ALTER VIEW public.view_bahan_baku_detail OWNER TO postgres;

--
-- TOC entry 322 (class 1259 OID 20061)
-- Name: view_pembelian_detail; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.view_pembelian_detail AS
 SELECT p.id,
    p.jumlah,
    p.harga_beli,
    p.tanggal,
    p.catatan,
    p.asal_barang,
    bb.nama_bahan_baku,
    s.nama_supplier,
    kem.nama_kemasan,
    kem.nilai_konversi,
    ud.nama_unit,
    p.user_id
   FROM ((((public.pembelian p
     JOIN public.bahan_baku bb ON ((p.bahan_baku_id = bb.id)))
     LEFT JOIN public.suppliers s ON ((p.supplier_id = s.id)))
     LEFT JOIN public.kemasan kem ON ((p.kemasan_id = kem.id)))
     LEFT JOIN public.unit_dasar ud ON ((kem.unit_dasar_id = ud.id)));


ALTER VIEW public.view_pembelian_detail OWNER TO postgres;

--
-- TOC entry 313 (class 1259 OID 18776)
-- Name: view_reservasi_stok_detail; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.view_reservasi_stok_detail AS
 SELECT rss.id,
    rss.jumlah_reservasi,
    rss.catatan,
    rss.created_at,
    rss.updated_at,
    bb.nama_bahan_baku,
    bb.stok AS stok_gudang,
    s.nama_supplier,
    s.kontak AS kontak_supplier,
    ud.nama_unit,
    k.nama_kategori,
    rss.user_id
   FROM ((((public.reservasi_stok_supplier rss
     JOIN public.bahan_baku bb ON ((rss.bahan_baku_id = bb.id)))
     JOIN public.suppliers s ON ((rss.supplier_id = s.id)))
     LEFT JOIN public.unit_dasar ud ON ((bb.unit_dasar_id = ud.id)))
     LEFT JOIN public.kategori k ON ((bb.kategori_id = k.id)));


ALTER VIEW public.view_reservasi_stok_detail OWNER TO postgres;

--
-- TOC entry 3885 (class 0 OID 17273)
-- Dependencies: 302
-- Data for Name: bahan_baku; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bahan_baku (id, nama_bahan_baku, stok, user_id, created_at, kategori_id, unit_dasar_id, supplier_eksklusif_id) FROM stdin;
23bb32d5-4fd0-49a2-aaaa-96e5a93910ac	Botol Lelabo 30 ML	0	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-12 13:44:23.241644+00	903dba41-842f-4cc2-8173-7d3fae93a565	820ffd81-7a02-4a36-ad73-486504f0fe5f	\N
0bc7f68f-25f4-4392-96e6-ed13a90248f1	PARFUM - ONE MILION	50	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-12 13:36:19.549975+00	337313c1-390e-4c0c-b40a-bd2d1c5b24fc	bb0f9e26-83de-4ccf-9866-9f50820f61bc	\N
\.


--
-- TOC entry 3891 (class 0 OID 18663)
-- Dependencies: 309
-- Data for Name: kategori; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.kategori (id, nama_kategori, deskripsi, user_id, created_at) FROM stdin;
337313c1-390e-4c0c-b40a-bd2d1c5b24fc	Bibit Parfum	Bibit Parfum 100%	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-12 11:07:39.880942+00
903dba41-842f-4cc2-8173-7d3fae93a565	Botol	\N	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-12 13:43:12.624085+00
\.


--
-- TOC entry 3893 (class 0 OID 18697)
-- Dependencies: 311
-- Data for Name: kemasan; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.kemasan (id, nama_kemasan, unit_dasar_id, nilai_konversi, user_id, created_at) FROM stdin;
aea969ec-a4d6-4389-9ffb-716506ff0684	100 Ml	bb0f9e26-83de-4ccf-9866-9f50820f61bc	100	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-12 10:50:44.991447+00
fe38d95a-1b34-4e69-93a6-ced51f81a3b5	500 Ml	bb0f9e26-83de-4ccf-9866-9f50820f61bc	500	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-12 10:57:11.883274+00
d297982b-4441-453b-9e13-a05de32e173c	1 Liter	bb0f9e26-83de-4ccf-9866-9f50820f61bc	1000	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-12 10:57:24.987233+00
0195694d-724a-4f55-8cc0-c86ff8ddb251	Lusin	820ffd81-7a02-4a36-ad73-486504f0fe5f	12	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-12 13:43:39.258286+00
ba421bf6-07de-4a3d-bd64-c150aa22e5e7	sasas	820ffd81-7a02-4a36-ad73-486504f0fe5f	1	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-13 00:38:23.754262+00
\.


--
-- TOC entry 3888 (class 0 OID 17330)
-- Dependencies: 305
-- Data for Name: pembelian; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pembelian (id, bahan_baku_id, jumlah, harga_beli, tanggal, catatan, user_id, supplier_id, kemasan_id, asal_barang) FROM stdin;
3f93d17a-3ad2-462a-9dcf-b29c8bf8927e	0bc7f68f-25f4-4392-96e6-ed13a90248f1	1	250000	2025-08-12 00:00:00+00	\N	3798ff14-acf7-40bd-a6bd-819f8479b880	bc219ee7-5945-468c-8dea-b68da385b53f	aea969ec-a4d6-4389-9ffb-716506ff0684	reservasi
0d9a5f1b-29fa-45f1-8c19-375bbe43bde6	0bc7f68f-25f4-4392-96e6-ed13a90248f1	1	2500000	2025-08-12 00:00:00+00	\N	3798ff14-acf7-40bd-a6bd-819f8479b880	bc219ee7-5945-468c-8dea-b68da385b53f	aea969ec-a4d6-4389-9ffb-716506ff0684	reservasi
4a4e2897-9b97-498e-8579-68fb311d0d50	23bb32d5-4fd0-49a2-aaaa-96e5a93910ac	10	25000	2025-08-12 00:00:00+00	\N	3798ff14-acf7-40bd-a6bd-819f8479b880	\N	\N	langsung
\.


--
-- TOC entry 3889 (class 0 OID 17350)
-- Dependencies: 306
-- Data for Name: penjualan; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.penjualan (id, produk_jadi_id, jumlah, total_harga, tanggal, catatan, user_id) FROM stdin;
1b80af1c-cb79-4b4d-b0e1-3a4b20ff62e1	4cebe159-502c-4537-8531-209a80458931	1	25000	2025-08-12 00:00:00+00	\N	3798ff14-acf7-40bd-a6bd-819f8479b880
b260aaec-713e-4d5d-bb6d-7469c661e663	4cebe159-502c-4537-8531-209a80458931	9	225000	2025-08-12 00:00:00+00	\N	3798ff14-acf7-40bd-a6bd-819f8479b880
\.


--
-- TOC entry 3886 (class 0 OID 17288)
-- Dependencies: 303
-- Data for Name: produk_jadi; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.produk_jadi (id, nama_produk_jadi, sku, harga_jual, user_id, created_at) FROM stdin;
4cebe159-502c-4537-8531-209a80458931	ONE MILION - 30 ML	ONE317057	25000	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-12 13:45:24.670878+00
\.


--
-- TOC entry 3887 (class 0 OID 17305)
-- Dependencies: 304
-- Data for Name: resep; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.resep (id, produk_jadi_id, bahan_baku_id, jumlah_dibutuhkan, user_id) FROM stdin;
af879e7f-27a8-4f3b-9280-b9a25b777b23	4cebe159-502c-4537-8531-209a80458931	23bb32d5-4fd0-49a2-aaaa-96e5a93910ac	1	3798ff14-acf7-40bd-a6bd-819f8479b880
dad5fa66-7310-4295-97c9-65d8dc7e577c	4cebe159-502c-4537-8531-209a80458931	0bc7f68f-25f4-4392-96e6-ed13a90248f1	15	3798ff14-acf7-40bd-a6bd-819f8479b880
\.


--
-- TOC entry 3894 (class 0 OID 18719)
-- Dependencies: 312
-- Data for Name: reservasi_stok_supplier; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reservasi_stok_supplier (id, bahan_baku_id, supplier_id, jumlah_reservasi, catatan, user_id, created_at, updated_at, kemasan_id) FROM stdin;
6150657b-adb4-4d74-8a31-b5fce2ea580d	0bc7f68f-25f4-4392-96e6-ed13a90248f1	bc219ee7-5945-468c-8dea-b68da385b53f	199		3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-12 14:28:03.316603+00	2025-08-12 14:28:44.101625+00	aea969ec-a4d6-4389-9ffb-716506ff0684
\.


--
-- TOC entry 3890 (class 0 OID 18648)
-- Dependencies: 308
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.suppliers (id, nama_supplier, kontak, alamat, user_id, created_at) FROM stdin;
bc219ee7-5945-468c-8dea-b68da385b53f	PT NILAM WIDURI	0812312782878	NILAM WIDURI JAKARTA	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-12 11:15:58.16648+00
d4d03686-6d01-4e74-a22b-95bfd6389ecd	PT KREASTIKA	088544848578	\N	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-13 00:14:02.702085+00
\.


--
-- TOC entry 3892 (class 0 OID 18680)
-- Dependencies: 310
-- Data for Name: unit_dasar; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.unit_dasar (id, nama_unit, deskripsi, user_id, created_at) FROM stdin;
820ffd81-7a02-4a36-ad73-486504f0fe5f	Pcs	Satuan Pices	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-12 10:17:56.85954+00
bb0f9e26-83de-4ccf-9866-9f50820f61bc	ml	1000 Mili Liter = 1 Liter	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-12 10:18:19.077091+00
\.


--
-- TOC entry 3615 (class 2606 OID 17282)
-- Name: bahan_baku bahan_baku_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bahan_baku
    ADD CONSTRAINT bahan_baku_pkey PRIMARY KEY (id);


--
-- TOC entry 3640 (class 2606 OID 18673)
-- Name: kategori kategori_nama_kategori_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kategori
    ADD CONSTRAINT kategori_nama_kategori_key UNIQUE (nama_kategori);


--
-- TOC entry 3642 (class 2606 OID 18671)
-- Name: kategori kategori_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kategori
    ADD CONSTRAINT kategori_pkey PRIMARY KEY (id);


--
-- TOC entry 3651 (class 2606 OID 18707)
-- Name: kemasan kemasan_nama_kemasan_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kemasan
    ADD CONSTRAINT kemasan_nama_kemasan_user_id_key UNIQUE (nama_kemasan, user_id);


--
-- TOC entry 3653 (class 2606 OID 18705)
-- Name: kemasan kemasan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kemasan
    ADD CONSTRAINT kemasan_pkey PRIMARY KEY (id);


--
-- TOC entry 3632 (class 2606 OID 17339)
-- Name: pembelian pembelian_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pembelian
    ADD CONSTRAINT pembelian_pkey PRIMARY KEY (id);


--
-- TOC entry 3634 (class 2606 OID 17359)
-- Name: penjualan penjualan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penjualan
    ADD CONSTRAINT penjualan_pkey PRIMARY KEY (id);


--
-- TOC entry 3621 (class 2606 OID 17297)
-- Name: produk_jadi produk_jadi_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produk_jadi
    ADD CONSTRAINT produk_jadi_pkey PRIMARY KEY (id);


--
-- TOC entry 3623 (class 2606 OID 17299)
-- Name: produk_jadi produk_jadi_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produk_jadi
    ADD CONSTRAINT produk_jadi_sku_key UNIQUE (sku);


--
-- TOC entry 3625 (class 2606 OID 17312)
-- Name: resep resep_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resep
    ADD CONSTRAINT resep_pkey PRIMARY KEY (id);


--
-- TOC entry 3627 (class 2606 OID 17314)
-- Name: resep resep_produk_jadi_id_bahan_baku_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resep
    ADD CONSTRAINT resep_produk_jadi_id_bahan_baku_id_key UNIQUE (produk_jadi_id, bahan_baku_id);


--
-- TOC entry 3661 (class 2606 OID 18728)
-- Name: reservasi_stok_supplier reservasi_stok_supplier_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservasi_stok_supplier
    ADD CONSTRAINT reservasi_stok_supplier_pkey PRIMARY KEY (id);


--
-- TOC entry 3637 (class 2606 OID 18656)
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- TOC entry 3645 (class 2606 OID 18690)
-- Name: unit_dasar unit_dasar_nama_unit_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit_dasar
    ADD CONSTRAINT unit_dasar_nama_unit_key UNIQUE (nama_unit);


--
-- TOC entry 3647 (class 2606 OID 18688)
-- Name: unit_dasar unit_dasar_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit_dasar
    ADD CONSTRAINT unit_dasar_pkey PRIMARY KEY (id);


--
-- TOC entry 3616 (class 1259 OID 18790)
-- Name: idx_bahan_baku_kategori_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bahan_baku_kategori_id ON public.bahan_baku USING btree (kategori_id);


--
-- TOC entry 3617 (class 1259 OID 20115)
-- Name: idx_bahan_baku_supplier_eksklusif; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bahan_baku_supplier_eksklusif ON public.bahan_baku USING btree (supplier_eksklusif_id) WHERE (supplier_eksklusif_id IS NOT NULL);


--
-- TOC entry 3618 (class 1259 OID 18791)
-- Name: idx_bahan_baku_unit_dasar_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bahan_baku_unit_dasar_id ON public.bahan_baku USING btree (unit_dasar_id);


--
-- TOC entry 3619 (class 1259 OID 20116)
-- Name: idx_bahan_baku_user_supplier_eksklusif; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bahan_baku_user_supplier_eksklusif ON public.bahan_baku USING btree (user_id, supplier_eksklusif_id);


--
-- TOC entry 3638 (class 1259 OID 18798)
-- Name: idx_kategori_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kategori_user_id ON public.kategori USING btree (user_id);


--
-- TOC entry 3648 (class 1259 OID 18796)
-- Name: idx_kemasan_unit_dasar_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kemasan_unit_dasar_id ON public.kemasan USING btree (unit_dasar_id);


--
-- TOC entry 3649 (class 1259 OID 18800)
-- Name: idx_kemasan_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kemasan_user_id ON public.kemasan USING btree (user_id);


--
-- TOC entry 3628 (class 1259 OID 18793)
-- Name: idx_pembelian_kemasan_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pembelian_kemasan_id ON public.pembelian USING btree (kemasan_id);


--
-- TOC entry 3629 (class 1259 OID 20066)
-- Name: idx_pembelian_reservasi; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pembelian_reservasi ON public.pembelian USING btree (supplier_id, bahan_baku_id, kemasan_id) WHERE (asal_barang = 'reservasi'::text);


--
-- TOC entry 3630 (class 1259 OID 18792)
-- Name: idx_pembelian_supplier_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pembelian_supplier_id ON public.pembelian USING btree (supplier_id);


--
-- TOC entry 3654 (class 1259 OID 18794)
-- Name: idx_reservasi_bahan_baku_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reservasi_bahan_baku_id ON public.reservasi_stok_supplier USING btree (bahan_baku_id);


--
-- TOC entry 3655 (class 1259 OID 19932)
-- Name: idx_reservasi_stok_supplier_kemasan_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reservasi_stok_supplier_kemasan_id ON public.reservasi_stok_supplier USING btree (kemasan_id);


--
-- TOC entry 3656 (class 1259 OID 20029)
-- Name: idx_reservasi_supplier_bahan_kemasan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reservasi_supplier_bahan_kemasan ON public.reservasi_stok_supplier USING btree (supplier_id, bahan_baku_id, kemasan_id);


--
-- TOC entry 3657 (class 1259 OID 18795)
-- Name: idx_reservasi_supplier_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reservasi_supplier_id ON public.reservasi_stok_supplier USING btree (supplier_id);


--
-- TOC entry 3658 (class 1259 OID 20030)
-- Name: idx_reservasi_user_aktif; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reservasi_user_aktif ON public.reservasi_stok_supplier USING btree (user_id) WHERE (jumlah_reservasi > (0)::numeric);


--
-- TOC entry 3659 (class 1259 OID 18801)
-- Name: idx_reservasi_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reservasi_user_id ON public.reservasi_stok_supplier USING btree (user_id);


--
-- TOC entry 3635 (class 1259 OID 18797)
-- Name: idx_suppliers_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_suppliers_user_id ON public.suppliers USING btree (user_id);


--
-- TOC entry 3643 (class 1259 OID 18799)
-- Name: idx_unit_dasar_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_unit_dasar_user_id ON public.unit_dasar USING btree (user_id);


--
-- TOC entry 3685 (class 2620 OID 18773)
-- Name: pembelian trigger_handle_pembelian; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_handle_pembelian AFTER INSERT ON public.pembelian FOR EACH ROW EXECUTE FUNCTION public.handle_pembelian_stok();


--
-- TOC entry 3688 (class 2620 OID 18775)
-- Name: reservasi_stok_supplier trigger_update_reservasi_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_reservasi_timestamp BEFORE UPDATE ON public.reservasi_stok_supplier FOR EACH ROW EXECUTE FUNCTION public.update_reservasi_timestamp();


--
-- TOC entry 3687 (class 2620 OID 17371)
-- Name: penjualan trigger_update_stok_penjualan; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_stok_penjualan AFTER INSERT ON public.penjualan FOR EACH ROW EXECUTE FUNCTION public.update_stok_penjualan();


--
-- TOC entry 3686 (class 2620 OID 20119)
-- Name: pembelian trigger_validate_supplier_eksklusif; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_validate_supplier_eksklusif BEFORE INSERT OR UPDATE ON public.pembelian FOR EACH ROW EXECUTE FUNCTION public.trigger_validate_pembelian_supplier_eksklusif();


--
-- TOC entry 3662 (class 2606 OID 18750)
-- Name: bahan_baku bahan_baku_kategori_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bahan_baku
    ADD CONSTRAINT bahan_baku_kategori_id_fkey FOREIGN KEY (kategori_id) REFERENCES public.kategori(id);


--
-- TOC entry 3663 (class 2606 OID 20110)
-- Name: bahan_baku bahan_baku_supplier_eksklusif_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bahan_baku
    ADD CONSTRAINT bahan_baku_supplier_eksklusif_id_fkey FOREIGN KEY (supplier_eksklusif_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- TOC entry 3664 (class 2606 OID 18755)
-- Name: bahan_baku bahan_baku_unit_dasar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bahan_baku
    ADD CONSTRAINT bahan_baku_unit_dasar_id_fkey FOREIGN KEY (unit_dasar_id) REFERENCES public.unit_dasar(id);


--
-- TOC entry 3665 (class 2606 OID 17283)
-- Name: bahan_baku bahan_baku_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bahan_baku
    ADD CONSTRAINT bahan_baku_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3677 (class 2606 OID 18674)
-- Name: kategori kategori_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kategori
    ADD CONSTRAINT kategori_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3679 (class 2606 OID 18708)
-- Name: kemasan kemasan_unit_dasar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kemasan
    ADD CONSTRAINT kemasan_unit_dasar_id_fkey FOREIGN KEY (unit_dasar_id) REFERENCES public.unit_dasar(id);


--
-- TOC entry 3680 (class 2606 OID 18713)
-- Name: kemasan kemasan_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kemasan
    ADD CONSTRAINT kemasan_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3670 (class 2606 OID 17340)
-- Name: pembelian pembelian_bahan_baku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pembelian
    ADD CONSTRAINT pembelian_bahan_baku_id_fkey FOREIGN KEY (bahan_baku_id) REFERENCES public.bahan_baku(id) ON DELETE CASCADE;


--
-- TOC entry 3671 (class 2606 OID 18766)
-- Name: pembelian pembelian_kemasan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pembelian
    ADD CONSTRAINT pembelian_kemasan_id_fkey FOREIGN KEY (kemasan_id) REFERENCES public.kemasan(id);


--
-- TOC entry 3672 (class 2606 OID 18760)
-- Name: pembelian pembelian_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pembelian
    ADD CONSTRAINT pembelian_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- TOC entry 3673 (class 2606 OID 17345)
-- Name: pembelian pembelian_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pembelian
    ADD CONSTRAINT pembelian_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3674 (class 2606 OID 17360)
-- Name: penjualan penjualan_produk_jadi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penjualan
    ADD CONSTRAINT penjualan_produk_jadi_id_fkey FOREIGN KEY (produk_jadi_id) REFERENCES public.produk_jadi(id) ON DELETE CASCADE;


--
-- TOC entry 3675 (class 2606 OID 17365)
-- Name: penjualan penjualan_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penjualan
    ADD CONSTRAINT penjualan_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3666 (class 2606 OID 17300)
-- Name: produk_jadi produk_jadi_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produk_jadi
    ADD CONSTRAINT produk_jadi_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3667 (class 2606 OID 17320)
-- Name: resep resep_bahan_baku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resep
    ADD CONSTRAINT resep_bahan_baku_id_fkey FOREIGN KEY (bahan_baku_id) REFERENCES public.bahan_baku(id) ON DELETE CASCADE;


--
-- TOC entry 3668 (class 2606 OID 17315)
-- Name: resep resep_produk_jadi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resep
    ADD CONSTRAINT resep_produk_jadi_id_fkey FOREIGN KEY (produk_jadi_id) REFERENCES public.produk_jadi(id) ON DELETE CASCADE;


--
-- TOC entry 3669 (class 2606 OID 17325)
-- Name: resep resep_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resep
    ADD CONSTRAINT resep_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3681 (class 2606 OID 18729)
-- Name: reservasi_stok_supplier reservasi_stok_supplier_bahan_baku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservasi_stok_supplier
    ADD CONSTRAINT reservasi_stok_supplier_bahan_baku_id_fkey FOREIGN KEY (bahan_baku_id) REFERENCES public.bahan_baku(id) ON DELETE CASCADE;


--
-- TOC entry 3682 (class 2606 OID 19927)
-- Name: reservasi_stok_supplier reservasi_stok_supplier_kemasan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservasi_stok_supplier
    ADD CONSTRAINT reservasi_stok_supplier_kemasan_id_fkey FOREIGN KEY (kemasan_id) REFERENCES public.kemasan(id);


--
-- TOC entry 3683 (class 2606 OID 18734)
-- Name: reservasi_stok_supplier reservasi_stok_supplier_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservasi_stok_supplier
    ADD CONSTRAINT reservasi_stok_supplier_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- TOC entry 3684 (class 2606 OID 18739)
-- Name: reservasi_stok_supplier reservasi_stok_supplier_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservasi_stok_supplier
    ADD CONSTRAINT reservasi_stok_supplier_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3676 (class 2606 OID 18657)
-- Name: suppliers suppliers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3678 (class 2606 OID 18691)
-- Name: unit_dasar unit_dasar_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit_dasar
    ADD CONSTRAINT unit_dasar_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3862 (class 3256 OID 17385)
-- Name: bahan_baku Users can delete own bahan_baku; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own bahan_baku" ON public.bahan_baku FOR DELETE USING ((auth.uid() = user_id));


--
-- TOC entry 3874 (class 3256 OID 17397)
-- Name: pembelian Users can delete own pembelian; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own pembelian" ON public.pembelian FOR DELETE USING ((auth.uid() = user_id));


--
-- TOC entry 3878 (class 3256 OID 17401)
-- Name: penjualan Users can delete own penjualan; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own penjualan" ON public.penjualan FOR DELETE USING ((auth.uid() = user_id));


--
-- TOC entry 3866 (class 3256 OID 17389)
-- Name: produk_jadi Users can delete own produk_jadi; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own produk_jadi" ON public.produk_jadi FOR DELETE USING ((auth.uid() = user_id));


--
-- TOC entry 3870 (class 3256 OID 17393)
-- Name: resep Users can delete own resep; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own resep" ON public.resep FOR DELETE USING ((auth.uid() = user_id));


--
-- TOC entry 3860 (class 3256 OID 17383)
-- Name: bahan_baku Users can insert own bahan_baku; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own bahan_baku" ON public.bahan_baku FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 3872 (class 3256 OID 17395)
-- Name: pembelian Users can insert own pembelian; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own pembelian" ON public.pembelian FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 3876 (class 3256 OID 17399)
-- Name: penjualan Users can insert own penjualan; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own penjualan" ON public.penjualan FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 3864 (class 3256 OID 17387)
-- Name: produk_jadi Users can insert own produk_jadi; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own produk_jadi" ON public.produk_jadi FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 3868 (class 3256 OID 17391)
-- Name: resep Users can insert own resep; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own resep" ON public.resep FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 3880 (class 3256 OID 18679)
-- Name: kategori Users can manage own kategori; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage own kategori" ON public.kategori USING ((auth.uid() = user_id));


--
-- TOC entry 3882 (class 3256 OID 18718)
-- Name: kemasan Users can manage own kemasan; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage own kemasan" ON public.kemasan USING ((auth.uid() = user_id));


--
-- TOC entry 3883 (class 3256 OID 18744)
-- Name: reservasi_stok_supplier Users can manage own reservations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage own reservations" ON public.reservasi_stok_supplier USING ((auth.uid() = user_id));


--
-- TOC entry 3879 (class 3256 OID 18662)
-- Name: suppliers Users can manage own suppliers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage own suppliers" ON public.suppliers USING ((auth.uid() = user_id));


--
-- TOC entry 3881 (class 3256 OID 18696)
-- Name: unit_dasar Users can manage own unit_dasar; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage own unit_dasar" ON public.unit_dasar USING ((auth.uid() = user_id));


--
-- TOC entry 3861 (class 3256 OID 17384)
-- Name: bahan_baku Users can update own bahan_baku; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own bahan_baku" ON public.bahan_baku FOR UPDATE USING ((auth.uid() = user_id));


--
-- TOC entry 3873 (class 3256 OID 17396)
-- Name: pembelian Users can update own pembelian; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own pembelian" ON public.pembelian FOR UPDATE USING ((auth.uid() = user_id));


--
-- TOC entry 3877 (class 3256 OID 17400)
-- Name: penjualan Users can update own penjualan; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own penjualan" ON public.penjualan FOR UPDATE USING ((auth.uid() = user_id));


--
-- TOC entry 3865 (class 3256 OID 17388)
-- Name: produk_jadi Users can update own produk_jadi; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own produk_jadi" ON public.produk_jadi FOR UPDATE USING ((auth.uid() = user_id));


--
-- TOC entry 3869 (class 3256 OID 17392)
-- Name: resep Users can update own resep; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own resep" ON public.resep FOR UPDATE USING ((auth.uid() = user_id));


--
-- TOC entry 3859 (class 3256 OID 17382)
-- Name: bahan_baku Users can view own bahan_baku; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own bahan_baku" ON public.bahan_baku FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 3871 (class 3256 OID 17394)
-- Name: pembelian Users can view own pembelian; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own pembelian" ON public.pembelian FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 3875 (class 3256 OID 17398)
-- Name: penjualan Users can view own penjualan; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own penjualan" ON public.penjualan FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 3863 (class 3256 OID 17386)
-- Name: produk_jadi Users can view own produk_jadi; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own produk_jadi" ON public.produk_jadi FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 3867 (class 3256 OID 17390)
-- Name: resep Users can view own resep; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own resep" ON public.resep FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 3849 (class 0 OID 17273)
-- Dependencies: 302
-- Name: bahan_baku; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.bahan_baku ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3855 (class 0 OID 18663)
-- Dependencies: 309
-- Name: kategori; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.kategori ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3857 (class 0 OID 18697)
-- Dependencies: 311
-- Name: kemasan; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.kemasan ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3852 (class 0 OID 17330)
-- Dependencies: 305
-- Name: pembelian; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pembelian ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3853 (class 0 OID 17350)
-- Dependencies: 306
-- Name: penjualan; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.penjualan ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3850 (class 0 OID 17288)
-- Dependencies: 303
-- Name: produk_jadi; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.produk_jadi ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3851 (class 0 OID 17305)
-- Dependencies: 304
-- Name: resep; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.resep ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3858 (class 0 OID 18719)
-- Dependencies: 312
-- Name: reservasi_stok_supplier; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.reservasi_stok_supplier ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3854 (class 0 OID 18648)
-- Dependencies: 308
-- Name: suppliers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3856 (class 0 OID 18680)
-- Dependencies: 310
-- Name: unit_dasar; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.unit_dasar ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3901 (class 0 OID 0)
-- Dependencies: 13
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- TOC entry 3902 (class 0 OID 0)
-- Dependencies: 430
-- Name: FUNCTION check_stok_tersedia(produk_id uuid, jumlah_jual numeric); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.check_stok_tersedia(produk_id uuid, jumlah_jual numeric) TO anon;
GRANT ALL ON FUNCTION public.check_stok_tersedia(produk_id uuid, jumlah_jual numeric) TO authenticated;
GRANT ALL ON FUNCTION public.check_stok_tersedia(produk_id uuid, jumlah_jual numeric) TO service_role;


--
-- TOC entry 3904 (class 0 OID 0)
-- Dependencies: 437
-- Name: FUNCTION get_pelanggaran_supplier_eksklusif(p_user_id uuid, p_bahan_baku_id uuid, p_start_date date, p_end_date date); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_pelanggaran_supplier_eksklusif(p_user_id uuid, p_bahan_baku_id uuid, p_start_date date, p_end_date date) TO anon;
GRANT ALL ON FUNCTION public.get_pelanggaran_supplier_eksklusif(p_user_id uuid, p_bahan_baku_id uuid, p_start_date date, p_end_date date) TO authenticated;
GRANT ALL ON FUNCTION public.get_pelanggaran_supplier_eksklusif(p_user_id uuid, p_bahan_baku_id uuid, p_start_date date, p_end_date date) TO service_role;


--
-- TOC entry 3906 (class 0 OID 0)
-- Dependencies: 432
-- Name: FUNCTION handle_pembelian_stok(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_pembelian_stok() TO anon;
GRANT ALL ON FUNCTION public.handle_pembelian_stok() TO authenticated;
GRANT ALL ON FUNCTION public.handle_pembelian_stok() TO service_role;


--
-- TOC entry 3907 (class 0 OID 0)
-- Dependencies: 431
-- Name: FUNCTION hitung_max_produksi(produk_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hitung_max_produksi(produk_id uuid) TO anon;
GRANT ALL ON FUNCTION public.hitung_max_produksi(produk_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.hitung_max_produksi(produk_id uuid) TO service_role;


--
-- TOC entry 3908 (class 0 OID 0)
-- Dependencies: 436
-- Name: FUNCTION trigger_validate_pembelian_supplier_eksklusif(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trigger_validate_pembelian_supplier_eksklusif() TO anon;
GRANT ALL ON FUNCTION public.trigger_validate_pembelian_supplier_eksklusif() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_validate_pembelian_supplier_eksklusif() TO service_role;


--
-- TOC entry 3909 (class 0 OID 0)
-- Dependencies: 433
-- Name: FUNCTION update_reservasi_timestamp(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_reservasi_timestamp() TO anon;
GRANT ALL ON FUNCTION public.update_reservasi_timestamp() TO authenticated;
GRANT ALL ON FUNCTION public.update_reservasi_timestamp() TO service_role;


--
-- TOC entry 3910 (class 0 OID 0)
-- Dependencies: 429
-- Name: FUNCTION update_stok_penjualan(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_stok_penjualan() TO anon;
GRANT ALL ON FUNCTION public.update_stok_penjualan() TO authenticated;
GRANT ALL ON FUNCTION public.update_stok_penjualan() TO service_role;


--
-- TOC entry 3912 (class 0 OID 0)
-- Dependencies: 434
-- Name: FUNCTION validate_reservasi_consistency(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.validate_reservasi_consistency() TO anon;
GRANT ALL ON FUNCTION public.validate_reservasi_consistency() TO authenticated;
GRANT ALL ON FUNCTION public.validate_reservasi_consistency() TO service_role;


--
-- TOC entry 3914 (class 0 OID 0)
-- Dependencies: 435
-- Name: FUNCTION validate_supplier_eksklusif(p_bahan_baku_id uuid, p_supplier_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.validate_supplier_eksklusif(p_bahan_baku_id uuid, p_supplier_id uuid) TO anon;
GRANT ALL ON FUNCTION public.validate_supplier_eksklusif(p_bahan_baku_id uuid, p_supplier_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.validate_supplier_eksklusif(p_bahan_baku_id uuid, p_supplier_id uuid) TO service_role;


--
-- TOC entry 3916 (class 0 OID 0)
-- Dependencies: 302
-- Name: TABLE bahan_baku; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bahan_baku TO anon;
GRANT ALL ON TABLE public.bahan_baku TO authenticated;
GRANT ALL ON TABLE public.bahan_baku TO service_role;


--
-- TOC entry 3917 (class 0 OID 0)
-- Dependencies: 306
-- Name: TABLE penjualan; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.penjualan TO anon;
GRANT ALL ON TABLE public.penjualan TO authenticated;
GRANT ALL ON TABLE public.penjualan TO service_role;


--
-- TOC entry 3918 (class 0 OID 0)
-- Dependencies: 303
-- Name: TABLE produk_jadi; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.produk_jadi TO anon;
GRANT ALL ON TABLE public.produk_jadi TO authenticated;
GRANT ALL ON TABLE public.produk_jadi TO service_role;


--
-- TOC entry 3919 (class 0 OID 0)
-- Dependencies: 304
-- Name: TABLE resep; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.resep TO anon;
GRANT ALL ON TABLE public.resep TO authenticated;
GRANT ALL ON TABLE public.resep TO service_role;


--
-- TOC entry 3920 (class 0 OID 0)
-- Dependencies: 310
-- Name: TABLE unit_dasar; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.unit_dasar TO anon;
GRANT ALL ON TABLE public.unit_dasar TO authenticated;
GRANT ALL ON TABLE public.unit_dasar TO service_role;


--
-- TOC entry 3921 (class 0 OID 0)
-- Dependencies: 316
-- Name: TABLE bahan_baku_terlaris_detail; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bahan_baku_terlaris_detail TO anon;
GRANT ALL ON TABLE public.bahan_baku_terlaris_detail TO authenticated;
GRANT ALL ON TABLE public.bahan_baku_terlaris_detail TO service_role;


--
-- TOC entry 3922 (class 0 OID 0)
-- Dependencies: 318
-- Name: TABLE bahan_baku_terlaris_filter; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bahan_baku_terlaris_filter TO anon;
GRANT ALL ON TABLE public.bahan_baku_terlaris_filter TO authenticated;
GRANT ALL ON TABLE public.bahan_baku_terlaris_filter TO service_role;


--
-- TOC entry 3923 (class 0 OID 0)
-- Dependencies: 317
-- Name: TABLE bahan_baku_top20_chart; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bahan_baku_top20_chart TO anon;
GRANT ALL ON TABLE public.bahan_baku_top20_chart TO authenticated;
GRANT ALL ON TABLE public.bahan_baku_top20_chart TO service_role;


--
-- TOC entry 3924 (class 0 OID 0)
-- Dependencies: 320
-- Name: TABLE dashboard_bahan_baku_terlaris; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.dashboard_bahan_baku_terlaris TO anon;
GRANT ALL ON TABLE public.dashboard_bahan_baku_terlaris TO authenticated;
GRANT ALL ON TABLE public.dashboard_bahan_baku_terlaris TO service_role;


--
-- TOC entry 3925 (class 0 OID 0)
-- Dependencies: 309
-- Name: TABLE kategori; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.kategori TO anon;
GRANT ALL ON TABLE public.kategori TO authenticated;
GRANT ALL ON TABLE public.kategori TO service_role;


--
-- TOC entry 3926 (class 0 OID 0)
-- Dependencies: 311
-- Name: TABLE kemasan; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.kemasan TO anon;
GRANT ALL ON TABLE public.kemasan TO authenticated;
GRANT ALL ON TABLE public.kemasan TO service_role;


--
-- TOC entry 3927 (class 0 OID 0)
-- Dependencies: 305
-- Name: TABLE pembelian; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pembelian TO anon;
GRANT ALL ON TABLE public.pembelian TO authenticated;
GRANT ALL ON TABLE public.pembelian TO service_role;


--
-- TOC entry 3928 (class 0 OID 0)
-- Dependencies: 308
-- Name: TABLE suppliers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.suppliers TO anon;
GRANT ALL ON TABLE public.suppliers TO authenticated;
GRANT ALL ON TABLE public.suppliers TO service_role;


--
-- TOC entry 3930 (class 0 OID 0)
-- Dependencies: 323
-- Name: TABLE laporan_akuntabilitas_supplier_eksklusif; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.laporan_akuntabilitas_supplier_eksklusif TO anon;
GRANT ALL ON TABLE public.laporan_akuntabilitas_supplier_eksklusif TO authenticated;
GRANT ALL ON TABLE public.laporan_akuntabilitas_supplier_eksklusif TO service_role;


--
-- TOC entry 3931 (class 0 OID 0)
-- Dependencies: 315
-- Name: TABLE laporan_pemakaian_bahan_baku; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.laporan_pemakaian_bahan_baku TO anon;
GRANT ALL ON TABLE public.laporan_pemakaian_bahan_baku TO authenticated;
GRANT ALL ON TABLE public.laporan_pemakaian_bahan_baku TO service_role;


--
-- TOC entry 3932 (class 0 OID 0)
-- Dependencies: 307
-- Name: TABLE laporan_penjualan; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.laporan_penjualan TO anon;
GRANT ALL ON TABLE public.laporan_penjualan TO authenticated;
GRANT ALL ON TABLE public.laporan_penjualan TO service_role;


--
-- TOC entry 3934 (class 0 OID 0)
-- Dependencies: 312
-- Name: TABLE reservasi_stok_supplier; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.reservasi_stok_supplier TO anon;
GRANT ALL ON TABLE public.reservasi_stok_supplier TO authenticated;
GRANT ALL ON TABLE public.reservasi_stok_supplier TO service_role;


--
-- TOC entry 3935 (class 0 OID 0)
-- Dependencies: 319
-- Name: TABLE trend_pemakaian_bahan_baku; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.trend_pemakaian_bahan_baku TO anon;
GRANT ALL ON TABLE public.trend_pemakaian_bahan_baku TO authenticated;
GRANT ALL ON TABLE public.trend_pemakaian_bahan_baku TO service_role;


--
-- TOC entry 3937 (class 0 OID 0)
-- Dependencies: 321
-- Name: TABLE v_reservasi_stok_monitoring; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_reservasi_stok_monitoring TO anon;
GRANT ALL ON TABLE public.v_reservasi_stok_monitoring TO authenticated;
GRANT ALL ON TABLE public.v_reservasi_stok_monitoring TO service_role;


--
-- TOC entry 3938 (class 0 OID 0)
-- Dependencies: 314
-- Name: TABLE view_bahan_baku_detail; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.view_bahan_baku_detail TO anon;
GRANT ALL ON TABLE public.view_bahan_baku_detail TO authenticated;
GRANT ALL ON TABLE public.view_bahan_baku_detail TO service_role;


--
-- TOC entry 3939 (class 0 OID 0)
-- Dependencies: 322
-- Name: TABLE view_pembelian_detail; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.view_pembelian_detail TO anon;
GRANT ALL ON TABLE public.view_pembelian_detail TO authenticated;
GRANT ALL ON TABLE public.view_pembelian_detail TO service_role;


--
-- TOC entry 3940 (class 0 OID 0)
-- Dependencies: 313
-- Name: TABLE view_reservasi_stok_detail; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.view_reservasi_stok_detail TO anon;
GRANT ALL ON TABLE public.view_reservasi_stok_detail TO authenticated;
GRANT ALL ON TABLE public.view_reservasi_stok_detail TO service_role;


--
-- TOC entry 2393 (class 826 OID 16488)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- TOC entry 2394 (class 826 OID 16489)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- TOC entry 2392 (class 826 OID 16487)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- TOC entry 2396 (class 826 OID 16491)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- TOC entry 2391 (class 826 OID 16486)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- TOC entry 2395 (class 826 OID 16490)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


-- Completed on 2025-08-13 07:44:58

--
-- PostgreSQL database dump complete
--

