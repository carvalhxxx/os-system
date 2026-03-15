# Configuração do Bucket de Storage

O sistema usa um bucket chamado `attachments` para armazenar:
- Anexos das Ordens de Serviço (fotos, documentos)
- Logo da empresa (usada na tela de login e no PDF)

## Passo a passo no Supabase

### 1. Criar o bucket

1. Acesse o painel do Supabase
2. Vá em **Storage** no menu lateral
3. Clique em **New bucket**
4. Preencha:
   - **Name:** `attachments`
   - **Public bucket:** ✅ Ativado (necessário para exibir a logo e anexos publicamente)
5. Clique em **Save**

### 2. Configurar as policies

Após criar o bucket, vá em **Storage → Policies** e crie as seguintes policies para o bucket `attachments`:

#### Policy de INSERT (upload)
- **Policy name:** `attachments_insert`
- **Allowed operation:** INSERT
- **Policy definition:**
```sql
(auth.uid()::text) = (storage.foldername(name))[1]
```

#### Policy de SELECT (leitura)
- **Policy name:** `attachments_select`
- **Allowed operation:** SELECT
- **Policy definition:**
```sql
true
```

#### Policy de DELETE (exclusão)
- **Policy name:** `attachments_delete`
- **Allowed operation:** DELETE
- **Policy definition:**
```sql
(auth.uid()::text) = (storage.foldername(name))[1]
```

## Como funciona

- Cada usuário só consegue fazer upload e deletar arquivos dentro da **própria pasta** (identificada pelo `user_id`)
- A leitura é pública (`true`), necessário para exibir imagens no navegador sem autenticação
- A logo da empresa é salva em `logos/{user_id}.{ext}`
- Os anexos das OS são salvos em `{user_id}/{order_id}/{filename}`

## Verificação

Após configurar, tente fazer upload de uma logo em **Configurações**. Se aparecer no preview, está tudo certo.
