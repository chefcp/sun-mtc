'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Layout from '@/components/Layout'
import { supabase, Client, Appointment, ClinicalNote } from '@/lib/supabase'
import { ArrowLeft, User, Calendar, FileText, Edit, Phone, Mail, Cake, Clock, MapPin, Stethoscope, Search, Filter, ChevronDown, ChevronUp, Eye } from 'lucide-react'
import Link from 'next/link'

interface AppointmentWithDetails extends Appointment {
  clinical_notes?: ClinicalNote[]
}

export default function ClientDetailsPage() {
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<Client | null>(null)
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<AppointmentWithDetails[]>([])
  const [canAccessClinicalNotes, setCanAccessClinicalNotes] = useState(false)
  const [selectedView, setSelectedView] = useState<'timeline' | 'appointments' | 'notes'>('timeline')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedAppointments, setExpandedAppointments] = useState<Set<string>>(new Set())
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  useEffect(() => {
    if (clientId) {
      checkAccessAndFetchData()
    }
  }, [clientId])

  useEffect(() => {
    filterAppointments()
  }, [appointments, searchTerm, statusFilter])

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

  const filterAppointments = () => {
    let filtered = appointments

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(appointment => 
        appointment.doctor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.doctor?.specialty?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.clinical_notes?.some(note => 
          note.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          note.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          note.prescription?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(appointment => appointment.status === statusFilter)
    }

    setFilteredAppointments(filtered)
  }

  const toggleAppointmentExpansion = (appointmentId: string) => {
    const newExpanded = new Set(expandedAppointments)
    if (newExpanded.has(appointmentId)) {
      newExpanded.delete(appointmentId)
    } else {
      newExpanded.add(appointmentId)
    }
    setExpandedAppointments(newExpanded)
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
      scheduled: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      done: 'bg-green-100 text-green-800',
      canceled: 'bg-red-100 text-red-800'
    }
    
    const labels = {
      scheduled: 'Agendada',
      in_progress: 'Em Andamento',
      done: 'Realizada',
      canceled: 'Cancelada'
    }

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const getTotalConsultations = () => appointments.filter(apt => apt.status === 'done').length
  const getLastConsultation = () => appointments.find(apt => apt.status === 'done')
  const getAllClinicalNotes = () => appointments.flatMap(apt => apt.clinical_notes || [])

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white shadow rounded-lg p-6">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-4">
                  <div className="h-20 bg-gray-200 rounded"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
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
            <h3 className="text-lg font-medium text-gray-900">Cliente não encontrado</h3>
            <Link href="/clients" className="text-blue-600 hover:text-blue-500">
              Voltar aos clientes
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
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              {client.name}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Histórico clínico completo • {getTotalConsultations()} consultas realizadas
            </p>
          </div>
          <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
            <Link
              href={`/clients/${client.id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Patient Info Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6 sticky top-6">
              <div className="flex items-center mb-6">
                <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                  <User className="h-8 w-8 text-gray-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">{client.name}</h3>
                  <p className="text-sm text-gray-500">{calculateAge(client.birth_date)} anos</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <Cake className="h-4 w-4 mr-2" />
                    Data de Nascimento
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(client.birth_date)}</dd>
                </div>

                {client.email && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">{client.email}</dd>
                  </div>
                )}

                {client.phone && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      Telefone
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">{client.phone}</dd>
                  </div>
                )}

                {client.notes && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Observações</dt>
                    <dd className="mt-1 text-sm text-gray-900">{client.notes}</dd>
                  </div>
                )}
              </div>

              {/* Clinical Summary */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Resumo Clínico</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Total Consultas</span>
                    <span className="text-sm font-medium text-gray-900">{appointments.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Concluídas</span>
                    <span className="text-sm font-medium text-green-600">{getTotalConsultations()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Notas Clínicas</span>
                    <span className="text-sm font-medium text-gray-900">{getAllClinicalNotes().length}</span>
                  </div>
                  {getLastConsultation() && (
                    <div>
                      <span className="text-sm text-gray-500">Última Consulta</span>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(getLastConsultation()!.date)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* View Selector */}
            <div className="mb-6">
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                {[
                  { key: 'timeline', label: 'Timeline', icon: Calendar },
                  { key: 'appointments', label: 'Consultas', icon: Stethoscope },
                  { key: 'notes', label: 'Notas Clínicas', icon: FileText }
                ].map((view) => {
                  const Icon = view.icon
                  return (
                    <button
                      key={view.key}
                      onClick={() => setSelectedView(view.key as any)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                        selectedView === view.key
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {view.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Pesquisar no histórico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="all">Todos os status</option>
                  <option value="scheduled">Agendadas</option>
                  <option value="in_progress">Em Andamento</option>
                  <option value="done">Realizadas</option>
                  <option value="canceled">Canceladas</option>
                </select>
              </div>
            </div>

            {/* Content based on selected view */}
            <div className="space-y-6">
              {selectedView === 'timeline' && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Timeline Clínica</h3>
                    <p className="text-sm text-gray-500">Histórico cronológico de todas as interações</p>
                  </div>
                  <div className="p-6">
                    {filteredAppointments.length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma consulta encontrada</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Ajuste os filtros ou verifique se existem consultas registadas.
                        </p>
                      </div>
                    ) : (
                      <div className="flow-root">
                        <ul className="-mb-8">
                          {filteredAppointments.map((appointment, appointmentIdx) => (
                            <li key={appointment.id}>
                              <div className="relative pb-8">
                                {appointmentIdx !== filteredAppointments.length - 1 ? (
                                  <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                                ) : null}
                                <div className="relative flex space-x-3">
                                  <div>
                                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                                      appointment.status === 'done' ? 'bg-green-500' :
                                      appointment.status === 'in_progress' ? 'bg-yellow-500' :
                                      appointment.status === 'scheduled' ? 'bg-blue-500' : 'bg-red-500'
                                    }`}>
                                      <Calendar className="h-4 w-4 text-white" />
                                    </span>
                                  </div>
                                  <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                    <div>
                                      <div className="flex items-center space-x-2">
                                        <p className="text-sm font-medium text-gray-900">
                                          Consulta - {appointment.doctor?.name}
                                        </p>
                                        {getStatusBadge(appointment.status)}
                                      </div>
                                      <p className="text-sm text-gray-500">
                                        {appointment.doctor?.specialty} • {appointment.room?.name}
                                      </p>
                                      {appointment.clinical_notes && appointment.clinical_notes.length > 0 && canAccessClinicalNotes && (
                                        <div className="mt-2 space-y-2">
                                          {appointment.clinical_notes.map((note) => (
                                            <div key={note.id} className="bg-gray-50 rounded-md p-3">
                                              <p className="text-sm text-gray-900 font-medium">Nota Clínica:</p>
                                              <p className="text-sm text-gray-700">{note.summary}</p>
                                              {note.diagnosis && (
                                                <p className="text-sm text-gray-600 mt-1">
                                                  <span className="font-medium">Diagnóstico:</span> {note.diagnosis}
                                                </p>
                                              )}
                                              {note.prescription && (
                                                <p className="text-sm text-gray-600 mt-1">
                                                  <span className="font-medium">Prescrição:</span> {note.prescription}
                                                </p>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                      <time dateTime={appointment.date}>{formatDateTime(appointment.date)}</time>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedView === 'appointments' && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Lista de Consultas</h3>
                    <p className="text-sm text-gray-500">Todas as consultas deste paciente</p>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {filteredAppointments.length === 0 ? (
                      <div className="text-center py-12">
                        <Stethoscope className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma consulta encontrada</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Ajuste os filtros ou verifique se existem consultas registadas.
                        </p>
                      </div>
                    ) : (
                      filteredAppointments.map((appointment) => (
                        <div key={appointment.id} className="px-6 py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {formatDateTime(appointment.date)}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {appointment.doctor?.name} • {appointment.doctor?.specialty}
                                  </p>
                                  <div className="flex items-center space-x-2 mt-1">
                                    {getStatusBadge(appointment.status)}
                                    <span className="text-xs text-gray-500">
                                      <MapPin className="h-3 w-3 inline mr-1" />
                                      {appointment.room?.name}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      <Clock className="h-3 w-3 inline mr-1" />
                                      {appointment.duration_min}min
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {appointment.clinical_notes && appointment.clinical_notes.length > 0 && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  {appointment.clinical_notes.length} nota(s)
                                </span>
                              )}
                              <button
                                onClick={() => toggleAppointmentExpansion(appointment.id)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                {expandedAppointments.has(appointment.id) ? (
                                  <ChevronUp className="h-5 w-5" />
                                ) : (
                                  <ChevronDown className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {expandedAppointments.has(appointment.id) && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              {appointment.notes && (
                                <div className="mb-3">
                                  <p className="text-sm font-medium text-gray-900">Notas da Consulta:</p>
                                  <p className="text-sm text-gray-700 mt-1">{appointment.notes}</p>
                                </div>
                              )}
                              
                              {appointment.clinical_notes && appointment.clinical_notes.length > 0 && canAccessClinicalNotes && (
                                <div>
                                  <p className="text-sm font-medium text-gray-900 mb-2">Notas Clínicas:</p>
                                  <div className="space-y-3">
                                    {appointment.clinical_notes.map((note) => (
                                      <div key={note.id} className="bg-gray-50 rounded-md p-3">
                                        <div className="text-xs text-gray-500 mb-1">
                                          {new Date(note.created_at).toLocaleString('pt-PT')}
                                        </div>
                                        <p className="text-sm text-gray-900">{note.summary}</p>
                                        {note.diagnosis && (
                                          <p className="text-sm text-gray-600 mt-1">
                                            <span className="font-medium">Diagnóstico:</span> {note.diagnosis}
                                          </p>
                                        )}
                                        {note.prescription && (
                                          <p className="text-sm text-gray-600 mt-1">
                                            <span className="font-medium">Prescrição:</span> {note.prescription}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="flex justify-end mt-4 space-x-2">
                                {canAccessClinicalNotes && appointment.status === 'scheduled' && (
                                  <Link
                                    href={`/appointments/${appointment.id}/consultation`}
                                    className="text-sm text-emerald-600 hover:text-emerald-900"
                                  >
                                    Abrir Consulta
                                  </Link>
                                )}
                                {canAccessClinicalNotes && (
                                  <Link
                                    href={`/appointments/${appointment.id}/clinical-notes`}
                                    className="text-sm text-blue-600 hover:text-blue-900"
                                  >
                                    Ver Notas Clínicas
                                  </Link>
                                )}
                                <Link
                                  href={`/appointments/${appointment.id}/edit`}
                                  className="text-sm text-indigo-600 hover:text-indigo-900"
                                >
                                  Editar Consulta
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {selectedView === 'notes' && canAccessClinicalNotes && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Notas Clínicas</h3>
                    <p className="text-sm text-gray-500">Todas as notas médicas do paciente</p>
                  </div>
                  <div className="p-6">
                    {getAllClinicalNotes().length === 0 ? (
                      <div className="text-center py-12">
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma nota clínica encontrada</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          As notas clínicas aparecerão aqui quando forem criadas durante as consultas.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {getAllClinicalNotes()
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .map((note) => {
                            const appointment = appointments.find(apt => 
                              apt.clinical_notes?.some(n => n.id === note.id)
                            )
                            return (
                              <div key={note.id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <p className="text-sm font-medium text-gray-900">
                                        {new Date(note.created_at).toLocaleDateString('pt-PT')}
                                      </p>
                                      <span className="text-xs text-gray-500">•</span>
                                      <p className="text-xs text-gray-500">
                                        {appointment?.doctor?.name} - {appointment?.doctor?.specialty}
                                      </p>
                                    </div>
                                    <div className="space-y-3">
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">Resumo:</p>
                                        <p className="text-sm text-gray-700 mt-1">{note.summary}</p>
                                      </div>
                                      {note.diagnosis && (
                                        <div>
                                          <p className="text-sm font-medium text-gray-900">Diagnóstico:</p>
                                          <p className="text-sm text-gray-700 mt-1">{note.diagnosis}</p>
                                        </div>
                                      )}
                                      {note.prescription && (
                                        <div>
                                          <p className="text-sm font-medium text-gray-900">Prescrição/Tratamento:</p>
                                          <p className="text-sm text-gray-700 mt-1">{note.prescription}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    {appointment && (
                                      <Link
                                        href={`/appointments/${appointment.id}/clinical-notes`}
                                        className="text-blue-600 hover:text-blue-900"
                                        title="Ver detalhes da consulta"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Link>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedView === 'notes' && !canAccessClinicalNotes && (
                <div className="bg-white shadow rounded-lg p-6 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Acesso Restrito</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Apenas médicos podem visualizar notas clínicas.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 