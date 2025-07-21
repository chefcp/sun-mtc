'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const roomSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  location: z.string().optional(),
  notes: z.string().optional()
})

type RoomFormData = z.infer<typeof roomSchema>

export default function NewRoomPage() {
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema)
  })

  const onSubmit = async (data: RoomFormData) => {
    setSaving(true)
    
    try {
      // Clean empty strings
      const cleanData = {
        ...data,
        location: data.location || null,
        notes: data.notes || null
      }

      const { error } = await supabase
        .from('rooms')
        .insert([cleanData])
      
      if (error) throw error
      
      router.push('/rooms')
    } catch (error) {
      console.error('Error creating room:', error)
      alert('Erro ao criar gabinete')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Novo Gabinete
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Adicionar uma nova sala de consulta ao sistema
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Link
              href="/rooms"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </div>
        </div>

        {/* Form */}
        <div className="mt-4">
          <div className="bg-white shadow rounded-lg">
            <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Nome */}
                <div className="sm:col-span-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Nome do Gabinete *
                  </label>
                  <div className="mt-1">
                    <input
                      {...register('name')}
                      type="text"
                      id="name"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Gabinete 1, Sala de Consulta A, etc."
                    />
                    {errors.name && (
                      <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>
                </div>

                {/* Localização */}
                <div className="sm:col-span-2">
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                    Localização
                  </label>
                  <div className="mt-1">
                    <input
                      {...register('location')}
                      type="text"
                      id="location"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="1º Andar, Ala Direita, Piso Térreo, etc."
                    />
                    {errors.location && (
                      <p className="mt-2 text-sm text-red-600">{errors.location.message}</p>
                    )}
                  </div>
                </div>

                {/* Notas */}
                <div className="sm:col-span-2">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Notas e Equipamentos
                  </label>
                  <div className="mt-1">
                    <textarea
                      {...register('notes')}
                      id="notes"
                      rows={4}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Equipamentos disponíveis, características especiais, limitações, etc."
                    />
                    {errors.notes && (
                      <p className="mt-2 text-sm text-red-600">{errors.notes.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end space-x-3">
                <Link
                  href="/rooms"
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
                  {saving ? 'A guardar...' : 'Criar Gabinete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  )
} 