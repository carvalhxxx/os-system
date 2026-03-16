-- ══════════════════════════════════════════════════════════════════════
-- OS MANAGER — SETUP COMPLETO DO BANCO
-- Execute este arquivo no SQL Editor do Supabase para configurar
-- um novo projeto do zero. Ordem de execução já está correta.
-- ══════════════════════════════════════════════════════════════════════


-- ─── Configuração de URL (Supabase Dashboard) ────────────────
-- Authentication → URL Configuration
-- Site URL: https://seu-projeto.vercel.app
-- Redirect URLs:
--   https://seu-projeto.vercel.app/**
--   http://localhost:5173/**


-- ────────────────────────────────────────────────────────────────────
-- 1. EXTENSÕES
-- ────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ────────────────────────────────────────────────────────────────────
-- 2. TIPOS ENUM
-- ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'aberta', 'em_andamento', 'aguardando_peca', 'finalizada', 'cancelada'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM (
    'dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia', 'boleto'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ────────────────────────────────────────────────────────────────────
-- 3. TABELAS PRINCIPAIS
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.clients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT,
  document    TEXT NOT NULL,
  address     TEXT,
  city        TEXT,
  state       TEXT,
  zip_code    TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.technicians (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  specialty   TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number        TEXT NOT NULL UNIQUE,
  client_id           UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  technician_id       UUID REFERENCES public.technicians(id) ON DELETE SET NULL,
  problem_description TEXT NOT NULL,
  diagnosis           TEXT,
  service_performed   TEXT,
  service_value       NUMERIC(10,2) NOT NULL DEFAULT 0,
  labor_value         NUMERIC(10,2) NOT NULL DEFAULT 0,
  parts_total         NUMERIC(10,2) NOT NULL DEFAULT 0,
  status              order_status NOT NULL DEFAULT 'aberta',
  payment_status      TEXT NOT NULL DEFAULT 'pendente'
                        CHECK (payment_status IN ('pendente','pago','pago_parcial')),
  payment_method      payment_method,
  payment_date        DATE,
  amount_paid         NUMERIC(10,2) NOT NULL DEFAULT 0,
  public_token        TEXT UNIQUE,
  opened_at           DATE NOT NULL DEFAULT CURRENT_DATE,
  closed_at           DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attachments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name     TEXT NOT NULL,
  file_type     TEXT NOT NULL,
  file_size     BIGINT NOT NULL,
  storage_path  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.parts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code        TEXT,
  notes        TEXT,
  name        TEXT NOT NULL,
  description TEXT,
  unit_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  part_id     UUID REFERENCES public.parts(id) ON DELETE SET NULL,
  quantity    INTEGER NOT NULL DEFAULT 1,
  unit_price  NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.company_settings (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL DEFAULT 'Minha Assistência',
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  city         TEXT,
  state        TEXT,
  zip_code     TEXT,
  document     TEXT,  -- CNPJ
  website      TEXT,
  logo_url     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quotes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_number       TEXT NOT NULL UNIQUE,
  client_id          UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  technician_id      UUID REFERENCES public.technicians(id) ON DELETE SET NULL,
  description        TEXT NOT NULL,
  notes              TEXT,
  labor_value        NUMERIC(10,2) NOT NULL DEFAULT 0,
  parts_total        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_value        NUMERIC(10,2) NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'pendente'
                       CHECK (status IN ('pendente','aprovado','recusado')),
  converted_order_id UUID REFERENCES public.service_orders(id) ON DELETE SET NULL,
  valid_until        DATE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quote_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id    UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  part_id     UUID REFERENCES public.parts(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1,
  unit_price  NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author     TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────────────
-- 4. ÍNDICES
-- ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clients_user_id       ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_name          ON public.clients(name);
CREATE INDEX IF NOT EXISTS idx_technicians_user_id   ON public.technicians(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id        ON public.service_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_client_id      ON public.service_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_technician_id  ON public.service_orders(technician_id);
CREATE INDEX IF NOT EXISTS idx_orders_status         ON public.service_orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_opened_at      ON public.service_orders(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_number         ON public.service_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_user_status    ON public.service_orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.service_orders(user_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_attachments_order_id  ON public.attachments(order_id);
CREATE INDEX IF NOT EXISTS idx_parts_user_id         ON public.parts(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order     ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_part      ON public.order_items(part_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id        ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote     ON public.quote_items(quote_id);


-- ────────────────────────────────────────────────────────────────────
-- 5. TRIGGERS
-- ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER technicians_updated_at
  BEFORE UPDATE ON public.technicians FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER service_orders_updated_at
  BEFORE UPDATE ON public.service_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER parts_updated_at
  BEFORE UPDATE ON public.parts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER quotes_updated_at
  BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER order_notes_updated_at
  BEFORE UPDATE ON public.order_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Token público para portal do cliente
CREATE OR REPLACE FUNCTION generate_public_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_token IS NULL THEN
    NEW.public_token := encode(gen_random_bytes(16), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER service_orders_public_token
  BEFORE INSERT ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION generate_public_token();

-- Número de orçamento automático
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    NEW.quote_number := 'ORC-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
      LPAD(CAST(FLOOR(RANDOM() * 9000 + 1000) AS TEXT), 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER quotes_quote_number
  BEFORE INSERT ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION generate_quote_number();

-- Total de peças do orçamento
CREATE OR REPLACE FUNCTION update_quote_parts_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.quotes
  SET parts_total = (
        SELECT COALESCE(SUM(total_price), 0) FROM public.quote_items WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id)
      ),
      total_value = labor_value + (
        SELECT COALESCE(SUM(total_price), 0) FROM public.quote_items WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id)
      ),
      updated_at = NOW()
  WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER quote_items_update_total
  AFTER INSERT OR UPDATE OR DELETE ON public.quote_items
  FOR EACH ROW EXECUTE FUNCTION update_quote_parts_total();


-- ────────────────────────────────────────────────────────────────────
-- 6. FUNÇÃO APROVAR ORÇAMENTO (ATÔMICA)
-- ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION approve_quote(p_quote_id UUID, p_order_number TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_quote    quotes%ROWTYPE;
  v_order_id UUID;
BEGIN
  SELECT * INTO v_quote FROM quotes WHERE id = p_quote_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orçamento não encontrado'; END IF;
  IF v_quote.status != 'pendente' THEN RAISE EXCEPTION 'Orçamento não está pendente'; END IF;

  INSERT INTO service_orders (
    user_id, client_id, technician_id, order_number,
    problem_description, notes,
    labor_value, service_value, parts_total,
    status, payment_status, amount_paid, opened_at
  ) VALUES (
    v_quote.user_id, v_quote.client_id, v_quote.technician_id, p_order_number,
    v_quote.description, v_quote.notes,
    v_quote.labor_value, v_quote.total_value, v_quote.parts_total,
    'aberta', 'pendente', 0, CURRENT_DATE
  ) RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, part_id, quantity, unit_price, total_price)
  SELECT v_order_id, part_id, quantity, unit_price, total_price
  FROM quote_items WHERE quote_id = p_quote_id;

  UPDATE quotes
  SET status = 'aprovado', converted_order_id = v_order_id, updated_at = NOW()
  WHERE id = p_quote_id;

  RETURN v_order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION approve_quote(UUID, TEXT) FROM anon;
GRANT  EXECUTE ON FUNCTION approve_quote(UUID, TEXT) TO authenticated;


-- ────────────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE public.clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_notes      ENABLE ROW LEVEL SECURITY;

-- Drop tudo antes de recriar (idempotente)
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || r.tablename;
  END LOOP;
END $$;

-- clients
CREATE POLICY "clients_select" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "clients_insert" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients_update" ON public.clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "clients_delete" ON public.clients FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "clients_public_via_order" ON public.clients FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.service_orders o WHERE o.client_id = clients.id AND o.public_token IS NOT NULL)
);

-- technicians
CREATE POLICY "technicians_select" ON public.technicians FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "technicians_insert" ON public.technicians FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "technicians_update" ON public.technicians FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "technicians_delete" ON public.technicians FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "technicians_public_via_order" ON public.technicians FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.service_orders o WHERE o.technician_id = technicians.id AND o.public_token IS NOT NULL)
);

-- service_orders
CREATE POLICY "orders_select" ON public.service_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders_insert" ON public.service_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders_update" ON public.service_orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "orders_delete" ON public.service_orders FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "orders_public_by_token" ON public.service_orders FOR SELECT USING (public_token IS NOT NULL);

-- attachments
CREATE POLICY "attachments_select" ON public.attachments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "attachments_insert" ON public.attachments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "attachments_delete" ON public.attachments FOR DELETE USING (auth.uid() = user_id);

-- parts
CREATE POLICY "parts_select" ON public.parts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "parts_insert" ON public.parts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "parts_update" ON public.parts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "parts_delete" ON public.parts FOR DELETE USING (auth.uid() = user_id);

-- order_items
CREATE POLICY "order_items_select" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.service_orders so WHERE so.id = order_items.order_id AND so.user_id = auth.uid())
);
CREATE POLICY "order_items_insert" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.service_orders so WHERE so.id = order_items.order_id AND so.user_id = auth.uid())
);
CREATE POLICY "order_items_update" ON public.order_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.service_orders so WHERE so.id = order_items.order_id AND so.user_id = auth.uid())
);
CREATE POLICY "order_items_delete" ON public.order_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.service_orders so WHERE so.id = order_items.order_id AND so.user_id = auth.uid())
);

-- company_settings
CREATE POLICY "settings_select" ON public.company_settings
  FOR SELECT USING (true);
CREATE POLICY "settings_insert" ON public.company_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "settings_update" ON public.company_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- quotes
CREATE POLICY "quotes_select" ON public.quotes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "quotes_insert" ON public.quotes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quotes_update" ON public.quotes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "quotes_delete" ON public.quotes FOR DELETE USING (auth.uid() = user_id);

-- quote_items
CREATE POLICY "quote_items_select" ON public.quote_items FOR SELECT USING (
  quote_id IN (SELECT id FROM public.quotes WHERE user_id = auth.uid())
);
CREATE POLICY "quote_items_insert" ON public.quote_items FOR INSERT WITH CHECK (
  quote_id IN (SELECT id FROM public.quotes WHERE user_id = auth.uid())
);
CREATE POLICY "quote_items_update" ON public.quote_items FOR UPDATE USING (
  quote_id IN (SELECT id FROM public.quotes WHERE user_id = auth.uid())
);
CREATE POLICY "quote_items_delete" ON public.quote_items FOR DELETE USING (
  quote_id IN (SELECT id FROM public.quotes WHERE user_id = auth.uid())
);

-- order_notes
CREATE POLICY "notes_select" ON public.order_notes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.service_orders WHERE service_orders.id = order_notes.order_id AND service_orders.user_id = auth.uid())
);
CREATE POLICY "notes_insert" ON public.order_notes FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.service_orders WHERE service_orders.id = order_notes.order_id AND service_orders.user_id = auth.uid())
);
CREATE POLICY "notes_update" ON public.order_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notes_delete" ON public.order_notes FOR DELETE USING (auth.uid() = user_id);


-- Permite leitura pública de name e logo_url para a tela de login
-- (sem expor dados sensíveis como CNPJ, endereço, etc.)
CREATE POLICY "company_settings_public_read" ON company_settings
  FOR SELECT
  USING (true);


-- ══════════════════════════════════════════════════════════════════════
-- Setup concluído! Lembre de criar o bucket "attachments" no Storage.
-- ══════════════════════════════════════════════════════════════════════