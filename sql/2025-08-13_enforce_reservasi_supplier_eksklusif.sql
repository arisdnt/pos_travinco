-- Enforce supplier eksklusif on reservasi_stok_supplier
-- Run this script in Supabase SQL editor (or psql) against your database.
-- Depends on existing function public.validate_supplier_eksklusif(p_bahan_baku_id uuid, p_supplier_id uuid)

BEGIN;

-- Create or replace trigger function that validates exclusive supplier on reservasi
CREATE OR REPLACE FUNCTION public.trigger_validate_reservasi_supplier_eksklusif()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Recreate trigger to ensure it exists and points to the function above
DROP TRIGGER IF EXISTS trigger_validate_reservasi_supplier_eksklusif ON public.reservasi_stok_supplier;
CREATE TRIGGER trigger_validate_reservasi_supplier_eksklusif
  BEFORE INSERT OR UPDATE ON public.reservasi_stok_supplier
  FOR EACH ROW EXECUTE FUNCTION public.trigger_validate_reservasi_supplier_eksklusif();

COMMIT;

