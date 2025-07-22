-- 🔧 Corrigir Políticas RLS - Sistema MTC
-- Execute este SQL no Supabase SQL Editor para resolver recursão infinita

-- ========================================
-- 1. REMOVER TODAS AS POLÍTICAS PROBLEMÁTICAS
-- ========================================

-- Remover políticas da tabela user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

-- Remover políticas da tabela user_invites  
DROP POLICY IF EXISTS "Admins can manage invites" ON user_invites;
DROP POLICY IF EXISTS "Users can view their own invites" ON user_invites;

-- Remover políticas da tabela doctors
DROP POLICY IF EXISTS "Users can view approved doctors" ON doctors;
DROP POLICY IF EXISTS "Invited users can create doctor records" ON doctors;
DROP POLICY IF EXISTS "Doctors can update their own data" ON doctors;
DROP POLICY IF EXISTS "Admins can manage all doctors" ON doctors;

-- ========================================
-- 2. CRIAR POLÍTICAS SIMPLES E SEGURAS
-- ========================================

-- Políticas para user_profiles (sem recursão)
CREATE POLICY "Allow authenticated users to view profiles" ON user_profiles 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow users to insert their own profile" ON user_profiles 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own profile" ON user_profiles 
FOR UPDATE TO authenticated 
USING (auth.uid() = user_id);

-- Política simples para admins (baseada em email)
CREATE POLICY "Allow admin email access to all profiles" ON user_profiles 
FOR ALL TO authenticated 
USING (auth.jwt() ->> 'email' = 'edurandrade@gmail.com');

-- Políticas para user_invites (sem recursão)
CREATE POLICY "Allow authenticated users to view invites" ON user_invites 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin email to manage invites" ON user_invites 
FOR ALL TO authenticated 
USING (auth.jwt() ->> 'email' = 'edurandrade@gmail.com');

-- Políticas para doctors (simplificadas)
CREATE POLICY "Allow all authenticated users to view approved doctors" ON doctors 
FOR SELECT TO authenticated 
USING (approved = true);

CREATE POLICY "Allow authenticated users to create doctor records" ON doctors 
FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow doctors to update own records" ON doctors 
FOR UPDATE TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Allow admin email to manage all doctors" ON doctors 
FOR ALL TO authenticated 
USING (auth.jwt() ->> 'email' = 'edurandrade@gmail.com');

-- ========================================
-- 3. VERIFICAR TABELAS E ÍNDICES
-- ========================================

-- Garantir que as tabelas têm RLS ativado
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

-- Verificar índices importantes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_invites_email ON user_invites(email);
CREATE INDEX IF NOT EXISTS idx_user_invites_token ON user_invites(token);

-- ========================================
-- 4. COMENTÁRIOS
-- ========================================

COMMENT ON POLICY "Allow authenticated users to view profiles" ON user_profiles 
IS 'Permite a todos os utilizadores autenticados ver perfis (sem recursão)';

COMMENT ON POLICY "Allow admin email access to all profiles" ON user_profiles 
IS 'Acesso total para email específico de administrador';

-- ========================================
-- 5. TESTE DAS POLÍTICAS
-- ========================================

-- Verificar se as políticas foram criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'user_invites', 'doctors')
ORDER BY tablename, policyname;

-- INSTRUÇÕES:
-- 1. Execute este SQL no Supabase SQL Editor
-- 2. Refresh a página do sistema
-- 3. O erro de recursão deve desaparecer
-- 4. Teste o login e navegação 