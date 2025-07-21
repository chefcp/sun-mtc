-- Atualizar tabela de doctors para incluir aprovação
-- Execute este SQL no Supabase SQL Editor

-- 1. Adicionar coluna 'approved' à tabela doctors
ALTER TABLE doctors 
ADD COLUMN approved BOOLEAN DEFAULT false;

-- 2. Aprovar médicos existentes (opcional - execute apenas se quiser aprovar médicos já existentes)
UPDATE doctors 
SET approved = true 
WHERE created_at < NOW();

-- 3. Criar tabela de perfis de utilizador (opcional para sistema mais robusto)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'doctor')) DEFAULT 'doctor',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- 4. Políticas RLS para user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON user_profiles 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON user_profiles 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles 
FOR UPDATE TO authenticated 
USING (auth.uid() = user_id);

-- 5. Atualizar políticas de doctors para considerar aprovação
DROP POLICY IF EXISTS "Users can view all doctors" ON doctors;
DROP POLICY IF EXISTS "Users can insert doctors" ON doctors;
DROP POLICY IF EXISTS "Users can update doctors" ON doctors;
DROP POLICY IF EXISTS "Users can delete doctors" ON doctors;

-- Política para visualizar: usuários autenticados podem ver apenas médicos aprovados
CREATE POLICY "Users can view approved doctors" ON doctors 
FOR SELECT TO authenticated 
USING (approved = true);

-- Política para inserir: usuários autenticados podem criar médicos (que ficarão pendentes)
CREATE POLICY "Users can insert doctors" ON doctors 
FOR INSERT TO authenticated 
WITH CHECK (true);

-- Política para atualizar: apenas o próprio médico pode atualizar seus dados
-- (admins podem atualizar através de políticas específicas)
CREATE POLICY "Doctors can update their own data" ON doctors 
FOR UPDATE TO authenticated 
USING (user_id = auth.uid());

-- Política especial para admins (baseada em email - ajustar conforme necessário)
-- Para ambiente de produção, use a tabela user_profiles
CREATE POLICY "Admins can manage all doctors" ON doctors 
FOR ALL TO authenticated 
USING (
  auth.jwt() ->> 'email' LIKE '%admin%' OR 
  auth.jwt() ->> 'email' = 'edurandrade@gmail.com'
);

-- 6. Função para criar perfil de usuário automaticamente (opcional)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, role)
  VALUES (
    new.id,
    CASE 
      WHEN new.email LIKE '%admin%' THEN 'admin'
      ELSE 'doctor'
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. Índices para performance
CREATE INDEX IF NOT EXISTS idx_doctors_approved ON doctors(approved);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- 9. Comentários para documentação
COMMENT ON COLUMN doctors.approved IS 'Indica se o médico foi aprovado pelo administrador';
COMMENT ON TABLE user_profiles IS 'Perfis de utilizador com roles (admin, doctor)';

-- INSTRUÇÕES DE USO:
-- 1. Execute este script no Supabase SQL Editor
-- 2. O primeiro utilizador com email contendo "admin" ou "edurandrade@gmail.com" será automaticamente admin
-- 3. Novos médicos serão criados como não aprovados (approved = false)
-- 4. Apenas admins podem aprovar médicos através da página /admin
-- 5. Utilizadores normais só veem médicos aprovados 