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
