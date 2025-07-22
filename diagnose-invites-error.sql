-- 🔍 Diagnóstico de Erro nos Convites - Sistema MTC
-- Execute este SQL no Supabase SQL Editor para diagnosticar o problema

-- ========================================
-- 1. VERIFICAR POLÍTICAS RLS ATUAIS
-- ========================================

SELECT 'POLÍTICAS ATUAIS:' as info;

SELECT 
    tablename,
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename IN ('user_invites', 'user_profiles')
ORDER BY tablename, policyname;

-- ========================================
-- 2. VERIFICAR DADOS NA TABELA INVITES
-- ========================================

SELECT 'DADOS NA TABELA USER_INVITES:' as info;

SELECT 
    email,
    role,
    token,
    accepted,
    expires_at,
    created_at
FROM user_invites
ORDER BY created_at DESC;

-- ========================================
-- 3. VERIFICAR UTILIZADOR ATUAL
-- ========================================

SELECT 'UTILIZADOR ATUAL:' as info;

SELECT 
    id,
    email,
    created_at
FROM auth.users 
WHERE email = 'edurandrade@gmail.com';

-- ========================================
-- 4. VERIFICAR PERFIL DO UTILIZADOR
-- ========================================

SELECT 'PERFIL DO UTILIZADOR:' as info;

SELECT 
    user_id,
    role,
    name,
    email,
    created_at
FROM user_profiles 
WHERE email = 'edurandrade@gmail.com';

-- ========================================
-- 5. TESTE DE ACESSO ÀS TABELAS
-- ========================================

-- Testar se consegue ver invites (simula o que o app faz)
SELECT 'TESTE DE ACESSO - COUNT INVITES:' as info;

SELECT COUNT(*) as total_invites FROM user_invites;

-- ========================================
-- 6. VERIFICAR RLS STATUS
-- ========================================

SELECT 'STATUS RLS DAS TABELAS:' as info;

SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('user_invites', 'user_profiles', 'doctors')
ORDER BY tablename;

-- ========================================
-- 7. SOLUÇÃO TEMPORÁRIA - DESATIVAR RLS
-- ========================================

-- Se houver problemas, desativar temporariamente RLS
-- (descomente as linhas abaixo se necessário)

-- ALTER TABLE user_invites DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- ========================================
-- 8. CRIAR CONVITES DE TESTE
-- ========================================

-- Criar convites se não existirem
INSERT INTO user_invites (email, role, invited_by, token, expires_at, accepted)
VALUES 
    ('info@sunmtc.com', 'admin', 
     (SELECT id FROM auth.users WHERE email = 'edurandrade@gmail.com' LIMIT 1),
     gen_random_uuid()::text, NOW() + INTERVAL '30 days', false),
    ('salvador.ra@sunmtc.com', 'admin_doctor', 
     (SELECT id FROM auth.users WHERE email = 'edurandrade@gmail.com' LIMIT 1),
     gen_random_uuid()::text, NOW() + INTERVAL '30 days', false),
    ('eduardo.horgan@sunmtc.com', 'admin_doctor', 
     (SELECT id FROM auth.users WHERE email = 'edurandrade@gmail.com' LIMIT 1),
     gen_random_uuid()::text, NOW() + INTERVAL '30 days', false)
ON CONFLICT (email) DO NOTHING;

-- ========================================
-- 9. VERIFICAÇÃO FINAL
-- ========================================

SELECT 'CONVITES CRIADOS:' as info;

SELECT 
    email,
    role,
    token,
    'https://sun-kol6vfz1y-chef-cp.vercel.app/invite/' || token as invite_link,
    expires_at
FROM user_invites
WHERE email IN ('info@sunmtc.com', 'salvador.ra@sunmtc.com', 'eduardo.horgan@sunmtc.com')
ORDER BY email;

-- INSTRUÇÕES:
-- 1. Execute este SQL completo
-- 2. Analise os resultados para ver onde está o problema
-- 3. Se necessário, descomente as linhas de desativar RLS
-- 4. Os convites serão criados automaticamente 