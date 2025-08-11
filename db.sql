--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.0

-- Started on 2025-08-11 07:36:49

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
-- TOC entry 3756 (class 0 OID 0)
-- Dependencies: 13
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 405 (class 1255 OID 17271)
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
-- TOC entry 406 (class 1255 OID 17272)
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
-- TOC entry 403 (class 1255 OID 17269)
-- Name: update_stok_pembelian(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_stok_pembelian() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Tambah stok bahan baku
    UPDATE public.bahan_baku 
    SET stok = stok + NEW.jumlah 
    WHERE id = NEW.bahan_baku_id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_stok_pembelian() OWNER TO postgres;

--
-- TOC entry 404 (class 1255 OID 17270)
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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 286 (class 1259 OID 17273)
-- Name: bahan_baku; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bahan_baku (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nama_bahan_baku text NOT NULL,
    stok numeric DEFAULT 0 NOT NULL,
    unit text NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.bahan_baku OWNER TO postgres;

--
-- TOC entry 290 (class 1259 OID 17350)
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
-- TOC entry 287 (class 1259 OID 17288)
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
-- TOC entry 288 (class 1259 OID 17305)
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
-- TOC entry 293 (class 1259 OID 17465)
-- Name: bahan_baku_terlaris_detail; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.bahan_baku_terlaris_detail AS
 SELECT bb.id AS bahan_baku_id,
    bb.nama_bahan_baku,
    bb.unit,
    bb.stok AS stok_tersisa,
    COALESCE(sum((r.jumlah_dibutuhkan * p.jumlah)), (0)::numeric) AS total_terpakai,
    count(DISTINCT pj.id) AS jumlah_produk_menggunakan,
    string_agg(DISTINCT pj.nama_produk_jadi, ', '::text ORDER BY pj.nama_produk_jadi) AS produk_yang_menggunakan,
    date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone) AS periode_bulan_ini,
    EXTRACT(month FROM CURRENT_DATE) AS bulan,
    EXTRACT(year FROM CURRENT_DATE) AS tahun,
    bb.user_id
   FROM (((public.bahan_baku bb
     LEFT JOIN public.resep r ON ((bb.id = r.bahan_baku_id)))
     LEFT JOIN public.produk_jadi pj ON ((r.produk_jadi_id = pj.id)))
     LEFT JOIN public.penjualan p ON (((pj.id = p.produk_jadi_id) AND (date_trunc('month'::text, p.tanggal) = date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone)))))
  GROUP BY bb.id, bb.nama_bahan_baku, bb.unit, bb.stok, bb.user_id
  ORDER BY COALESCE(sum((r.jumlah_dibutuhkan * p.jumlah)), (0)::numeric) DESC, bb.nama_bahan_baku;


ALTER VIEW public.bahan_baku_terlaris_detail OWNER TO postgres;

--
-- TOC entry 295 (class 1259 OID 17475)
-- Name: bahan_baku_terlaris_filter; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.bahan_baku_terlaris_filter AS
 SELECT bb.id AS bahan_baku_id,
    bb.nama_bahan_baku,
    bb.unit,
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
   FROM (((public.bahan_baku bb
     LEFT JOIN public.resep r ON ((bb.id = r.bahan_baku_id)))
     LEFT JOIN public.produk_jadi pj ON ((r.produk_jadi_id = pj.id)))
     LEFT JOIN public.penjualan p ON ((pj.id = p.produk_jadi_id)))
  WHERE (p.tanggal IS NOT NULL)
  GROUP BY bb.id, bb.nama_bahan_baku, bb.unit, bb.stok, bb.user_id, (date_trunc('month'::text, p.tanggal))
  ORDER BY COALESCE(sum((r.jumlah_dibutuhkan * p.jumlah)), (0)::numeric) DESC, bb.nama_bahan_baku;


ALTER VIEW public.bahan_baku_terlaris_filter OWNER TO postgres;

--
-- TOC entry 294 (class 1259 OID 17470)
-- Name: bahan_baku_top20_chart; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.bahan_baku_top20_chart AS
 SELECT bb.nama_bahan_baku,
    bb.unit,
    COALESCE(sum((r.jumlah_dibutuhkan * p.jumlah)), (0)::numeric) AS total_terpakai,
    row_number() OVER (ORDER BY COALESCE(sum((r.jumlah_dibutuhkan * p.jumlah)), (0)::numeric) DESC) AS ranking,
    bb.user_id
   FROM (((public.bahan_baku bb
     LEFT JOIN public.resep r ON ((bb.id = r.bahan_baku_id)))
     LEFT JOIN public.produk_jadi pj ON ((r.produk_jadi_id = pj.id)))
     LEFT JOIN public.penjualan p ON (((pj.id = p.produk_jadi_id) AND (date_trunc('month'::text, p.tanggal) = date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone)))))
  GROUP BY bb.id, bb.nama_bahan_baku, bb.unit, bb.user_id
  ORDER BY COALESCE(sum((r.jumlah_dibutuhkan * p.jumlah)), (0)::numeric) DESC
 LIMIT 20;


ALTER VIEW public.bahan_baku_top20_chart OWNER TO postgres;

--
-- TOC entry 296 (class 1259 OID 17480)
-- Name: dashboard_bahan_baku_terlaris; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.dashboard_bahan_baku_terlaris AS
 SELECT bahan_baku_id,
    nama_bahan_baku,
    unit,
    stok_tersisa,
    total_terpakai,
    jumlah_produk_menggunakan,
    produk_yang_menggunakan,
    periode_bulan_ini,
    bulan,
    tahun,
    user_id,
    round(((total_terpakai / NULLIF(sum(total_terpakai) OVER (PARTITION BY user_id), (0)::numeric)) * (100)::numeric), 2) AS persentase_pemakaian,
        CASE
            WHEN (stok_tersisa <= (0)::numeric) THEN 'Habis'::text
            WHEN (stok_tersisa <= (10)::numeric) THEN 'Stok Rendah'::text
            WHEN (stok_tersisa <= (50)::numeric) THEN 'Stok Normal'::text
            ELSE 'Stok Aman'::text
        END AS status_stok,
        CASE
            WHEN (total_terpakai = (0)::numeric) THEN 'Tidak Terpakai'::text
            WHEN (total_terpakai <= (50)::numeric) THEN 'Pemakaian Rendah'::text
            WHEN (total_terpakai <= (200)::numeric) THEN 'Pemakaian Sedang'::text
            ELSE 'Pemakaian Tinggi'::text
        END AS kategori_pemakaian
   FROM public.bahan_baku_terlaris_detail
  WHERE (total_terpakai >= (0)::numeric)
  ORDER BY total_terpakai DESC, nama_bahan_baku;


ALTER VIEW public.dashboard_bahan_baku_terlaris OWNER TO postgres;

--
-- TOC entry 291 (class 1259 OID 17372)
-- Name: laporan_pemakaian_bahan_baku; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.laporan_pemakaian_bahan_baku AS
 SELECT bb.nama_bahan_baku,
    bb.unit,
    COALESCE(sum((r.jumlah_dibutuhkan * p.jumlah)), (0)::numeric) AS total_terpakai,
    date_trunc('month'::text, p.tanggal) AS periode,
    bb.user_id
   FROM ((public.bahan_baku bb
     LEFT JOIN public.resep r ON ((bb.id = r.bahan_baku_id)))
     LEFT JOIN public.penjualan p ON ((r.produk_jadi_id = p.produk_jadi_id)))
  GROUP BY bb.id, bb.nama_bahan_baku, bb.unit, bb.user_id, (date_trunc('month'::text, p.tanggal))
  ORDER BY (date_trunc('month'::text, p.tanggal)) DESC, COALESCE(sum((r.jumlah_dibutuhkan * p.jumlah)), (0)::numeric) DESC;


ALTER VIEW public.laporan_pemakaian_bahan_baku OWNER TO postgres;

--
-- TOC entry 292 (class 1259 OID 17377)
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
-- TOC entry 289 (class 1259 OID 17330)
-- Name: pembelian; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pembelian (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bahan_baku_id uuid NOT NULL,
    jumlah numeric NOT NULL,
    harga_beli numeric DEFAULT 0,
    tanggal timestamp with time zone DEFAULT now() NOT NULL,
    catatan text,
    user_id uuid
);


ALTER TABLE public.pembelian OWNER TO postgres;

--
-- TOC entry 297 (class 1259 OID 17485)
-- Name: trend_pemakaian_bahan_baku; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.trend_pemakaian_bahan_baku AS
 SELECT bb.id AS bahan_baku_id,
    bb.nama_bahan_baku,
    bb.unit,
    date_trunc('month'::text, p.tanggal) AS periode,
    EXTRACT(month FROM date_trunc('month'::text, p.tanggal)) AS bulan,
    EXTRACT(year FROM date_trunc('month'::text, p.tanggal)) AS tahun,
    COALESCE(sum((r.jumlah_dibutuhkan * p.jumlah)), (0)::numeric) AS total_terpakai,
    count(DISTINCT p.id) AS jumlah_transaksi,
    bb.user_id
   FROM (((public.bahan_baku bb
     LEFT JOIN public.resep r ON ((bb.id = r.bahan_baku_id)))
     LEFT JOIN public.produk_jadi pj ON ((r.produk_jadi_id = pj.id)))
     LEFT JOIN public.penjualan p ON ((pj.id = p.produk_jadi_id)))
  WHERE (p.tanggal >= date_trunc('month'::text, (CURRENT_DATE - '3 mons'::interval)))
  GROUP BY bb.id, bb.nama_bahan_baku, bb.unit, bb.user_id, (date_trunc('month'::text, p.tanggal))
  ORDER BY (date_trunc('month'::text, p.tanggal)) DESC, COALESCE(sum((r.jumlah_dibutuhkan * p.jumlah)), (0)::numeric) DESC;


ALTER VIEW public.trend_pemakaian_bahan_baku OWNER TO postgres;

--
-- TOC entry 3746 (class 0 OID 17273)
-- Dependencies: 286
-- Data for Name: bahan_baku; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bahan_baku (id, nama_bahan_baku, stok, unit, user_id, created_at) FROM stdin;
a0188910-24b7-4e1f-9a43-621fc9b05ff8	BIBIT SECADAL	100	ml	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-10 15:12:04.238514+00
\.


--
-- TOC entry 3749 (class 0 OID 17330)
-- Dependencies: 289
-- Data for Name: pembelian; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pembelian (id, bahan_baku_id, jumlah, harga_beli, tanggal, catatan, user_id) FROM stdin;
1313920d-619d-4834-a793-7b8603e2e6a6	a0188910-24b7-4e1f-9a43-621fc9b05ff8	100	20000	2025-08-10 00:00:00+00	\N	3798ff14-acf7-40bd-a6bd-819f8479b880
\.


--
-- TOC entry 3750 (class 0 OID 17350)
-- Dependencies: 290
-- Data for Name: penjualan; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.penjualan (id, produk_jadi_id, jumlah, total_harga, tanggal, catatan, user_id) FROM stdin;
\.


--
-- TOC entry 3747 (class 0 OID 17288)
-- Dependencies: 287
-- Data for Name: produk_jadi; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.produk_jadi (id, nama_produk_jadi, sku, harga_jual, user_id, created_at) FROM stdin;
935d6b56-2f9d-4e7d-91b8-1976f4856935	TRADIN	52	5000	3798ff14-acf7-40bd-a6bd-819f8479b880	2025-08-10 14:21:37.928798+00
\.


--
-- TOC entry 3748 (class 0 OID 17305)
-- Dependencies: 288
-- Data for Name: resep; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.resep (id, produk_jadi_id, bahan_baku_id, jumlah_dibutuhkan, user_id) FROM stdin;
4e9c1e02-33d9-48f0-84a5-3f373a694910	935d6b56-2f9d-4e7d-91b8-1976f4856935	a0188910-24b7-4e1f-9a43-621fc9b05ff8	10	3798ff14-acf7-40bd-a6bd-819f8479b880
\.


--
-- TOC entry 3541 (class 2606 OID 17282)
-- Name: bahan_baku bahan_baku_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bahan_baku
    ADD CONSTRAINT bahan_baku_pkey PRIMARY KEY (id);


--
-- TOC entry 3551 (class 2606 OID 17339)
-- Name: pembelian pembelian_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pembelian
    ADD CONSTRAINT pembelian_pkey PRIMARY KEY (id);


--
-- TOC entry 3553 (class 2606 OID 17359)
-- Name: penjualan penjualan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penjualan
    ADD CONSTRAINT penjualan_pkey PRIMARY KEY (id);


--
-- TOC entry 3543 (class 2606 OID 17297)
-- Name: produk_jadi produk_jadi_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produk_jadi
    ADD CONSTRAINT produk_jadi_pkey PRIMARY KEY (id);


--
-- TOC entry 3545 (class 2606 OID 17299)
-- Name: produk_jadi produk_jadi_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produk_jadi
    ADD CONSTRAINT produk_jadi_sku_key UNIQUE (sku);


--
-- TOC entry 3547 (class 2606 OID 17312)
-- Name: resep resep_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resep
    ADD CONSTRAINT resep_pkey PRIMARY KEY (id);


--
-- TOC entry 3549 (class 2606 OID 17314)
-- Name: resep resep_produk_jadi_id_bahan_baku_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resep
    ADD CONSTRAINT resep_produk_jadi_id_bahan_baku_id_key UNIQUE (produk_jadi_id, bahan_baku_id);


--
-- TOC entry 3563 (class 2620 OID 17370)
-- Name: pembelian trigger_update_stok_pembelian; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_stok_pembelian AFTER INSERT ON public.pembelian FOR EACH ROW EXECUTE FUNCTION public.update_stok_pembelian();


--
-- TOC entry 3564 (class 2620 OID 17371)
-- Name: penjualan trigger_update_stok_penjualan; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_stok_penjualan AFTER INSERT ON public.penjualan FOR EACH ROW EXECUTE FUNCTION public.update_stok_penjualan();


--
-- TOC entry 3554 (class 2606 OID 17283)
-- Name: bahan_baku bahan_baku_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bahan_baku
    ADD CONSTRAINT bahan_baku_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3559 (class 2606 OID 17340)
-- Name: pembelian pembelian_bahan_baku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pembelian
    ADD CONSTRAINT pembelian_bahan_baku_id_fkey FOREIGN KEY (bahan_baku_id) REFERENCES public.bahan_baku(id) ON DELETE CASCADE;


--
-- TOC entry 3560 (class 2606 OID 17345)
-- Name: pembelian pembelian_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pembelian
    ADD CONSTRAINT pembelian_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3561 (class 2606 OID 17360)
-- Name: penjualan penjualan_produk_jadi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penjualan
    ADD CONSTRAINT penjualan_produk_jadi_id_fkey FOREIGN KEY (produk_jadi_id) REFERENCES public.produk_jadi(id) ON DELETE CASCADE;


--
-- TOC entry 3562 (class 2606 OID 17365)
-- Name: penjualan penjualan_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penjualan
    ADD CONSTRAINT penjualan_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3555 (class 2606 OID 17300)
-- Name: produk_jadi produk_jadi_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produk_jadi
    ADD CONSTRAINT produk_jadi_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3556 (class 2606 OID 17320)
-- Name: resep resep_bahan_baku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resep
    ADD CONSTRAINT resep_bahan_baku_id_fkey FOREIGN KEY (bahan_baku_id) REFERENCES public.bahan_baku(id) ON DELETE CASCADE;


--
-- TOC entry 3557 (class 2606 OID 17315)
-- Name: resep resep_produk_jadi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resep
    ADD CONSTRAINT resep_produk_jadi_id_fkey FOREIGN KEY (produk_jadi_id) REFERENCES public.produk_jadi(id) ON DELETE CASCADE;


--
-- TOC entry 3558 (class 2606 OID 17325)
-- Name: resep resep_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resep
    ADD CONSTRAINT resep_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3728 (class 3256 OID 17385)
-- Name: bahan_baku Users can delete own bahan_baku; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own bahan_baku" ON public.bahan_baku FOR DELETE USING ((auth.uid() = user_id));


--
-- TOC entry 3740 (class 3256 OID 17397)
-- Name: pembelian Users can delete own pembelian; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own pembelian" ON public.pembelian FOR DELETE USING ((auth.uid() = user_id));


--
-- TOC entry 3744 (class 3256 OID 17401)
-- Name: penjualan Users can delete own penjualan; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own penjualan" ON public.penjualan FOR DELETE USING ((auth.uid() = user_id));


--
-- TOC entry 3732 (class 3256 OID 17389)
-- Name: produk_jadi Users can delete own produk_jadi; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own produk_jadi" ON public.produk_jadi FOR DELETE USING ((auth.uid() = user_id));


--
-- TOC entry 3736 (class 3256 OID 17393)
-- Name: resep Users can delete own resep; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own resep" ON public.resep FOR DELETE USING ((auth.uid() = user_id));


--
-- TOC entry 3726 (class 3256 OID 17383)
-- Name: bahan_baku Users can insert own bahan_baku; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own bahan_baku" ON public.bahan_baku FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 3738 (class 3256 OID 17395)
-- Name: pembelian Users can insert own pembelian; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own pembelian" ON public.pembelian FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 3742 (class 3256 OID 17399)
-- Name: penjualan Users can insert own penjualan; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own penjualan" ON public.penjualan FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 3730 (class 3256 OID 17387)
-- Name: produk_jadi Users can insert own produk_jadi; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own produk_jadi" ON public.produk_jadi FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 3734 (class 3256 OID 17391)
-- Name: resep Users can insert own resep; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own resep" ON public.resep FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 3727 (class 3256 OID 17384)
-- Name: bahan_baku Users can update own bahan_baku; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own bahan_baku" ON public.bahan_baku FOR UPDATE USING ((auth.uid() = user_id));


--
-- TOC entry 3739 (class 3256 OID 17396)
-- Name: pembelian Users can update own pembelian; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own pembelian" ON public.pembelian FOR UPDATE USING ((auth.uid() = user_id));


--
-- TOC entry 3743 (class 3256 OID 17400)
-- Name: penjualan Users can update own penjualan; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own penjualan" ON public.penjualan FOR UPDATE USING ((auth.uid() = user_id));


--
-- TOC entry 3731 (class 3256 OID 17388)
-- Name: produk_jadi Users can update own produk_jadi; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own produk_jadi" ON public.produk_jadi FOR UPDATE USING ((auth.uid() = user_id));


--
-- TOC entry 3735 (class 3256 OID 17392)
-- Name: resep Users can update own resep; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own resep" ON public.resep FOR UPDATE USING ((auth.uid() = user_id));


--
-- TOC entry 3725 (class 3256 OID 17382)
-- Name: bahan_baku Users can view own bahan_baku; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own bahan_baku" ON public.bahan_baku FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 3737 (class 3256 OID 17394)
-- Name: pembelian Users can view own pembelian; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own pembelian" ON public.pembelian FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 3741 (class 3256 OID 17398)
-- Name: penjualan Users can view own penjualan; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own penjualan" ON public.penjualan FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 3729 (class 3256 OID 17386)
-- Name: produk_jadi Users can view own produk_jadi; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own produk_jadi" ON public.produk_jadi FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 3733 (class 3256 OID 17390)
-- Name: resep Users can view own resep; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own resep" ON public.resep FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 3720 (class 0 OID 17273)
-- Dependencies: 286
-- Name: bahan_baku; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.bahan_baku ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3723 (class 0 OID 17330)
-- Dependencies: 289
-- Name: pembelian; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pembelian ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3724 (class 0 OID 17350)
-- Dependencies: 290
-- Name: penjualan; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.penjualan ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3721 (class 0 OID 17288)
-- Dependencies: 287
-- Name: produk_jadi; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.produk_jadi ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3722 (class 0 OID 17305)
-- Dependencies: 288
-- Name: resep; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.resep ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3757 (class 0 OID 0)
-- Dependencies: 13
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- TOC entry 3758 (class 0 OID 0)
-- Dependencies: 405
-- Name: FUNCTION check_stok_tersedia(produk_id uuid, jumlah_jual numeric); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.check_stok_tersedia(produk_id uuid, jumlah_jual numeric) TO anon;
GRANT ALL ON FUNCTION public.check_stok_tersedia(produk_id uuid, jumlah_jual numeric) TO authenticated;
GRANT ALL ON FUNCTION public.check_stok_tersedia(produk_id uuid, jumlah_jual numeric) TO service_role;


--
-- TOC entry 3759 (class 0 OID 0)
-- Dependencies: 406
-- Name: FUNCTION hitung_max_produksi(produk_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hitung_max_produksi(produk_id uuid) TO anon;
GRANT ALL ON FUNCTION public.hitung_max_produksi(produk_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.hitung_max_produksi(produk_id uuid) TO service_role;


--
-- TOC entry 3760 (class 0 OID 0)
-- Dependencies: 403
-- Name: FUNCTION update_stok_pembelian(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_stok_pembelian() TO anon;
GRANT ALL ON FUNCTION public.update_stok_pembelian() TO authenticated;
GRANT ALL ON FUNCTION public.update_stok_pembelian() TO service_role;


--
-- TOC entry 3761 (class 0 OID 0)
-- Dependencies: 404
-- Name: FUNCTION update_stok_penjualan(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_stok_penjualan() TO anon;
GRANT ALL ON FUNCTION public.update_stok_penjualan() TO authenticated;
GRANT ALL ON FUNCTION public.update_stok_penjualan() TO service_role;


--
-- TOC entry 3762 (class 0 OID 0)
-- Dependencies: 286
-- Name: TABLE bahan_baku; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bahan_baku TO anon;
GRANT ALL ON TABLE public.bahan_baku TO authenticated;
GRANT ALL ON TABLE public.bahan_baku TO service_role;


--
-- TOC entry 3763 (class 0 OID 0)
-- Dependencies: 290
-- Name: TABLE penjualan; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.penjualan TO anon;
GRANT ALL ON TABLE public.penjualan TO authenticated;
GRANT ALL ON TABLE public.penjualan TO service_role;


--
-- TOC entry 3764 (class 0 OID 0)
-- Dependencies: 287
-- Name: TABLE produk_jadi; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.produk_jadi TO anon;
GRANT ALL ON TABLE public.produk_jadi TO authenticated;
GRANT ALL ON TABLE public.produk_jadi TO service_role;


--
-- TOC entry 3765 (class 0 OID 0)
-- Dependencies: 288
-- Name: TABLE resep; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.resep TO anon;
GRANT ALL ON TABLE public.resep TO authenticated;
GRANT ALL ON TABLE public.resep TO service_role;


--
-- TOC entry 3766 (class 0 OID 0)
-- Dependencies: 293
-- Name: TABLE bahan_baku_terlaris_detail; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bahan_baku_terlaris_detail TO anon;
GRANT ALL ON TABLE public.bahan_baku_terlaris_detail TO authenticated;
GRANT ALL ON TABLE public.bahan_baku_terlaris_detail TO service_role;


--
-- TOC entry 3767 (class 0 OID 0)
-- Dependencies: 295
-- Name: TABLE bahan_baku_terlaris_filter; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bahan_baku_terlaris_filter TO anon;
GRANT ALL ON TABLE public.bahan_baku_terlaris_filter TO authenticated;
GRANT ALL ON TABLE public.bahan_baku_terlaris_filter TO service_role;


--
-- TOC entry 3768 (class 0 OID 0)
-- Dependencies: 294
-- Name: TABLE bahan_baku_top20_chart; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bahan_baku_top20_chart TO anon;
GRANT ALL ON TABLE public.bahan_baku_top20_chart TO authenticated;
GRANT ALL ON TABLE public.bahan_baku_top20_chart TO service_role;


--
-- TOC entry 3769 (class 0 OID 0)
-- Dependencies: 296
-- Name: TABLE dashboard_bahan_baku_terlaris; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.dashboard_bahan_baku_terlaris TO anon;
GRANT ALL ON TABLE public.dashboard_bahan_baku_terlaris TO authenticated;
GRANT ALL ON TABLE public.dashboard_bahan_baku_terlaris TO service_role;


--
-- TOC entry 3770 (class 0 OID 0)
-- Dependencies: 291
-- Name: TABLE laporan_pemakaian_bahan_baku; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.laporan_pemakaian_bahan_baku TO anon;
GRANT ALL ON TABLE public.laporan_pemakaian_bahan_baku TO authenticated;
GRANT ALL ON TABLE public.laporan_pemakaian_bahan_baku TO service_role;


--
-- TOC entry 3771 (class 0 OID 0)
-- Dependencies: 292
-- Name: TABLE laporan_penjualan; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.laporan_penjualan TO anon;
GRANT ALL ON TABLE public.laporan_penjualan TO authenticated;
GRANT ALL ON TABLE public.laporan_penjualan TO service_role;


--
-- TOC entry 3772 (class 0 OID 0)
-- Dependencies: 289
-- Name: TABLE pembelian; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pembelian TO anon;
GRANT ALL ON TABLE public.pembelian TO authenticated;
GRANT ALL ON TABLE public.pembelian TO service_role;


--
-- TOC entry 3773 (class 0 OID 0)
-- Dependencies: 297
-- Name: TABLE trend_pemakaian_bahan_baku; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.trend_pemakaian_bahan_baku TO anon;
GRANT ALL ON TABLE public.trend_pemakaian_bahan_baku TO authenticated;
GRANT ALL ON TABLE public.trend_pemakaian_bahan_baku TO service_role;


--
-- TOC entry 2332 (class 826 OID 16488)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- TOC entry 2333 (class 826 OID 16489)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- TOC entry 2331 (class 826 OID 16487)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- TOC entry 2335 (class 826 OID 16491)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- TOC entry 2330 (class 826 OID 16486)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- TOC entry 2334 (class 826 OID 16490)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


-- Completed on 2025-08-11 07:36:53

--
-- PostgreSQL database dump complete
--

