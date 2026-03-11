import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ClipboardList, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    const { error } = await signIn(data.email, data.password)
    if (error) {
      toast.error('Email ou senha incorretos')
      return
    }
    toast.success('Bem-vindo!')
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-slate-900">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white" />
          <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-white" />
        </div>
        <div className="relative text-center text-white">
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <ClipboardList className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-3">OS Manager</h1>
          <p className="text-blue-100 text-lg max-w-xs">
            Gerencie suas ordens de serviço de forma eficiente e profissional.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            {[
              { value: '100%', label: 'Seguro' },
              { value: 'RLS', label: 'Protegido' },
              { value: '24/7', label: 'Disponível' },
            ].map(item => (
              <div key={item.label}>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-blue-200 text-sm">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">OS Manager</h1>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Entrar na conta
            </h2>
            <p className="text-gray-500 dark:text-slate-400 text-sm mb-8">
              Não tem conta?{' '}
              <Link to="/registro" className="text-blue-600 hover:underline font-medium">
                Cadastre-se
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="seu@email.com"
                  className="input-field pl-9"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Senha</label>
                <Link to="/recuperar-senha" className="text-xs text-blue-600 hover:underline">
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input-field pl-9 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full justify-center py-2.5 text-base"
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
