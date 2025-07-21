-- SCRIPT RÁPIDO - Sistema de Convites MTC
-- Execute este SQL no Supabase SQL Editor
-- Este script pode ser executado múltiplas vezes sem erros

-- 1. Adicionar coluna 'approved' à tabela doctors
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'doctors' AND column_name = 'approved') THEN
        ALTER TABLE doctors ADD COLUMN approved BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 2. Criar tabela user_profiles se não existir
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'doctor', 'admin_doctor')) DEFAULT 'doctor',
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(email)
);

-- 3. Criar tabela user_invites se não existir
CREATE TABLE IF NOT EXISTS user_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'doctor', 'admin_doctor')) NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted BOOLEAN DEFAULT false,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Ativar RLS nas tabelas
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;

-- 5. Criar perfil admin para o utilizador atual (se ainda não existir)
INSERT INTO user_profiles (user_id, role, name, email) 
SELECT id, 'admin', 'Administrador', email 
FROM auth.users 
WHERE email = 'edurandrade@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- 6. Atualizar médicos existentes como aprovados
UPDATE doctors SET approved = true WHERE approved IS NULL;

-- MENSAGEM DE SUCESSO
SELECT 'Setup básico concluído! Agora execute o script completo supabase-invite-system.sql' as status; 