import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { loginRequest, meRequest } from '@/features/auth/api/auth-api'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/login')({
  // If already authenticated, redirect away from login
  beforeLoad: () => {
    const token = useAuthStore.getState().token
    if (token) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const setSession = useAuthStore((s) => s.setSession)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { access_token } = await loginRequest({ email, password })
      const user = await meRequest(access_token)
      setSession(access_token, user)
      await router.navigate({ to: '/' })
    } catch (err: unknown) {
      const msg = (err as Error).message
      if (msg.includes('401')) {
        setError('Correo o contraseña incorrectos.')
      } else {
        setError(`Error: ${msg}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
        {/* Logo / title */}
        <div className="mb-6 text-center">
          <span className="text-4xl">🐢</span>
          <h1 className="mt-2 text-2xl font-bold text-foreground">TURTLE</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ingresa con tus credenciales de trabajador
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mozo@turtle.pe"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <Button type="submit" className="mt-2 w-full" disabled={loading}>
            {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </Button>
        </form>
      </div>
    </div>
  )
}
