# 🚀 Setup Rápido - Sistema MTC

## ⚡ Início Rápido (5 minutos)

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Supabase

1. Ir a [supabase.com](https://supabase.com) e criar conta
2. Criar novo projeto
3. Copiar credenciais do projeto

### 3. Configurar Variáveis de Ambiente

Criar arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-publica
SUPABASE_SERVICE_ROLE_KEY=sua-chave-de-servico
```

### 4. Criar Base de Dados

No Supabase Dashboard → SQL Editor, executar:

```sql
-- Tabela de clientes
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de médicos
CREATE TABLE doctors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  phone TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de gabinetes
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de consultas
CREATE TABLE appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id),
  room_id UUID REFERENCES rooms(id),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_min INTEGER DEFAULT 60,
  status TEXT CHECK (status IN ('scheduled', 'done', 'canceled')) DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de notas clínicas
CREATE TABLE clinical_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  summary TEXT,
  diagnosis TEXT,
  prescription TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Políticas RLS básicas
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON doctors FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON rooms FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON appointments FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON clinical_notes FOR ALL TO authenticated USING (true);
```

### 5. Executar Projeto

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

### 6. Primeiro Login

1. Ir para página de login
2. Criar nova conta
3. Confirmar email
4. Fazer login e começar a usar!

---

## 🌐 Deploy no Vercel

### 1. Conectar Repositório
1. Fazer push para GitHub
2. Ir a [vercel.com](https://vercel.com)
3. Importar projeto do GitHub

### 2. Configurar Variáveis
No dashboard do Vercel, adicionar as mesmas variáveis do `.env.local`

### 3. Deploy
Deploy automático! 🎉

---

## 📚 Próximos Passos

- **Adicionar dados**: Criar clientes, médicos e gabinetes
- **Migração**: Usar scripts em `/scripts` para importar dados legacy
- **Personalizar**: Ajustar cores, logo e configurações no código

## 🆘 Problemas Comuns

**Erro de autenticação**: Verificar variáveis de ambiente
**Erro na base de dados**: Confirmar que as tabelas foram criadas
**Deploy falha**: Verificar se as variáveis estão configuradas no Vercel

## 💡 Dicas

- Use dados de exemplo para testar o sistema
- Configure email personalizado no Supabase para melhor experiência
- Ative backups automáticos no Supabase para segurança

---

**Sistema MTC** - Pronto em 5 minutos! 🚀 