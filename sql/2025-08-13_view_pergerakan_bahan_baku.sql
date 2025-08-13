-- View: public.view_pergerakan_bahan_baku
-- Purpose: unify pembelian (+) and pemakaian via penjualan (-) per bahan_baku
-- Run this in Supabase SQL editor

BEGIN;

DROP VIEW IF EXISTS public.view_pergerakan_bahan_baku;

CREATE VIEW public.view_pergerakan_bahan_baku AS
  -- Purchases increase stock
  SELECT 
    bb.id AS bahan_baku_id,
    p.tanggal AS tanggal,
    'Pembelian'::text AS jenis,
    p.id AS ref_id,
    ('Dari supplier: ' || COALESCE(s.nama_supplier, ''))::text AS keterangan,
    p.jumlah AS jumlah, -- stored in base unit
    ud.nama_unit AS unit
  FROM public.pembelian p
  JOIN public.bahan_baku bb ON p.bahan_baku_id = bb.id
  LEFT JOIN public.suppliers s ON p.supplier_id = s.id
  LEFT JOIN public.unit_dasar ud ON bb.unit_dasar_id = ud.id

  UNION ALL

  -- Sales consume stock based on recipe
  SELECT 
    bb.id AS bahan_baku_id,
    pj.tanggal AS tanggal,
    'Pemakaian'::text AS jenis,
    pj.id AS ref_id,
    ('Untuk produk: ' || COALESCE(pj_prod.nama_produk_jadi, ''))::text AS keterangan,
    (r.jumlah_dibutuhkan * pj.jumlah) AS jumlah_consumed_pos,
    ud.nama_unit AS unit
  FROM public.penjualan pj
  JOIN public.resep r ON r.produk_jadi_id = pj.produk_jadi_id
  JOIN public.bahan_baku bb ON r.bahan_baku_id = bb.id
  LEFT JOIN public.produk_jadi pj_prod ON pj.produk_jadi_id = pj_prod.id
  LEFT JOIN public.unit_dasar ud ON bb.unit_dasar_id = ud.id;

-- Consumers of this view should treat 'Pemakaian' as negative movement in UI if needed.

COMMIT;
