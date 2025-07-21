-- 🏥 Sistema MTC - Setup da Base de Dados
-- Executa este código no Supabase SQL Editor

-- 1. Tabela de clientes/pacientes
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Tabela de médicos
CREATE TABLE doctors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  phone TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Tabela de gabinetes/salas
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Tabela de consultas
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

-- 5. Tabela de notas clínicas
CREATE TABLE clinical_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  summary TEXT,
  diagnosis TEXT,
  prescription TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Índices para melhor performance
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_client ON appointments(client_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_status ON appointments(status);

-- 7. Ativar Row Level Security (RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;

-- 8. Políticas de segurança básicas (utilizadores autenticados)
CREATE POLICY "Allow all operations for authenticated users" ON clients 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON doctors 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON rooms 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON appointments 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON clinical_notes 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9. Dados de exemplo (opcional)
INSERT INTO doctors (name, specialty, phone, active) VALUES 
('Dr. João Silva', 'Clínica Geral', '912345678', true),
('Dra. Maria Santos', 'Cardiologia', '923456789', true),
('Dr. Pedro Costa', 'Pediatria', '934567890', true);

INSERT INTO rooms (name, location, notes) VALUES 
('Gabinete 1', 'Piso 0, Ala Norte', 'Gabinete principal com equipamento completo'),
('Gabinete 2', 'Piso 1, Ala Sul', 'Especializado em cardiologia'),
('Sala de Exames', 'Piso 0, Centro', 'Para exames e procedimentos');

INSERT INTO clients (name, birth_date, email, phone, notes) VALUES 
('Ana Rodrigues', '1985-03-15', 'ana@email.com', '911111111', 'Cliente regular'),
('José Ferreira', '1970-08-22', 'jose@email.com', '922222222', 'Historial de hipertensão'),
('Sofia Mendes', '1995-12-05', 'sofia@email.com', '933333333', 'Primeira consulta');

-- Sucesso! As tabelas foram criadas 🎉 