-- SCRIPT DE LIMPEZA - Remove todas as políticas RLS
-- Execute este SQL APENAS se tiver conflitos de políticas
-- Depois execute o supabase-invite-system.sql

-- 1. Remover todas as políticas RLS da tabela doctors
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'doctors') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON doctors';
    END LOOP;
END $$;

-- 2. Remover todas as políticas RLS da tabela user_profiles
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON user_profiles';
    END LOOP;
END $$;

-- 3. Remover todas as políticas RLS da tabela user_invites
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_invites') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON user_invites';
    END LOOP;
END $$;

-- 4. Remover todas as políticas RLS da tabela clinical_notes
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'clinical_notes') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON clinical_notes';
    END LOOP;
END $$;

-- 5. Verificar se todas as políticas foram removidas
SELECT 
    tablename, 
    COUNT(*) as policies_remaining 
FROM pg_policies 
WHERE tablename IN ('doctors', 'user_profiles', 'user_invites', 'clinical_notes')
GROUP BY tablename;

-- MENSAGEM DE SUCESSO
SELECT 'Políticas RLS removidas! Agora execute supabase-invite-system.sql' as status; 