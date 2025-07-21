#!/usr/bin/env python3
"""
Script para migração de dados de base de dados SQL legacy para Supabase
Este script conecta à base de dados antiga e migra os dados para o Supabase.
"""

import os
import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Optional, Any
import pandas as pd
from supabase import create_client, Client

# Configurações
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

class SQLToSupabaseMigrator:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.connection = None
        
    def connect_to_legacy_db(self):
        """Conecta à base de dados legacy"""
        try:
            self.connection = sqlite3.connect(self.db_path)
            self.connection.row_factory = sqlite3.Row  # Para acessar colunas por nome
            print(f"Conectado à base de dados: {self.db_path}")
            return True
        except Exception as e:
            print(f"Erro ao conectar à base de dados: {e}")
            return False
    
    def get_table_info(self, table_name: str) -> List[Dict]:
        """Obtém informações sobre a estrutura de uma tabela"""
        try:
            cursor = self.connection.cursor()
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()
            
            table_info = []
            for col in columns:
                table_info.append({
                    'name': col['name'],
                    'type': col['type'],
                    'not_null': bool(col['notnull']),
                    'primary_key': bool(col['pk'])
                })
            
            return table_info
        except Exception as e:
            print(f"Erro ao obter informações da tabela {table_name}: {e}")
            return []
    
    def list_tables(self) -> List[str]:
        """Lista todas as tabelas na base de dados"""
        try:
            cursor = self.connection.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            return tables
        except Exception as e:
            print(f"Erro ao listar tabelas: {e}")
            return []
    
    def migrate_clients(self):
        """Migra dados de clientes/pacientes"""
        print("\n=== Migrando Clientes ===")
        
        # Mapear possíveis nomes de tabelas
        possible_tables = ['clients', 'patients', 'pacientes', 'clientes']
        client_table = None
        
        tables = self.list_tables()
        for table in possible_tables:
            if table in tables:
                client_table = table
                break
        
        if not client_table:
            print("Tabela de clientes não encontrada")
            return False
        
        print(f"Tabela de clientes encontrada: {client_table}")
        
        try:
            # Ler dados da tabela
            df = pd.read_sql_query(f"SELECT * FROM {client_table}", self.connection)
            print(f"Encontrados {len(df)} registos na tabela {client_table}")
            
            # Mapear colunas para o schema do Supabase
            column_mapping = self.map_client_columns(df.columns.tolist())
            
            migrated_count = 0
            errors_count = 0
            
            for _, row in df.iterrows():
                try:
                    # Transformar dados
                    client_data = self.transform_client_data(row, column_mapping)
                    
                    if not client_data:
                        errors_count += 1
                        continue
                    
                    # Verificar se cliente já existe
                    existing = self.supabase.table('clients').select('id').eq('name', client_data['name']).execute()
                    
                    if existing.data:
                        print(f"Cliente já existe: {client_data['name']}")
                        continue
                    
                    # Inserir no Supabase
                    result = self.supabase.table('clients').insert(client_data).execute()
                    
                    if result.data:
                        migrated_count += 1
                        print(f"Cliente migrado: {client_data['name']}")
                    else:
                        errors_count += 1
                        
                except Exception as e:
                    print(f"Erro ao migrar cliente: {e}")
                    errors_count += 1
            
            print(f"Clientes migrados: {migrated_count}")
            print(f"Erros: {errors_count}")
            return True
            
        except Exception as e:
            print(f"Erro na migração de clientes: {e}")
            return False
    
    def map_client_columns(self, columns: List[str]) -> Dict[str, str]:
        """Mapeia colunas da tabela legacy para o schema do Supabase"""
        mapping = {}
        
        # Mapeamentos possíveis
        name_fields = ['name', 'nome', 'patient_name', 'full_name']
        birth_date_fields = ['birth_date', 'data_nascimento', 'nascimento', 'birthday']
        email_fields = ['email', 'e_mail', 'email_address']
        phone_fields = ['phone', 'telefone', 'telemóvel', 'mobile', 'contact']
        notes_fields = ['notes', 'notas', 'observacoes', 'comments']
        
        for col in columns:
            col_lower = col.lower()
            
            if any(field in col_lower for field in name_fields):
                mapping['name'] = col
            elif any(field in col_lower for field in birth_date_fields):
                mapping['birth_date'] = col
            elif any(field in col_lower for field in email_fields):
                mapping['email'] = col
            elif any(field in col_lower for field in phone_fields):
                mapping['phone'] = col
            elif any(field in col_lower for field in notes_fields):
                mapping['notes'] = col
        
        print(f"Mapeamento de colunas: {mapping}")
        return mapping
    
    def transform_client_data(self, row: pd.Series, mapping: Dict[str, str]) -> Optional[Dict]:
        """Transforma dados de um cliente para o formato do Supabase"""
        try:
            # Nome é obrigatório
            if 'name' not in mapping or pd.isna(row[mapping['name']]):
                return None
            
            client_data = {
                'name': str(row[mapping['name']]).strip()
            }
            
            # Data de nascimento (obrigatória)
            if 'birth_date' in mapping and not pd.isna(row[mapping['birth_date']]):
                birth_date = self.parse_date(row[mapping['birth_date']])
                if birth_date:
                    client_data['birth_date'] = birth_date
                else:
                    # Se não conseguir parsear a data, usar uma data padrão
                    client_data['birth_date'] = '1900-01-01'
            else:
                client_data['birth_date'] = '1900-01-01'
            
            # Campos opcionais
            if 'email' in mapping and not pd.isna(row[mapping['email']]):
                email = str(row[mapping['email']]).strip()
                if '@' in email:  # Validação básica
                    client_data['email'] = email
            
            if 'phone' in mapping and not pd.isna(row[mapping['phone']]):
                client_data['phone'] = str(row[mapping['phone']]).strip()
            
            if 'notes' in mapping and not pd.isna(row[mapping['notes']]):
                client_data['notes'] = str(row[mapping['notes']]).strip()
            
            return client_data
            
        except Exception as e:
            print(f"Erro ao transformar dados do cliente: {e}")
            return None
    
    def parse_date(self, date_value: Any) -> Optional[str]:
        """Converte diversos formatos de data para ISO format"""
        if pd.isna(date_value):
            return None
        
        date_str = str(date_value).strip()
        
        # Formatos comuns
        formats = [
            '%Y-%m-%d',      # 2023-12-25
            '%d/%m/%Y',      # 25/12/2023
            '%d-%m-%Y',      # 25-12-2023
            '%m/%d/%Y',      # 12/25/2023
            '%Y/%m/%d',      # 2023/12/25
            '%d.%m.%Y',      # 25.12.2023
        ]
        
        for fmt in formats:
            try:
                date_obj = datetime.strptime(date_str, fmt)
                return date_obj.strftime('%Y-%m-%d')
            except ValueError:
                continue
        
        print(f"Não foi possível parsear a data: {date_value}")
        return None
    
    def migrate_appointments(self):
        """Migra dados de consultas"""
        print("\n=== Migrando Consultas ===")
        
        possible_tables = ['appointments', 'consultas', 'sessions', 'visits']
        appointment_table = None
        
        tables = self.list_tables()
        for table in possible_tables:
            if table in tables:
                appointment_table = table
                break
        
        if not appointment_table:
            print("Tabela de consultas não encontrada")
            return False
        
        print(f"Tabela de consultas encontrada: {appointment_table}")
        
        try:
            df = pd.read_sql_query(f"SELECT * FROM {appointment_table}", self.connection)
            print(f"Encontrados {len(df)} registos na tabela {appointment_table}")
            
            column_mapping = self.map_appointment_columns(df.columns.tolist())
            
            migrated_count = 0
            errors_count = 0
            
            for _, row in df.iterrows():
                try:
                    appointment_data = self.transform_appointment_data(row, column_mapping)
                    
                    if not appointment_data:
                        errors_count += 1
                        continue
                    
                    # Inserir consulta
                    result = self.supabase.table('appointments').insert(appointment_data).execute()
                    
                    if result.data:
                        migrated_count += 1
                        print(f"Consulta migrada: {appointment_data.get('date', 'sem data')}")
                    else:
                        errors_count += 1
                        
                except Exception as e:
                    print(f"Erro ao migrar consulta: {e}")
                    errors_count += 1
            
            print(f"Consultas migradas: {migrated_count}")
            print(f"Erros: {errors_count}")
            return True
            
        except Exception as e:
            print(f"Erro na migração de consultas: {e}")
            return False
    
    def map_appointment_columns(self, columns: List[str]) -> Dict[str, str]:
        """Mapeia colunas da tabela de consultas"""
        mapping = {}
        
        # Mapeamentos possíveis
        client_fields = ['client_id', 'patient_id', 'cliente_id', 'paciente_id']
        date_fields = ['date', 'appointment_date', 'data', 'data_consulta']
        notes_fields = ['notes', 'notas', 'observacoes', 'summary']
        
        for col in columns:
            col_lower = col.lower()
            
            if any(field in col_lower for field in client_fields):
                mapping['client_id'] = col
            elif any(field in col_lower for field in date_fields):
                mapping['date'] = col
            elif any(field in col_lower for field in notes_fields):
                mapping['notes'] = col
        
        print(f"Mapeamento de consultas: {mapping}")
        return mapping
    
    def transform_appointment_data(self, row: pd.Series, mapping: Dict[str, str]) -> Optional[Dict]:
        """Transforma dados de consulta para o formato do Supabase"""
        try:
            appointment_data = {
                'client_id': None,  # Será necessário mapear manualmente
                'doctor_id': None,  # Será necessário configurar
                'room_id': None,    # Será necessário configurar
                'date': datetime.now().isoformat(),
                'duration_min': 60,
                'status': 'done'
            }
            
            # Data da consulta
            if 'date' in mapping and not pd.isna(row[mapping['date']]):
                date_parsed = self.parse_date(row[mapping['date']])
                if date_parsed:
                    appointment_data['date'] = f"{date_parsed}T10:00:00"
            
            # Notas
            if 'notes' in mapping and not pd.isna(row[mapping['notes']]):
                appointment_data['notes'] = str(row[mapping['notes']]).strip()
            
            return appointment_data
            
        except Exception as e:
            print(f"Erro ao transformar dados da consulta: {e}")
            return None
    
    def export_to_csv(self, output_dir: str = "migration_export"):
        """Exporta dados para CSV para revisão manual"""
        print(f"\n=== Exportando dados para {output_dir} ===")
        
        os.makedirs(output_dir, exist_ok=True)
        
        tables = self.list_tables()
        
        for table in tables:
            try:
                df = pd.read_sql_query(f"SELECT * FROM {table}", self.connection)
                csv_path = os.path.join(output_dir, f"{table}.csv")
                df.to_csv(csv_path, index=False)
                print(f"Exportado: {table} ({len(df)} registos) -> {csv_path}")
                
            except Exception as e:
                print(f"Erro ao exportar {table}: {e}")
    
    def close_connection(self):
        """Fecha a conexão com a base de dados"""
        if self.connection:
            self.connection.close()

def main():
    """Função principal"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Erro: Variáveis de ambiente SUPABASE não configuradas")
        return
    
    # Caminho para a base de dados legacy
    db_path = input("Digite o caminho para a base de dados legacy (*.db, *.sqlite): ").strip()
    
    if not os.path.exists(db_path):
        print(f"Arquivo não encontrado: {db_path}")
        return
    
    migrator = SQLToSupabaseMigrator(db_path)
    
    if not migrator.connect_to_legacy_db():
        return
    
    try:
        print("Tabelas encontradas:", migrator.list_tables())
        
        # Perguntar ao utilizador o que fazer
        print("\nOpções:")
        print("1. Migrar dados para Supabase")
        print("2. Exportar dados para CSV")
        print("3. Ambos")
        
        choice = input("Escolha uma opção (1/2/3): ").strip()
        
        if choice in ['1', '3']:
            print("\nIniciando migração para Supabase...")
            migrator.migrate_clients()
            migrator.migrate_appointments()
        
        if choice in ['2', '3']:
            print("\nExportando para CSV...")
            migrator.export_to_csv()
        
        print("\n=== Processo Concluído ===")
        
    finally:
        migrator.close_connection()

if __name__ == "__main__":
    main() 