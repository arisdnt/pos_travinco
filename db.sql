--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.0

-- Started on 2025-08-13 20:24:47

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
-- TOC entry 3915 (class 0 OID 0)
-- Dependencies: 13
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 437 (class 1255 OID 17271)
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
-- TOC entry 444 (class 1255 OID 20125)
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
-- TOC entry 3918 (class 0 OID 0)
-- Dependencies: 444
-- Name: FUNCTION get_pelanggaran_supplier_eksklusif(p_user_id uuid, p_bahan_baku_id uuid, p_start_date date, p_end_date date); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_pelanggaran_supplier_eksklusif(p_user_id uuid, p_bahan_baku_id uuid, p_start_date date, p_end_date date) IS 'Mendapatkan detail pelanggaran aturan supplier eksklusif dengan filter opsional.';


--
-- TOC entry 439 (class 1255 OID 18772)
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
-- TOC entry 3920 (class 0 OID 0)
-- Dependencies: 439
-- Name: FUNCTION handle_pembelian_stok(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.handle_pembelian_stok() IS 'Fungsi trigger untuk menangani pembelian stok dengan validasi kemasan yang ketat. 
Memastikan kemasan pembelian sesuai dengan kemasan reservasi.';


--
-- TOC entry 438 (class 1255 OID 17272)
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
-- TOC entry 445 (class 1255 OID 21251)
-- Name: trigger_check_stok_penjualan(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_check_stok_penjualan() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Validate stock availability before inserting penjualan
  IF NOT public.check_stok_tersedia(NEW.produk_jadi_id, NEW.jumlah) THEN
    RAISE EXCEPTION 'Stok bahan baku tidak mencukupi untuk transaksi penjualan ini.';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_check_stok_penjualan() OWNER TO postgres;

--
-- TOC entry 443 (class 1255 OID 20118)
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
-- TOC entry 446 (class 1255 OID 21276)
-- Name: trigger_validate_reservasi_supplier_eksklusif(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_validate_reservasi_supplier_eksklusif() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Validate only on insert/update
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    -- If bahan baku has an exclusive supplier, reservasi supplier must match
    IF NOT public.validate_supplier_eksklusif(NEW.bahan_baku_id, NEW.supplier_id) THEN
      RAISE EXCEPTION 'Reservasi stok bahan baku ini hanya dapat dilakukan untuk supplier eksklusif yang telah ditentukan.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_validate_reservasi_supplier_eksklusif() OWNER TO postgres;

--
-- TOC entry 440 (class 1255 OID 18774)
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
-- TOC entry 436 (class 1255 OID 17270)
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
-- TOC entry 441 (class 1255 OID 20028)
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
-- TOC entry 3928 (class 0 OID 0)
-- Dependencies: 441
-- Name: FUNCTION validate_reservasi_consistency(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.validate_reservasi_consistency() IS 'Fungsi untuk validasi konsistensi data reservasi stok dan mendeteksi masalah.';


--
-- TOC entry 442 (class 1255 OID 20117)
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
-- TOC entry 3930 (class 0 OID 0)
-- Dependencies: 442
-- Name: FUNCTION validate_supplier_eksklusif(p_bahan_baku_id uuid, p_supplier_id uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.validate_supplier_eksklusif(p_bahan_baku_id uuid, p_supplier_id uuid) IS 'Memvalidasi apakah pembelian bahan baku dapat dilakukan dari supplier tertentu berdasarkan aturan supplier eksklusif.';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 308 (class 1259 OID 17273)
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
-- TOC entry 3932 (class 0 OID 0)
-- Dependencies: 308
-- Name: COLUMN bahan_baku.supplier_eksklusif_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.bahan_baku.supplier_eksklusif_id IS 'ID supplier yang menjadi supplier eksklusif untuk bahan baku ini. Jika diisi, maka pembelian bahan baku ini hanya bisa dari supplier yang ditentukan.';


--
-- TOC entry 312 (class 1259 OID 17350)
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
-- TOC entry 309 (class 1259 OID 17288)
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
-- TOC entry 310 (class 1259 OID 17305)
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
-- TOC entry 316 (class 1259 OID 18680)
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
-- TOC entry 322 (class 1259 OID 19966)
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
-- TOC entry 324 (class 1259 OID 19976)
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
-- TOC entry 323 (class 1259 OID 19971)
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
-- TOC entry 326 (class 1259 OID 19986)
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
-- TOC entry 315 (class 1259 OID 18663)
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
-- TOC entry 317 (class 1259 OID 18697)
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
-- TOC entry 311 (class 1259 OID 17330)
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
-- TOC entry 314 (class 1259 OID 18648)
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
-- TOC entry 329 (class 1259 OID 20120)
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
-- TOC entry 3946 (class 0 OID 0)
-- Dependencies: 329
-- Name: VIEW laporan_akuntabilitas_supplier_eksklusif; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.laporan_akuntabilitas_supplier_eksklusif IS 'View untuk laporan akuntabilitas supplier eksklusif, menampilkan statistik pembelian dan deteksi pelanggaran aturan supplier eksklusif.';


--
-- TOC entry 321 (class 1259 OID 19961)
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
-- TOC entry 313 (class 1259 OID 17377)
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
-- TOC entry 318 (class 1259 OID 18719)
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
-- TOC entry 3950 (class 0 OID 0)
-- Dependencies: 318
-- Name: COLUMN reservasi_stok_supplier.kemasan_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.reservasi_stok_supplier.kemasan_id IS 'Reference to packaging unit used during input (for tracking purposes). The jumlah_reservasi is always stored in base unit.';


--
-- TOC entry 325 (class 1259 OID 19981)
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
-- TOC entry 327 (class 1259 OID 20023)
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
-- TOC entry 3953 (class 0 OID 0)
-- Dependencies: 327
-- Name: VIEW v_reservasi_stok_monitoring; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_reservasi_stok_monitoring IS 'View untuk monitoring reservasi stok dengan informasi kemasan yang user-friendly.';


--
-- TOC entry 320 (class 1259 OID 19956)
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
-- TOC entry 328 (class 1259 OID 20061)
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
-- TOC entry 330 (class 1259 OID 21300)
-- Name: view_pergerakan_bahan_baku; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.view_pergerakan_bahan_baku AS
 SELECT bb.id AS bahan_baku_id,
    p.tanggal,
    'Pembelian'::text AS jenis,
    p.id AS ref_id,
    ('Dari supplier: '::text || COALESCE(s.nama_supplier, ''::text)) AS keterangan,
    p.jumlah,
    ud.nama_unit AS unit
   FROM (((public.pembelian p
     JOIN public.bahan_baku bb ON ((p.bahan_baku_id = bb.id)))
     LEFT JOIN public.suppliers s ON ((p.supplier_id = s.id)))
     LEFT JOIN public.unit_dasar ud ON ((bb.unit_dasar_id = ud.id)))
UNION ALL
 SELECT bb.id AS bahan_baku_id,
    pj.tanggal,
    'Pemakaian'::text AS jenis,
    pj.id AS ref_id,
    ('Untuk produk: '::text || COALESCE(pj_prod.nama_produk_jadi, ''::text)) AS keterangan,
    (r.jumlah_dibutuhkan * pj.jumlah) AS jumlah,
    ud.nama_unit AS unit
   FROM ((((public.penjualan pj
     JOIN public.resep r ON ((r.produk_jadi_id = pj.produk_jadi_id)))
     JOIN public.bahan_baku bb ON ((r.bahan_baku_id = bb.id)))
     LEFT JOIN public.produk_jadi pj_prod ON ((pj.produk_jadi_id = pj_prod.id)))
     LEFT JOIN public.unit_dasar ud ON ((bb.unit_dasar_id = ud.id)));


ALTER VIEW public.view_pergerakan_bahan_baku OWNER TO postgres;

--
-- TOC entry 319 (class 1259 OID 18776)
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
-- TOC entry 3900 (class 0 OID 17273)
-- Dependencies: 308
-- Data for Name: bahan_baku; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bahan_baku (id, nama_bahan_baku, stok, user_id, created_at, kategori_id, unit_dasar_id, supplier_eksklusif_id) FROM stdin;
86029daa-d1de-4312-bdac-d2832736d8c0	BIBIT LUNCY	85	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-13 12:23:14.124517+00	ef0384c5-09fa-4ce8-ac67-9cc4436dc1a8	bc11d116-e086-45c8-8d39-bdf82f7c576d	\N
1e9b4def-e4f0-446a-a522-cdb4a0f19477	BOTOL LELABO 30 ML	10	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-13 12:33:08.588974+00	42d6cd1a-edc9-4c81-b1c5-439553804901	bc11d116-e086-45c8-8d39-bdf82f7c576d	f40d1f3b-54ed-4372-9c44-501ca42e00b2
\.


--
-- TOC entry 3906 (class 0 OID 18663)
-- Dependencies: 315
-- Data for Name: kategori; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.kategori (id, nama_kategori, deskripsi, user_id, created_at) FROM stdin;
42d6cd1a-edc9-4c81-b1c5-439553804901	BOTOL	\N	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-13 05:10:53.229089+00
ef0384c5-09fa-4ce8-ac67-9cc4436dc1a8	BIBIT	\N	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-13 05:26:36.281639+00
\.


--
-- TOC entry 3908 (class 0 OID 18697)
-- Dependencies: 317
-- Data for Name: kemasan; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.kemasan (id, nama_kemasan, unit_dasar_id, nilai_konversi, user_id, created_at) FROM stdin;
f118801f-e72a-4b21-89a9-daca94017625	100ml	bc11d116-e086-45c8-8d39-bdf82f7c576d	100	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-13 05:11:47.319653+00
b0a4cec5-0530-4ebe-ab5f-277153835e66	500 ml	bc11d116-e086-45c8-8d39-bdf82f7c576d	500	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-13 05:11:57.487406+00
1211744d-4fe4-4273-b420-3a146a059c95	1 Lusin	0277184f-a272-4cda-9503-f2242474cfce	12	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-13 05:12:13.243077+00
629d1bf3-9331-462b-bbaf-bf685cc3a039	jerigen 5L	bc11d116-e086-45c8-8d39-bdf82f7c576d	5000	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-13 05:28:40.909419+00
\.


--
-- TOC entry 3903 (class 0 OID 17330)
-- Dependencies: 311
-- Data for Name: pembelian; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pembelian (id, bahan_baku_id, jumlah, harga_beli, tanggal, catatan, user_id, supplier_id, kemasan_id, asal_barang) FROM stdin;
9857e248-0cc8-4b40-9a62-b5192b14f7d7	86029daa-d1de-4312-bdac-d2832736d8c0	1	25000	2025-08-13 00:00:00+00	\N	3798ff14-acf7-40bd-a6bd-819f8479b880	ab9cb80f-e1db-4ca8-a8b6-dca1d00d7a7d	f118801f-e72a-4b21-89a9-daca94017625	reservasi
1e046666-301d-42b8-9845-c3454562d62b	1e9b4def-e4f0-446a-a522-cdb4a0f19477	1	5000	2025-08-13 00:00:00+00	\N	3798ff14-acf7-40bd-a6bd-819f8479b880	\N	\N	langsung
dbdc9225-6be1-4248-8f7b-8d87e6c92778	1e9b4def-e4f0-446a-a522-cdb4a0f19477	10	15000	2025-08-13 00:00:00+00	\N	3798ff14-acf7-40bd-a6bd-819f8479b880	\N	\N	langsung
\.


--
-- TOC entry 3904 (class 0 OID 17350)
-- Dependencies: 312
-- Data for Name: penjualan; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.penjualan (id, produk_jadi_id, jumlah, total_harga, tanggal, catatan, user_id) FROM stdin;
7df7dc93-1f1e-4a51-87d2-610337b98912	1250e62d-c8a7-4b23-b0b0-84d0fa64e101	1	25000	2025-08-13 00:00:00+00	\N	3798ff14-acf7-40bd-a6bd-819f8479b880
\.


--
-- TOC entry 3901 (class 0 OID 17288)
-- Dependencies: 309
-- Data for Name: produk_jadi; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.produk_jadi (id, nama_produk_jadi, sku, harga_jual, user_id, created_at) FROM stdin;
1250e62d-c8a7-4b23-b0b0-84d0fa64e101	EXTRAID LUNCY 30	EXT849820	25000	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-13 05:44:17.135578+00
39032499-2566-42a9-9322-f83277dca61d	LUNCY PLASTIKAN	LUN843289	25000	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-13 12:40:49.417928+00
\.


--
-- TOC entry 3902 (class 0 OID 17305)
-- Dependencies: 310
-- Data for Name: resep; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.resep (id, produk_jadi_id, bahan_baku_id, jumlah_dibutuhkan, user_id) FROM stdin;
b1b2369a-2410-42ca-a0eb-97f492bafb59	1250e62d-c8a7-4b23-b0b0-84d0fa64e101	86029daa-d1de-4312-bdac-d2832736d8c0	15	3798ff14-acf7-40bd-a6bd-819f8479b880
d033a1bb-2b6b-4ea4-8eb7-d94b4f7cda31	1250e62d-c8a7-4b23-b0b0-84d0fa64e101	1e9b4def-e4f0-446a-a522-cdb4a0f19477	1	3798ff14-acf7-40bd-a6bd-819f8479b880
\.


--
-- TOC entry 3909 (class 0 OID 18719)
-- Dependencies: 318
-- Data for Name: reservasi_stok_supplier; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reservasi_stok_supplier (id, bahan_baku_id, supplier_id, jumlah_reservasi, catatan, user_id, created_at, updated_at, kemasan_id) FROM stdin;
bcf075fd-c666-4292-bf83-48d7b991fe00	86029daa-d1de-4312-bdac-d2832736d8c0	ab9cb80f-e1db-4ca8-a8b6-dca1d00d7a7d	0		3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-13 12:32:08.614111+00	2025-08-13 12:32:34.629023+00	f118801f-e72a-4b21-89a9-daca94017625
6daca786-5248-49fc-9dc1-0d3394a0203f	1e9b4def-e4f0-446a-a522-cdb4a0f19477	ab9cb80f-e1db-4ca8-a8b6-dca1d00d7a7d	100		3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-13 12:51:00.868541+00	2025-08-13 12:51:00.868541+00	f118801f-e72a-4b21-89a9-daca94017625
\.


--
-- TOC entry 3905 (class 0 OID 18648)
-- Dependencies: 314
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.suppliers (id, nama_supplier, kontak, alamat, user_id, created_at) FROM stdin;
ab9cb80f-e1db-4ca8-a8b6-dca1d00d7a7d	PT NILAM	NILAM WIDURI	\N	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-13 12:22:12.614694+00
f40d1f3b-54ed-4372-9c44-501ca42e00b2	pt botol	\N	\N	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-13 12:50:29.824372+00
\.


--
-- TOC entry 3907 (class 0 OID 18680)
-- Dependencies: 316
-- Data for Name: unit_dasar; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.unit_dasar (id, nama_unit, deskripsi, user_id, created_at) FROM stdin;
bc11d116-e086-45c8-8d39-bdf82f7c576d	ml	\N	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-13 05:11:08.41781+00
0277184f-a272-4cda-9503-f2242474cfce	pcs	\N	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-13 05:11:16.807787+00
\.


--
-- TOC entry 3627 (class 2606 OID 17282)
-- Name: bahan_baku bahan_baku_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bahan_baku
    ADD CONSTRAINT bahan_baku_pkey PRIMARY KEY (id);


--
-- TOC entry 3652 (class 2606 OID 18673)
-- Name: kategori kategori_nama_kategori_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kategori
    ADD CONSTRAINT kategori_nama_kategori_key UNIQUE (nama_kategori);


--
-- TOC entry 3654 (class 2606 OID 18671)
-- Name: kategori kategori_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kategori
    ADD CONSTRAINT kategori_pkey PRIMARY KEY (id);


--
-- TOC entry 3663 (class 2606 OID 18707)
-- Name: kemasan kemasan_nama_kemasan_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kemasan
    ADD CONSTRAINT kemasan_nama_kemasan_user_id_key UNIQUE (nama_kemasan, user_id);


--
-- TOC entry 3665 (class 2606 OID 18705)
-- Name: kemasan kemasan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kemasan
    ADD CONSTRAINT kemasan_pkey PRIMARY KEY (id);


--
-- TOC entry 3644 (class 2606 OID 17339)
-- Name: pembelian pembelian_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pembelian
    ADD CONSTRAINT pembelian_pkey PRIMARY KEY (id);


--
-- TOC entry 3646 (class 2606 OID 17359)
-- Name: penjualan penjualan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penjualan
    ADD CONSTRAINT penjualan_pkey PRIMARY KEY (id);


--
-- TOC entry 3633 (class 2606 OID 17297)
-- Name: produk_jadi produk_jadi_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produk_jadi
    ADD CONSTRAINT produk_jadi_pkey PRIMARY KEY (id);


--
-- TOC entry 3635 (class 2606 OID 17299)
-- Name: produk_jadi produk_jadi_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produk_jadi
    ADD CONSTRAINT produk_jadi_sku_key UNIQUE (sku);


--
-- TOC entry 3637 (class 2606 OID 17312)
-- Name: resep resep_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resep
    ADD CONSTRAINT resep_pkey PRIMARY KEY (id);


--
-- TOC entry 3639 (class 2606 OID 17314)
-- Name: resep resep_produk_jadi_id_bahan_baku_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resep
    ADD CONSTRAINT resep_produk_jadi_id_bahan_baku_id_key UNIQUE (produk_jadi_id, bahan_baku_id);


--
-- TOC entry 3673 (class 2606 OID 18728)
-- Name: reservasi_stok_supplier reservasi_stok_supplier_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservasi_stok_supplier
    ADD CONSTRAINT reservasi_stok_supplier_pkey PRIMARY KEY (id);


--
-- TOC entry 3649 (class 2606 OID 18656)
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- TOC entry 3657 (class 2606 OID 18690)
-- Name: unit_dasar unit_dasar_nama_unit_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit_dasar
    ADD CONSTRAINT unit_dasar_nama_unit_key UNIQUE (nama_unit);


--
-- TOC entry 3659 (class 2606 OID 18688)
-- Name: unit_dasar unit_dasar_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit_dasar
    ADD CONSTRAINT unit_dasar_pkey PRIMARY KEY (id);


--
-- TOC entry 3628 (class 1259 OID 18790)
-- Name: idx_bahan_baku_kategori_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bahan_baku_kategori_id ON public.bahan_baku USING btree (kategori_id);


--
-- TOC entry 3629 (class 1259 OID 20115)
-- Name: idx_bahan_baku_supplier_eksklusif; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bahan_baku_supplier_eksklusif ON public.bahan_baku USING btree (supplier_eksklusif_id) WHERE (supplier_eksklusif_id IS NOT NULL);


--
-- TOC entry 3630 (class 1259 OID 18791)
-- Name: idx_bahan_baku_unit_dasar_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bahan_baku_unit_dasar_id ON public.bahan_baku USING btree (unit_dasar_id);


--
-- TOC entry 3631 (class 1259 OID 20116)
-- Name: idx_bahan_baku_user_supplier_eksklusif; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bahan_baku_user_supplier_eksklusif ON public.bahan_baku USING btree (user_id, supplier_eksklusif_id);


--
-- TOC entry 3650 (class 1259 OID 18798)
-- Name: idx_kategori_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kategori_user_id ON public.kategori USING btree (user_id);


--
-- TOC entry 3660 (class 1259 OID 18796)
-- Name: idx_kemasan_unit_dasar_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kemasan_unit_dasar_id ON public.kemasan USING btree (unit_dasar_id);


--
-- TOC entry 3661 (class 1259 OID 18800)
-- Name: idx_kemasan_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kemasan_user_id ON public.kemasan USING btree (user_id);


--
-- TOC entry 3640 (class 1259 OID 18793)
-- Name: idx_pembelian_kemasan_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pembelian_kemasan_id ON public.pembelian USING btree (kemasan_id);


--
-- TOC entry 3641 (class 1259 OID 20066)
-- Name: idx_pembelian_reservasi; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pembelian_reservasi ON public.pembelian USING btree (supplier_id, bahan_baku_id, kemasan_id) WHERE (asal_barang = 'reservasi'::text);


--
-- TOC entry 3642 (class 1259 OID 18792)
-- Name: idx_pembelian_supplier_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pembelian_supplier_id ON public.pembelian USING btree (supplier_id);


--
-- TOC entry 3666 (class 1259 OID 18794)
-- Name: idx_reservasi_bahan_baku_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reservasi_bahan_baku_id ON public.reservasi_stok_supplier USING btree (bahan_baku_id);


--
-- TOC entry 3667 (class 1259 OID 19932)
-- Name: idx_reservasi_stok_supplier_kemasan_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reservasi_stok_supplier_kemasan_id ON public.reservasi_stok_supplier USING btree (kemasan_id);


--
-- TOC entry 3668 (class 1259 OID 20029)
-- Name: idx_reservasi_supplier_bahan_kemasan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reservasi_supplier_bahan_kemasan ON public.reservasi_stok_supplier USING btree (supplier_id, bahan_baku_id, kemasan_id);


--
-- TOC entry 3669 (class 1259 OID 18795)
-- Name: idx_reservasi_supplier_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reservasi_supplier_id ON public.reservasi_stok_supplier USING btree (supplier_id);


--
-- TOC entry 3670 (class 1259 OID 20030)
-- Name: idx_reservasi_user_aktif; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reservasi_user_aktif ON public.reservasi_stok_supplier USING btree (user_id) WHERE (jumlah_reservasi > (0)::numeric);


--
-- TOC entry 3671 (class 1259 OID 18801)
-- Name: idx_reservasi_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reservasi_user_id ON public.reservasi_stok_supplier USING btree (user_id);


--
-- TOC entry 3647 (class 1259 OID 18797)
-- Name: idx_suppliers_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_suppliers_user_id ON public.suppliers USING btree (user_id);


--
-- TOC entry 3655 (class 1259 OID 18799)
-- Name: idx_unit_dasar_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_unit_dasar_user_id ON public.unit_dasar USING btree (user_id);


--
-- TOC entry 3699 (class 2620 OID 21252)
-- Name: penjualan trigger_check_stok_penjualan; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_check_stok_penjualan BEFORE INSERT ON public.penjualan FOR EACH ROW EXECUTE FUNCTION public.trigger_check_stok_penjualan();


--
-- TOC entry 3697 (class 2620 OID 18773)
-- Name: pembelian trigger_handle_pembelian; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_handle_pembelian AFTER INSERT ON public.pembelian FOR EACH ROW EXECUTE FUNCTION public.handle_pembelian_stok();


--
-- TOC entry 3701 (class 2620 OID 18775)
-- Name: reservasi_stok_supplier trigger_update_reservasi_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_reservasi_timestamp BEFORE UPDATE ON public.reservasi_stok_supplier FOR EACH ROW EXECUTE FUNCTION public.update_reservasi_timestamp();


--
-- TOC entry 3700 (class 2620 OID 17371)
-- Name: penjualan trigger_update_stok_penjualan; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_stok_penjualan AFTER INSERT ON public.penjualan FOR EACH ROW EXECUTE FUNCTION public.update_stok_penjualan();


--
-- TOC entry 3702 (class 2620 OID 21277)
-- Name: reservasi_stok_supplier trigger_validate_reservasi_supplier_eksklusif; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_validate_reservasi_supplier_eksklusif BEFORE INSERT OR UPDATE ON public.reservasi_stok_supplier FOR EACH ROW EXECUTE FUNCTION public.trigger_validate_reservasi_supplier_eksklusif();


--
-- TOC entry 3698 (class 2620 OID 20119)
-- Name: pembelian trigger_validate_supplier_eksklusif; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_validate_supplier_eksklusif BEFORE INSERT OR UPDATE ON public.pembelian FOR EACH ROW EXECUTE FUNCTION public.trigger_validate_pembelian_supplier_eksklusif();


--
-- TOC entry 3674 (class 2606 OID 18750)
-- Name: bahan_baku bahan_baku_kategori_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bahan_baku
    ADD CONSTRAINT bahan_baku_kategori_id_fkey FOREIGN KEY (kategori_id) REFERENCES public.kategori(id);


--
-- TOC entry 3675 (class 2606 OID 20110)
-- Name: bahan_baku bahan_baku_supplier_eksklusif_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bahan_baku
    ADD CONSTRAINT bahan_baku_supplier_eksklusif_id_fkey FOREIGN KEY (supplier_eksklusif_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- TOC entry 3676 (class 2606 OID 18755)
-- Name: bahan_baku bahan_baku_unit_dasar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bahan_baku
    ADD CONSTRAINT bahan_baku_unit_dasar_id_fkey FOREIGN KEY (unit_dasar_id) REFERENCES public.unit_dasar(id);


--
-- TOC entry 3677 (class 2606 OID 17283)
-- Name: bahan_baku bahan_baku_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bahan_baku
    ADD CONSTRAINT bahan_baku_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3689 (class 2606 OID 18674)
-- Name: kategori kategori_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kategori
    ADD CONSTRAINT kategori_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3691 (class 2606 OID 18708)
-- Name: kemasan kemasan_unit_dasar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kemasan
    ADD CONSTRAINT kemasan_unit_dasar_id_fkey FOREIGN KEY (unit_dasar_id) REFERENCES public.unit_dasar(id);


--
-- TOC entry 3692 (class 2606 OID 18713)
-- Name: kemasan kemasan_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kemasan
    ADD CONSTRAINT kemasan_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3682 (class 2606 OID 17340)
-- Name: pembelian pembelian_bahan_baku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pembelian
    ADD CONSTRAINT pembelian_bahan_baku_id_fkey FOREIGN KEY (bahan_baku_id) REFERENCES public.bahan_baku(id) ON DELETE CASCADE;


--
-- TOC entry 3683 (class 2606 OID 18766)
-- Name: pembelian pembelian_kemasan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pembelian
    ADD CONSTRAINT pembelian_kemasan_id_fkey FOREIGN KEY (kemasan_id) REFERENCES public.kemasan(id);


--
-- TOC entry 3684 (class 2606 OID 18760)
-- Name: pembelian pembelian_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pembelian
    ADD CONSTRAINT pembelian_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- TOC entry 3685 (class 2606 OID 17345)
-- Name: pembelian pembelian_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pembelian
    ADD CONSTRAINT pembelian_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3686 (class 2606 OID 17360)
-- Name: penjualan penjualan_produk_jadi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penjualan
    ADD CONSTRAINT penjualan_produk_jadi_id_fkey FOREIGN KEY (produk_jadi_id) REFERENCES public.produk_jadi(id) ON DELETE CASCADE;


--
-- TOC entry 3687 (class 2606 OID 17365)
-- Name: penjualan penjualan_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penjualan
    ADD CONSTRAINT penjualan_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3678 (class 2606 OID 17300)
-- Name: produk_jadi produk_jadi_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produk_jadi
    ADD CONSTRAINT produk_jadi_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3679 (class 2606 OID 17320)
-- Name: resep resep_bahan_baku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resep
    ADD CONSTRAINT resep_bahan_baku_id_fkey FOREIGN KEY (bahan_baku_id) REFERENCES public.bahan_baku(id) ON DELETE CASCADE;


--
-- TOC entry 3680 (class 2606 OID 17315)
-- Name: resep resep_produk_jadi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resep
    ADD CONSTRAINT resep_produk_jadi_id_fkey FOREIGN KEY (produk_jadi_id) REFERENCES public.produk_jadi(id) ON DELETE CASCADE;


--
-- TOC entry 3681 (class 2606 OID 17325)
-- Name: resep resep_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resep
    ADD CONSTRAINT resep_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3693 (class 2606 OID 18729)
-- Name: reservasi_stok_supplier reservasi_stok_supplier_bahan_baku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservasi_stok_supplier
    ADD CONSTRAINT reservasi_stok_supplier_bahan_baku_id_fkey FOREIGN KEY (bahan_baku_id) REFERENCES public.bahan_baku(id) ON DELETE CASCADE;


--
-- TOC entry 3694 (class 2606 OID 19927)
-- Name: reservasi_stok_supplier reservasi_stok_supplier_kemasan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservasi_stok_supplier
    ADD CONSTRAINT reservasi_stok_supplier_kemasan_id_fkey FOREIGN KEY (kemasan_id) REFERENCES public.kemasan(id);


--
-- TOC entry 3695 (class 2606 OID 18734)
-- Name: reservasi_stok_supplier reservasi_stok_supplier_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservasi_stok_supplier
    ADD CONSTRAINT reservasi_stok_supplier_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- TOC entry 3696 (class 2606 OID 18739)
-- Name: reservasi_stok_supplier reservasi_stok_supplier_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservasi_stok_supplier
    ADD CONSTRAINT reservasi_stok_supplier_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3688 (class 2606 OID 18657)
-- Name: suppliers suppliers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3690 (class 2606 OID 18691)
-- Name: unit_dasar unit_dasar_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit_dasar
    ADD CONSTRAINT unit_dasar_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3877 (class 3256 OID 17385)
-- Name: bahan_baku Users can delete own bahan_baku; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own bahan_baku" ON public.bahan_baku FOR DELETE USING ((auth.uid() = user_id));


--
-- TOC entry 3889 (class 3256 OID 17397)
-- Name: pembelian Users can delete own pembelian; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own pembelian" ON public.pembelian FOR DELETE USING ((auth.uid() = user_id));


--
-- TOC entry 3893 (class 3256 OID 17401)
-- Name: penjualan Users can delete own penjualan; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own penjualan" ON public.penjualan FOR DELETE USING ((auth.uid() = user_id));


--
-- TOC entry 3881 (class 3256 OID 17389)
-- Name: produk_jadi Users can delete own produk_jadi; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own produk_jadi" ON public.produk_jadi FOR DELETE USING ((auth.uid() = user_id));


--
-- TOC entry 3885 (class 3256 OID 17393)
-- Name: resep Users can delete own resep; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own resep" ON public.resep FOR DELETE USING ((auth.uid() = user_id));


--
-- TOC entry 3875 (class 3256 OID 17383)
-- Name: bahan_baku Users can insert own bahan_baku; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own bahan_baku" ON public.bahan_baku FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 3887 (class 3256 OID 17395)
-- Name: pembelian Users can insert own pembelian; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own pembelian" ON public.pembelian FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 3891 (class 3256 OID 17399)
-- Name: penjualan Users can insert own penjualan; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own penjualan" ON public.penjualan FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 3879 (class 3256 OID 17387)
-- Name: produk_jadi Users can insert own produk_jadi; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own produk_jadi" ON public.produk_jadi FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 3883 (class 3256 OID 17391)
-- Name: resep Users can insert own resep; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own resep" ON public.resep FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 3895 (class 3256 OID 18679)
-- Name: kategori Users can manage own kategori; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage own kategori" ON public.kategori USING ((auth.uid() = user_id));


--
-- TOC entry 3897 (class 3256 OID 18718)
-- Name: kemasan Users can manage own kemasan; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage own kemasan" ON public.kemasan USING ((auth.uid() = user_id));


--
-- TOC entry 3898 (class 3256 OID 18744)
-- Name: reservasi_stok_supplier Users can manage own reservations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage own reservations" ON public.reservasi_stok_supplier USING ((auth.uid() = user_id));


--
-- TOC entry 3894 (class 3256 OID 18662)
-- Name: suppliers Users can manage own suppliers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage own suppliers" ON public.suppliers USING ((auth.uid() = user_id));


--
-- TOC entry 3896 (class 3256 OID 18696)
-- Name: unit_dasar Users can manage own unit_dasar; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage own unit_dasar" ON public.unit_dasar USING ((auth.uid() = user_id));


--
-- TOC entry 3876 (class 3256 OID 17384)
-- Name: bahan_baku Users can update own bahan_baku; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own bahan_baku" ON public.bahan_baku FOR UPDATE USING ((auth.uid() = user_id));


--
-- TOC entry 3888 (class 3256 OID 17396)
-- Name: pembelian Users can update own pembelian; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own pembelian" ON public.pembelian FOR UPDATE USING ((auth.uid() = user_id));


--
-- TOC entry 3892 (class 3256 OID 17400)
-- Name: penjualan Users can update own penjualan; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own penjualan" ON public.penjualan FOR UPDATE USING ((auth.uid() = user_id));


--
-- TOC entry 3880 (class 3256 OID 17388)
-- Name: produk_jadi Users can update own produk_jadi; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own produk_jadi" ON public.produk_jadi FOR UPDATE USING ((auth.uid() = user_id));


--
-- TOC entry 3884 (class 3256 OID 17392)
-- Name: resep Users can update own resep; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own resep" ON public.resep FOR UPDATE USING ((auth.uid() = user_id));


--
-- TOC entry 3874 (class 3256 OID 17382)
-- Name: bahan_baku Users can view own bahan_baku; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own bahan_baku" ON public.bahan_baku FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 3886 (class 3256 OID 17394)
-- Name: pembelian Users can view own pembelian; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own pembelian" ON public.pembelian FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 3890 (class 3256 OID 17398)
-- Name: penjualan Users can view own penjualan; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own penjualan" ON public.penjualan FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 3878 (class 3256 OID 17386)
-- Name: produk_jadi Users can view own produk_jadi; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own produk_jadi" ON public.produk_jadi FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 3882 (class 3256 OID 17390)
-- Name: resep Users can view own resep; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own resep" ON public.resep FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 3864 (class 0 OID 17273)
-- Dependencies: 308
-- Name: bahan_baku; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.bahan_baku ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3870 (class 0 OID 18663)
-- Dependencies: 315
-- Name: kategori; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.kategori ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3872 (class 0 OID 18697)
-- Dependencies: 317
-- Name: kemasan; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.kemasan ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3867 (class 0 OID 17330)
-- Dependencies: 311
-- Name: pembelian; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pembelian ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3868 (class 0 OID 17350)
-- Dependencies: 312
-- Name: penjualan; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.penjualan ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3865 (class 0 OID 17288)
-- Dependencies: 309
-- Name: produk_jadi; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.produk_jadi ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3866 (class 0 OID 17305)
-- Dependencies: 310
-- Name: resep; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.resep ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3873 (class 0 OID 18719)
-- Dependencies: 318
-- Name: reservasi_stok_supplier; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.reservasi_stok_supplier ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3869 (class 0 OID 18648)
-- Dependencies: 314
-- Name: suppliers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3871 (class 0 OID 18680)
-- Dependencies: 316
-- Name: unit_dasar; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.unit_dasar ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3916 (class 0 OID 0)
-- Dependencies: 13
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- TOC entry 3917 (class 0 OID 0)
-- Dependencies: 437
-- Name: FUNCTION check_stok_tersedia(produk_id uuid, jumlah_jual numeric); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.check_stok_tersedia(produk_id uuid, jumlah_jual numeric) TO anon;
GRANT ALL ON FUNCTION public.check_stok_tersedia(produk_id uuid, jumlah_jual numeric) TO authenticated;
GRANT ALL ON FUNCTION public.check_stok_tersedia(produk_id uuid, jumlah_jual numeric) TO service_role;


--
-- TOC entry 3919 (class 0 OID 0)
-- Dependencies: 444
-- Name: FUNCTION get_pelanggaran_supplier_eksklusif(p_user_id uuid, p_bahan_baku_id uuid, p_start_date date, p_end_date date); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_pelanggaran_supplier_eksklusif(p_user_id uuid, p_bahan_baku_id uuid, p_start_date date, p_end_date date) TO anon;
GRANT ALL ON FUNCTION public.get_pelanggaran_supplier_eksklusif(p_user_id uuid, p_bahan_baku_id uuid, p_start_date date, p_end_date date) TO authenticated;
GRANT ALL ON FUNCTION public.get_pelanggaran_supplier_eksklusif(p_user_id uuid, p_bahan_baku_id uuid, p_start_date date, p_end_date date) TO service_role;


--
-- TOC entry 3921 (class 0 OID 0)
-- Dependencies: 439
-- Name: FUNCTION handle_pembelian_stok(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_pembelian_stok() TO anon;
GRANT ALL ON FUNCTION public.handle_pembelian_stok() TO authenticated;
GRANT ALL ON FUNCTION public.handle_pembelian_stok() TO service_role;


--
-- TOC entry 3922 (class 0 OID 0)
-- Dependencies: 438
-- Name: FUNCTION hitung_max_produksi(produk_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hitung_max_produksi(produk_id uuid) TO anon;
GRANT ALL ON FUNCTION public.hitung_max_produksi(produk_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.hitung_max_produksi(produk_id uuid) TO service_role;


--
-- TOC entry 3923 (class 0 OID 0)
-- Dependencies: 445
-- Name: FUNCTION trigger_check_stok_penjualan(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trigger_check_stok_penjualan() TO anon;
GRANT ALL ON FUNCTION public.trigger_check_stok_penjualan() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_check_stok_penjualan() TO service_role;


--
-- TOC entry 3924 (class 0 OID 0)
-- Dependencies: 443
-- Name: FUNCTION trigger_validate_pembelian_supplier_eksklusif(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trigger_validate_pembelian_supplier_eksklusif() TO anon;
GRANT ALL ON FUNCTION public.trigger_validate_pembelian_supplier_eksklusif() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_validate_pembelian_supplier_eksklusif() TO service_role;


--
-- TOC entry 3925 (class 0 OID 0)
-- Dependencies: 446
-- Name: FUNCTION trigger_validate_reservasi_supplier_eksklusif(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trigger_validate_reservasi_supplier_eksklusif() TO anon;
GRANT ALL ON FUNCTION public.trigger_validate_reservasi_supplier_eksklusif() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_validate_reservasi_supplier_eksklusif() TO service_role;


--
-- TOC entry 3926 (class 0 OID 0)
-- Dependencies: 440
-- Name: FUNCTION update_reservasi_timestamp(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_reservasi_timestamp() TO anon;
GRANT ALL ON FUNCTION public.update_reservasi_timestamp() TO authenticated;
GRANT ALL ON FUNCTION public.update_reservasi_timestamp() TO service_role;


--
-- TOC entry 3927 (class 0 OID 0)
-- Dependencies: 436
-- Name: FUNCTION update_stok_penjualan(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_stok_penjualan() TO anon;
GRANT ALL ON FUNCTION public.update_stok_penjualan() TO authenticated;
GRANT ALL ON FUNCTION public.update_stok_penjualan() TO service_role;


--
-- TOC entry 3929 (class 0 OID 0)
-- Dependencies: 441
-- Name: FUNCTION validate_reservasi_consistency(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.validate_reservasi_consistency() TO anon;
GRANT ALL ON FUNCTION public.validate_reservasi_consistency() TO authenticated;
GRANT ALL ON FUNCTION public.validate_reservasi_consistency() TO service_role;


--
-- TOC entry 3931 (class 0 OID 0)
-- Dependencies: 442
-- Name: FUNCTION validate_supplier_eksklusif(p_bahan_baku_id uuid, p_supplier_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.validate_supplier_eksklusif(p_bahan_baku_id uuid, p_supplier_id uuid) TO anon;
GRANT ALL ON FUNCTION public.validate_supplier_eksklusif(p_bahan_baku_id uuid, p_supplier_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.validate_supplier_eksklusif(p_bahan_baku_id uuid, p_supplier_id uuid) TO service_role;


--
-- TOC entry 3933 (class 0 OID 0)
-- Dependencies: 308
-- Name: TABLE bahan_baku; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bahan_baku TO anon;
GRANT ALL ON TABLE public.bahan_baku TO authenticated;
GRANT ALL ON TABLE public.bahan_baku TO service_role;


--
-- TOC entry 3934 (class 0 OID 0)
-- Dependencies: 312
-- Name: TABLE penjualan; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.penjualan TO anon;
GRANT ALL ON TABLE public.penjualan TO authenticated;
GRANT ALL ON TABLE public.penjualan TO service_role;


--
-- TOC entry 3935 (class 0 OID 0)
-- Dependencies: 309
-- Name: TABLE produk_jadi; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.produk_jadi TO anon;
GRANT ALL ON TABLE public.produk_jadi TO authenticated;
GRANT ALL ON TABLE public.produk_jadi TO service_role;


--
-- TOC entry 3936 (class 0 OID 0)
-- Dependencies: 310
-- Name: TABLE resep; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.resep TO anon;
GRANT ALL ON TABLE public.resep TO authenticated;
GRANT ALL ON TABLE public.resep TO service_role;


--
-- TOC entry 3937 (class 0 OID 0)
-- Dependencies: 316
-- Name: TABLE unit_dasar; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.unit_dasar TO anon;
GRANT ALL ON TABLE public.unit_dasar TO authenticated;
GRANT ALL ON TABLE public.unit_dasar TO service_role;


--
-- TOC entry 3938 (class 0 OID 0)
-- Dependencies: 322
-- Name: TABLE bahan_baku_terlaris_detail; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bahan_baku_terlaris_detail TO anon;
GRANT ALL ON TABLE public.bahan_baku_terlaris_detail TO authenticated;
GRANT ALL ON TABLE public.bahan_baku_terlaris_detail TO service_role;


--
-- TOC entry 3939 (class 0 OID 0)
-- Dependencies: 324
-- Name: TABLE bahan_baku_terlaris_filter; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bahan_baku_terlaris_filter TO anon;
GRANT ALL ON TABLE public.bahan_baku_terlaris_filter TO authenticated;
GRANT ALL ON TABLE public.bahan_baku_terlaris_filter TO service_role;


--
-- TOC entry 3940 (class 0 OID 0)
-- Dependencies: 323
-- Name: TABLE bahan_baku_top20_chart; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bahan_baku_top20_chart TO anon;
GRANT ALL ON TABLE public.bahan_baku_top20_chart TO authenticated;
GRANT ALL ON TABLE public.bahan_baku_top20_chart TO service_role;


--
-- TOC entry 3941 (class 0 OID 0)
-- Dependencies: 326
-- Name: TABLE dashboard_bahan_baku_terlaris; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.dashboard_bahan_baku_terlaris TO anon;
GRANT ALL ON TABLE public.dashboard_bahan_baku_terlaris TO authenticated;
GRANT ALL ON TABLE public.dashboard_bahan_baku_terlaris TO service_role;


--
-- TOC entry 3942 (class 0 OID 0)
-- Dependencies: 315
-- Name: TABLE kategori; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.kategori TO anon;
GRANT ALL ON TABLE public.kategori TO authenticated;
GRANT ALL ON TABLE public.kategori TO service_role;


--
-- TOC entry 3943 (class 0 OID 0)
-- Dependencies: 317
-- Name: TABLE kemasan; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.kemasan TO anon;
GRANT ALL ON TABLE public.kemasan TO authenticated;
GRANT ALL ON TABLE public.kemasan TO service_role;


--
-- TOC entry 3944 (class 0 OID 0)
-- Dependencies: 311
-- Name: TABLE pembelian; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pembelian TO anon;
GRANT ALL ON TABLE public.pembelian TO authenticated;
GRANT ALL ON TABLE public.pembelian TO service_role;


--
-- TOC entry 3945 (class 0 OID 0)
-- Dependencies: 314
-- Name: TABLE suppliers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.suppliers TO anon;
GRANT ALL ON TABLE public.suppliers TO authenticated;
GRANT ALL ON TABLE public.suppliers TO service_role;


--
-- TOC entry 3947 (class 0 OID 0)
-- Dependencies: 329
-- Name: TABLE laporan_akuntabilitas_supplier_eksklusif; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.laporan_akuntabilitas_supplier_eksklusif TO anon;
GRANT ALL ON TABLE public.laporan_akuntabilitas_supplier_eksklusif TO authenticated;
GRANT ALL ON TABLE public.laporan_akuntabilitas_supplier_eksklusif TO service_role;


--
-- TOC entry 3948 (class 0 OID 0)
-- Dependencies: 321
-- Name: TABLE laporan_pemakaian_bahan_baku; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.laporan_pemakaian_bahan_baku TO anon;
GRANT ALL ON TABLE public.laporan_pemakaian_bahan_baku TO authenticated;
GRANT ALL ON TABLE public.laporan_pemakaian_bahan_baku TO service_role;


--
-- TOC entry 3949 (class 0 OID 0)
-- Dependencies: 313
-- Name: TABLE laporan_penjualan; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.laporan_penjualan TO anon;
GRANT ALL ON TABLE public.laporan_penjualan TO authenticated;
GRANT ALL ON TABLE public.laporan_penjualan TO service_role;


--
-- TOC entry 3951 (class 0 OID 0)
-- Dependencies: 318
-- Name: TABLE reservasi_stok_supplier; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.reservasi_stok_supplier TO anon;
GRANT ALL ON TABLE public.reservasi_stok_supplier TO authenticated;
GRANT ALL ON TABLE public.reservasi_stok_supplier TO service_role;


--
-- TOC entry 3952 (class 0 OID 0)
-- Dependencies: 325
-- Name: TABLE trend_pemakaian_bahan_baku; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.trend_pemakaian_bahan_baku TO anon;
GRANT ALL ON TABLE public.trend_pemakaian_bahan_baku TO authenticated;
GRANT ALL ON TABLE public.trend_pemakaian_bahan_baku TO service_role;


--
-- TOC entry 3954 (class 0 OID 0)
-- Dependencies: 327
-- Name: TABLE v_reservasi_stok_monitoring; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_reservasi_stok_monitoring TO anon;
GRANT ALL ON TABLE public.v_reservasi_stok_monitoring TO authenticated;
GRANT ALL ON TABLE public.v_reservasi_stok_monitoring TO service_role;


--
-- TOC entry 3955 (class 0 OID 0)
-- Dependencies: 320
-- Name: TABLE view_bahan_baku_detail; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.view_bahan_baku_detail TO anon;
GRANT ALL ON TABLE public.view_bahan_baku_detail TO authenticated;
GRANT ALL ON TABLE public.view_bahan_baku_detail TO service_role;


--
-- TOC entry 3956 (class 0 OID 0)
-- Dependencies: 328
-- Name: TABLE view_pembelian_detail; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.view_pembelian_detail TO anon;
GRANT ALL ON TABLE public.view_pembelian_detail TO authenticated;
GRANT ALL ON TABLE public.view_pembelian_detail TO service_role;


--
-- TOC entry 3957 (class 0 OID 0)
-- Dependencies: 330
-- Name: TABLE view_pergerakan_bahan_baku; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.view_pergerakan_bahan_baku TO anon;
GRANT ALL ON TABLE public.view_pergerakan_bahan_baku TO authenticated;
GRANT ALL ON TABLE public.view_pergerakan_bahan_baku TO service_role;


--
-- TOC entry 3958 (class 0 OID 0)
-- Dependencies: 319
-- Name: TABLE view_reservasi_stok_detail; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.view_reservasi_stok_detail TO anon;
GRANT ALL ON TABLE public.view_reservasi_stok_detail TO authenticated;
GRANT ALL ON TABLE public.view_reservasi_stok_detail TO service_role;


--
-- TOC entry 2405 (class 826 OID 16488)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- TOC entry 2406 (class 826 OID 16489)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- TOC entry 2404 (class 826 OID 16487)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- TOC entry 2408 (class 826 OID 16491)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- TOC entry 2403 (class 826 OID 16486)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- TOC entry 2407 (class 826 OID 16490)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


-- Completed on 2025-08-13 20:24:51

--
-- PostgreSQL database dump complete
--

