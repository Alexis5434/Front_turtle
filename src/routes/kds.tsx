import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowsClockwise,
  CheckCircle,
  Clock,
  CookingPot,
  Gear,
  ListChecks,
  PlusCircle,
  ArrowCounterClockwise,
  SquaresFour,
  Columns,
  Sparkle,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import {
  createKitchenMovement,
  getComandas,
  updateComandaListo,
  type KdsComanda,
  type KdsDetalleComanda,
  type MovimientoEstado,
} from '@/features/kds/api/kds-api'
import {
  buildInitialDemoComandas,
  calculateAvgPrepTimeMinutes,
  calculateProductionSummary,
  CATEGORY_LABELS,
  ORDER_TYPE_LABELS,
  type ChefPinColor,
  type KdsLayoutMode,
  type KdsTimingConfig,
  type KdsViewMode,
  type OrderTypeFilter,
  type StationFilter,
} from '@/features/kds/logic/kds-logic'
import { KdsTicketCard } from '@/features/kds/components/kds-ticket-card'
import { KdsExpoView } from '@/features/kds/components/kds-expo-view'
import {
  KdsSettingsModal,
  KdsSimulatorModal,
} from '@/features/kds/components/kds-modals'

export const Route = createFileRoute('/kds')({
  component: KdsPage,
})

interface UndoToastState {
  comandaId: number
  codigo: string
}

function KdsPage() {
  const token = useAuthStore((s) => s.token)
  const queryClient = useQueryClient()

  // Reloj en tiempo real que actualiza los cronómetros cada 1 segundo (Videos 1, 2 y 3)
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Estado de comandas locales para Modo Simulación / Demo interactivo
  const [demoComandas, setDemoComandas] = useState<KdsComanda[]>(() =>
    buildInitialDemoComandas(Date.now()),
  )
  const [useDemoMode, setUseDemoMode] = useState<boolean>(!token)

  // Filtros y vistas (Lycaios + Clover KDS + TicknCook)
  const [viewMode, setViewMode] = useState<KdsViewMode>('COCINA')
  const [stationFilter, setStationFilter] = useState<StationFilter>('TODAS')
  const [orderTypeFilter, setOrderTypeFilter] =
    useState<OrderTypeFilter>('TODOS')
  const [layoutMode, setLayoutMode] = useState<KdsLayoutMode>('GRID_10')
  const [timingConfig, setTimingConfig] = useState<KdsTimingConfig>({
    warningMinutes: 5,
    delayedMinutes: 10,
  })

  // Pines de color por comanda (Estilo TicknCook)
  const [pinColors, setPinColors] = useState<Record<number, ChefPinColor>>({
    101: 'red',
    102: 'blue',
  })

  // Modales y Toast de "Deshacer (Undo)" estilo Clover KDS
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showSimulatorModal, setShowSimulatorModal] = useState(false)
  const [undoToast, setUndoToast] = useState<UndoToastState | null>(null)

  // Consumo de API con TanStack Query (cuando hay sesión activa y no está en modo demo)
  const comandasQuery = useQuery({
    queryKey: ['kds-comandas', token],
    queryFn: () => getComandas(token!),
    enabled: Boolean(token) && !useDemoMode,
    refetchInterval: 5000,
  })

  const movementMutation = useMutation({
    mutationFn: (vars: {
      itemId: number
      estado: MovimientoEstado
      quantity: number
    }) => createKitchenMovement(token!, vars),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kds-comandas'] })
    },
  })

  const updateListoMutation = useMutation({
    mutationFn: (vars: { comandaId: number; listo: boolean }) =>
      updateComandaListo(token!, vars),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kds-comandas'] })
    },
  })

  // Fuente unificada de comandas (API real o Simulación Interactiva)
  const allComandas: KdsComanda[] = useMemo(() => {
    if (!useDemoMode && comandasQuery.data && comandasQuery.data.length > 0) {
      return comandasQuery.data
    }
    return demoComandas
  }, [useDemoMode, comandasQuery.data, demoComandas])

  // Filtrado por estación y tipo de pedido
  const filteredComandas = useMemo(() => {
    return allComandas.filter((comanda) => {
      if (
        orderTypeFilter !== 'TODOS' &&
        comanda.pedido.tipo !== orderTypeFilter
      ) {
        return false
      }
      if (stationFilter !== 'TODAS') {
        const hasStationItems = comanda.detalles.some(
          (d) => d.plato.categoria === stationFilter,
        )
        if (!hasStationItems) return false
      }
      return true
    })
  }, [allComandas, orderTypeFilter, stationFilter])

  // Ordenar las activas por antigüedad (FIFO: las más antiguas primero)
  const activeComandas = useMemo(
    () =>
      filteredComandas
        .filter((c) => !c.listo)
        .sort(
          (a, b) =>
            new Date(a.fecha_hora_emision).getTime() -
            new Date(b.fecha_hora_emision).getTime(),
        ),
    [filteredComandas],
  )

  const readyComandas = useMemo(
    () =>
      filteredComandas
        .filter((c) => c.listo)
        .sort(
          (a, b) =>
            new Date(b.fecha_hora_listo ?? b.fecha_hora_emision).getTime() -
            new Date(a.fecha_hora_listo ?? a.fecha_hora_emision).getTime(),
        ),
    [filteredComandas],
  )

  const avgPrepMinutes = useMemo(
    () => calculateAvgPrepTimeMinutes(allComandas),
    [allComandas],
  )

  const productionSummary = useMemo(
    () => calculateProductionSummary(allComandas, stationFilter),
    [allComandas, stationFilter],
  )

  // Acciones sobre platillos y comandas
  function handleToggleItemState(
    comandaId: number,
    detalle: KdsDetalleComanda,
    nextState: MovimientoEstado,
  ) {
    if (!useDemoMode && token && comandasQuery.data?.length) {
      movementMutation.mutate({
        itemId: detalle.id,
        estado: nextState,
        quantity: detalle.cantidad,
      })
      return
    }

    setDemoComandas((prev) =>
      prev.map((c) => {
        if (c.id !== comandaId) return c
        return {
          ...c,
          detalles: c.detalles.map((d) => {
            if (d.id !== detalle.id) return d
            return {
              ...d,
              movimientos: [
                ...d.movimientos,
                {
                  id: Date.now(),
                  fecha_hora: new Date().toISOString(),
                  estado_platillo: nextState,
                  cantidad: d.cantidad,
                  id_detalle_comanda: d.id,
                },
              ],
            }
          }),
        }
      }),
    )
  }

  function handleMarkAllItemsReady(
    comandaId: number,
    detalles: KdsDetalleComanda[],
  ) {
    const targetIds = new Set(detalles.map((d) => d.id))

    if (!useDemoMode && token && comandasQuery.data?.length) {
      for (const d of detalles) {
        movementMutation.mutate({
          itemId: d.id,
          estado: 'terminado',
          quantity: d.cantidad,
        })
      }
      return
    }

    setDemoComandas((prev) =>
      prev.map((c) => {
        if (c.id !== comandaId) return c
        return {
          ...c,
          detalles: c.detalles.map((d) => {
            if (!targetIds.has(d.id)) return d
            return {
              ...d,
              movimientos: [
                ...d.movimientos,
                {
                  id: Date.now() + d.id,
                  fecha_hora: new Date().toISOString(),
                  estado_platillo: 'terminado',
                  cantidad: d.cantidad,
                  id_detalle_comanda: d.id,
                },
              ],
            }
          }),
        }
      }),
    )
  }

  function handleCompleteComanda(comanda: KdsComanda) {
    if (!useDemoMode && token && comandasQuery.data?.length) {
      updateListoMutation.mutate({ comandaId: comanda.id, listo: true })
    } else {
      setDemoComandas((prev) =>
        prev.map((c) =>
          c.id === comanda.id
            ? {
                ...c,
                listo: true,
                fecha_hora_listo: new Date().toISOString(),
              }
            : c,
        ),
      )
    }

    // Mostrar Toast con opción "Undo" estilo Clover KDS (Video 2)
    setUndoToast({ comandaId: comanda.id, codigo: comanda.codigo })
  }

  function handleReopenComanda(comanda: KdsComanda) {
    if (!useDemoMode && token && comandasQuery.data?.length) {
      updateListoMutation.mutate({ comandaId: comanda.id, listo: false })
    } else {
      setDemoComandas((prev) =>
        prev.map((c) =>
          c.id === comanda.id
            ? {
                ...c,
                listo: false,
                fecha_hora_listo: null,
              }
            : c,
        ),
      )
    }
    setUndoToast(null)
  }

  function handleUndoLastComplete() {
    if (!undoToast) return
    const target = allComandas.find((c) => c.id === undoToast.comandaId)
    if (target) {
      handleReopenComanda(target)
    }
    setUndoToast(null)
  }

  function handleDismissReadyComanda(comandaId: number) {
    setDemoComandas((prev) => prev.filter((c) => c.id !== comandaId))
  }

  function handleCreateSimulatedComanda(newComanda: KdsComanda) {
    setUseDemoMode(true)
    setDemoComandas((prev) => [newComanda, ...prev])
    setViewMode('COCINA')
  }

  const stationDisplayName =
    stationFilter === 'TODAS'
      ? 'COCINA GENERAL'
      : CATEGORY_LABELS[stationFilter].toUpperCase()

  const displayedTickets =
    viewMode === 'TERMINADAS' ? readyComandas : activeComandas

  // Casillas vacías para completar la cuadrícula de 8/10 espacios estilo Clover KDS
  const emptyGridSlotsCount =
    layoutMode === 'GRID_10' ? Math.max(0, 8 - displayedTickets.length) : 0

  return (
    <section
      aria-labelledby="kds-main-title"
      className="-mx-4 -my-8 flex min-h-[calc(100vh-8rem)] flex-col bg-slate-950 text-slate-100"
    >
      {/* 1. BARRA SUPERIOR KDS (Combinación de Lycaios + Clover KDS + TicknCook) */}
      <header className="border-b border-slate-800 bg-slate-900 px-4 py-3 shadow-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          {/* Izquierda: Estación activa + Avg Prep Time (Clover KDS) */}
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow">
              <CookingPot className="size-6" weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  id="kds-main-title"
                  className="text-base font-extrabold tracking-tight text-white sm:text-lg"
                >
                  KDS — {stationDisplayName}
                </h1>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-[11px]">
                  {viewMode === 'TERMINADAS'
                    ? 'Historial Listas'
                    : viewMode === 'PASE'
                      ? 'Modo Pase / Expo'
                      : 'Tickets Activos'}
                </Badge>
              </div>
              <p className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="size-3.5 text-emerald-400" />
                <span>
                  Tiempo prom. preparación:{' '}
                  <strong className="text-emerald-300">
                    {avgPrepMinutes} min
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Semáforo:{' '}
                  <span className="text-amber-300 font-semibold">
                    {timingConfig.warningMinutes}m
                  </span>{' '}
                  /{' '}
                  <span className="text-rose-400 font-semibold">
                    {timingConfig.delayedMinutes}m
                  </span>
                </span>
              </p>
            </div>
          </div>

          {/* Centro: Contador de Tickets y Selector de Vistas */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 p-1">
            <button
              type="button"
              onClick={() => setViewMode('COCINA')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition',
                viewMode === 'COCINA'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white',
              )}
            >
              <CookingPot className="size-4" weight="bold" />
              <span>Activas ({activeComandas.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('PASE')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition',
                viewMode === 'PASE'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white',
              )}
            >
              <ListChecks className="size-4" weight="bold" />
              <span>Pase / Entrega</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('TERMINADAS')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition',
                viewMode === 'TERMINADAS'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white',
              )}
            >
              <CheckCircle className="size-4" weight="bold" />
              <span>Listas ({readyComandas.length})</span>
            </button>
          </div>

          {/* Derecha: Simulador de comanda, Actualizar y Configuración */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => setShowSimulatorModal(true)}
              className="rounded-lg bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-500"
            >
              <PlusCircle className="mr-1 size-4" weight="bold" />
              + Simular Comanda
            </Button>

            {token && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setUseDemoMode((prev) => !prev)}
                className="rounded-lg border-slate-700 bg-slate-800 text-xs text-slate-200 hover:bg-slate-700"
              >
                <Sparkle className="mr-1 size-3.5 text-amber-400" weight="fill" />
                {useDemoMode ? 'Modo Demo' : 'API en Vivo'}
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!useDemoMode && token) {
                  void comandasQuery.refetch()
                } else {
                  setNowMs(Date.now())
                }
              }}
              title="Actualizar comandas"
              className="rounded-lg border-slate-700 bg-slate-800 text-xs text-slate-200 hover:bg-slate-700"
            >
              <ArrowsClockwise className="size-4" weight="bold" />
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSettingsModal(true)}
              className="rounded-lg border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              <Gear className="mr-1 size-4 text-sky-400" weight="bold" />
              Estación y Tiempos
            </Button>
          </div>
        </div>

        {/* Sub-barra de filtros rápidos por Estación (Cocina / Fríos / Postres / Barra) y Tipo de Pedido */}
        <div className="mx-auto mt-3 flex max-w-7xl flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5">
          {/* Estaciones */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Estación:
            </span>
            {(
              [
                { id: 'TODAS', label: 'Todas' },
                { id: 'principal', label: 'Cocina Principal' },
                { id: 'entrada', label: 'Entradas / Fríos' },
                { id: 'postre', label: 'Postres' },
                { id: 'refresco', label: 'Barra / Refrescos' },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStationFilter(st.id)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-semibold transition',
                  stationFilter === st.id
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
                )}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Filtro por Tipo de Pedido (Salón / Para llevar / Delivery) + Selector de Layout */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Canal:
              </span>
              {(
                [
                  { id: 'TODOS', label: 'Todos' },
                  { id: 'local', label: ORDER_TYPE_LABELS.local },
                  { id: 'para_llevar', label: ORDER_TYPE_LABELS.para_llevar },
                  { id: 'delivery', label: ORDER_TYPE_LABELS.delivery },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setOrderTypeFilter(t.id)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-semibold transition',
                    orderTypeFilter === t.id
                      ? 'bg-indigo-500 text-white font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {viewMode !== 'PASE' && (
              <div className="flex items-center rounded-md border border-slate-800 bg-slate-950 p-0.5">
                <button
                  type="button"
                  onClick={() => setLayoutMode('GRID_10')}
                  title="Vista Cuadrícula Clover KDS"
                  className={cn(
                    'rounded p-1 transition',
                    layoutMode === 'GRID_10'
                      ? 'bg-slate-800 text-sky-400'
                      : 'text-slate-500 hover:text-slate-300',
                  )}
                >
                  <SquaresFour className="size-4" weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode('COLUMNAS')}
                  title="Vista Columnas TicknCook"
                  className={cn(
                    'rounded p-1 transition',
                    layoutMode === 'COLUMNAS'
                      ? 'bg-slate-800 text-emerald-400'
                      : 'text-slate-500 hover:text-slate-300',
                  )}
                >
                  <Columns className="size-4" weight="bold" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* TOAST DE CONFIRMACIÓN CON BOTÓN "DESHACER (UNDO)" (Video 2 Clover KDS) */}
      {undoToast && (
        <div
          role="status"
          aria-live="polite"
          className="mx-auto mt-3 flex w-full max-w-7xl items-center justify-between rounded-lg border border-emerald-400/50 bg-emerald-500 px-4 py-2.5 text-slate-950 shadow-lg"
        >
          <div className="flex items-center gap-2 text-sm font-extrabold">
            <CheckCircle className="size-5" weight="fill" />
            <span>
              Comanda #{undoToast.codigo} marcada como lista para entregar.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              onClick={handleUndoLastComplete}
              className="rounded bg-slate-950 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
            >
              <ArrowCounterClockwise className="mr-1 size-3.5" weight="bold" />
              Deshacer (Undo)
            </Button>
            <button
              type="button"
              onClick={() => setUndoToast(null)}
              className="text-xs font-bold underline opacity-80 hover:opacity-100"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* 2. ÁREA CENTRAL DE COMANDAS */}
      <div className="mx-auto w-full max-w-7xl flex-1 p-4">
        {viewMode === 'PASE' ? (
          <KdsExpoView
            activeComandas={activeComandas}
            readyComandas={readyComandas}
            nowMs={nowMs}
            timingConfig={timingConfig}
            onCompleteComanda={handleCompleteComanda}
            onReopenComanda={handleReopenComanda}
            onDismissReadyComanda={handleDismissReadyComanda}
          />
        ) : (
          <div
            className={cn(
              'grid gap-4',
              layoutMode === 'GRID_10'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-start',
            )}
          >
            {displayedTickets.map((comanda) => (
              <KdsTicketCard
                key={comanda.id}
                comanda={comanda}
                nowMs={nowMs}
                timingConfig={timingConfig}
                stationFilter={stationFilter}
                pinColor={pinColors[comanda.id] ?? 'none'}
                onChangePinColor={(id, color) =>
                  setPinColors((prev) => ({ ...prev, [id]: color }))
                }
                onToggleItemState={handleToggleItemState}
                onMarkAllItemsReady={handleMarkAllItemsReady}
                onCompleteComanda={handleCompleteComanda}
                onReopenComanda={handleReopenComanda}
              />
            ))}

            {/* Casillas vacías visuales de la cuadrícula fija estilo Clover KDS (Video 2) */}
            {Array.from({ length: emptyGridSlotsCount }).map((_, idx) => (
              <div
                key={`empty-slot-${idx}`}
                aria-hidden="true"
                className="flex min-h-72 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-800/70 bg-slate-900/25 p-4 text-center text-slate-600"
              >
                <span className="font-mono text-xs uppercase tracking-widest">
                  Espacio KDS #{displayedTickets.length + idx + 1}
                </span>
                <span className="mt-1 text-[11px] text-slate-700">
                  Esperando comanda…
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. BARRA INFERIOR DE RESUMEN DE PRODUCCIÓN (Totalizador de platos estilo TicknCook Video 3) */}
      <footer className="border-t border-slate-800 bg-slate-900 px-4 py-2.5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
              Resumen de Producción (Platos por cocinar):
            </span>
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-2">
            {productionSummary.length === 0 ? (
              <span className="text-xs text-emerald-400 font-semibold">
                ✔ Todos los platillos de esta estación están terminados.
              </span>
            ) : (
              productionSummary.map((item) => (
                <div
                  key={item.menuItemId}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs"
                >
                  <span className="font-mono font-extrabold text-amber-300">
                    {item.pendingQuantity + item.inPrepQuantity}x
                  </span>
                  <span className="font-semibold text-slate-200">
                    {item.nombre}
                  </span>
                  {item.inPrepQuantity > 0 && (
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                      {item.inPrepQuantity} en fuego
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </footer>

      {/* MODALES DE CONFIGURACIÓN Y SIMULADOR */}
      <KdsSettingsModal
        open={showSettingsModal}
        stationFilter={stationFilter}
        timingConfig={timingConfig}
        layoutMode={layoutMode}
        onClose={() => setShowSettingsModal(false)}
        onSave={({ stationFilter: st, timingConfig: tc, layoutMode: lm }) => {
          setStationFilter(st)
          setTimingConfig(tc)
          setLayoutMode(lm)
        }}
      />

      <KdsSimulatorModal
        open={showSimulatorModal}
        onClose={() => setShowSimulatorModal(false)}
        onCreateComanda={handleCreateSimulatedComanda}
      />
    </section>
  )
}
