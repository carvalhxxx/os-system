import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ClipboardList, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

// ─── Register ─────────────────────────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    const { error } = await signUp(data.email, data.password)
    if (error) {
      toast.error(error.message || 'Erro ao criar conta')
      return
    }
    toast.success('Conta criada! Verifique seu email.')
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 dark:bg-slate-900">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">OS Manager</h1>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Criar conta</h2>
        <p className="text-gray-500 dark:text-slate-400 text-sm mb-8">
          Já tem conta?{' '}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">Fazer login</Link>
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input {...register('email')} type="email" placeholder="seu@email.com" className="input-field pl-9" />
            </div>
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                {...register('password')}
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                className="input-field pl-9 pr-9"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <div>
            <label className="label">Confirmar senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input {...register('confirmPassword')} type="password" placeholder="••••••••" className="input-field pl-9" />
            </div>
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-2.5">
            {isSubmitting ? 'Criando...' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Recover Password ──────────────────────────────────────────────────────
const recoverSchema = z.object({
  email: z.string().email('Email inválido'),
})

type RecoverForm = z.infer<typeof recoverSchema>

export function RecoverPasswordPage() {
  const { resetPassword } = useAuth()
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RecoverForm>({
    resolver: zodResolver(recoverSchema),
  })

  const onSubmit = async (data: RecoverForm) => {
    const { error } = await resetPassword(data.email)
    if (error) {
      toast.error('Erro ao enviar email')
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 dark:bg-slate-900">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Email enviado!</h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">
            Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
          </p>
          <Link to="/login" className="btn-primary justify-center">Voltar ao login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 dark:bg-slate-900">
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Recuperar senha</h2>
        <p className="text-gray-500 dark:text-slate-400 text-sm mb-8">
          <Link to="/login" className="text-blue-600 hover:underline">← Voltar ao login</Link>
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input {...register('email')} type="email" placeholder="seu@email.com" className="input-field pl-9" />
            </div>
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-2.5">
            {isSubmitting ? 'Enviando...' : 'Enviar link de recuperação'}
          </button>
        </form>
      </div>
    </div>
  )
}
