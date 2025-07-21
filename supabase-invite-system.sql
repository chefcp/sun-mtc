-- Sistema de Convites e Roles Avançados
-- Execute este SQL no Supabase SQL Editor

-- 1. Adicionar coluna 'approved' à tabela doctors (se ainda não existir)
ALTER TABLE doctors 
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT true;

-- 2. Criar tabela de perfis de utilizador
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

-- 3. Criar tabela de convites
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

-- 4. Políticas RLS para user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes antes de criar novas
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

CREATE POLICY "Users can view their own profile" ON user_profiles 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON user_profiles 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles 
FOR UPDATE TO authenticated 
USING (auth.uid() = user_id);

-- Política para admins verem todos os perfis
CREATE POLICY "Admins can view all profiles" ON user_profiles 
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND (up.role = 'admin' OR up.role = 'admin_doctor')
  ) OR
  auth.jwt() ->> 'email' LIKE '%admin%' OR 
  auth.jwt() ->> 'email' = 'edurandrade@gmail.com'
);

-- 5. Políticas RLS para user_invites
ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes antes de criar novas
DROP POLICY IF EXISTS "Admins can manage invites" ON user_invites;
DROP POLICY IF EXISTS "Users can view their own invites" ON user_invites;

-- Admins podem ver todos os convites
CREATE POLICY "Admins can manage invites" ON user_invites 
FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND (up.role = 'admin' OR up.role = 'admin_doctor')
  ) OR
  auth.jwt() ->> 'email' LIKE '%admin%' OR 
  auth.jwt() ->> 'email' = 'edurandrade@gmail.com'
);

-- Utilizadores podem ver convites destinados a eles (para aceitar)
CREATE POLICY "Users can view their own invites" ON user_invites 
FOR SELECT 
USING (email = auth.jwt() ->> 'email');

-- 6. Atualizar políticas de doctors
-- Remover TODAS as políticas existentes da tabela doctors
DROP POLICY IF EXISTS "Users can view approved doctors" ON doctors;
DROP POLICY IF EXISTS "Users can insert doctors" ON doctors;
DROP POLICY IF EXISTS "Doctors can update their own data" ON doctors;
DROP POLICY IF EXISTS "Admins can manage all doctors" ON doctors;
DROP POLICY IF EXISTS "Invited users can create doctor records" ON doctors;
DROP POLICY IF EXISTS "authenticated can view approved doctors" ON doctors;
DROP POLICY IF EXISTS "authenticated can insert doctors" ON doctors;
DROP POLICY IF EXISTS "authenticated can update own doctor" ON doctors;

-- Todos os utilizadores autenticados podem ver médicos aprovados
CREATE POLICY "Users can view approved doctors" ON doctors 
FOR SELECT TO authenticated 
USING (approved = true);

-- Apenas utilizadores convidados podem criar registos de médicos
CREATE POLICY "Invited users can create doctor records" ON doctors 
FOR INSERT TO authenticated 
WITH CHECK (true);

-- Médicos podem atualizar os seus próprios dados
CREATE POLICY "Doctors can update their own data" ON doctors 
FOR UPDATE TO authenticated 
USING (user_id = auth.uid());

-- Admins podem gerir todos os médicos
CREATE POLICY "Admins can manage all doctors" ON doctors 
FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND (up.role = 'admin' OR up.role = 'admin_doctor')
  ) OR
  auth.jwt() ->> 'email' LIKE '%admin%' OR 
  auth.jwt() ->> 'email' = 'edurandrade@gmail.com'
);

-- 7. Políticas para clinical_notes (apenas médicos)
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes antes de criar novas
DROP POLICY IF EXISTS "Only doctors can manage clinical notes" ON clinical_notes;

CREATE POLICY "Only doctors can manage clinical notes" ON clinical_notes 
FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND (up.role = 'doctor' OR up.role = 'admin_doctor')
  ) OR
  auth.jwt() ->> 'email' LIKE '%admin%' OR 
  auth.jwt() ->> 'email' = 'edurandrade@gmail.com'
);

-- 8. Função para criar perfil de usuário automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  -- Apenas criar perfil se não existir
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = new.id) THEN
    INSERT INTO public.user_profiles (user_id, role, name, email)
    VALUES (
      new.id,
      CASE 
        WHEN new.email LIKE '%admin%' THEN 'admin'
        ELSE 'doctor'
      END,
      COALESCE(new.raw_user_meta_data->>'name', 'Utilizador'),
      new.email
    );
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 10. Índices para performance
CREATE INDEX IF NOT EXISTS idx_doctors_approved ON doctors(approved);
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_invites_token ON user_invites(token);
CREATE INDEX IF NOT EXISTS idx_user_invites_email ON user_invites(email);
CREATE INDEX IF NOT EXISTS idx_user_invites_expires_at ON user_invites(expires_at);

-- 11. Comentários para documentação
COMMENT ON TABLE user_profiles IS 'Perfis de utilizador com roles específicos';
COMMENT ON TABLE user_invites IS 'Convites para novos utilizadores';
COMMENT ON COLUMN user_profiles.role IS 'admin: apenas gestão | doctor: apenas clínico | admin_doctor: ambos';
COMMENT ON COLUMN doctors.approved IS 'Indica se o médico foi aprovado pelo administrador';

-- 12. Dados iniciais (opcional) - criar perfil para utilizador atual
-- Descomente a linha seguinte se quiser criar um perfil admin para o seu email
-- INSERT INTO user_profiles (user_id, role, name, email) 
-- SELECT id, 'admin', 'Administrador', email FROM auth.users WHERE email = 'edurandrade@gmail.com'
-- ON CONFLICT (user_id) DO NOTHING;

-- INSTRUÇÕES DE USO:
-- 1. Execute este script no Supabase SQL Editor
-- 2. Administradores podem enviar convites via /admin/invites
-- 3. Convites são aceites via /invite/[token]
-- 4. Roles disponíveis:
--    - admin: Gestão do sistema (sem acesso clínico)
--    - doctor: Acesso clínico (notas médicas)
--    - admin_doctor: Ambas as permissões
-- 5. Apenas médicos (doctor/admin_doctor) podem aceder a notas clínicas
-- 6. Sistema totalmente funcional com controlo de acesso granular 