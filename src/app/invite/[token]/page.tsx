'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase, UserInvite } from '@/lib/supabase'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'

const signupSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  password: z.string().min(6, 'Password deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirmação de password é obrigatória')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords não coincidem",
  path: ["confirmPassword"],
})

type SignupFormData = z.infer<typeof signupSchema>

export default function InviteAcceptPage() {
  const [invite, setInvite] = useState<UserInvite | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()
  const params = useParams()
  const token = params.token as string

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema)
  })

  useEffect(() => {
    if (token) {
      fetchInvite()
    }
  }, [token])

  const fetchInvite = async () => {
    try {
      const { data, error } = await supabase
        .from('user_invites')
        .select('*')
        .eq('token', token)
        .eq('accepted', false)
        .single()

      if (error) throw error

      // Check if invite is expired
      if (new Date(data.expires_at) < new Date()) {
        throw new Error('Convite expirado')
      }

      setInvite(data)
    } catch (error: any) {
      console.error('Error fetching invite:', error)
      alert(error.message === 'Convite expirado' ? 
        'Este convite expirou. Contacte o administrador para um novo convite.' :
        'Convite inválido ou já utilizado.'
      )
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: SignupFormData) => {
    if (!invite) return

    setCreating(true)
    
    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invite.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            role: invite.role
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([{
            user_id: authData.user.id,
            role: invite.role,
            name: data.name,
            email: invite.email
          }])

        if (profileError) throw profileError

        // If user is a doctor, create doctor record
        if (invite.role === 'doctor' || invite.role === 'admin_doctor') {
          const { error: doctorError } = await supabase
            .from('doctors')
            .insert([{
              user_id: authData.user.id,
              name: data.name,
              specialty: 'A definir', // User can update later
              active: true,
              approved: true
            }])

          if (doctorError) throw doctorError
        }

        // Mark invite as accepted
        const { error: inviteError } = await supabase
          .from('user_invites')
          .update({ accepted: true })
          .eq('id', invite.id)

        if (inviteError) throw inviteError

        alert('Conta criada com sucesso! Verifique o seu email para confirmar a conta.')
        router.push('/login')
      }
    } catch (error: any) {
      console.error('Error creating account:', error)
      
      let errorMessage = 'Erro ao criar conta'
      if (error.message?.includes('email')) {
        errorMessage = 'Este email já está registado'
      } else if (error.message) {
        errorMessage += `: ${error.message}`
      }
      
      alert(errorMessage)
    } finally {
      setCreating(false)
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

  const getRoleDescription = (role: string) => {
    const descriptions = {
      admin: 'Gestão de utilizadores, convites e configurações do sistema',
      doctor: 'Acesso a dados clínicos, consultas e registos médicos',
      admin_doctor: 'Todas as permissões: gestão do sistema e acesso clínico'
    }
    return descriptions[role as keyof typeof descriptions] || ''
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-8"></div>
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!invite) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Convite Inválido</h2>
            <p className="mt-2 text-sm text-gray-600">
              Este convite não é válido ou já foi utilizado.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <UserPlus className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Aceitar Convite
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Criar a sua conta no Sistema MTC
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Invite Info */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center">
              <Mail className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-900">{invite.email}</span>
            </div>
            <div className="mt-2">
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                {getRoleLabel(invite.role)}
              </span>
            </div>
            <p className="mt-2 text-xs text-blue-700">
              {getRoleDescription(invite.role)}
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nome Completo *
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('name')}
                  type="text"
                  id="name"
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="O seu nome completo"
                />
              </div>
              {errors.name && (
                <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password *
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="appearance-none block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Mínimo 6 caracteres"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmar Password *
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  className="appearance-none block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Repetir a password"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              {errors.confirmPassword && (
                <p className="mt-2 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={creating}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {creating ? 'A criar conta...' : 'Criar Conta'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="text-center text-xs text-gray-500">
              Ao criar uma conta, aceita os termos de uso do sistema.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 