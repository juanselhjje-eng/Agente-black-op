-- Administrative data model for Black Ops business operations.
-- Creates empty business tables; it does not fabricate or import historical records.
-- Access is restricted to trusted server-side service_role credentials.

CREATE TABLE IF NOT EXISTS public.blackops_business_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_code TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN (
    'pending_payment', 'payment_reported', 'scheduled', 'completed',
    'cancelled', 'expired', 'overdue'
  )),
  reservation_date DATE NOT NULL,
  starts_at TIMESTAMPTZ,
  players INTEGER NOT NULL CHECK (players > 0),
  package_type TEXT NOT NULL,
  total_cop BIGINT NOT NULL CHECK (total_cop >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS blackops_business_reservations_date_idx
  ON public.blackops_business_reservations (reservation_date, status);
CREATE INDEX IF NOT EXISTS blackops_business_reservations_created_idx
  ON public.blackops_business_reservations (created_at DESC);

CREATE TABLE IF NOT EXISTS public.blackops_business_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES public.blackops_business_reservations(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN (
    'pending', 'reported', 'verified', 'paid', 'approved', 'refunded', 'failed'
  )),
  amount_cop BIGINT NOT NULL CHECK (amount_cop >= 0),
  verified_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status NOT IN ('verified', 'paid', 'approved') OR verified_at IS NOT NULL),
  CHECK (status <> 'refunded' OR refunded_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS blackops_business_payments_created_idx
  ON public.blackops_business_payments (created_at DESC, status);
CREATE INDEX IF NOT EXISTS blackops_business_payments_reservation_idx
  ON public.blackops_business_payments (reservation_id);

CREATE TABLE IF NOT EXISTS public.blackops_business_inventory (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  minimum INTEGER NOT NULL CHECK (minimum >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No direct access from browser roles. Trusted server-side code will use service_role.
ALTER TABLE public.blackops_business_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blackops_business_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blackops_business_inventory ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.blackops_business_reservations FROM anon, authenticated;
REVOKE ALL ON TABLE public.blackops_business_payments FROM anon, authenticated;
REVOKE ALL ON TABLE public.blackops_business_inventory FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.blackops_business_reservations TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.blackops_business_payments TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.blackops_business_inventory TO service_role;
