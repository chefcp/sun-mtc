# 🏥 Sistema MTC - Gestão de Consultas Clínicas

Sistema web completo para gestão de consultas médicas, clientes, profissionais de saúde e registos clínicos.

## 🚀 Funcionalidades

- ✅ **Gestão de Clientes**: Cadastro, edição e pesquisa de pacientes
- ✅ **Sistema de Consultas**: Agendamento e gestão de appointments
- ✅ **Registos Clínicos**: Notas médicas, diagnósticos e prescrições
- ✅ **Gestão de Médicos**: Cadastro e gestão de profissionais
- ✅ **Gestão de Gabinetes**: Controlo de salas de consulta
- ✅ **Autenticação**: Login seguro com Supabase Auth
- ✅ **Dashboard**: Visão geral do sistema com estatísticas
- ✅ **Migração de Dados**: Scripts para importar dados legacy

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + APIs)
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Deployment**: Vercel

## 📦 Setup Inicial

### 1. Clonar e Instalar

```bash
git clone <repo-url>
cd sistema-mtc
npm install
```

### 2. Configurar Supabase

1. Criar projeto no [Supabase](https://supabase.com)
2. Copiar as credenciais do projeto
3. Criar arquivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Criar Schema da Base de Dados

Execute os seguintes comandos SQL no Supabase SQL Editor:

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

-- Tabela de gabinetes/salas
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

-- Índices para performance
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_client ON appointments(client_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);

-- RLS (Row Level Security) - Opcional
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas (ajustar conforme necessário)
CREATE POLICY "Users can view all clients" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert clients" ON clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update clients" ON clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete clients" ON clients FOR DELETE TO authenticated USING (true);

-- Repetir políticas similares para outras tabelas...
```

### 4. Executar o Projeto

```bash
npm run dev
```

Aceder a [http://localhost:3000](http://localhost:3000)

## 🔑 Primeiro Acesso

1. Aceder à página de login
2. Criar uma nova conta com email/password
3. Confirmar email (verificar spam)
4. Fazer login e começar a usar

## 📋 Guia de Uso

### Dashboard
- Visão geral das estatísticas do sistema
- Ações rápidas para criar novos registos
- Navegação rápida para as principais funcionalidades

### Gestão de Clientes
- **Listar**: Ver todos os clientes com pesquisa
- **Adicionar**: Formulário para novo cliente
- **Editar**: Modificar dados existentes
- **Eliminar**: Remover cliente (cuidado com consultas associadas)

### Gestão de Consultas
- **Agendar**: Nova consulta com cliente, médico, gabinete
- **Ver**: Lista de consultas por data/status
- **Editar**: Modificar detalhes da consulta
- **Notas**: Adicionar registos clínicos

### Gestão de Médicos
- **Cadastrar**: Novos profissionais de saúde
- **Especialidades**: Definir área de atuação
- **Ativo/Inativo**: Controlar disponibilidade

### Gestão de Gabinetes
- **Criar**: Novos espaços de consulta
- **Localização**: Definir localização física
- **Notas**: Equipamentos, características especiais

## 🔄 Migração de Dados

### Google Drive para Supabase

```bash
cd scripts
pip install -r requirements.txt
python migrate_from_drive.py
```

**Pré-requisitos**:
- Credenciais Google API (`credentials.json`)
- ID da pasta do Google Drive
- Documentos organizados por paciente

### Base de Dados SQL Legacy

```bash
cd scripts
python migrate_from_sql.py
```

**Suporte**:
- SQLite
- Estruturas de dados variadas
- Exportação para CSV para revisão

## 🚀 Deploy (Vercel)

### 1. Preparar para Deploy

```bash
npm run build
```

### 2. Deploy no Vercel

1. Conectar repositório ao [Vercel](https://vercel.com)
2. Configurar variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy automático

### 3. Configurar Domínio (Opcional)

- Adicionar domínio personalizado no Vercel
- Configurar DNS conforme instruções

## 📁 Estrutura do Projeto

```
/
├── src/
│   ├── app/                    # App Router (Next.js 14)
│   │   ├── login/             # Página de autenticação
│   │   ├── dashboard/         # Dashboard principal
│   │   ├── clients/           # Gestão de clientes
│   │   ├── appointments/      # Gestão de consultas
│   │   ├── doctors/           # Gestão de médicos
│   │   └── rooms/             # Gestão de gabinetes
│   ├── components/            # Componentes reutilizáveis
│   │   └── Layout.tsx         # Layout principal
│   └── lib/                   # Configurações e utilitários
│       ├── supabase.ts        # Cliente Supabase
│       └── auth.ts            # Funções de autenticação
├── scripts/                   # Scripts de migração
│   ├── migrate_from_drive.py  # Migração Google Drive
│   ├── migrate_from_sql.py    # Migração SQL legacy
│   └── requirements.txt       # Dependências Python
├── public/                    # Assets estáticos
└── package.json               # Dependências Node.js
```

## 🔧 Configurações Avançadas

### Personalizar Autenticação

```typescript
// src/lib/auth.ts
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google'
  })
  return { data, error }
}
```

### Adicionar Novos Campos

1. Atualizar schema no Supabase
2. Modificar tipos TypeScript em `src/lib/supabase.ts`
3. Atualizar formulários e componentes

### Configurar Emails

No Supabase Dashboard:
1. Settings → Auth → Email Templates
2. Personalizar templates de confirmação
3. Configurar SMTP personalizado (opcional)

## 🐛 Troubleshooting

### Erro de Conexão Supabase
- Verificar variáveis de ambiente
- Confirmar URL e chaves corretas
- Verificar RLS policies

### Problemas de Autenticação
- Verificar confirmação de email
- Limpar localStorage do browser
- Verificar configurações de Auth no Supabase

### Erro na Migração
- Verificar credenciais Google API
- Confirmar estrutura da base de dados legacy
- Verificar logs detalhados no console

## 📚 Recursos Adicionais

- [Documentação Supabase](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Hook Form](https://react-hook-form.com/)

## 🤝 Contribuir

1. Fork do projeto
2. Criar branch para feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit das alterações (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para branch (`git push origin feature/nova-funcionalidade`)
5. Abrir Pull Request

## 📄 Licença

Este projeto está sob licença MIT. Ver arquivo `LICENSE` para detalhes.

## 📞 Suporte

Para suporte e questões:
- Criar issue no repositório
- Email: suporte@sistema-mtc.com
- Documentação: [docs.sistema-mtc.com](docs.sistema-mtc.com)

---

**Sistema MTC** - Desenvolvido com ❤️ para profissionais de saúde
