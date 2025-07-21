'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { supabase, Doctor } from '@/lib/supabase'
import { Plus, Search, Edit, Trash2, UserCheck, Phone, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    getCurrentUserAndFetchDoctors()
  }, [])

  const getCurrentUserAndFetchDoctors = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) return
      
      setCurrentUser(user)
      fetchDoctors(user)
    } catch (error) {
      console.error('Error getting user:', error)
      fetchDoctors()
    }
  }

  const fetchDoctors = async (user?: any) => {
    try {
      // Check if user is admin
      const isAdmin = user?.email?.includes('admin') || user?.email === 'edurandrade@gmail.com'
      
      let query = supabase
        .from('doctors')
        .select('*')
        .order('name')
      
      // If not admin, only show approved doctors
      if (!isAdmin) {
        query = query.eq('approved', true)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      setDoctors(data || [])
    } catch (error) {
      console.error('Error fetching doctors:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleDoctorStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('doctors')
        .update({ active: !currentStatus })
        .eq('id', id)
      
      if (error) throw error
      
      setDoctors(doctors.map(doctor => 
        doctor.id === id ? { ...doctor, active: !currentStatus } : doctor
      ))
      
      // Refresh list to ensure consistency
      if (currentUser) {
        fetchDoctors(currentUser)
      }
    } catch (error) {
      console.error('Error updating doctor status:', error)
      alert('Erro ao atualizar status do médico')
    }
  }

  const deleteDoctor = async (id: string) => {
    if (!confirm('Tem certeza que deseja eliminar este médico?')) return
    
    try {
      const { error } = await supabase
        .from('doctors')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      setDoctors(doctors.filter(doctor => doctor.id !== id))
      
      // Refresh list to ensure consistency
      if (currentUser) {
        fetchDoctors(currentUser)
      }
    } catch (error) {
      console.error('Error deleting doctor:', error)
      alert('Erro ao eliminar médico')
    }
  }

  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = 
      doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesActive = 
      activeFilter === 'all' || 
      (activeFilter === 'active' && doctor.active) ||
      (activeFilter === 'inactive' && !doctor.active)
    
    return matchesSearch && matchesActive
  })

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Médicos
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Gestão de profissionais de saúde
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Link
              href="/doctors/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Médico
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Pesquisar por nome, especialidade ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">Todos os médicos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserCheck className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total de Médicos
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {doctors.length}
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
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Ativos
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {doctors.filter(d => d.active).length}
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
                  <XCircle className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Inativos
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {doctors.filter(d => !d.active).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Doctors List */}
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
          ) : filteredDoctors.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center">
                <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {searchTerm || activeFilter !== 'all' ? 'Nenhum médico encontrado' : 'Nenhum médico cadastrado'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || activeFilter !== 'all'
                    ? 'Tente ajustar os termos de pesquisa.'
                    : 'Comece adicionando um novo médico.'}
                </p>
                {!searchTerm && activeFilter === 'all' && (
                  <div className="mt-6">
                    <Link
                      href="/doctors/new"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Novo Médico
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {filteredDoctors.map((doctor) => (
                  <li key={doctor.id}>
                    <div className="px-4 py-4 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            doctor.active ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            <UserCheck className={`h-5 w-5 ${
                              doctor.active ? 'text-green-600' : 'text-gray-600'
                            }`} />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center space-x-2">
                            <div className="text-sm font-medium text-gray-900">
                              {doctor.name}
                            </div>
                            {doctor.active ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Ativo
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Inativo
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            <span className="mr-4">{doctor.specialty}</span>
                            {doctor.phone && (
                              <span className="flex items-center">
                                <Phone className="mr-1 h-4 w-4" />
                                {doctor.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleDoctorStatus(doctor.id, doctor.active)}
                          className={`text-sm font-medium ${
                            doctor.active 
                              ? 'text-red-600 hover:text-red-900' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                          title={doctor.active ? 'Desativar' : 'Ativar'}
                        >
                          {doctor.active ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </button>
                        <Link
                          href={`/doctors/${doctor.id}/edit`}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => deleteDoctor(doctor.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Results count */}
        {!loading && filteredDoctors.length > 0 && (
          <div className="mt-4 text-sm text-gray-500">
            {searchTerm || activeFilter !== 'all' ? (
              <>Encontrados {filteredDoctors.length} médico(s)</>
            ) : (
              <>Total: {doctors.length} médico(s)</>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
} 