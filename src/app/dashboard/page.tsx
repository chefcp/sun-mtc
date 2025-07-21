'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { Users, Calendar, UserCheck, Home, Plus } from 'lucide-react'
import Link from 'next/link'

interface Stats {
  clients: number
  appointments: number
  doctors: number
  rooms: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    clients: 0,
    appointments: 0,
    doctors: 0,
    rooms: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const [clientsRes, appointmentsRes, doctorsRes, roomsRes] = await Promise.all([
        supabase.from('clients').select('count', { count: 'exact', head: true }),
        supabase.from('appointments').select('count', { count: 'exact', head: true }),
        supabase.from('doctors').select('count', { count: 'exact', head: true }),
        supabase.from('rooms').select('count', { count: 'exact', head: true })
      ])

      setStats({
        clients: clientsRes.count || 0,
        appointments: appointmentsRes.count || 0,
        doctors: doctorsRes.count || 0,
        rooms: roomsRes.count || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    {
      name: 'Nova Consulta',
      href: '/appointments/new',
      icon: Plus,
      description: 'Agendar nova consulta',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      name: 'Novo Cliente',
      href: '/clients/new',
      icon: Plus,
      description: 'Adicionar novo cliente',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      name: 'Ver Consultas Hoje',
      href: '/appointments?date=today',
      icon: Calendar,
      description: 'Consultas agendadas para hoje',
      color: 'bg-purple-500 hover:bg-purple-600'
    }
  ]

  const statsCards = [
    {
      name: 'Clientes',
      value: stats.clients,
      icon: Users,
      href: '/clients',
      color: 'text-blue-600 bg-blue-100'
    },
    {
      name: 'Consultas',
      value: stats.appointments,
      icon: Calendar,
      href: '/appointments',
      color: 'text-green-600 bg-green-100'
    },
    {
      name: 'Médicos',
      value: stats.doctors,
      icon: UserCheck,
      href: '/doctors',
      color: 'text-purple-600 bg-purple-100'
    },
    {
      name: 'Gabinetes',
      value: stats.rooms,
      icon: Home,
      href: '/rooms',
      color: 'text-orange-600 bg-orange-100'
    }
  ]

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Dashboard
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Bem-vindo ao sistema de gestão de consultas clínicas
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {statsCards.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div>
                  <div className={`absolute ${item.color} rounded-md p-3`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <p className="ml-16 text-sm font-medium text-gray-500 truncate">
                    {item.name}
                  </p>
                </div>
                <div className="ml-16 pb-6 flex items-baseline sm:pb-7">
                  <div className="text-2xl font-semibold text-gray-900">
                    {loading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                    ) : (
                      item.value
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                href={action.href}
                className={`relative group ${action.color} p-6 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 rounded-lg text-white transition-colors`}
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 ring-4 ring-white">
                    <action.icon className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-8">
                  <h3 className="text-lg font-medium">
                    <span className="absolute inset-0" />
                    {action.name}
                  </h3>
                  <p className="mt-2 text-sm opacity-90">
                    {action.description}
                  </p>
                </div>
                <span
                  className="pointer-events-none absolute top-6 right-6 text-white group-hover:text-gray-300"
                  aria-hidden="true"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="m11.293 17.293 1.414 1.414L19.414 12l-6.707-6.707-1.414 1.414L15.586 11H6v2h9.586l-4.293 4.293z" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity placeholder */}
        <div className="mt-4">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">Atividade Recente</h3>
              <div className="mt-6 flow-root">
                <div className="text-sm text-gray-500 text-center py-12">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 font-medium text-gray-900">Nenhuma atividade recente</h3>
                  <p className="mt-1">Comece a usar o sistema para ver a atividade aqui.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 