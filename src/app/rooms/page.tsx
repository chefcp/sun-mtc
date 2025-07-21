'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { supabase, Room } from '@/lib/supabase'
import { Plus, Search, Edit, Trash2, Home, MapPin } from 'lucide-react'
import Link from 'next/link'

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('name')
      
      if (error) throw error
      setRooms(data || [])
    } catch (error) {
      console.error('Error fetching rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteRoom = async (id: string) => {
    if (!confirm('Tem certeza que deseja eliminar este gabinete?')) return
    
    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      setRooms(rooms.filter(room => room.id !== id))
    } catch (error) {
      console.error('Error deleting room:', error)
      alert('Erro ao eliminar gabinete')
    }
  }

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Gabinetes
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Gestão de salas e espaços de consulta
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Link
              href="/rooms/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Gabinete
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Pesquisar por nome, localização ou notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Home className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total de Gabinetes
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {rooms.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white overflow-hidden shadow rounded-lg animate-pulse">
                  <div className="p-6">
                    <div className="h-6 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center">
                <Home className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {searchTerm ? 'Nenhum gabinete encontrado' : 'Nenhum gabinete cadastrado'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm 
                    ? 'Tente ajustar os termos de pesquisa.' 
                    : 'Comece adicionando um novo gabinete.'}
                </p>
                {!searchTerm && (
                  <div className="mt-6">
                    <Link
                      href="/rooms/new"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Novo Gabinete
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredRooms.map((room) => (
                <div key={room.id} className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Home className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-gray-900">
                            {room.name}
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/rooms/${room.id}/edit`}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => deleteRoom(room.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      {room.location && (
                        <div className="flex items-center text-sm text-gray-500 mb-2">
                          <MapPin className="mr-2 h-4 w-4" />
                          {room.location}
                        </div>
                      )}
                      
                      {room.notes && (
                        <div className="text-sm text-gray-600">
                          <p className="line-clamp-3">{room.notes}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-6">
                      <Link
                        href={`/appointments?room=${room.id}`}
                        className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                      >
                        Ver consultas neste gabinete →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Results count */}
        {!loading && filteredRooms.length > 0 && (
          <div className="mt-6 text-sm text-gray-500">
            {searchTerm ? (
              <>Encontrados {filteredRooms.length} gabinete(s)</>
            ) : (
              <>Total: {rooms.length} gabinete(s)</>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
} 