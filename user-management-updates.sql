-- 🏥 Sistema MTC - Gestão de Utilizadores
-- Execute este SQL no Supabase SQL Editor

-- ========================================
-- 1. ATUALIZAR UTILIZADOR EXISTENTE
-- ========================================

-- Atualizar o perfil do edurandrade@gmail.com
-- Primeiro, verificar se o utilizador existe e obter o user_id
-- Se existir, atualizar nome e role para admin_doctor

UPDATE user_profiles 
SET 
    name = 'Ed RA',
    role = 'admin_doctor'
WHERE email = 'edurandrade@gmail.com';

-- Se o perfil não existir mas o utilizador está na tabela auth.users, criar perfil
INSERT INTO user_profiles (user_id, role, name, email)
SELECT 
    au.id,
    'admin_doctor',
    'Ed RA',
    'edurandrade@gmail.com'
FROM auth.users au
WHERE au.email = 'edurandrade@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.email = 'edurandrade@gmail.com'
  );

-- Garantir que tem registo de médico (se aplicável)
INSERT INTO doctors (user_id, name, specialty, approved)
SELECT 
    up.user_id,
    'Ed RA',
    'Administração/Clínica Geral',
    true
FROM user_profiles up
WHERE up.email = 'edurandrade@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM doctors d 
    WHERE d.user_id = up.user_id
  );

-- ========================================
-- 2. CRIAR CONVITES PARA NOVOS UTILIZADORES
-- ========================================

-- Limpar convites existentes para estes emails (se existirem)
DELETE FROM user_invites 
WHERE email IN (
    'info@sunmtc.com',
    'salvador.ra@sunmtc.com', 
    'eduardo.horgan@sunmtc.com'
);

-- Criar convites para os novos utilizadores
-- Nota: Os tokens são gerados automaticamente como UUID únicos

-- 1. info@sunmtc.com - Geral Sun MTC - só administrador
INSERT INTO user_invites (
    email,
    role,
    invited_by,
    token,
    expires_at
) VALUES (
    'info@sunmtc.com',
    'admin',
    (SELECT id FROM auth.users WHERE email = 'edurandrade@gmail.com' LIMIT 1),
    gen_random_uuid()::text,
    NOW() + INTERVAL '30 days'
);

-- 2. salvador.ra@sunmtc.com - Salvador Andrade - médico e administrador  
INSERT INTO user_invites (
    email,
    role,
    invited_by,
    token,
    expires_at
) VALUES (
    'salvador.ra@sunmtc.com',
    'admin_doctor',
    (SELECT id FROM auth.users WHERE email = 'edurandrade@gmail.com' LIMIT 1),
    gen_random_uuid()::text,
    NOW() + INTERVAL '30 days'
);

-- 3. eduardo.horgan@sunmtc.com - Eduardo Horgan - médico e administrador
INSERT INTO user_invites (
    email,
    role,
    invited_by,
    token,
    expires_at
) VALUES (
    'eduardo.horgan@sunmtc.com',
    'admin_doctor',
    (SELECT id FROM auth.users WHERE email = 'edurandrade@gmail.com' LIMIT 1),
    gen_random_uuid()::text,
    NOW() + INTERVAL '30 days'
);

-- ========================================
-- 3. VERIFICAÇÃO DOS RESULTADOS
-- ========================================

-- Ver convites criados
SELECT 
    email,
    role,
    token,
    expires_at,
    'https://sua-app.vercel.app/invite/' || token as invite_link
FROM user_invites 
WHERE email IN (
    'info@sunmtc.com',
    'salvador.ra@sunmtc.com', 
    'eduardo.horgan@sunmtc.com'
)
ORDER BY email;

-- Ver perfil atualizado do edurandrade
SELECT 
    name,
    email,
    role,
    created_at
FROM user_profiles 
WHERE email = 'edurandrade@gmail.com';

-- ========================================
-- 4. INSTRUÇÕES DE USO
-- ========================================

/*
PRÓXIMOS PASSOS:

1. Execute este SQL no Supabase SQL Editor

2. Copie os links de convite gerados pela query de verificação

3. Envie os links para os respetivos utilizadores:
   - info@sunmtc.com → Link de convite (role: admin)
   - salvador.ra@sunmtc.com → Link de convite (role: admin_doctor)  
   - eduardo.horgan@sunmtc.com → Link de convite (role: admin_doctor)

4. Os utilizadores acedem ao link e completam o registo

5. Após aceitarem o convite:
   - info@sunmtc.com: Terá acesso apenas à área administrativa
   - salvador.ra@sunmtc.com: Terá acesso administrativo + clínico
   - eduardo.horgan@sunmtc.com: Terá acesso administrativo + clínico

NOTA: Os convites expiram em 30 dias. 
Se precisar de reenviar, execute novamente a secção 2.
*/ 