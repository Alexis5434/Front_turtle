import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getTables, setTableOcupado, type Table } from '@/features/tables/api/tables-api'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/tables')({
  beforeLoad: () => {
    if (!useAuthStore.getState().token) {
      throw redirect({ to: '/login' })
    }
  },
  component: TablesPage,
})

function TablesPage() {
  const token = useAuthStore((s) => s.token)!
  const navigate = useNavigate()
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getTables(token)
      .then((data) => {
        if (!cancelled) setTables(data)
      })
      .catch((err: Error) => {
        if (!cancelled) {
          if (err.message.includes('401')) void navigate({ to: '/login' })
          else setError(err.message)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, navigate])

  async function handleToggle(table: Table) {
    setToggling(table.numero_mesa)
    try {
      const updated = await setTableOcupado(table.numero_mesa, !table.ocupado, token)
      setTables((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      )
    } catch (err) {
      alert(`Error al actualizar la mesa: ${(err as Error).message}`)
    } finally {
      setToggling(null)
    }
  }

  return (
    <section aria-labelledby="tables-title">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 id="tables-title" className="text-2xl font-bold text-foreground">
            Gestión de Mesas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta el estado de cada mesa y cambia su ocupación.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
            Libre
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
            Ocupada
          </span>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-lg border border-border bg-muted"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <strong>Error al cargar las mesas:</strong> {error}
          {error.includes('401') && (
            <p className="mt-1 text-xs">
              No tienes sesión activa. Inicia sesión para ver las mesas.
            </p>
          )}
        </div>
      )}

      {!loading && !error && tables.length === 0 && (
        <p className="text-center text-muted-foreground">No hay mesas registradas.</p>
      )}

      {!loading && !error && tables.length > 0 && (
        <>
          {/* Group by floor */}
          {(['piso_1', 'piso_2'] as const).map((piso) => {
            const floorTables = tables.filter((t) => t.piso === piso)
            if (floorTables.length === 0) return null
            return (
              <div key={piso} className="mb-8">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {piso === 'piso_1' ? 'Piso 1' : 'Piso 2'}
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {floorTables.map((table) => (
                    <TableCard
                      key={table.id}
                      table={table}
                      isToggling={toggling === table.numero_mesa}
                      onToggle={() => handleToggle(table)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </>
      )}
    </section>
  )
}

interface TableCardProps {
  table: Table
  isToggling: boolean
  onToggle: () => void
}

function TableCard({ table, isToggling, onToggle }: TableCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-between rounded-lg border p-4 shadow-sm transition-all',
        table.ocupado
          ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20'
          : 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20',
      )}
    >
      {/* Status dot */}
      <span
        className={cn(
          'mb-3 inline-block h-3 w-3 rounded-full',
          table.ocupado ? 'bg-red-500' : 'bg-green-500',
        )}
        aria-hidden="true"
      />

      {/* Table number */}
      <p className="text-3xl font-bold text-foreground">#{table.numero_mesa}</p>

      {/* Capacity */}
      <p className="mt-1 text-xs text-muted-foreground">
        {table.capacidad} {table.capacidad === 1 ? 'persona' : 'personas'}
      </p>

      {/* Status label */}
      <p
        className={cn(
          'mt-2 rounded-full px-2 py-0.5 text-xs font-semibold',
          table.ocupado
            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
            : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
        )}
      >
        {table.ocupado ? 'Ocupada' : 'Libre'}
      </p>

      {/* Toggle button */}
      <Button
        className="mt-4 w-full"
        size="sm"
        variant={table.ocupado ? 'destructive' : 'default'}
        disabled={isToggling}
        onClick={onToggle}
        aria-label={
          table.ocupado
            ? `Liberar mesa ${table.numero_mesa}`
            : `Marcar mesa ${table.numero_mesa} como ocupada`
        }
      >
        {isToggling ? 'Actualizando…' : table.ocupado ? 'Liberar' : 'Ocupar'}
      </Button>
    </div>
  )
}
