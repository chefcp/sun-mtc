-- 🔧 Atualizar utilizador edurandrade@gmail.com - Sistema MTC
-- Execute este SQL no Supabase SQL Editor

-- ========================================
-- 1. ATUALIZAR PERFIL PARA ADMIN_DOCTOR
-- ========================================

-- Atualizar o perfil existente ou criar se não existir
INSERT INTO user_profiles (user_id, role, name, email)
SELECT 
    au.id,
    'admin_doctor',
    'Ed RA',
    'edurandrade@gmail.com'
FROM auth.users au
WHERE au.email = 'edurandrade@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET 
    role = 'admin_doctor',
    name = 'Ed RA',
    email = 'edurandrade@gmail.com';

-- Se não existir na tabela auth.users, atualizar apenas se existir
UPDATE user_profiles 
SET 
    role = 'admin_doctor',
    name = 'Ed RA'
WHERE email = 'edurandrade@gmail.com';

-- ========================================
-- 2. GARANTIR REGISTO DE MÉDICO
-- ========================================

-- Criar registo de médico se não existir
INSERT INTO doctors (user_id, name, specialty, approved, active)
SELECT 
    up.user_id,
    'Ed RA',
    'Administração e Clínica Geral',
    true,
    true
FROM user_profiles up
WHERE up.email = 'edurandrade@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM doctors d 
    WHERE d.user_id = up.user_id
  );

-- Atualizar registo de médico se já existir
UPDATE doctors 
SET 
    name = 'Ed RA',
    specialty = 'Administração e Clínica Geral',
    approved = true,
    active = true
WHERE user_id IN (
    SELECT user_id FROM user_profiles 
    WHERE email = 'edurandrade@gmail.com'
);

-- ========================================
-- 3. VERIFICAÇÃO DO RESULTADO
-- ========================================

-- Ver perfil atualizado
SELECT 
    'Perfil atualizado:' as info,
    name,
    email,
    role,
    created_at
FROM user_profiles 
WHERE email = 'edurandrade@gmail.com';

-- Ver registo de médico
SELECT 
    'Registo de médico:' as info,
    d.name,
    d.specialty,
    d.approved,
    d.active,
    d.created_at
FROM doctors d
JOIN user_profiles up ON d.user_id = up.user_id
WHERE up.email = 'edurandrade@gmail.com';

-- ========================================
-- 4. PERMISSÕES DISPONÍVEIS
-- ========================================

SELECT 'PERMISSÕES PARA ROLE admin_doctor:' as info
UNION ALL
SELECT '✅ Gestão completa de utilizadores'
UNION ALL
SELECT '✅ Envio de convites'
UNION ALL
SELECT '✅ Acesso a todas as áreas administrativas'
UNION ALL
SELECT '✅ Acesso completo a dados clínicos'
UNION ALL
SELECT '✅ Criação e edição de notas médicas'
UNION ALL
SELECT '✅ Gestão de consultas e pacientes'
UNION ALL
SELECT '✅ Aprovação de novos médicos';

-- INSTRUÇÕES:
-- 1. Execute este SQL no Supabase SQL Editor
-- 2. Verifique os resultados das queries de verificação
-- 3. Faça logout e login novamente no sistema
-- 4. Deve ter acesso completo a todas as funcionalidades 