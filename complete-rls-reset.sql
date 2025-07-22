-- 🔧 Reset Completo de Políticas RLS - Sistema MTC
-- Execute este SQL no Supabase SQL Editor

-- ========================================
-- 1. REMOVER TODAS AS POLÍTICAS EXISTENTES
-- ========================================

-- Listar todas as políticas primeiro (para debugging)
DO $$
BEGIN
    RAISE NOTICE 'Políticas existentes antes da limpeza:';
END $$;

-- Remover TODAS as políticas da tabela user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow admin email access to all profiles" ON user_profiles;

-- Remover TODAS as políticas da tabela user_invites
DROP POLICY IF EXISTS "Admins can manage invites" ON user_invites;
DROP POLICY IF EXISTS "Users can view their own invites" ON user_invites;
DROP POLICY IF EXISTS "Allow authenticated users to view invites" ON user_invites;
DROP POLICY IF EXISTS "Allow admin email to manage invites" ON user_invites;

-- Remover TODAS as políticas da tabela doctors
DROP POLICY IF EXISTS "Users can view approved doctors" ON doctors;
DROP POLICY IF EXISTS "Invited users can create doctor records" ON doctors;
DROP POLICY IF EXISTS "Doctors can update their own data" ON doctors;
DROP POLICY IF EXISTS "Admins can manage all doctors" ON doctors;
DROP POLICY IF EXISTS "Allow all authenticated users to view approved doctors" ON doctors;
DROP POLICY IF EXISTS "Allow authenticated users to create doctor records" ON doctors;
DROP POLICY IF EXISTS "Allow doctors to update own records" ON doctors;
DROP POLICY IF EXISTS "Allow admin email to manage all doctors" ON doctors;

-- Remover políticas das outras tabelas também
DROP POLICY IF EXISTS "Only doctors can manage clinical notes" ON clinical_notes;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON clients;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON doctors;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON rooms;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON appointments;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON clinical_notes;

-- ========================================
-- 2. DESATIVAR TEMPORARIAMENTE RLS
-- ========================================

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE doctors DISABLE ROW LEVEL SECURITY;

-- ========================================
-- 3. REATIVAR RLS E CRIAR POLÍTICAS SIMPLES
-- ========================================

-- Reativar RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

-- Políticas MUITO SIMPLES para user_profiles
CREATE POLICY "simple_view_profiles" ON user_profiles 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "simple_insert_profiles" ON user_profiles 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "simple_update_profiles" ON user_profiles 
FOR UPDATE TO authenticated 
USING (auth.uid() = user_id);

-- Política especial para admin (sem recursão)
CREATE POLICY "admin_all_profiles" ON user_profiles 
FOR ALL TO authenticated 
USING (auth.jwt() ->> 'email' = 'edurandrade@gmail.com');

-- Políticas simples para user_invites
CREATE POLICY "simple_view_invites" ON user_invites 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_manage_invites" ON user_invites 
FOR ALL TO authenticated 
USING (auth.jwt() ->> 'email' = 'edurandrade@gmail.com');

-- Políticas simples para doctors
CREATE POLICY "simple_view_doctors" ON doctors 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "simple_insert_doctors" ON doctors 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "simple_update_doctors" ON doctors 
FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "admin_all_doctors" ON doctors 
FOR ALL TO authenticated 
USING (auth.jwt() ->> 'email' = 'edurandrade@gmail.com');

-- ========================================
-- 4. POLÍTICAS SIMPLES PARA OUTRAS TABELAS
-- ========================================

-- Tabelas principais - acesso total para utilizadores autenticados
CREATE POLICY "simple_all_clients" ON clients 
FOR ALL TO authenticated USING (true);

CREATE POLICY "simple_all_rooms" ON rooms 
FOR ALL TO authenticated USING (true);

CREATE POLICY "simple_all_appointments" ON appointments 
FOR ALL TO authenticated USING (true);

CREATE POLICY "simple_all_clinical_notes" ON clinical_notes 
FOR ALL TO authenticated USING (true);

-- ========================================
-- 5. VERIFICAÇÃO FINAL
-- ========================================

-- Listar políticas criadas
SELECT 
    tablename,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'user_invites', 'doctors', 'clients', 'rooms', 'appointments', 'clinical_notes')
ORDER BY tablename, policyname;

-- ========================================
-- SUCESSO!
-- ========================================

SELECT 'Políticas RLS resetadas e recriadas com sucesso!' as status; 