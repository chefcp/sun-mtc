'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Layout from '@/components/Layout'
import { supabase, Client, Appointment, ClinicalNote } from '@/lib/supabase'
import { ArrowLeft, User, Calendar, FileText, Edit, Phone, Mail, Cake, Clock, MapPin, Stethoscope } from 'lucide-react'
import Link from 'next/link'

interface AppointmentWithDetails extends Appointment {
  clinical_notes?: ClinicalNote[]
}

export default function ClientDetailsPage() {
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<Client | null>(null)
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([])
  const [canAccessClinicalNotes, setCanAccessClinicalNotes] = useState(false)
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  useEffect(() => {
    if (clientId) {
      checkAccessAndFetchData()
    }
  }, [clientId])

  const checkAccessAndFetchData = async () => {
    try {
      // Get current user and check access
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        router.push('/login')
        return
      }

      // Check if user can access clinical notes
      const isLegacyAdmin = user.email?.includes('admin') || user.email === 'edurandrade@gmail.com'
      
      if (isLegacyAdmin) {
        setCanAccessClinicalNotes(true)
      } else {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        const canAccess = profile && (profile.role === 'doctor' || profile.role === 'admin_doctor')
        setCanAccessClinicalNotes(canAccess || false)
      }

      fetchClientData()
    } catch (error) {
      console.error('Error checking access:', error)
      fetchClientData()
    }
  }

  const fetchClientData = async () => {
    try {
      // Fetch client data
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()

      if (clientError) throw clientError
      setClient(clientData)

      // Fetch appointments with related data and clinical notes
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor:doctors(id, name, specialty),
          room:rooms(id, name, location),
          clinical_notes(*)
        `)
        .eq('client_id', clientId)
        .order('date', { ascending: false })

      if (appointmentsError) throw appointmentsError
      setAppointments(appointmentsData || [])

    } catch (error) {
      console.error('Error fetching client data:', error)
      alert('Erro ao carregar dados do cliente')
      router.push('/clients')
    } finally {
      setLoading(false)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      scheduled: 'bg-yellow-100 text-yellow-800',
      done: 'bg-green-100 text-green-800',
      canceled: 'bg-red-100 text-red-800'
    }
    
    const labels = {
      scheduled: 'Agendada',
      done: 'Realizada',
      canceled: 'Cancelada'
    }

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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

  if (!client) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center">
            <h2 className="text-lg font-medium text-gray-900">Cliente não encontrado</h2>
            <p className="mt-1 text-sm text-gray-500">
              O cliente que procura não existe ou foi removido.
            </p>
            <Link
              href="/clients"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Voltar à lista
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              {client.name}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Cliente desde {formatDate(client.created_at)} • {calculateAge(client.birth_date)} anos
            </p>
          </div>
          <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
            <Link
              href={`/clients/${client.id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Link>
            <Link
              href="/clients"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Client Information */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Informações Pessoais</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{client.name}</p>
                      <p className="text-sm text-gray-500">Nome completo</p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Cake className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(client.birth_date)} ({calculateAge(client.birth_date)} anos)
                      </p>
                      <p className="text-sm text-gray-500">Data de nascimento</p>
                    </div>
                  </div>

                  {client.email && (
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{client.email}</p>
                        <p className="text-sm text-gray-500">Email</p>
                      </div>
                    </div>
                  )}

                  {client.phone && (
                    <div className="flex items-center">
                      <Phone className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{client.phone}</p>
                        <p className="text-sm text-gray-500">Telefone</p>
                      </div>
                    </div>
                  )}
                </div>

                {client.notes && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Notas</h4>
                    <div className="bg-gray-50 rounded-md p-3">
                      <p className="text-sm text-gray-600">{client.notes}</p>
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-blue-600">{appointments.length}</p>
                      <p className="text-xs text-gray-500">Total Consultas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-green-600">
                        {appointments.filter(apt => apt.status === 'done').length}
                      </p>
                      <p className="text-xs text-gray-500">Realizadas</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Medical History */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Histórico Clínico</h3>
                  <Link
                    href="/appointments/new"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Nova Consulta
                  </Link>
                </div>

                {appointments.length === 0 ? (
                  <div className="text-center py-12">
                    <Stethoscope className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma consulta registada</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Este cliente ainda não tem consultas no sistema.
                    </p>
                    <div className="mt-6">
                      <Link
                        href="/appointments/new"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        Agendar Primeira Consulta
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {appointments.map((appointment) => (
                      <div key={appointment.id} className="border border-gray-200 rounded-lg p-4">
                        {/* Appointment Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <Calendar className="h-5 w-5 text-gray-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {formatDateTime(appointment.date)}
                              </p>
                              <p className="text-sm text-gray-500">
                                {appointment.doctor?.name} • {appointment.doctor?.specialty}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(appointment.status)}
                            {canAccessClinicalNotes && appointment.status === 'done' && appointment.clinical_notes && appointment.clinical_notes.length > 0 && (
                              <Link
                                href={`/appointments/${appointment.id}/clinical-notes`}
                                className="text-green-600 hover:text-green-900"
                                title="Ver Notas Clínicas"
                              >
                                <FileText className="h-4 w-4" />
                              </Link>
                            )}
                          </div>
                        </div>

                        {/* Appointment Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-600 mb-3">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            {appointment.duration_min} minutos
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            {appointment.room?.name}
                            {appointment.room?.location && ` (${appointment.room.location})`}
                          </div>
                        </div>

                        {/* Appointment Notes */}
                        {appointment.notes && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-600">
                              <strong>Motivo:</strong> {appointment.notes}
                            </p>
                          </div>
                        )}

                        {/* Clinical Notes */}
                        {canAccessClinicalNotes && appointment.clinical_notes && appointment.clinical_notes.length > 0 && (
                          <div className="bg-green-50 border border-green-200 rounded-md p-3">
                            <h4 className="text-sm font-medium text-green-800 mb-2">Notas Clínicas</h4>
                            {appointment.clinical_notes.map((note) => (
                              <div key={note.id} className="space-y-2 text-sm">
                                {note.summary && (
                                  <div>
                                    <strong className="text-green-700">Resumo:</strong>
                                    <p className="text-green-600">{note.summary}</p>
                                  </div>
                                )}
                                {note.diagnosis && (
                                  <div>
                                    <strong className="text-green-700">Diagnóstico:</strong>
                                    <p className="text-green-600">{note.diagnosis}</p>
                                  </div>
                                )}
                                {note.prescription && (
                                  <div>
                                    <strong className="text-green-700">Prescrição:</strong>
                                    <p className="text-green-600">{note.prescription}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Actions for scheduled appointments */}
                        {appointment.status === 'scheduled' && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex space-x-3">
                              {canAccessClinicalNotes && (
                                <Link
                                  href={`/appointments/${appointment.id}/clinical-notes`}
                                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700"
                                >
                                  <FileText className="mr-1 h-3 w-3" />
                                  Adicionar Notas
                                </Link>
                              )}
                              <Link
                                href={`/appointments/${appointment.id}`}
                                className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                              >
                                <Edit className="mr-1 h-3 w-3" />
                                Editar
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 