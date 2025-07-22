'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, User, ChevronLeft, ChevronRight } from 'lucide-react'

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

const DAYS_OF_WEEK = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

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

export default function WeeklyCalendar() {
  const [selectedWeek, setSelectedWeek] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRoomsAndAppointments()
  }, [selectedWeek])

  const getWeekDates = (date: Date) => {
    const week = []
    const startOfWeek = new Date(date)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Monday as first day

    startOfWeek.setDate(diff)

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      week.push(day)
    }

    return week
  }

  const fetchRoomsAndAppointments = async () => {
    try {
      // Fetch rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .order('name')

      if (roomsError) throw roomsError

      // Fetch appointments for selected week
      const weekDates = getWeekDates(selectedWeek)
      const weekStart = new Date(weekDates[0])
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekDates[6])
      weekEnd.setHours(23, 59, 59, 999)

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
        .gte('date', weekStart.toISOString())
        .lte('date', weekEnd.toISOString())
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

  const changeWeek = (weeks: number) => {
    const newDate = new Date(selectedWeek)
    newDate.setDate(newDate.getDate() + (weeks * 7))
    setSelectedWeek(newDate)
  }

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toDateString()
    return appointments.filter(apt => new Date(apt.date).toDateString() === dateStr)
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

  const formatWeekRange = (dates: Date[]) => {
    const start = dates[0].toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
    const end = dates[6].toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })
    return `${start} - ${end}`
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-7 gap-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const weekDates = getWeekDates(selectedWeek)

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Agenda Semanal
          </h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => changeWeek(-1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm font-medium min-w-40 text-center">
                {formatWeekRange(weekDates)}
              </span>
              <button
                onClick={() => changeWeek(1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={() => setSelectedWeek(new Date())}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Esta Semana
            </button>
          </div>
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="p-6">
        <div className="grid grid-cols-7 gap-4">
          {weekDates.map((date, dayIndex) => {
            const dayAppointments = getAppointmentsForDate(date)
            const isToday = date.toDateString() === new Date().toDateString()

            return (
              <div key={dayIndex} className="min-h-96">
                {/* Day Header */}
                <div className={`text-center p-2 rounded-t-lg ${isToday ? 'bg-blue-100 text-blue-800' : 'bg-gray-50 text-gray-700'}`}>
                  <div className="text-sm font-medium">{DAYS_OF_WEEK[dayIndex]}</div>
                  <div className={`text-lg ${isToday ? 'font-bold' : ''}`}>
                    {date.getDate()}
                  </div>
                </div>

                {/* Appointments */}
                <div className="border border-t-0 rounded-b-lg p-2 space-y-2 min-h-80">
                  {dayAppointments.map((appointment) => {
                    const appointmentTime = new Date(appointment.date)
                    const roomColor = getRoomColor(appointment.room?.id || '')

                    return (
                      <div
                        key={appointment.id}
                        className={`p-2 rounded border-l-4 ${roomColor} ${getStatusColor(appointment.status)} hover:shadow-md transition-shadow cursor-pointer text-xs`}
                      >
                        <div className="font-medium truncate">
                          {appointmentTime.toLocaleTimeString('pt-PT', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="truncate">{appointment.client?.name}</div>
                        <div className="opacity-75 flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {appointment.doctor?.name}
                        </div>
                        <div className="opacity-75">{appointment.room?.name}</div>
                      </div>
                    )
                  })}

                  {dayAppointments.length === 0 && (
                    <div className="text-center text-gray-400 text-xs py-8">
                      Sem consultas
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
} 