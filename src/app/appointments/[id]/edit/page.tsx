'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Layout from '@/components/Layout'
import { supabase, Client, Doctor, Room } from '@/lib/supabase'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'

const appointmentSchema = z.object({
  client_id: z.string().min(1, 'Cliente é obrigatório'),
  doctor_id: z.string().min(1, 'Médico é obrigatório'),
  room_id: z.string().min(1, 'Gabinete é obrigatório'),
  date: z.string().min(1, 'Data e hora são obrigatórias'),
  duration_min: z.number().min(15, 'Duração mínima é 15 minutos').max(480, 'Duração máxima é 8 horas'),
  status: z.enum(['scheduled', 'done', 'canceled']),
  notes: z.string().optional()
})

type AppointmentFormData = z.infer<typeof appointmentSchema>

export default function EditAppointmentPage() {
  const [saving, setSaving] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const params = useParams()
  const appointmentId = params.id as string

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema)
  })

  useEffect(() => {
    fetchData()
  }, [appointmentId])

  const fetchData = async () => {
    try {
      const [clientsRes, doctorsRes, roomsRes, appointmentRes] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('doctors').select('*').eq('active', true).order('name'),
        supabase.from('rooms').select('*').order('name'),
        supabase.from('appointments').select('*').eq('id', appointmentId).single()
      ])

      if (clientsRes.error) throw clientsRes.error
      if (doctorsRes.error) throw doctorsRes.error
      if (roomsRes.error) throw roomsRes.error
      if (appointmentRes.error) throw appointmentRes.error

      setClients(clientsRes.data || [])
      setDoctors(doctorsRes.data || [])
      setRooms(roomsRes.data || [])

      // Populate form with existing data
      const appointment = appointmentRes.data
      if (appointment) {
        setValue('client_id', appointment.client_id)
        setValue('doctor_id', appointment.doctor_id)
        setValue('room_id', appointment.room_id)
        setValue('duration_min', appointment.duration_min)
        setValue('status', appointment.status)
        setValue('notes', appointment.notes || '')
        
        // Format date for datetime-local input
        const appointmentDate = new Date(appointment.date)
        const localDate = new Date(appointmentDate.getTime() - appointmentDate.getTimezoneOffset() * 60000)
        setValue('date', localDate.toISOString().slice(0, 16))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Erro ao carregar dados')
      router.push('/appointments')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: AppointmentFormData) => {
    setSaving(true)
    
    try {
      // Clean empty strings and convert date to ISO format
      const cleanData = {
        ...data,
        date: new Date(data.date).toISOString(),
        notes: data.notes || null
      }

      const { error } = await supabase
        .from('appointments')
        .update(cleanData)
        .eq('id', appointmentId)
      
      if (error) throw error
      
      router.push('/appointments')
    } catch (error) {
      console.error('Error updating appointment:', error)
      alert('Erro ao atualizar consulta')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-8"></div>
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded"></div>
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Editar Consulta
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Alterar informações da consulta agendada
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Link
              href="/appointments"
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
                {/* Cliente */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="client_id" className="block text-sm font-medium text-gray-700">
                      Cliente *
                    </label>
                    <Link
                      href="/clients/new"
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      <Plus className="h-4 w-4 inline mr-1" />
                      Novo Cliente
                    </Link>
                  </div>
                  <div className="mt-1">
                    <select
                      {...register('client_id')}
                      id="client_id"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="">Selecionar cliente...</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name} {client.email && `(${client.email})`}
                        </option>
                      ))}
                    </select>
                    {errors.client_id && (
                      <p className="mt-2 text-sm text-red-600">{errors.client_id.message}</p>
                    )}
                  </div>
                </div>

                {/* Médico */}
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="doctor_id" className="block text-sm font-medium text-gray-700">
                      Médico *
                    </label>
                    <Link
                      href="/doctors/new"
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      <Plus className="h-4 w-4 inline mr-1" />
                      Novo Médico
                    </Link>
                  </div>
                  <div className="mt-1">
                    <select
                      {...register('doctor_id')}
                      id="doctor_id"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="">Selecionar médico...</option>
                      {doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.name} - {doctor.specialty}
                        </option>
                      ))}
                    </select>
                    {errors.doctor_id && (
                      <p className="mt-2 text-sm text-red-600">{errors.doctor_id.message}</p>
                    )}
                  </div>
                </div>

                {/* Gabinete */}
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="room_id" className="block text-sm font-medium text-gray-700">
                      Gabinete *
                    </label>
                    <Link
                      href="/rooms/new"
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      <Plus className="h-4 w-4 inline mr-1" />
                      Novo Gabinete
                    </Link>
                  </div>
                  <div className="mt-1">
                    <select
                      {...register('room_id')}
                      id="room_id"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="">Selecionar gabinete...</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name} {room.location && `(${room.location})`}
                        </option>
                      ))}
                    </select>
                    {errors.room_id && (
                      <p className="mt-2 text-sm text-red-600">{errors.room_id.message}</p>
                    )}
                  </div>
                </div>

                {/* Data e Hora */}
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                    Data e Hora *
                  </label>
                  <div className="mt-1">
                    <input
                      {...register('date')}
                      type="datetime-local"
                      id="date"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                    {errors.date && (
                      <p className="mt-2 text-sm text-red-600">{errors.date.message}</p>
                    )}
                  </div>
                </div>

                {/* Duração */}
                <div>
                  <label htmlFor="duration_min" className="block text-sm font-medium text-gray-700">
                    Duração (minutos) *
                  </label>
                  <div className="mt-1">
                    <select
                      {...register('duration_min', { valueAsNumber: true })}
                      id="duration_min"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value={15}>15 minutos</option>
                      <option value={30}>30 minutos</option>
                      <option value={45}>45 minutos</option>
                      <option value={60}>1 hora</option>
                      <option value={90}>1h 30min</option>
                      <option value={120}>2 horas</option>
                      <option value={180}>3 horas</option>
                      <option value={240}>4 horas</option>
                    </select>
                    {errors.duration_min && (
                      <p className="mt-2 text-sm text-red-600">{errors.duration_min.message}</p>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    Status *
                  </label>
                  <div className="mt-1">
                    <select
                      {...register('status')}
                      id="status"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="scheduled">Agendada</option>
                      <option value="done">Concluída</option>
                      <option value="canceled">Cancelada</option>
                    </select>
                    {errors.status && (
                      <p className="mt-2 text-sm text-red-600">{errors.status.message}</p>
                    )}
                  </div>
                </div>

                {/* Notas */}
                <div className="sm:col-span-2">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Notas
                  </label>
                  <div className="mt-1">
                    <textarea
                      {...register('notes')}
                      id="notes"
                      rows={4}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Observações sobre a consulta..."
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
                  href="/appointments"
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