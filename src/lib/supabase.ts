import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export interface Client {
  id: string
  name: string
  birth_date: string
  email?: string
  phone?: string
  notes?: string
  created_at: string
}

export interface Doctor {
  id: string
  user_id?: string
  name: string
  specialty: string
  phone?: string
  active: boolean
  approved: boolean
  created_at: string
}

export interface Room {
  id: string
  name: string
  location?: string
  notes?: string
  created_at: string
}

export interface Appointment {
  id: string
  client_id: string
  doctor_id: string
  room_id: string
  date: string
  duration_min: number
  status: 'scheduled' | 'done' | 'canceled'
  notes?: string
  client?: Client
  doctor?: Doctor
  room?: Room
  created_at: string
}

export interface ClinicalNote {
  id: string
  appointment_id: string
  summary?: string
  diagnosis?: string
  prescription?: string
  created_at: string
}

export interface UserProfile {
  id: string
  user_id: string
  role: 'admin' | 'doctor' | 'admin_doctor'
  name: string
  email: string
  created_at: string
}

export interface UserInvite {
  id: string
  email: string
  role: 'admin' | 'doctor' | 'admin_doctor'
  invited_by: string
  accepted: boolean
  token: string
  expires_at: string
  created_at: string
} 