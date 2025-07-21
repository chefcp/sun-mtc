'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { supabase, Doctor } from '@/lib/supabase'
import { Check, X, User, UserCheck, Clock, Calendar, Mail, Phone, Send } from 'lucide-react'
import Link from 'next/link'

export default function AdminPage() {
  const [pendingDoctors, setPendingDoctors] = useState<Doctor[]>([])
  const [approvedDoctors, setApprovedDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        router.push('/login')
        return
      }

      setCurrentUser(user)

      // Check if user is admin (for now, we'll check if email contains 'admin' or is the first user)
      // In production, this should be a proper role-based system
      const isAdmin = user.email?.includes('admin') || user.email === 'edurandrade@gmail.com'
      
      if (!isAdmin) {
        alert('Acesso negado. Apenas administradores podem aceder a esta página.')
        router.push('/dashboard')
        return
      }

      fetchDoctors()
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/dashboard')
    }
  }

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Separate pending and approved doctors
      const pending = (data || []).filter(doctor => !doctor.approved)
      const approved = (data || []).filter(doctor => doctor.approved)

      setPendingDoctors(pending)
      setApprovedDoctors(approved)
    } catch (error) {
      console.error('Error fetching doctors:', error)
    } finally {
      setLoading(false)
    }
  }

  const approveDoctor = async (doctorId: string) => {
    try {
      const { error } = await supabase
        .from('doctors')
        .update({ 
          approved: true,
          active: true 
        })
        .eq('id', doctorId)

      if (error) throw error

      // Refresh the lists
      fetchDoctors()
      alert('Médico aprovado com sucesso!')
    } catch (error) {
      console.error('Error approving doctor:', error)
      alert('Erro ao aprovar médico')
    }
  }

  const rejectDoctor = async (doctorId: string) => {
    if (!confirm('Tem certeza que deseja rejeitar este médico? Esta ação irá remover o registo.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('doctors')
        .delete()
        .eq('id', doctorId)

      if (error) throw error

      // Refresh the lists
      fetchDoctors()
      alert('Médico rejeitado e removido do sistema.')
    } catch (error) {
      console.error('Error rejecting doctor:', error)
      alert('Erro ao rejeitar médico')
    }
  }

  const toggleDoctorStatus = async (doctorId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('doctors')
        .update({ active: !currentStatus })
        .eq('id', doctorId)

      if (error) throw error

      fetchDoctors()
    } catch (error) {
      console.error('Error updating doctor status:', error)
      alert('Erro ao atualizar status do médico')
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

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-8"></div>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
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
              Administração
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Gestão de médicos, utilizadores e convites do sistema
            </p>
          </div>
          <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
            <Link
              href="/admin/invites"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Send className="mr-2 h-4 w-4" />
              Convites
            </Link>
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Médicos Pendentes
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {pendingDoctors.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserCheck className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Médicos Aprovados
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {approvedDoctors.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <User className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Médicos Ativos
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {approvedDoctors.filter(d => d.active).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Doctors */}
        {pendingDoctors.length > 0 && (
          <div className="mt-8">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Médicos Pendentes de Aprovação
                </h3>
                <div className="space-y-4">
                  {pendingDoctors.map((doctor) => (
                    <div key={doctor.id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-yellow-600" />
                            </div>
                          </div>
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">{doctor.name}</h4>
                            <p className="text-sm text-gray-600">{doctor.specialty}</p>
                            {doctor.phone && (
                              <p className="text-sm text-gray-500 flex items-center mt-1">
                                <Phone className="h-4 w-4 mr-1" />
                                {doctor.phone}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 flex items-center mt-1">
                              <Calendar className="h-3 w-3 mr-1" />
                              Solicitado em {formatDate(doctor.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => approveDoctor(doctor.id)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Aprovar
                          </button>
                          <button
                            onClick={() => rejectDoctor(doctor.id)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Rejeitar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Approved Doctors */}
        <div className="mt-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Médicos Aprovados
              </h3>
              {approvedDoctors.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum médico aprovado</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Quando aprovar médicos, eles aparecerão aqui.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {approvedDoctors.map((doctor) => (
                    <div key={doctor.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              doctor.active ? 'bg-green-100' : 'bg-gray-100'
                            }`}>
                              <UserCheck className={`h-5 w-5 ${
                                doctor.active ? 'text-green-600' : 'text-gray-600'
                              }`} />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {doctor.name}
                            </h4>
                            <p className="text-sm text-gray-500 truncate">{doctor.specialty}</p>
                            <p className="text-xs text-gray-400">
                              Aprovado em {formatDate(doctor.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          doctor.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {doctor.active ? 'Ativo' : 'Inativo'}
                        </span>
                        <button
                          onClick={() => toggleDoctorStatus(doctor.id, doctor.active)}
                          className={`text-sm font-medium ${
                            doctor.active 
                              ? 'text-red-600 hover:text-red-900' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                        >
                          {doctor.active ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 