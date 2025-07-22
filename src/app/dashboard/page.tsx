'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import DailyCalendar from '@/components/DailyCalendar'
import { Plus, Calendar, UserPlus, Eye } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
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
      icon: UserPlus,
      description: 'Adicionar novo cliente',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      name: 'Ver Todas as Consultas',
      href: '/appointments',
      icon: Eye,
      description: 'Visualizar agenda completa',
      color: 'bg-purple-500 hover:bg-purple-600'
    }
  ]

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Dashboard
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Agenda diária e ações rápidas
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
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

        {/* Daily Calendar */}
        <DailyCalendar />
      </div>
    </Layout>
  )
} 