'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Layout from '@/components/Layout'
import { supabase, Appointment, ClinicalNote } from '@/lib/supabase'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, ArrowLeft, FileText, User, Calendar, Clock, Edit, History, Search, Filter, EyeOff, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

const clinicalNoteSchema = z.object({
  summary: z.string().min(10, 'Resumo deve ter pelo menos 10 caracteres'),
  diagnosis: z.string().optional(),
  prescription: z.string().optional(),
  is_private: z.boolean().optional(),
  urgency_level: z.enum(['low', 'medium', 'high', 'critical']).optional()
})

type ClinicalNoteFormData = z.infer<typeof clinicalNoteSchema>

interface ClinicalNoteWithHistory extends ClinicalNote {
  doctor?: {
    id: string
    name: string
    specialty: string
  }
  versions?: NoteVersion[]
}

interface NoteVersion {
  id: string
  note_id: string
  version_number: number
  summary: string
  diagnosis?: string
  prescription?: string
  created_by: string
  created_at: string
  doctor?: {
    name: string
    specialty: string
  }
}

export default function ClinicalNotesPage() {
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNoteWithHistory[]>([])
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedView, setSelectedView] = useState<'current' | 'history' | 'private'>('current')
  const [searchTerm, setSearchTerm] = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState('all')
  const [selectedNoteHistory, setSelectedNoteHistory] = useState<string | null>(null)
  const router = useRouter()
  const params = useParams()
  const appointmentId = params.id as string

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm<ClinicalNoteFormData>({
    resolver: zodResolver(clinicalNoteSchema),
    defaultValues: {
      urgency_level: 'low',
      is_private: false
    }
  })

  useEffect(() => {
    if (appointmentId) {
      checkAccessAndFetchData()
    }
  }, [appointmentId])

  const checkAccessAndFetchData = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        router.push('/login')
        return
      }

      setCurrentUser(user)

      // Get user profile to check role
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      // If no profile exists, check if user is legacy admin
      const isLegacyAdmin = user.email?.includes('admin') || user.email === 'edurandrade@gmail.com'
      
      if (profileError && !isLegacyAdmin) {
        alert('Acesso negado. Apenas médicos podem aceder às notas clínicas.')
        router.push('/appointments')
        return
      }

      // Check if user is doctor or admin_doctor
      const canAccessClinicalNotes = isLegacyAdmin || 
        (profile && (profile.role === 'doctor' || profile.role === 'admin_doctor'))

      if (!canAccessClinicalNotes) {
        alert('Acesso negado. Apenas médicos podem aceder às notas clínicas.')
        router.push('/appointments')
        return
      }

      fetchData()
    } catch (error) {
      console.error('Error checking access:', error)
      router.push('/appointments')
    }
  }

  const fetchData = async () => {
    try {
      // Fetch appointment with related data
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          client:clients(id, name, email, phone, birth_date),
          doctor:doctors(id, name, specialty),
          room:rooms(id, name, location)
        `)
        .eq('id', appointmentId)
        .single()

      if (appointmentError) throw appointmentError
      setAppointment(appointmentData)

      // Fetch clinical notes with doctor information and versions
      const { data: notesData, error: notesError } = await supabase
        .from('clinical_notes')
        .select(`
          *,
          doctor:doctors(id, name, specialty)
        `)
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false })

      if (notesError) throw notesError

      // For each note, fetch its version history if it exists
      const notesWithHistory = await Promise.all(
        (notesData || []).map(async (note) => {
          const { data: versions } = await supabase
            .from('clinical_note_versions')
            .select(`
              *,
              doctor:doctors(name, specialty)
            `)
            .eq('note_id', note.id)
            .order('version_number', { ascending: false })

          return { ...note, versions: versions || [] }
        })
      )

      setClinicalNotes(notesWithHistory)

    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Erro ao carregar dados')
      router.push('/appointments')
    } finally {
      setLoading(false)
    }
  }

  const startEditingNote = (note: ClinicalNoteWithHistory) => {
    setEditingNote(note.id)
    setValue('summary', note.summary || '')
    setValue('diagnosis', note.diagnosis || '')
    setValue('prescription', note.prescription || '')
    setValue('is_private', note.is_private || false)
    setValue('urgency_level', (note.urgency_level as any) || 'low')
  }

  const cancelEditing = () => {
    setEditingNote(null)
    reset()
  }

  const onSubmit = async (data: ClinicalNoteFormData) => {
    setSaving(true)
    
    try {
      if (editingNote) {
        // Editing existing note - create new version
        const existingNote = clinicalNotes.find(n => n.id === editingNote)
        if (!existingNote) throw new Error('Note not found')

        // Create version entry for current note before updating
        await supabase
          .from('clinical_note_versions')
          .insert([{
            note_id: editingNote,
            version_number: (existingNote.versions?.length || 0) + 1,
            summary: existingNote.summary,
            diagnosis: existingNote.diagnosis,
            prescription: existingNote.prescription,
            created_by: currentUser.id,
            created_at: new Date().toISOString()
          }])

        // Update the main note
        const { error } = await supabase
          .from('clinical_notes')
          .update({
            summary: data.summary,
            diagnosis: data.diagnosis || null,
            prescription: data.prescription || null,
            is_private: data.is_private || false,
            urgency_level: data.urgency_level || 'low',
            updated_at: new Date().toISOString(),
            updated_by: currentUser.id
          })
          .eq('id', editingNote)

        if (error) throw error
        
        setEditingNote(null)
        alert('Nota clínica atualizada com sucesso!')
      } else {
        // Creating new note
        const { error } = await supabase
          .from('clinical_notes')
          .insert([{
            appointment_id: appointmentId,
            summary: data.summary,
            diagnosis: data.diagnosis || null,
            prescription: data.prescription || null,
            is_private: data.is_private || false,
            urgency_level: data.urgency_level || 'low',
            created_by: currentUser.id
          }])

        if (error) throw error
        
        alert('Nota clínica criada com sucesso!')
      }

      reset()
      fetchData()
    } catch (error) {
      console.error('Error saving clinical note:', error)
      alert('Erro ao guardar nota clínica')
    } finally {
      setSaving(false)
    }
  }

  const deleteNote = async (noteId: string) => {
    if (!confirm('Tem certeza que deseja eliminar esta nota clínica?')) return
    
    try {
      const { error } = await supabase
        .from('clinical_notes')
        .delete()
        .eq('id', noteId)

      if (error) throw error
      
      setClinicalNotes(clinicalNotes.filter(note => note.id !== noteId))
      alert('Nota clínica eliminada com sucesso!')
    } catch (error) {
      console.error('Error deleting note:', error)
      alert('Erro ao eliminar nota clínica')
    }
  }

  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-PT')
  }

  const getUrgencyBadge = (level: string) => {
    const styles = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    }
    
    const labels = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      critical: 'Crítica'
    }
    
    const icons = {
      low: CheckCircle,
      medium: AlertTriangle,
      high: AlertTriangle,
      critical: XCircle
    }

    const Icon = icons[level as keyof typeof icons] || CheckCircle

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[level as keyof typeof styles]}`}>
        <Icon className="h-3 w-3 mr-1" />
        {labels[level as keyof typeof labels]}
      </span>
    )
  }

  const filteredNotes = clinicalNotes.filter(note => {
    const matchesSearch = !searchTerm || 
      note.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.prescription?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesUrgency = urgencyFilter === 'all' || note.urgency_level === urgencyFilter
    
    const matchesPrivacy = selectedView === 'private' ? note.is_private : 
                          selectedView === 'current' ? !note.is_private : true

    return matchesSearch && matchesUrgency && matchesPrivacy
  })

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (!appointment) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">Consulta não encontrada</h3>
            <Link href="/appointments" className="text-blue-600 hover:text-blue-500">
              Voltar às consultas
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Notas Clínicas
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {appointment.client?.name} • {new Date(appointment.date).toLocaleDateString('pt-PT')}
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Patient Info Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6 sticky top-6">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">{appointment.client?.name}</h3>
                  <p className="text-sm text-gray-500">
                    {appointment.client?.birth_date && calculateAge(appointment.client.birth_date)} anos
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                  <span>{formatDateTime(appointment.date)}</span>
                </div>
                <div className="flex items-center">
                  <User className="h-4 w-4 text-gray-400 mr-2" />
                  <span>{appointment.doctor?.name}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-gray-400 mr-2" />
                  <span>{appointment.duration_min} minutos</span>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Estatísticas</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Total Notas</span>
                    <span className="text-sm font-medium text-gray-900">{clinicalNotes.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Privadas</span>
                    <span className="text-sm font-medium text-gray-900">
                      {clinicalNotes.filter(n => n.is_private).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Alta Prioridade</span>
                    <span className="text-sm font-medium text-red-600">
                      {clinicalNotes.filter(n => n.urgency_level === 'high' || n.urgency_level === 'critical').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* View Selector */}
            <div className="mb-6">
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                {[
                  { key: 'current', label: 'Notas Atuais', icon: FileText },
                  { key: 'history', label: 'Histórico', icon: History },
                  { key: 'private', label: 'Privadas', icon: EyeOff }
                ].map((view) => {
                  const Icon = view.icon
                  return (
                    <button
                      key={view.key}
                      onClick={() => setSelectedView(view.key as any)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                        selectedView === view.key
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {view.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Pesquisar nas notas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              {/* Urgency Filter */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="all">Todas as urgências</option>
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="critical">Crítica</option>
                </select>
              </div>
            </div>

            {/* New Note Form */}
            {!editingNote && (
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Nova Nota Clínica
                </h3>
                
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Summary */}
                  <div>
                    <label htmlFor="summary" className="block text-sm font-medium text-gray-700">
                      Resumo/Observações *
                    </label>
                    <div className="mt-1">
                      <textarea
                        {...register('summary')}
                        id="summary"
                        rows={4}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="Descreva as observações da consulta..."
                      />
                      {errors.summary && (
                        <p className="mt-2 text-sm text-red-600">{errors.summary.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Diagnosis */}
                    <div>
                      <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700">
                        Diagnóstico
                      </label>
                      <div className="mt-1">
                        <textarea
                          {...register('diagnosis')}
                          id="diagnosis"
                          rows={3}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Diagnóstico médico..."
                        />
                      </div>
                    </div>

                    {/* Prescription */}
                    <div>
                      <label htmlFor="prescription" className="block text-sm font-medium text-gray-700">
                        Prescrição/Tratamento
                      </label>
                      <div className="mt-1">
                        <textarea
                          {...register('prescription')}
                          id="prescription"
                          rows={3}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Medicação, instruções..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Urgency Level */}
                    <div>
                      <label htmlFor="urgency_level" className="block text-sm font-medium text-gray-700">
                        Nível de Urgência
                      </label>
                      <div className="mt-1">
                        <select
                          {...register('urgency_level')}
                          id="urgency_level"
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        >
                          <option value="low">Baixa</option>
                          <option value="medium">Média</option>
                          <option value="high">Alta</option>
                          <option value="critical">Crítica</option>
                        </select>
                      </div>
                    </div>

                    {/* Privacy */}
                    <div className="flex items-center pt-6">
                      <input
                        {...register('is_private')}
                        id="is_private"
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_private" className="ml-2 block text-sm text-gray-900">
                        Nota privada (acesso restrito)
                      </label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? 'A guardar...' : 'Guardar Nota'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Clinical Notes List */}
            <div className="space-y-6">
              {filteredNotes.length === 0 ? (
                <div className="bg-white shadow rounded-lg p-6 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {selectedView === 'private' ? 'Nenhuma nota privada encontrada' : 'Nenhuma nota clínica encontrada'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'Tente ajustar os termos de pesquisa.' : 'As notas aparecerão aqui quando criadas.'}
                  </p>
                </div>
              ) : (
                filteredNotes.map((note) => (
                  <div key={note.id} className="bg-white shadow rounded-lg">
                    {editingNote === note.id ? (
                      /* Edit Form */
                      <div className="p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                          <Edit className="h-5 w-5 mr-2" />
                          Editar Nota Clínica
                        </h3>
                        
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                          {/* Summary */}
                          <div>
                            <label htmlFor="edit_summary" className="block text-sm font-medium text-gray-700">
                              Resumo/Observações *
                            </label>
                            <div className="mt-1">
                              <textarea
                                {...register('summary')}
                                id="edit_summary"
                                rows={4}
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              />
                              {errors.summary && (
                                <p className="mt-2 text-sm text-red-600">{errors.summary.message}</p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Diagnosis */}
                            <div>
                              <label htmlFor="edit_diagnosis" className="block text-sm font-medium text-gray-700">
                                Diagnóstico
                              </label>
                              <div className="mt-1">
                                <textarea
                                  {...register('diagnosis')}
                                  id="edit_diagnosis"
                                  rows={3}
                                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                />
                              </div>
                            </div>

                            {/* Prescription */}
                            <div>
                              <label htmlFor="edit_prescription" className="block text-sm font-medium text-gray-700">
                                Prescrição/Tratamento
                              </label>
                              <div className="mt-1">
                                <textarea
                                  {...register('prescription')}
                                  id="edit_prescription"
                                  rows={3}
                                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Urgency Level */}
                            <div>
                              <label htmlFor="edit_urgency" className="block text-sm font-medium text-gray-700">
                                Nível de Urgência
                              </label>
                              <div className="mt-1">
                                <select
                                  {...register('urgency_level')}
                                  id="edit_urgency"
                                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                >
                                  <option value="low">Baixa</option>
                                  <option value="medium">Média</option>
                                  <option value="high">Alta</option>
                                  <option value="critical">Crítica</option>
                                </select>
                              </div>
                            </div>

                            {/* Privacy */}
                            <div className="flex items-center pt-6">
                              <input
                                {...register('is_private')}
                                id="edit_private"
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label htmlFor="edit_private" className="ml-2 block text-sm text-gray-900">
                                Nota privada (acesso restrito)
                              </label>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex justify-end space-x-3">
                            <button
                              type="button"
                              onClick={cancelEditing}
                              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              disabled={saving}
                              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                              <Save className="mr-2 h-4 w-4" />
                              {saving ? 'A guardar...' : 'Atualizar Nota'}
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      /* Display Note */
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="text-sm text-gray-500">
                              {formatDateTime(note.created_at)}
                            </div>
                            {getUrgencyBadge(note.urgency_level || 'low')}
                            {note.is_private && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                <EyeOff className="h-3 w-3 mr-1" />
                                Privada
                              </span>
                            )}
                            {note.versions && note.versions.length > 0 && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                <History className="h-3 w-3 mr-1" />
                                v{note.versions.length + 1}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {note.versions && note.versions.length > 0 && (
                              <button
                                onClick={() => setSelectedNoteHistory(selectedNoteHistory === note.id ? null : note.id)}
                                className="text-gray-400 hover:text-gray-600"
                                title="Ver histórico"
                              >
                                <History className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => startEditingNote(note)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteNote(note.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">Resumo:</h4>
                            <p className="text-sm text-gray-700 mt-1">{note.summary}</p>
                          </div>

                          {note.diagnosis && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">Diagnóstico:</h4>
                              <p className="text-sm text-gray-700 mt-1">{note.diagnosis}</p>
                            </div>
                          )}

                          {note.prescription && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">Prescrição/Tratamento:</h4>
                              <p className="text-sm text-gray-700 mt-1">{note.prescription}</p>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                          Criado por: {note.doctor?.name || 'Médico'} • {note.doctor?.specialty || ''}
                          {note.updated_at && note.updated_at !== note.created_at && (
                            <span> • Última atualização: {formatDateTime(note.updated_at)}</span>
                          )}
                        </div>

                        {/* Version History */}
                        {selectedNoteHistory === note.id && note.versions && note.versions.length > 0 && (
                          <div className="mt-6 pt-6 border-t border-gray-200">
                            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                              <History className="h-4 w-4 mr-2" />
                              Histórico de Versões
                            </h4>
                            <div className="space-y-4">
                              {note.versions.map((version) => (
                                <div key={version.id} className="bg-gray-50 rounded-md p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-900">
                                      Versão {version.version_number}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {formatDateTime(version.created_at)}
                                    </span>
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="font-medium text-gray-900">Resumo:</span>
                                      <p className="text-gray-700">{version.summary}</p>
                                    </div>
                                    {version.diagnosis && (
                                      <div>
                                        <span className="font-medium text-gray-900">Diagnóstico:</span>
                                        <p className="text-gray-700">{version.diagnosis}</p>
                                      </div>
                                    )}
                                    {version.prescription && (
                                      <div>
                                        <span className="font-medium text-gray-900">Prescrição:</span>
                                        <p className="text-gray-700">{version.prescription}</p>
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-2 text-xs text-gray-500">
                                    Por: {version.doctor?.name} - {version.doctor?.specialty}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 