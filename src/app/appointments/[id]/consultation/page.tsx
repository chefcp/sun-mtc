'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, ArrowLeft, Clock, User, UserCheck, FileText, CheckCircle } from 'lucide-react'
import Link from 'next/link'

const clinicalNoteSchema = z.object({
  summary: z.string().min(10, 'Resumo deve ter pelo menos 10 caracteres'),
  diagnosis: z.string().optional(),
  prescription: z.string().optional(),
  finish_consultation: z.boolean().optional()
})

type ClinicalNoteFormData = z.infer<typeof clinicalNoteSchema>

interface Appointment {
  id: string
  date: string
  duration_min: number
  status: string
  notes: string | null
  client: {
    id: string
    name: string
    birth_date: string
    email?: string
    phone?: string
  } | null
  doctor: {
    id: string
    name: string
    specialty: string
  } | null
  room: {
    id: string
    name: string
    location?: string
  } | null
}

interface ClinicalNote {
  id: string
  summary: string
  diagnosis?: string
  prescription?: string
  created_at: string
}

export default function ConsultationPage() {
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [consultationStarted, setConsultationStarted] = useState(false)
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
    fetchAppointmentAndNotes()
  }, [appointmentId])

  const fetchAppointmentAndNotes = async () => {
    try {
      // Fetch appointment with relations
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          client:clients(id, name, birth_date, email, phone),
          doctor:doctors(id, name, specialty),
          room:rooms(id, name, location)
        `)
        .eq('id', appointmentId)
        .single()

      if (appointmentError) throw appointmentError

      // Fetch existing clinical notes
      const { data: notesData, error: notesError } = await supabase
        .from('clinical_notes')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false })

      if (notesError) throw notesError

      setAppointment(appointmentData)
      setClinicalNotes(notesData || [])
      
      // Check if consultation is already in progress
      setConsultationStarted(appointmentData.status === 'in_progress')
    } catch (error) {
      console.error('Error fetching appointment:', error)
      alert('Erro ao carregar consulta')
      router.push('/appointments')
    } finally {
      setLoading(false)
    }
  }

  const startConsultation = async () => {
    try {
      setSaving(true)
      
      // Update appointment status to in_progress
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'in_progress' })
        .eq('id', appointmentId)

      if (error) throw error

      setConsultationStarted(true)
      setAppointment(prev => prev ? { ...prev, status: 'in_progress' } : null)
    } catch (error) {
      console.error('Error starting consultation:', error)
      alert('Erro ao iniciar consulta')
    } finally {
      setSaving(false)
    }
  }

  const onSubmit = async (data: ClinicalNoteFormData) => {
    setSaving(true)
    
    try {
      // Create clinical note
      const { error: noteError } = await supabase
        .from('clinical_notes')
        .insert([{
          appointment_id: appointmentId,
          summary: data.summary,
          diagnosis: data.diagnosis || null,
          prescription: data.prescription || null
        }])

      if (noteError) throw noteError

      // If finishing consultation, update appointment status
      if (data.finish_consultation) {
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ status: 'done' })
          .eq('id', appointmentId)

        if (updateError) throw updateError
      }

      // Refresh data
      await fetchAppointmentAndNotes()
      reset()
      
      if (data.finish_consultation) {
        alert('Consulta finalizada com sucesso!')
        router.push('/appointments')
      } else {
        alert('Nota clínica guardada com sucesso!')
      }
    } catch (error) {
      console.error('Error saving clinical note:', error)
      alert('Erro ao guardar nota clínica')
    } finally {
      setSaving(false)
    }
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('pt-PT'),
      time: date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
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
            <h3 className="text-lg font-medium text-gray-900">Consulta não encontrada</h3>
            <Link href="/appointments" className="text-blue-600 hover:text-blue-500">
              Voltar às consultas
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  const appointmentDateTime = formatDateTime(appointment.date)

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              {consultationStarted ? 'Consulta em Andamento' : 'Iniciar Consulta'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {appointmentDateTime.date} às {appointmentDateTime.time} - {appointment.room?.name}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Information */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Paciente
              </h3>
              
              <div className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Nome</dt>
                  <dd className="text-sm text-gray-900">{appointment.client?.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Idade</dt>
                  <dd className="text-sm text-gray-900">
                    {appointment.client?.birth_date && calculateAge(appointment.client.birth_date)} anos
                  </dd>
                </div>
                {appointment.client?.email && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="text-sm text-gray-900">{appointment.client.email}</dd>
                  </div>
                )}
                {appointment.client?.phone && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Telefone</dt>
                    <dd className="text-sm text-gray-900">{appointment.client.phone}</dd>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Médico
                </h4>
                <p className="text-sm text-gray-600">{appointment.doctor?.name}</p>
                <p className="text-xs text-gray-500">{appointment.doctor?.specialty}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Duração
                </h4>
                <p className="text-sm text-gray-600">{appointment.duration_min} minutos</p>
              </div>
            </div>
          </div>

          {/* Consultation Area */}
          <div className="lg:col-span-2">
            {!consultationStarted ? (
              <div className="bg-white shadow rounded-lg p-6 text-center">
                <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Consulta Agendada</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Clique no botão abaixo para iniciar a consulta
                </p>
                <button
                  onClick={startConsultation}
                  disabled={saving}
                  className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                >
                  <CheckCircle className="mr-2 h-5 w-5" />
                  {saving ? 'A iniciar...' : 'Iniciar Consulta'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Clinical Notes Form */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Nova Nota Clínica
                  </h3>
                  
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Summary */}
                    <div>
                      <label htmlFor="summary" className="block text-sm font-medium text-gray-700">
                        Resumo da Consulta *
                      </label>
                      <div className="mt-1">
                        <textarea
                          {...register('summary')}
                          id="summary"
                          rows={4}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Descreva o que foi observado durante a consulta..."
                        />
                        {errors.summary && (
                          <p className="mt-2 text-sm text-red-600">{errors.summary.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Diagnosis */}
                    <div>
                      <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700">
                        Diagnóstico
                      </label>
                      <div className="mt-1">
                        <textarea
                          {...register('diagnosis')}
                          id="diagnosis"
                          rows={3}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Diagnóstico médico..."
                        />
                        {errors.diagnosis && (
                          <p className="mt-2 text-sm text-red-600">{errors.diagnosis.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Prescription */}
                    <div>
                      <label htmlFor="prescription" className="block text-sm font-medium text-gray-700">
                        Prescrição/Tratamento
                      </label>
                      <div className="mt-1">
                        <textarea
                          {...register('prescription')}
                          id="prescription"
                          rows={3}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Medicação prescrita, instruções de tratamento..."
                        />
                        {errors.prescription && (
                          <p className="mt-2 text-sm text-red-600">{errors.prescription.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Finish Consultation Checkbox */}
                    <div className="flex items-center">
                      <input
                        {...register('finish_consultation')}
                        id="finish_consultation"
                        type="checkbox"
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                      />
                      <label htmlFor="finish_consultation" className="ml-2 block text-sm text-gray-900">
                        Finalizar consulta (marcar como concluída)
                      </label>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-3">
                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? 'A guardar...' : 'Guardar Nota'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Previous Clinical Notes */}
                {clinicalNotes.length > 0 && (
                  <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Notas Anteriores ({clinicalNotes.length})
                    </h3>
                    <div className="space-y-4">
                      {clinicalNotes.map((note) => (
                        <div key={note.id} className="border-l-4 border-blue-400 pl-4 py-2">
                          <div className="text-sm text-gray-500">
                            {new Date(note.created_at).toLocaleString('pt-PT')}
                          </div>
                          <div className="mt-1">
                            <p className="text-sm text-gray-900 font-medium">Resumo:</p>
                            <p className="text-sm text-gray-700">{note.summary}</p>
                          </div>
                          {note.diagnosis && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-900 font-medium">Diagnóstico:</p>
                              <p className="text-sm text-gray-700">{note.diagnosis}</p>
                            </div>
                          )}
                          {note.prescription && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-900 font-medium">Prescrição:</p>
                              <p className="text-sm text-gray-700">{note.prescription}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
} 