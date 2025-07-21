#!/usr/bin/env python3
"""
Script para migração de dados do Google Drive para Supabase
Este script extrai informações de documentos Google Docs e converte em registos de clientes e consultas.
"""

import os
import json
import re
from datetime import datetime
from typing import List, Dict, Optional
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from supabase import create_client, Client
import pickle

# Configurações
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

class DriveToSupabaseMigrator:
    def __init__(self):
        self.drive_service = None
        self.docs_service = None
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
    def authenticate_google(self):
        """Autentica com a API do Google Drive"""
        creds = None
        
        # Verifica se já existem credenciais salvas
        if os.path.exists('token.pickle'):
            with open('token.pickle', 'rb') as token:
                creds = pickle.load(token)
        
        # Se não há credenciais válidas, pede autorização
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    'credentials.json', SCOPES)
                creds = flow.run_local_server(port=0)
            
            # Salva credenciais para a próxima execução
            with open('token.pickle', 'wb') as token:
                pickle.dump(creds, token)
        
        self.drive_service = build('drive', 'v3', credentials=creds)
        self.docs_service = build('docs', 'v1', credentials=creds)
    
    def list_patient_documents(self, folder_id: str) -> List[Dict]:
        """Lista todos os documentos na pasta de pacientes"""
        try:
            results = self.drive_service.files().list(
                q=f"'{folder_id}' in parents and (mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document')",
                fields="nextPageToken, files(id, name, mimeType, createdTime, modifiedTime)"
            ).execute()
            
            items = results.get('files', [])
            print(f"Encontrados {len(items)} documentos")
            return items
            
        except Exception as e:
            print(f"Erro ao listar documentos: {e}")
            return []
    
    def extract_document_content(self, file_id: str, mime_type: str) -> str:
        """Extrai o conteúdo de um documento"""
        try:
            if mime_type == 'application/vnd.google-apps.document':
                # Google Docs
                document = self.docs_service.documents().get(documentId=file_id).execute()
                content = self.extract_text_from_doc(document)
            else:
                # Word document - exportar como texto
                content = self.drive_service.files().export_media(
                    fileId=file_id, mimeType='text/plain').execute().decode('utf-8')
            
            return content
            
        except Exception as e:
            print(f"Erro ao extrair conteúdo do documento {file_id}: {e}")
            return ""
    
    def extract_text_from_doc(self, document: Dict) -> str:
        """Extrai texto de um documento Google Docs"""
        content = document.get('body', {}).get('content', [])
        text = ""
        
        for element in content:
            if 'paragraph' in element:
                paragraph = element.get('paragraph', {})
                for text_run in paragraph.get('elements', []):
                    if 'textRun' in text_run:
                        text += text_run.get('textRun', {}).get('content', '')
        
        return text
    
    def parse_patient_info(self, filename: str, content: str) -> Optional[Dict]:
        """Extrai informações do paciente do conteúdo do documento"""
        patient_info = {
            'name': '',
            'birth_date': None,
            'email': None,
            'phone': None,
            'notes': content[:1000] if content else None  # Primeiros 1000 caracteres como notas
        }
        
        # Tentar extrair nome do arquivo
        # Assumir formato "Nome do Paciente.docx" ou similar
        name_from_file = re.sub(r'\.(docx?|gdoc)$', '', filename, flags=re.IGNORECASE)
        patient_info['name'] = name_from_file
        
        # Procurar por padrões no conteúdo
        patterns = {
            'birth_date': [
                r'nascimento[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})',
                r'nasceu[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})',
                r'data.*nascimento[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})'
            ],
            'email': [
                r'email[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})',
                r'e-mail[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'
            ],
            'phone': [
                r'telefone[:\s]+(\+?[\d\s\-\(\)]{9,15})',
                r'telemóvel[:\s]+(\+?[\d\s\-\(\)]{9,15})',
                r'contacto[:\s]+(\+?[\d\s\-\(\)]{9,15})'
            ]
        }
        
        for field, pattern_list in patterns.items():
            for pattern in pattern_list:
                match = re.search(pattern, content, re.IGNORECASE)
                if match:
                    value = match.group(1).strip()
                    if field == 'birth_date':
                        # Converter para formato ISO
                        try:
                            date_obj = datetime.strptime(value.replace('-', '/'), '%d/%m/%Y')
                            patient_info[field] = date_obj.strftime('%Y-%m-%d')
                        except:
                            continue
                    else:
                        patient_info[field] = value
                    break
        
        # Validar se temos informação mínima
        if not patient_info['name'] or len(patient_info['name']) < 2:
            return None
            
        return patient_info
    
    def create_client_in_supabase(self, client_data: Dict) -> Optional[str]:
        """Cria um cliente no Supabase e retorna o ID"""
        try:
            result = self.supabase.table('clients').insert(client_data).execute()
            if result.data:
                client_id = result.data[0]['id']
                print(f"Cliente criado: {client_data['name']} (ID: {client_id})")
                return client_id
            return None
            
        except Exception as e:
            print(f"Erro ao criar cliente {client_data['name']}: {e}")
            return None
    
    def create_appointment_record(self, client_id: str, filename: str, content: str):
        """Cria um registo de consulta baseado no documento"""
        try:
            # Tentar extrair data do conteúdo ou usar data de modificação do arquivo
            appointment_data = {
                'client_id': client_id,
                'doctor_id': None,  # Será necessário configurar manualmente
                'room_id': None,    # Será necessário configurar manualmente
                'date': datetime.now().isoformat(),  # Data padrão
                'duration_min': 60,  # Duração padrão
                'status': 'done',
                'notes': f"Importado de: {filename}"
            }
            
            # Procurar por datas no conteúdo
            date_patterns = [
                r'(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})',
                r'(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})'
            ]
            
            for pattern in date_patterns:
                matches = re.findall(pattern, content)
                if matches:
                    try:
                        # Usar a primeira data encontrada
                        date_str = matches[0]
                        if '/' in date_str or '-' in date_str:
                            separator = '/' if '/' in date_str else '-'
                            parts = date_str.split(separator)
                            if len(parts) == 3:
                                # Assumir dd/mm/yyyy ou yyyy/mm/dd
                                if len(parts[0]) == 4:
                                    # yyyy/mm/dd
                                    date_obj = datetime(int(parts[0]), int(parts[1]), int(parts[2]))
                                else:
                                    # dd/mm/yyyy
                                    date_obj = datetime(int(parts[2]), int(parts[1]), int(parts[0]))
                                appointment_data['date'] = date_obj.isoformat()
                                break
                    except:
                        continue
            
            # Criar consulta
            result = self.supabase.table('appointments').insert(appointment_data).execute()
            if result.data:
                appointment_id = result.data[0]['id']
                print(f"Consulta criada para cliente {client_id}")
                
                # Criar nota clínica
                clinical_note = {
                    'appointment_id': appointment_id,
                    'summary': content[:500] if content else None,
                    'diagnosis': None,
                    'prescription': None
                }
                
                self.supabase.table('clinical_notes').insert(clinical_note).execute()
                print(f"Nota clínica criada para consulta {appointment_id}")
                
        except Exception as e:
            print(f"Erro ao criar consulta para cliente {client_id}: {e}")
    
    def migrate_folder(self, folder_id: str):
        """Migra todos os documentos de uma pasta"""
        print(f"Iniciando migração da pasta {folder_id}")
        
        documents = self.list_patient_documents(folder_id)
        
        migrated_count = 0
        errors_count = 0
        
        for doc in documents:
            try:
                print(f"\nProcessando: {doc['name']}")
                
                # Extrair conteúdo
                content = self.extract_document_content(doc['id'], doc['mimeType'])
                
                # Analisar informações do paciente
                patient_info = self.parse_patient_info(doc['name'], content)
                
                if not patient_info:
                    print(f"Não foi possível extrair informações válidas de {doc['name']}")
                    errors_count += 1
                    continue
                
                # Verificar se cliente já existe
                existing = self.supabase.table('clients').select('id').eq('name', patient_info['name']).execute()
                
                if existing.data:
                    client_id = existing.data[0]['id']
                    print(f"Cliente já existe: {patient_info['name']}")
                else:
                    # Criar cliente
                    client_id = self.create_client_in_supabase(patient_info)
                    if not client_id:
                        errors_count += 1
                        continue
                
                # Criar registo de consulta
                self.create_appointment_record(client_id, doc['name'], content)
                
                migrated_count += 1
                
            except Exception as e:
                print(f"Erro ao processar {doc['name']}: {e}")
                errors_count += 1
        
        print(f"\n=== Migração Concluída ===")
        print(f"Documentos processados: {migrated_count}")
        print(f"Erros: {errors_count}")

def main():
    """Função principal"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Erro: Variáveis de ambiente SUPABASE não configuradas")
        return
    
    # ID da pasta do Google Drive com os documentos dos pacientes
    FOLDER_ID = input("Digite o ID da pasta do Google Drive: ").strip()
    
    if not FOLDER_ID:
        print("ID da pasta é obrigatório")
        return
    
    migrator = DriveToSupabaseMigrator()
    
    print("Autenticando com Google Drive...")
    migrator.authenticate_google()
    
    print("Iniciando migração...")
    migrator.migrate_folder(FOLDER_ID)

if __name__ == "__main__":
    main() 