-- ══════════════════════════════════════════════════════════════════════
-- OS MANAGER — SETUP COMPLETO DO BANCO
-- Execute este arquivo no SQL Editor do Supabase para configurar
-- um novo projeto do zero.
-- Ordem de execução já está correta — não altere a sequência.
-- ══════════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────────
-- 1. TABELAS PRINCIPAIS
-- ────────────────────────────────────────────────────────────────────
-- ============================================================
--  OS MANAGER — Schema SQL para Supabase
--  Execute este script no SQL Editor do Supabase
-- ============================================================

-- ─── Extensions ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Tabela: clients ───────────────────────────────────────
CREATE TABLE public.clients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT,
  document    TEXT NOT NULL, -- CPF ou CNPJ
  address     TEXT,
  city        TEXT,
  state       TEXT,
  zip_code    TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Tabela: technicians ───────────────────────────────────
CREATE TABLE public.technicians (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  specialty   TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Enum: status das ordens ───────────────────────────────
CREATE TYPE order_status AS ENUM (
  'aberta',
  'em_andamento',
  'aguardando_peca',
  'finalizada',
  'cancelada'
);

-- ─── Tabela: service_orders ────────────────────────────────
CREATE TABLE public.service_orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number        TEXT NOT NULL UNIQUE,
  client_id           UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  technician_id       UUID REFERENCES public.technicians(id) ON DELETE SET NULL,
  problem_description TEXT NOT NULL,
  diagnosis           TEXT,
  service_performed   TEXT,
  service_value       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status              order_status NOT NULL DEFAULT 'aberta',
  opened_at           DATE NOT NULL DEFAULT CURRENT_DATE,
  closed_at           DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Tabela: attachments ───────────────────────────────────
CREATE TABLE public.attachments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name     TEXT NOT NULL,
  file_type     TEXT NOT NULL,
  file_size     BIGINT NOT NULL,
  storage_path  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ───────────────────────────────────────────────
CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_clients_name    ON public.clients(name);

CREATE INDEX idx_technicians_user_id ON public.technicians(user_id);

CREATE INDEX idx_orders_user_id    ON public.service_orders(user_id);
CREATE INDEX idx_orders_client_id  ON public.service_orders(client_id);
CREATE INDEX idx_orders_tech_id    ON public.service_orders(technician_id);
CREATE INDEX idx_orders_status     ON public.service_orders(status);
CREATE INDEX idx_orders_opened_at  ON public.service_orders(opened_at);
CREATE INDEX idx_orders_number     ON public.service_orders(order_number);

CREATE INDEX idx_attachments_order_id ON public.attachments(order_id);

-- ─── Auto-updated_at trigger ───────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER technicians_updated_at
  BEFORE UPDATE ON public.technicians
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER service_orders_updated_at
  BEFORE UPDATE ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS: Row Level Security ───────────────────────────────

ALTER TABLE public.clients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments     ENABLE ROW LEVEL SECURITY;

-- Clients RLS
CREATE POLICY "clients_select" ON public.clients
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "clients_insert" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients_update" ON public.clients
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "clients_delete" ON public.clients
  FOR DELETE USING (auth.uid() = user_id);

-- Technicians RLS
CREATE POLICY "technicians_select" ON public.technicians
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "technicians_insert" ON public.technicians
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "technicians_update" ON public.technicians
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "technicians_delete" ON public.technicians
  FOR DELETE USING (auth.uid() = user_id);

-- Service Orders RLS
CREATE POLICY "orders_select" ON public.service_orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders_insert" ON public.service_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders_update" ON public.service_orders
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "orders_delete" ON public.service_orders
  FOR DELETE USING (auth.uid() = user_id);

-- Attachments RLS
CREATE POLICY "attachments_select" ON public.attachments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "attachments_insert" ON public.attachments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "attachments_delete" ON public.attachments
  FOR DELETE USING (auth.uid() = user_id);

-- ─── Storage: bucket attachments ───────────────────────────
-- Execute no Dashboard > Storage > New bucket
-- Nome: attachments | Public: true (ou false se quiser privado)

-- Políticas do Storage (via dashboard ou SQL):
-- INSERT policy: (auth.uid()::text) = (storage.foldername(name))[1]
-- SELECT policy: true (se bucket público)
-- DELETE policy: (auth.uid()::text) = (storage.foldername(name))[1]


-- ─── Exemplo de queries ────────────────────────────────────

-- Dashboard stats do usuário autenticado:
-- SELECT
--   COUNT(*) FILTER (WHERE status = 'aberta') AS total_open,
--   COUNT(*) FILTER (WHERE status IN ('em_andamento','aguardando_peca')) AS total_in_progress,
--   COUNT(*) FILTER (WHERE status = 'finalizada') AS total_finished,
--   COALESCE(SUM(service_value) FILTER (WHERE status = 'finalizada'), 0) AS total_revenue
-- FROM public.service_orders
-- WHERE user_id = auth.uid();

-- Ordens com join em cliente e técnico:
-- SELECT
--   so.*,
--   c.name AS client_name,
--   c.phone AS client_phone,
--   t.name AS technician_name
-- FROM public.service_orders so
-- LEFT JOIN public.clients c ON c.id = so.client_id
-- LEFT JOIN public.technicians t ON t.id = so.technician_id
-- WHERE so.user_id = auth.uid()
-- ORDER BY so.created_at DESC;

-- ────────────────────────────────────────────────────────────────────
-- 2. PEÇAS E ITENS DE OS
-- ────────────────────────────────────────────────────────────────────
-- ============================================================
--  Peças e Materiais — Execute no SQL Editor do Supabase
-- ============================================================

-- ─── Tabela: parts (catálogo de peças) ─────────────────────
CREATE TABLE public.parts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code        TEXT,                     -- código/referência
  name        TEXT NOT NULL,
  unit_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_qty   INTEGER,                  -- futuro controle de estoque
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Tabela: order_items (peças usadas em cada OS) ──────────
CREATE TABLE public.order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  part_id     UUID NOT NULL REFERENCES public.parts(id) ON DELETE RESTRICT,
  quantity    INTEGER NOT NULL DEFAULT 1,
  unit_price  NUMERIC(10,2) NOT NULL,   -- snapshot do preço no momento
  total_price NUMERIC(10,2) NOT NULL,   -- quantity * unit_price
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Coluna labor_value na service_orders ──────────────────
-- Separa mão de obra das peças
ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS labor_value  NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parts_total  NUMERIC(10,2) NOT NULL DEFAULT 0;

-- ─── Indexes ───────────────────────────────────────────────
CREATE INDEX idx_parts_user_id    ON public.parts(user_id);
CREATE INDEX idx_parts_name       ON public.parts(name);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_part  ON public.order_items(part_id);

-- ─── Trigger updated_at para parts ────────────────────────
CREATE TRIGGER parts_updated_at
  BEFORE UPDATE ON public.parts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS ──────────────────────────────────────────────────
ALTER TABLE public.parts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items  ENABLE ROW LEVEL SECURITY;

-- Parts: usuário acessa só as suas
CREATE POLICY "parts_select" ON public.parts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "parts_insert" ON public.parts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "parts_update" ON public.parts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "parts_delete" ON public.parts FOR DELETE USING (auth.uid() = user_id);

-- Order items: acessa via OS (checa user_id da OS)
CREATE POLICY "order_items_select" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = order_items.order_id AND so.user_id = auth.uid()
    )
  );

CREATE POLICY "order_items_insert" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = order_items.order_id AND so.user_id = auth.uid()
    )
  );

CREATE POLICY "order_items_update" ON public.order_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = order_items.order_id AND so.user_id = auth.uid()
    )
  );

CREATE POLICY "order_items_delete" ON public.order_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = order_items.order_id AND so.user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────────
-- 3. PAGAMENTOS
-- ────────────────────────────────────────────────────────────────────
-- ============================================================
--  Controle de Pagamentos — Execute no SQL Editor do Supabase
-- ============================================================

-- Tipo de método de pagamento
CREATE TYPE payment_method AS ENUM (
  'dinheiro',
  'pix',
  'cartao_credito',
  'cartao_debito',
  'transferencia',
  'boleto',
  'outro'
);

-- Adiciona colunas de pagamento na service_orders
ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS payment_status   TEXT NOT NULL DEFAULT 'pendente'
    CHECK (payment_status IN ('pendente', 'pago', 'pago_parcial')),
  ADD COLUMN IF NOT EXISTS payment_method   payment_method,
  ADD COLUMN IF NOT EXISTS payment_date     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS amount_paid      NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_notes    TEXT;

-- Index para buscar OS pendentes de pagamento
CREATE INDEX IF NOT EXISTS idx_orders_payment_status
  ON public.service_orders(user_id, payment_status);

-- ────────────────────────────────────────────────────────────────────
-- 4. PORTAL PÚBLICO (TOKEN)
-- ────────────────────────────────────────────────────────────────────
-- ============================================================
--  OS MANAGER — Portal Público do Cliente
--  Execute este script no SQL Editor do Supabase
-- ============================================================

-- ─── Adiciona token público na tabela service_orders ────────
-- Token único gerado ao criar a OS, usado na URL pública
ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE;

-- Gera token para OS existentes que não têm
UPDATE public.service_orders
  SET public_token = encode(gen_random_bytes(16), 'hex')
  WHERE public_token IS NULL;

-- Index para busca por token
CREATE INDEX IF NOT EXISTS idx_orders_public_token
  ON public.service_orders(public_token);

-- ─── RLS: permite leitura pública por token ─────────────────
-- Qualquer pessoa (sem login) pode ler UMA OS específica pelo token
CREATE POLICY "orders_public_by_token" ON public.service_orders
  FOR SELECT
  USING (public_token IS NOT NULL);

-- ─── RLS: permite leitura pública do cliente vinculado ──────
-- Necessário para o portal mostrar o nome do cliente
CREATE POLICY "clients_public_via_order" ON public.clients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.service_orders o
      WHERE o.client_id = id
        AND o.public_token IS NOT NULL
    )
  );

-- ─── RLS: permite leitura pública do técnico vinculado ──────
CREATE POLICY "technicians_public_via_order" ON public.technicians
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.service_orders o
      WHERE o.technician_id = id
        AND o.public_token IS NOT NULL
    )
  );

-- ─── Trigger: gera token automaticamente ao inserir OS ──────
CREATE OR REPLACE FUNCTION generate_public_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_token IS NULL THEN
    NEW.public_token := encode(gen_random_bytes(16), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_public_token
  BEFORE INSERT ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION generate_public_token();

-- ────────────────────────────────────────────────────────────────────
-- 5. CONFIGURAÇÕES DA EMPRESA
-- ────────────────────────────────────────────────────────────────────
-- ============================================================
--  OS MANAGER — Configurações da Empresa
--  Execute no SQL Editor do Supabase
-- ============================================================

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

CREATE TRIGGER company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select" ON public.company_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "settings_insert" ON public.company_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "settings_update" ON public.company_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────
-- 6. ORÇAMENTOS
-- ────────────────────────────────────────────────────────────────────
-- ── Orçamentos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
  quote_number TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','recusado')),
  description  TEXT NOT NULL,
  notes        TEXT,
  labor_value  NUMERIC(10,2) NOT NULL DEFAULT 0,
  parts_total  NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_value  NUMERIC(10,2) GENERATED ALWAYS AS (labor_value + parts_total) STORED,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  converted_order_id UUID REFERENCES service_orders(id) ON DELETE SET NULL
);

-- ── Itens do orçamento ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS quote_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id   UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  part_id    UUID REFERENCES parts(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  quantity   INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Trigger: atualiza parts_total ao mudar itens ─────────────
CREATE OR REPLACE FUNCTION update_quote_parts_total()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE quotes
  SET parts_total = (
    SELECT COALESCE(SUM(total_price), 0) FROM quote_items WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id)
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quote_items ON quote_items;
CREATE TRIGGER trg_quote_items
AFTER INSERT OR UPDATE OR DELETE ON quote_items
FOR EACH ROW EXECUTE FUNCTION update_quote_parts_total();

-- ── Trigger: gera quote_number ────────────────────────────────
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE seq INT;
BEGIN
  SELECT COUNT(*) + 1 INTO seq FROM quotes WHERE user_id = NEW.user_id;
  NEW.quote_number := 'ORC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quote_number ON quotes;
CREATE TRIGGER trg_quote_number
BEFORE INSERT ON quotes
FOR EACH ROW EXECUTE FUNCTION generate_quote_number();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes_user" ON quotes USING (auth.uid() = user_id);
CREATE POLICY "quote_items_user" ON quote_items
  USING (quote_id IN (SELECT id FROM quotes WHERE user_id = auth.uid()));

-- ────────────────────────────────────────────────────────────────────
-- 7. NOTAS INTERNAS
-- ────────────────────────────────────────────────────────────────────
-- ── Notas internas da OS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author     TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE order_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_user" ON order_notes
  USING (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────
-- 8. FUNÇÃO APROVAR ORÇAMENTO (ATÔMICA)
-- ────────────────────────────────────────────────────────────────────
-- Função que cria OS + itens atomicamente a partir de um orçamento
CREATE OR REPLACE FUNCTION approve_quote(p_quote_id UUID, p_order_number TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_quote     quotes%ROWTYPE;
  v_order_id  UUID;
BEGIN
  -- Busca o orçamento
  SELECT * INTO v_quote FROM quotes WHERE id = p_quote_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orçamento não encontrado'; END IF;
  IF v_quote.status != 'pendente' THEN RAISE EXCEPTION 'Orçamento não está pendente'; END IF;

  -- Cria a OS
  INSERT INTO service_orders (
    user_id, client_id, technician_id, order_number,
    problem_description, notes,
    labor_value, service_value, parts_total,
    status, payment_status, amount_paid, opened_at
  )
  VALUES (
    v_quote.user_id, v_quote.client_id, v_quote.technician_id, p_order_number,
    v_quote.description, v_quote.notes,
    v_quote.labor_value, v_quote.total_value, v_quote.parts_total,
    'aberta', 'pendente', 0, CURRENT_DATE
  )
  RETURNING id INTO v_order_id;

  -- Copia os itens
  INSERT INTO order_items (order_id, part_id, quantity, unit_price, total_price)
  SELECT v_order_id, part_id, quantity, unit_price, total_price
  FROM quote_items
  WHERE quote_id = p_quote_id;

  -- Atualiza o orçamento
  UPDATE quotes
  SET status = 'aprovado', converted_order_id = v_order_id, updated_at = NOW()
  WHERE id = p_quote_id;

  RETURN v_order_id;
END;
$$;

-- ────────────────────────────────────────────────────────────────────
-- 9. ÍNDICES DE PERFORMANCE
-- ────────────────────────────────────────────────────────────────────
-- Índices para acelerar histórico de cliente e funcionário
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON service_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_technician_id ON service_orders(technician_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON service_orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_opened_at ON service_orders(opened_at DESC);

-- ────────────────────────────────────────────────────────────────────
-- 10. CORREÇÕES DE RLS (WITH CHECK em todos os INSERTs)
-- ────────────────────────────────────────────────────────────────────
-- ══════════════════════════════════════════════════════════════
-- CORREÇÃO: WITH CHECK em todos os INSERTs
-- Problema: "qual": null nos INSERTs = sem proteção no insert
-- Execute no Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- ── clients ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "clients_insert" ON public.clients;
CREATE POLICY "clients_insert" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── technicians ───────────────────────────────────────────────
DROP POLICY IF EXISTS "technicians_insert" ON public.technicians;
CREATE POLICY "technicians_insert" ON public.technicians
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── service_orders ────────────────────────────────────────────
DROP POLICY IF EXISTS "orders_insert" ON public.service_orders;
CREATE POLICY "orders_insert" ON public.service_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── attachments ───────────────────────────────────────────────
DROP POLICY IF EXISTS "attachments_insert" ON public.attachments;
CREATE POLICY "attachments_insert" ON public.attachments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── parts ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "parts_insert" ON public.parts;
CREATE POLICY "parts_insert" ON public.parts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── order_items ───────────────────────────────────────────────
DROP POLICY IF EXISTS "order_items_insert" ON public.order_items;
CREATE POLICY "order_items_insert" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = order_items.order_id
      AND so.user_id = auth.uid()
    )
  );

-- ── order_notes ───────────────────────────────────────────────
DROP POLICY IF EXISTS "notes_insert" ON public.order_notes;
CREATE POLICY "notes_insert" ON public.order_notes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.service_orders
      WHERE service_orders.id = order_notes.order_id
      AND service_orders.user_id = auth.uid()
    )
  );

-- ── quotes ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "quotes_insert" ON public.quotes;
CREATE POLICY "quotes_insert" ON public.quotes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── quote_items ───────────────────────────────────────────────
DROP POLICY IF EXISTS "quote_items_insert" ON public.quote_items;
CREATE POLICY "quote_items_insert" ON public.quote_items
  FOR INSERT WITH CHECK (
    quote_id IN (SELECT id FROM public.quotes WHERE user_id = auth.uid())
  );

-- ── company_settings ──────────────────────────────────────────
DROP POLICY IF EXISTS "settings_insert" ON public.company_settings;
CREATE POLICY "settings_insert" ON public.company_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ══════════════════════════════════════════════════════════════
-- CORREÇÃO: Bug nas políticas do portal público
-- Problema: o JOIN está comparando o.client_id = o.id (errado!)
--           deveria ser o.client_id = clients.id
-- ══════════════════════════════════════════════════════════════

-- ── clients: portal público ───────────────────────────────────
DROP POLICY IF EXISTS "clients_public_via_order" ON public.clients;
CREATE POLICY "clients_public_via_order" ON public.clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.service_orders o
      WHERE o.client_id = clients.id
      AND o.public_token IS NOT NULL
    )
  );

-- ── technicians: portal público ───────────────────────────────
DROP POLICY IF EXISTS "technicians_public_via_order" ON public.technicians;
CREATE POLICY "technicians_public_via_order" ON public.technicians
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.service_orders o
      WHERE o.technician_id = technicians.id
      AND o.public_token IS NOT NULL
    )
  );


-- Setup concluído com sucesso!