'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { supabase, Appointment } from '@/lib/supabase'
import { Plus, Search, Edit, Trash2, Calendar, Clock, User, UserCheck, FileText } from 'lucide-react'
import Link from 'next/link'

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [canAccessClinicalNotes, setCanAccessClinicalNotes] = useState(false)

  useEffect(() => {
    checkUserAccessAndFetchAppointments()
  }, [])

  const checkUserAccessAndFetchAppointments = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) return
      
      setCurrentUser(user)

      // Check if user can access clinical notes
      const isLegacyAdmin = user.email?.includes('admin') || user.email === 'edurandrade@gmail.com'
      
      if (isLegacyAdmin) {
        setCanAccessClinicalNotes(true)
      } else {
        // Get user profile to check role
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        const canAccess = profile && (profile.role === 'doctor' || profile.role === 'admin_doctor')
        setCanAccessClinicalNotes(canAccess || false)
      }

      fetchAppointments()
    } catch (error) {
      console.error('Error checking user access:', error)
      fetchAppointments()
    }
  }

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          client:clients(id, name, email, phone),
          doctor:doctors(id, name, specialty),
          room:rooms(id, name, location)
        `)
        .order('date', { ascending: false })
      
      if (error) throw error
      setAppointments(data || [])
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteAppointment = async (id: string) => {
    if (!confirm('Tem certeza que deseja eliminar esta consulta?')) return
    
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      setAppointments(appointments.filter(appointment => appointment.id !== id))
    } catch (error) {
      console.error('Error deleting appointment:', error)
      alert('Erro ao eliminar consulta')
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('pt-PT'),
      time: date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      scheduled: 'bg-blue-100 text-blue-800',
      done: 'bg-green-100 text-green-800',
      canceled: 'bg-red-100 text-red-800'
    }
    
    const labels = {
      scheduled: 'Agendada',
      done: 'Concluída',
      canceled: 'Cancelada'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = 
      appointment.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.doctor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter
    
    const matchesDate = !dateFilter || 
      new Date(appointment.date).toDateString() === new Date(dateFilter).toDateString()
    
    return matchesSearch && matchesStatus && matchesDate
  })

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Consultas
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Gestão de consultas e agendamentos
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Link
              href="/appointments/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Consulta
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Pesquisar por cliente, médico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">Todos os status</option>
              <option value="scheduled">Agendadas</option>
              <option value="done">Concluídas</option>
              <option value="canceled">Canceladas</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Appointments List */}
        <div className="mt-6">
          {loading ? (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {searchTerm || statusFilter !== 'all' || dateFilter ? 'Nenhuma consulta encontrada' : 'Nenhuma consulta agendada'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || statusFilter !== 'all' || dateFilter
                    ? 'Tente ajustar os filtros de pesquisa.'
                    : 'Comece agendando uma nova consulta.'}
                </p>
                {!searchTerm && statusFilter === 'all' && !dateFilter && (
                  <div className="mt-6">
                    <Link
                      href="/appointments/new"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Nova Consulta
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {filteredAppointments.map((appointment) => {
                  const { date, time } = formatDateTime(appointment.date)
                  return (
                    <li key={appointment.id}>
                      <div className="px-4 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-blue-600" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium text-gray-900">
                                  {appointment.client?.name || 'Cliente não encontrado'}
                                </p>
                                {getStatusBadge(appointment.status)}
                              </div>
                              <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                                <div className="flex items-center">
                                  <Calendar className="mr-1 h-4 w-4" />
                                  {date}
                                </div>
                                <div className="flex items-center">
                                  <Clock className="mr-1 h-4 w-4" />
                                  {time}
                                </div>
                                {appointment.doctor && (
                                  <div className="flex items-center">
                                    <UserCheck className="mr-1 h-4 w-4" />
                                    {appointment.doctor.name}
                                  </div>
                                )}
                                {appointment.room && (
                                  <div className="flex items-center">
                                    <User className="mr-1 h-4 w-4" />
                                    {appointment.room.name}
                                  </div>
                                )}
                              </div>
                              {appointment.notes && (
                                <div className="mt-1 text-xs text-gray-400 truncate">
                                  {appointment.notes}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {canAccessClinicalNotes && (
                              <Link
                                href={`/appointments/${appointment.id}/clinical-notes`}
                                className="text-green-600 hover:text-green-900"
                                title="Notas Clínicas"
                              >
                                <FileText className="h-4 w-4" />
                              </Link>
                            )}
                            <Link
                              href={`/appointments/${appointment.id}`}
                              className="text-blue-600 hover:text-blue-900"
                              title="Ver detalhes"
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => deleteAppointment(appointment.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Results count */}
        {!loading && filteredAppointments.length > 0 && (
          <div className="mt-4 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all' || dateFilter ? (
              <>Encontradas {filteredAppointments.length} consulta(s)</>
            ) : (
              <>Total: {appointments.length} consulta(s)</>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
} 