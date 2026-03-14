-- Atomic increment for dba_products.download_count
-- Replaces the non-atomic read-then-write pattern in /api/dba/sales

CREATE OR REPLACE FUNCTION increment_download_count(product_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE dba_products
  SET download_count = download_count + 1
  WHERE id = product_id;
$$;
