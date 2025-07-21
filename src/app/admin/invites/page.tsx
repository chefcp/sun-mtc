'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { supabase, UserInvite } from '@/lib/supabase'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Send, ArrowLeft, Mail, Clock, Check, X, Copy } from 'lucide-react'
import Link from 'next/link'

const inviteSchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'doctor', 'admin_doctor'], {
    required_error: 'Tipo de utilizador é obrigatório'
  })
})

type InviteFormData = z.infer<typeof inviteSchema>

export default function InvitesPage() {
  const [invites, setInvites] = useState<UserInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema)
  })

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        router.push('/login')
        return
      }

      setCurrentUser(user)

      // Check if user is admin
      const isAdmin = user.email?.includes('admin') || user.email === 'edurandrade@gmail.com'
      
      if (!isAdmin) {
        alert('Acesso negado. Apenas administradores podem enviar convites.')
        router.push('/dashboard')
        return
      }

      fetchInvites()
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/dashboard')
    }
  }

  const fetchInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('user_invites')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvites(data || [])
    } catch (error) {
      console.error('Error fetching invites:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateInviteToken = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  const onSubmit = async (data: InviteFormData) => {
    setSending(true)
    
    try {
      // Check if email already has an active invite
      const { data: existingInvite } = await supabase
        .from('user_invites')
        .select('*')
        .eq('email', data.email)
        .eq('accepted', false)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (existingInvite) {
        alert('Este email já tem um convite pendente.')
        setSending(false)
        return
      }

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', data.email)
        .single()

      if (existingUser) {
        alert('Este email já está registado no sistema.')
        setSending(false)
        return
      }

      // Generate invite token and expiration (7 days)
      const token = generateInviteToken()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      // Create invite record
      const inviteData = {
        email: data.email,
        role: data.role,
        invited_by: currentUser.id,
        token: token,
        expires_at: expiresAt.toISOString(),
        accepted: false
      }

      const { error } = await supabase
        .from('user_invites')
        .insert([inviteData])

      if (error) throw error

      // Here you would normally send an email with the invite link
      // For now, we'll show the invite link
      const inviteLink = `${window.location.origin}/invite/${token}`
      
      alert(`Convite criado com sucesso!\n\nLink do convite (válido por 7 dias):\n${inviteLink}\n\nEnvie este link para ${data.email}`)

      reset()
      fetchInvites()
    } catch (error: any) {
      console.error('Error creating invite:', error)
      alert(`Erro ao criar convite: ${error.message || 'Erro desconhecido'}`)
    } finally {
      setSending(false)
    }
  }

  const copyInviteLink = (token: string) => {
    const inviteLink = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(inviteLink)
    alert('Link copiado para o clipboard!')
  }

  const revokeInvite = async (inviteId: string) => {
    if (!confirm('Tem certeza que deseja revogar este convite?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('user_invites')
        .delete()
        .eq('id', inviteId)

      if (error) throw error

      fetchInvites()
      alert('Convite revogado com sucesso.')
    } catch (error) {
      console.error('Error revoking invite:', error)
      alert('Erro ao revogar convite.')
    }
  }

  const getRoleLabel = (role: string) => {
    const labels = {
      admin: 'Administrador',
      doctor: 'Médico',
      admin_doctor: 'Médico + Administrador'
    }
    return labels[role as keyof typeof labels] || role
  }

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      doctor: 'bg-blue-100 text-blue-800',
      admin_doctor: 'bg-green-100 text-green-800'
    }
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-8"></div>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded"></div>
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Convites de Utilizadores
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Convidar novos utilizadores para o sistema
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Link
              href="/admin"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Invite Form */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Enviar Convite
                </h3>
                
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email *
                    </label>
                    <div className="mt-1">
                      <input
                        {...register('email')}
                        type="email"
                        id="email"
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="email@exemplo.com"
                      />
                      {errors.email && (
                        <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                      Tipo de Utilizador *
                    </label>
                    <div className="mt-1">
                      <select
                        {...register('role')}
                        id="role"
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      >
                        <option value="">Selecionar tipo...</option>
                        <option value="admin">Administrador</option>
                        <option value="doctor">Médico</option>
                        <option value="admin_doctor">Médico + Administrador</option>
                      </select>
                      {errors.role && (
                        <p className="mt-2 text-sm text-red-600">{errors.role.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Role Descriptions */}
                  <div className="text-xs text-gray-500 space-y-1">
                    <p><strong>Administrador:</strong> Gestão de utilizadores, convites e sistema</p>
                    <p><strong>Médico:</strong> Acesso a dados clínicos e notas médicas</p>
                    <p><strong>Médico + Admin:</strong> Todas as permissões</p>
                  </div>

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {sending ? 'A enviar...' : 'Enviar Convite'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Invites List */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Convites Enviados
                </h3>

                {invites.length === 0 ? (
                  <div className="text-center py-12">
                    <Mail className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum convite enviado</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Comece por enviar o seu primeiro convite.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {invites.map((invite) => (
                      <div key={invite.id} className={`border rounded-lg p-4 ${
                        invite.accepted ? 'border-green-200 bg-green-50' :
                        isExpired(invite.expires_at) ? 'border-red-200 bg-red-50' :
                        'border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {invite.email}
                              </p>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(invite.role)}`}>
                                {getRoleLabel(invite.role)}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                Enviado em {formatDate(invite.created_at)}
                              </span>
                              <span>
                                Expira em {formatDate(invite.expires_at)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {invite.accepted ? (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                <Check className="h-3 w-3 mr-1" />
                                Aceite
                              </span>
                            ) : isExpired(invite.expires_at) ? (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                <X className="h-3 w-3 mr-1" />
                                Expirado
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => copyInviteLink(invite.token)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Copiar Link"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => revokeInvite(invite.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Revogar"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 