'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Layout from '@/components/Layout'
import { supabase, Appointment, ClinicalNote } from '@/lib/supabase'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, ArrowLeft, FileText, User, Calendar, Clock } from 'lucide-react'
import Link from 'next/link'

const clinicalNoteSchema = z.object({
  summary: z.string().optional(),
  diagnosis: z.string().optional(),
  prescription: z.string().optional()
})

type ClinicalNoteFormData = z.infer<typeof clinicalNoteSchema>

export default function ClinicalNotesPage() {
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [clinicalNote, setClinicalNote] = useState<ClinicalNote | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const router = useRouter()
  const params = useParams()
  const appointmentId = params.id as string

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ClinicalNoteFormData>({
    resolver: zodResolver(clinicalNoteSchema)
  })

  useEffect(() => {
    if (appointmentId) {
      checkAccessAndFetchData()
    }
  }, [appointmentId])

  const checkAccessAndFetchData = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        router.push('/login')
        return
      }

      setCurrentUser(user)

      // Get user profile to check role
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      // If no profile exists, check if user is legacy admin
      const isLegacyAdmin = user.email?.includes('admin') || user.email === 'edurandrade@gmail.com'
      
      if (profileError && !isLegacyAdmin) {
        alert('Acesso negado. Apenas médicos podem aceder às notas clínicas.')
        router.push('/appointments')
        return
      }

      // Check if user is doctor or admin_doctor
      const canAccessClinicalNotes = isLegacyAdmin || 
        (profile && (profile.role === 'doctor' || profile.role === 'admin_doctor'))

      if (!canAccessClinicalNotes) {
        alert('Acesso negado. Apenas médicos podem aceder às notas clínicas.')
        router.push('/appointments')
        return
      }

      setUserProfile(profile)
      fetchData()
    } catch (error) {
      console.error('Error checking access:', error)
      router.push('/appointments')
    }
  }

  const fetchData = async () => {
    try {
      // Fetch appointment with related data
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          client:clients(id, name, email, phone, birth_date),
          doctor:doctors(id, name, specialty),
          room:rooms(id, name, location)
        `)
        .eq('id', appointmentId)
        .single()

      if (appointmentError) throw appointmentError

      setAppointment(appointmentData)

      // Fetch existing clinical note
      const { data: noteData, error: noteError } = await supabase
        .from('clinical_notes')
        .select('*')
        .eq('appointment_id', appointmentId)
        .single()

      if (noteError && noteError.code !== 'PGRST116') { // PGRST116 = no rows found
        throw noteError
      }

      if (noteData) {
        setClinicalNote(noteData)
        reset({
          summary: noteData.summary || '',
          diagnosis: noteData.diagnosis || '',
          prescription: noteData.prescription || ''
        })
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Erro ao carregar dados da consulta')
      router.push('/appointments')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: ClinicalNoteFormData) => {
    setSaving(true)
    
    try {
      // Clean empty strings
      const cleanData = {
        appointment_id: appointmentId,
        summary: data.summary || null,
        diagnosis: data.diagnosis || null,
        prescription: data.prescription || null
      }

      if (clinicalNote) {
        // Update existing note
        const { error } = await supabase
          .from('clinical_notes')
          .update(cleanData)
          .eq('id', clinicalNote.id)
        
        if (error) throw error
      } else {
        // Create new note
        const { data: newNote, error } = await supabase
          .from('clinical_notes')
          .insert([cleanData])
          .select()
          .single()
        
        if (error) throw error
        setClinicalNote(newNote)
      }

      // Update appointment status to 'done' if it's still scheduled
      if (appointment && appointment.status === 'scheduled') {
        await supabase
          .from('appointments')
          .update({ status: 'done' })
          .eq('id', appointmentId)
      }
      
      alert('Notas clínicas guardadas com sucesso!')
      router.push('/appointments')
    } catch (error) {
      console.error('Error saving clinical note:', error)
      alert('Erro ao guardar notas clínicas')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-8"></div>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (!appointment) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center">
            <h2 className="text-lg font-medium text-gray-900">Consulta não encontrada</h2>
            <p className="mt-1 text-sm text-gray-500">
              A consulta que procura não existe ou foi removida.
            </p>
            <Link
              href="/appointments"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Voltar às consultas
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Notas Clínicas
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {clinicalNote ? 'Editar' : 'Criar'} ficha clínica da consulta
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Link
              href="/appointments"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </div>
        </div>

        {/* Appointment Info */}
        <div className="mt-4">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informações da Consulta</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{appointment.client?.name}</p>
                    <p className="text-sm text-gray-500">
                      {appointment.client?.birth_date && `${calculateAge(appointment.client.birth_date)} anos`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{appointment.doctor?.name}</p>
                    <p className="text-sm text-gray-500">{appointment.doctor?.specialty}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatDate(appointment.date)}</p>
                    <p className="text-sm text-gray-500">{appointment.room?.name}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{appointment.duration_min} min</p>
                    <p className="text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        appointment.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                        appointment.status === 'done' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {appointment.status === 'scheduled' ? 'Agendada' :
                         appointment.status === 'done' ? 'Realizada' : 'Cancelada'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              {appointment.notes && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600">
                    <strong>Notas da consulta:</strong> {appointment.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Clinical Notes Form */}
        <div className="mt-4">
          <div className="bg-white shadow rounded-lg">
            <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Ficha Clínica</h3>
              
              <div className="space-y-6">
                {/* Resumo da Consulta */}
                <div>
                  <label htmlFor="summary" className="block text-sm font-medium text-gray-700">
                    Resumo da Consulta
                  </label>
                  <div className="mt-1">
                    <textarea
                      {...register('summary')}
                      id="summary"
                      rows={4}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Descreva o motivo da consulta, sintomas apresentados, histórico relevante..."
                    />
                    {errors.summary && (
                      <p className="mt-2 text-sm text-red-600">{errors.summary.message}</p>
                    )}
                  </div>
                </div>

                {/* Diagnóstico */}
                <div>
                  <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700">
                    Diagnóstico
                  </label>
                  <div className="mt-1">
                    <textarea
                      {...register('diagnosis')}
                      id="diagnosis"
                      rows={4}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Diagnóstico principal, diagnósticos diferenciais, observações clínicas..."
                    />
                    {errors.diagnosis && (
                      <p className="mt-2 text-sm text-red-600">{errors.diagnosis.message}</p>
                    )}
                  </div>
                </div>

                {/* Prescrição */}
                <div>
                  <label htmlFor="prescription" className="block text-sm font-medium text-gray-700">
                    Prescrição e Tratamento
                  </label>
                  <div className="mt-1">
                    <textarea
                      {...register('prescription')}
                      id="prescription"
                      rows={4}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Medicamentos prescritos, dosagens, tratamentos recomendados, próximos passos..."
                    />
                    {errors.prescription && (
                      <p className="mt-2 text-sm text-red-600">{errors.prescription.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end space-x-3">
                <Link
                  href="/appointments"
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'A guardar...' : 'Guardar Notas Clínicas'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Show creation/update timestamp */}
        {clinicalNote && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Última atualização: {formatDate(clinicalNote.created_at)}
          </div>
        )}
      </div>
    </Layout>
  )
} 