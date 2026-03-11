# OS Manager — Sistema de Ordens de Serviço

Sistema completo para controle de Ordens de Serviço para técnicos e empresas de manutenção.

## Stack

| Tecnologia | Versão | Uso |
|---|---|---|
| React | 18 | UI |
| TypeScript | 5 | Tipagem |
| Vite | 5 | Build tool |
| Supabase | 2 | Auth + DB + Storage |
| TailwindCSS | 3 LTS | Estilos |
| React Router | 6 | Navegação |
| React Hook Form | 7 | Formulários |
| Zod | 3 | Validação |
| TanStack Query | 5 | Server state |
| jsPDF | 2 | Exportação PDF |

---

## Funcionalidades

- **Autenticação** — Login, cadastro, recuperação de senha via Supabase Auth
- **Dashboard** — Estatísticas de OS abertas, em andamento, finalizadas e total faturado
- **Clientes** — CRUD completo com busca por nome e paginação
- **Técnicos** — CRUD com controle de ativo/inativo
- **Ordens de Serviço** — CRUD completo com filtros por status, cliente e data
- **Anexos** — Upload de fotos e PDFs no Supabase Storage
- **Exportar PDF** — Gera PDF profissional da OS com jsPDF
- **Modo escuro** — Toggle persistente no localStorage
- **RLS** — Row Level Security: cada usuário vê apenas seus dados

---

## Como rodar

### 1. Clone e instale dependências

```bash
git clone <repo>
cd os-system
npm install
```

### 2. Configure o Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Vá em **SQL Editor** e execute o conteúdo de `supabase-schema.sql`
3. Vá em **Storage > New Bucket**, crie um bucket chamado `attachments` (marque como público)
4. Configure as políticas do bucket:
   - **INSERT**: `(auth.uid()::text) = (storage.foldername(name))[1]`
   - **SELECT**: `true`
   - **DELETE**: `(auth.uid()::text) = (storage.foldername(name))[1]`

### 3. Configure variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` com suas credenciais do Supabase:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

As chaves estão em: **Settings > API** no painel do Supabase.

### 4. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:5173

---

## Estrutura de pastas

```
src/
├── components/
│   ├── ui/            # Badge, Modal, Paginação, FormField, Spinner...
│   └── ProtectedRoute.tsx
├── hooks/
│   ├── useAuth.tsx    # Context de autenticação
│   └── useTheme.tsx   # Context do tema (dark/light)
├── layouts/
│   └── AppLayout.tsx  # Sidebar + Navbar
├── lib/
│   ├── supabase.ts    # Cliente Supabase
│   ├── utils.ts       # Helpers (formatação, masks, status)
│   └── pdf.ts         # Exportação PDF com jsPDF
├── pages/
│   ├── auth/          # Login, Registro, Recuperar senha
│   ├── dashboard/     # Dashboard com stats e lista recente
│   ├── clients/       # CRUD de clientes
│   ├── technicians/   # CRUD de técnicos
│   └── orders/        # Lista, formulário e detalhe da OS
├── services/
│   ├── clients.service.ts
│   ├── technicians.service.ts
│   ├── orders.service.ts
│   └── attachments.service.ts
└── types/
    └── index.ts       # Todos os tipos TypeScript
```

---

## Build para produção

```bash
npm run build
npm run preview
```

---

## Tabelas Supabase

| Tabela | Descrição |
|---|---|
| `clients` | Cadastro de clientes |
| `technicians` | Cadastro de técnicos |
| `service_orders` | Ordens de serviço |
| `attachments` | Metadados dos arquivos anexados |

Todas as tabelas têm RLS habilitado. Cada usuário acessa apenas seus próprios registros via `user_id = auth.uid()`.

---

## Configuração do Storage

O bucket `attachments` armazena arquivos no caminho:
```
{user_id}/{order_id}/{timestamp}.{ext}
```

---

## Personalização

- **Cores**: edite `tailwind.config.js` → `theme.extend.colors.brand`
- **Logo**: substitua o ícone em `AppLayout.tsx`
- **Campos extras**: adicione colunas no SQL e atualize os tipos em `src/types/index.ts`
