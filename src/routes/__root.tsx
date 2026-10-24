import { createRootRoute, Link, Outlet, useRouter } from '@tanstack/react-router'
import { ErrorBoundary } from '../app/error-boundary'
import { useAppStore } from '../stores/app-store'
import { useAuthStore } from '../stores/auth-store'
import { Button } from '@/components/ui/button'

export const Route = createRootRoute({
  component: RootLayout,
})

const ROLE_LABELS: Record<string, string> = {
  administrador: 'Administrador',
  jefe: 'Jefe',
  mozo: 'Mozo',
  cocinero: 'Cocinero',
  asistente_de_cocina: 'Asist. Cocina',
  almacenero: 'Almacenero',
  anfitrion: 'Anfitrión',
}

function RootLayout() {
  const appName = useAppStore((state) => state.appName)
  const { user, token, clearSession } = useAuthStore()
  const router = useRouter()

  function handleLogout() {
    clearSession()
    void router.navigate({ to: '/login' })
  }

  const isAuthenticated = !!token

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen flex-col">
        <header className="border-b border-border bg-background">
          <nav
            aria-label="Main navigation"
            className="mx-auto flex h-16 w-full max-w-5xl items-center gap-6 px-4"
          >
            {/* Brand */}
            <Link to="/" className="font-semibold text-foreground [&.active]:text-primary">
              🐢 {appName}
            </Link>

            <Link
              to="/kds"
              className="text-sm font-medium text-muted-foreground hover:text-foreground [&.active]:font-semibold [&.active]:text-primary"
            >
              Cocina (KDS)
            </Link>

            {/* Nav links – only show when authenticated */}
            {isAuthenticated && (
              <>
                <Link
                  to="/tables"
                  className="text-sm text-muted-foreground hover:text-foreground [&.active]:font-medium [&.active]:text-foreground"
                >
                  Mesas
                </Link>
                <Link
                  to="/workers"
                  className="text-sm text-muted-foreground hover:text-foreground [&.active]:font-medium [&.active]:text-foreground"
                >
                  Trabajadores
                </Link>
              </>
            )}

            {/* Spacer */}
            <span className="flex-1" />

            {/* User info + logout / login button */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-medium text-foreground leading-none">{user.email}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {ROLE_LABELS[user.rol] ?? user.rol}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={handleLogout}>
                  Cerrar sesión
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button size="sm">Iniciar sesión</Button>
              </Link>
            )}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          <Outlet />
        </main>

        <footer className="border-t border-border py-4 text-center text-sm text-muted-foreground">
          {appName} — Vite + React SPA
        </footer>
      </div>
    </ErrorBoundary>
  )
}
