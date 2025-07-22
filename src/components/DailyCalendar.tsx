'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, Clock, User, ChevronLeft, ChevronRight } from 'lucide-react'

interface Appointment {
  id: string
  date: string
  duration_min: number
  client: { name: string } | null
  doctor: { name: string } | null
  room: { id: string; name: string } | null
  status: string
}

interface Room {
  id: string
  name: string
  location?: string
}

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`)

const ROOM_COLORS = [
  'bg-blue-100 border-blue-300 text-blue-800',
  'bg-green-100 border-green-300 text-green-800', 
  'bg-purple-100 border-purple-300 text-purple-800',
  'bg-orange-100 border-orange-300 text-orange-800',
  'bg-pink-100 border-pink-300 text-pink-800',
  'bg-indigo-100 border-indigo-300 text-indigo-800',
  'bg-teal-100 border-teal-300 text-teal-800',
  'bg-red-100 border-red-300 text-red-800',
]

export default function DailyCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRoomsAndAppointments()
  }, [selectedDate])

  const fetchRoomsAndAppointments = async () => {
    try {
      // Fetch rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .order('name')

      if (roomsError) throw roomsError

      // Fetch appointments for selected date
      const dateStart = new Date(selectedDate)
      dateStart.setHours(0, 0, 0, 0)
      const dateEnd = new Date(selectedDate)
      dateEnd.setHours(23, 59, 59, 999)

      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          duration_min,
          status,
          clients!inner(name),
          doctors!inner(name),
          rooms!inner(id, name)
        `)
        .gte('date', dateStart.toISOString())
        .lte('date', dateEnd.toISOString())
        .order('date')

      if (appointmentsError) throw appointmentsError

      // Transform the data to match our interface
      const transformedAppointments = (appointmentsData || []).map((apt: any) => ({
        id: apt.id,
        date: apt.date,
        duration_min: apt.duration_min,
        status: apt.status,
        client: apt.clients ? { name: apt.clients.name } : null,
        doctor: apt.doctors ? { name: apt.doctors.name } : null,
        room: apt.rooms ? { id: apt.rooms.id, name: apt.rooms.name } : null
      }))

      setRooms(roomsData || [])
      setAppointments(transformedAppointments)
    } catch (error) {
      console.error('Error fetching calendar data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-PT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  const getAppointmentPosition = (appointment: Appointment) => {
    const appointmentDate = new Date(appointment.date)
    const hour = appointmentDate.getHours()
    const minutes = appointmentDate.getMinutes()
    
    // Calculate position: each hour = 60px, each minute = 1px
    const top = (hour * 60) + minutes
    const height = appointment.duration_min || 60
    
    return { top, height }
  }

  const getRoomColor = (roomId: string) => {
    const index = rooms.findIndex(room => room.id === roomId)
    return ROOM_COLORS[index % ROOM_COLORS.length]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'border-l-yellow-400'
      case 'done': return 'border-l-green-400'
      case 'canceled': return 'border-l-red-400'
      default: return 'border-l-gray-400'
    }
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Agenda Diária
          </h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => changeDate(-1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm font-medium min-w-48 text-center">
                {formatDate(selectedDate)}
              </span>
              <button
                onClick={() => changeDate(1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Hoje
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {rooms.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum gabinete configurado</h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure gabinetes para ver a agenda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid gap-4" style={{ gridTemplateColumns: `80px repeat(${rooms.length}, 1fr)` }}>
              {/* Time Column */}
              <div className="space-y-2">
                <div className="h-8"></div> {/* Header spacer */}
                {TIME_SLOTS.filter((_, i) => i >= 8 && i <= 20).map((time) => (
                  <div key={time} className="text-xs text-gray-500 h-12 flex items-start">
                    {time}
                  </div>
                ))}
              </div>

              {/* Room Columns */}
              {rooms.map((room) => {
                const roomAppointments = appointments.filter(
                  apt => apt.room?.id === room.id
                )

                return (
                  <div key={room.id} className="relative">
                    {/* Room Header */}
                    <div className={`p-3 rounded-t-lg text-center ${getRoomColor(room.id)}`}>
                      <h4 className="font-medium">{room.name}</h4>
                      {room.location && (
                        <p className="text-xs opacity-75">{room.location}</p>
                      )}
                    </div>

                    {/* Time Grid */}
                    <div className="relative border border-t-0 rounded-b-lg" style={{ height: '780px' }}>
                      {/* Hour lines */}
                      {Array.from({ length: 13 }, (_, i) => (
                        <div
                          key={i}
                          className="absolute w-full border-t border-gray-100"
                          style={{ top: `${i * 60}px` }}
                        />
                      ))}

                      {/* Appointments */}
                      {roomAppointments.map((appointment) => {
                        const position = getAppointmentPosition(appointment)
                        const hourStart = new Date(appointment.date).getHours()
                        
                        // Only show appointments between 8h-21h
                        if (hourStart < 8 || hourStart > 20) return null

                        const adjustedTop = (hourStart - 8) * 60 + (new Date(appointment.date).getMinutes())

                        return (
                          <div
                            key={appointment.id}
                            className={`absolute left-1 right-1 p-2 rounded border-l-4 ${getRoomColor(room.id)} ${getStatusColor(appointment.status)} hover:shadow-md transition-shadow cursor-pointer`}
                            style={{
                              top: `${adjustedTop}px`,
                              height: `${Math.max(position.height, 30)}px`,
                              zIndex: 1
                            }}
                          >
                            <div className="text-xs font-medium truncate">
                              {appointment.client?.name}
                            </div>
                            <div className="text-xs opacity-75 flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              {appointment.doctor?.name}
                            </div>
                            <div className="text-xs opacity-75 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(appointment.date).toLocaleTimeString('pt-PT', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 