'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const doctorSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  specialty: z.string().min(2, 'Especialidade é obrigatória'),
  phone: z.string().optional(),
  active: z.boolean()
})

type DoctorFormData = z.infer<typeof doctorSchema>

export default function EditDoctorPage() {
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const params = useParams()
  const doctorId = params.id as string

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<DoctorFormData>({
    resolver: zodResolver(doctorSchema)
  })

  useEffect(() => {
    fetchDoctor()
  }, [doctorId])

  const fetchDoctor = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', doctorId)
        .single()
      
      if (error) throw error
      
      if (data) {
        setValue('name', data.name)
        setValue('specialty', data.specialty)
        setValue('phone', data.phone || '')
        setValue('active', data.active)
      }
    } catch (error) {
      console.error('Error fetching doctor:', error)
      alert('Erro ao carregar médico')
      router.push('/doctors')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: DoctorFormData) => {
    setSaving(true)
    
    try {
      // Clean empty strings
      const cleanData = {
        ...data,
        phone: data.phone || null
      }

      const { error } = await supabase
        .from('doctors')
        .update(cleanData)
        .eq('id', doctorId)
      
      if (error) throw error
      
      alert('Médico atualizado com sucesso!')
      router.push('/doctors')
    } catch (error: any) {
      console.error('Error updating doctor:', error)
      
      // Better error handling
      let errorMessage = 'Erro ao atualizar médico'
      if (error?.message) {
        errorMessage += `: ${error.message}`
      }
      if (error?.details) {
        errorMessage += ` (${error.details})`
      }
      
      alert(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Editar Médico
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Alterar informações do profissional de saúde
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Link
              href="/doctors"
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
                    Nome Completo *
                  </label>
                  <div className="mt-1">
                    <input
                      {...register('name')}
                      type="text"
                      id="name"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Dr. João Silva"
                    />
                    {errors.name && (
                      <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>
                </div>

                {/* Especialidade */}
                <div>
                  <label htmlFor="specialty" className="block text-sm font-medium text-gray-700">
                    Especialidade *
                  </label>
                  <div className="mt-1">
                    <input
                      {...register('specialty')}
                      type="text"
                      id="specialty"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Cardiologia, Dermatologia, etc."
                    />
                    {errors.specialty && (
                      <p className="mt-2 text-sm text-red-600">{errors.specialty.message}</p>
                    )}
                  </div>
                </div>

                {/* Telefone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Telefone
                  </label>
                  <div className="mt-1">
                    <input
                      {...register('phone')}
                      type="tel"
                      id="phone"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="+351 XXX XXX XXX"
                    />
                    {errors.phone && (
                      <p className="mt-2 text-sm text-red-600">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                {/* Status Ativo */}
                <div className="sm:col-span-2">
                  <div className="flex items-center">
                    <input
                      {...register('active')}
                      id="active"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                      Médico ativo (disponível para consultas)
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end space-x-3">
                <Link
                  href="/doctors"
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
                  {saving ? 'A guardar...' : 'Guardar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  )
} 