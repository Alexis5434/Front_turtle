import { useState } from 'react'
import {
  CheckCircle,
  Clock,
  CookingPot,
  ForkKnife,
  Moped,
  Bag,
  User,
  WarningCircle,
  ArrowCounterClockwise,
  Check,
  Tag,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type {
  KdsComanda,
  KdsDetalleComanda,
  MovimientoEstado,
  PlatoCategoria,
} from '../api/kds-api'
import {
  areAllItemsTerminados,
  formatElapsedTimer,
  getComandaProgress,
  getItemCurrentState,
  getNextItemState,
  getTicketUrgency,
  groupDetallesByCategoria,
  ORDER_TYPE_LABELS,
  type ChefPinColor,
  type KdsTimingConfig,
  type StationFilter,
} from '../logic/kds-logic'

export interface KdsTicketCardProps {
  comanda: KdsComanda
  nowMs: number
  timingConfig: KdsTimingConfig
  stationFilter: StationFilter
  pinColor?: ChefPinColor
  onChangePinColor?: (comandaId: number, color: ChefPinColor) => void
  onToggleItemState: (
    comandaId: number,
    detalle: KdsDetalleComanda,
    nextState: MovimientoEstado,
  ) => void
  onMarkAllItemsReady: (comandaId: number, detalles: KdsDetalleComanda[]) => void
  onCompleteComanda: (comanda: KdsComanda) => void
  onReopenComanda: (comanda: KdsComanda) => void
}

const PIN_COLORS: Array<{ id: ChefPinColor; label: string; dotClass: string }> = [
  { id: 'none', label: 'Sin asignar', dotClass: 'bg-slate-400' },
  { id: 'blue', label: 'Cocinero 1 (Azul)', dotClass: 'bg-sky-500' },
  { id: 'red', label: 'Prioridad (Rojo)', dotClass: 'bg-rose-500' },
  { id: 'amber', label: 'Parrilla (Ámbar)', dotClass: 'bg-amber-400' },
  { id: 'purple', label: 'Fríos (Morado)', dotClass: 'bg-purple-500' },
  { id: 'emerald', label: 'Pase (Verde)', dotClass: 'bg-emerald-500' },
]

const PIN_BORDER_CLASSES: Record<ChefPinColor, string> = {
  none: 'border-slate-700/80',
  blue: 'border-sky-500 ring-1 ring-sky-500/40',
  red: 'border-rose-500 ring-1 ring-rose-500/40',
  amber: 'border-amber-400 ring-1 ring-amber-400/40',
  purple: 'border-purple-500 ring-1 ring-purple-500/40',
  emerald: 'border-emerald-500 ring-1 ring-emerald-500/40',
}

const CATEGORY_BADGE_STYLES: Record<PlatoCategoria, string> = {
  entrada: 'text-emerald-300 border-emerald-500/30 bg-emerald-950/50',
  principal: 'text-amber-300 border-amber-500/30 bg-amber-950/50',
  postre: 'text-pink-300 border-pink-500/30 bg-pink-950/50',
  refresco: 'text-sky-300 border-sky-500/30 bg-sky-950/50',
}

export function KdsTicketCard({
  comanda,
  nowMs,
  timingConfig,
  stationFilter,
  pinColor = 'none',
  onChangePinColor,
  onToggleItemState,
  onMarkAllItemsReady,
  onCompleteComanda,
  onReopenComanda,
}: KdsTicketCardProps) {
  const [showPinMenu, setShowPinMenu] = useState(false)

  const filteredDetalles =
    stationFilter === 'TODAS'
      ? comanda.detalles
      : comanda.detalles.filter((d) => d.plato.categoria === stationFilter)

  const timer = formatElapsedTimer(
    comanda.fecha_hora_emision,
    nowMs,
    comanda.fecha_hora_listo,
  )
  const urgency = getTicketUrgency(
    timer.elapsedMinutes,
    comanda.listo,
    timingConfig,
  )

  const allItemsReady = areAllItemsTerminados(filteredDetalles)
  const progress = getComandaProgress(filteredDetalles)
  const groupedCategories = groupDetallesByCategoria(filteredDetalles)

  const emissionTimeFormatted = new Date(
    comanda.fecha_hora_emision,
  ).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  })

  // Estilos del encabezado según el semáforo (Videos 1, 2 y 3)
  const headerStyles = {
    normal: 'bg-amber-300 text-slate-950', // Cabecera amarilla clásica estilo Lycaios / Clover
    warning: 'bg-amber-500 text-slate-950', // Alerta intermedia (Approaching delayed)
    delayed: 'bg-rose-600 text-white animate-pulse', // Demorado / Urgente (Clover Red)
    ready: 'bg-emerald-500 text-slate-950', // Terminado (Clover Ready Green)
  }[urgency]

  const OrderTypeIcon =
    comanda.pedido.tipo === 'local'
      ? ForkKnife
      : comanda.pedido.tipo === 'para_llevar'
        ? Bag
        : Moped

  return (
    <article
      aria-label={`Comanda ${comanda.codigo}`}
      className={cn(
        'flex flex-col rounded-xl border-2 bg-slate-900 text-slate-100 shadow-lg transition-all overflow-hidden',
        PIN_BORDER_CLASSES[pinColor],
      )}
    >
      {/* CABECERA DE 2 FILAS (Estilo Lycaios + Clover + TicknCook) */}
      <header className={cn('relative px-3.5 py-2.5 transition-colors', headerStyles)}>
        {/* Fila 1: Código de comanda + Pin cocinero | Mesa / Tipo de pedido */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-base font-extrabold tracking-tight">
              #{comanda.codigo}
            </span>
            {onChangePinColor && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPinMenu((prev) => !prev)}
                  title="Asignar color de cocinero / prioridad (Estilo TicknCook)"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-black/15 hover:bg-black/25 transition"
                >
                  {pinColor === 'none' ? (
                    <Tag className="size-3.5" weight="bold" />
                  ) : (
                    <span
                      className={cn(
                        'size-3 rounded-full border border-white',
                        PIN_COLORS.find((p) => p.id === pinColor)?.dotClass,
                      )}
                    />
                  )}
                </button>
                {showPinMenu && (
                  <div className="absolute left-0 top-7 z-30 flex flex-col gap-1 rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-100 shadow-xl min-w-40">
                    <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Pin de Cocinero
                    </span>
                    {PIN_COLORS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          onChangePinColor(comanda.id, p.id)
                          setShowPinMenu(false)
                        }}
                        className={cn(
                          'flex items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-slate-800',
                          pinColor === p.id && 'bg-slate-800 font-semibold',
                        )}
                      >
                        <span className={cn('size-2.5 rounded-full', p.dotClass)} />
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {comanda.pedido.mesa ? (
              <span className="rounded-md bg-black/20 px-2 py-0.5 text-sm font-extrabold">
                M{comanda.pedido.mesa.numero_mesa}{' '}
                <span className="text-[11px] font-normal opacity-85">
                  ({comanda.pedido.mesa.piso === 'piso_1' ? 'P1' : 'P2'})
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-black/20 px-2 py-0.5 text-xs font-bold uppercase">
                <OrderTypeIcon className="size-3.5" weight="bold" />
                {ORDER_TYPE_LABELS[comanda.pedido.tipo]}
              </span>
            )}
          </div>
        </div>

        {/* Fila 2: Hora de ingreso y Mozo/Cliente | Cronómetro en vivo */}
        <div className="mt-1.5 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2 truncate">
            <span>{emissionTimeFormatted}</span>
            <span className="opacity-60">•</span>
            <span className="inline-flex items-center gap-1 truncate">
              <User className="size-3.5 shrink-0" weight="bold" />
              <span className="truncate">
                {comanda.pedido.nombre_mozo ??
                  comanda.pedido.nombre_cliente_local ??
                  'Mostrador'}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1 font-mono text-sm font-extrabold">
            <Clock className="size-4 shrink-0" weight="bold" />
            <span>{timer.formatted}</span>
          </div>
        </div>
      </header>

      {/* Sub-barra de progreso y tipo de pedido */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 px-3 py-1.5 text-[11px] text-slate-300">
        <div className="flex items-center gap-1.5">
          <OrderTypeIcon className="size-3.5 text-sky-400" weight="duotone" />
          <span className="font-medium">
            {ORDER_TYPE_LABELS[comanda.pedido.tipo]}
          </span>
          {comanda.pedido.nombre_cliente_local && (
            <span className="text-slate-400">
              ({comanda.pedido.nombre_cliente_local})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span
            className={cn(
              'font-bold',
              allItemsReady ? 'text-emerald-400' : 'text-amber-300',
            )}
          >
            {progress.completed}/{progress.total} listos
          </span>
        </div>
      </div>

      {/* CUERPO: LISTA DE PLATILLOS AGRUPADOS POR CATEGORÍA (TicknCook + Lycaios + Clover) */}
      <div className="flex-1 divide-y divide-slate-800/80 overflow-y-auto p-2.5 space-y-2.5">
        {groupedCategories.map((group) => (
          <div key={group.categoria} className="pt-2 first:pt-0">
            {/* Separador de categoría (Tiempos de cocina estilo TicknCook) */}
            <div className="mb-1.5 flex items-center justify-between">
              <span
                className={cn(
                  'rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                  CATEGORY_BADGE_STYLES[group.categoria],
                )}
              >
                {group.label}
              </span>
            </div>

            <div className="space-y-1.5">
              {group.items.map((detalle) => {
                const state = getItemCurrentState(detalle)
                const nextState = getNextItemState(state)
                const isTerminado = state === 'terminado'
                const isEnPrep = state === 'en_preparacion'

                // Formato de notas con viñetas "* MODIFICADOR" como en el Video 1 (Lycaios)
                const noteBullets = detalle.notas
                  ? detalle.notas
                      .split(/[•,\n]/)
                      .map((s) => s.trim())
                      .filter(Boolean)
                  : []

                return (
                  <button
                    key={detalle.id}
                    type="button"
                    onClick={() =>
                      onToggleItemState(comanda.id, detalle, nextState)
                    }
                    className={cn(
                      'w-full rounded-lg border p-2.5 text-left transition-all select-none active:scale-[0.99]',
                      isTerminado
                        ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-100' // Celda en verde claro al tocar (Video 1 Lycaios)
                        : isEnPrep
                          ? 'border-amber-400/60 bg-amber-500/15 text-amber-50'
                          : 'border-slate-800 bg-slate-800/70 text-slate-100 hover:border-slate-700 hover:bg-slate-800',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        {/* Círculo / Check estilo Clover KDS */}
                        <span
                          className={cn(
                            'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors',
                            isTerminado
                              ? 'border-emerald-400 bg-emerald-500 text-slate-950'
                              : isEnPrep
                                ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                                : 'border-slate-500 bg-slate-900/60 text-slate-400',
                          )}
                        >
                          {isTerminado ? (
                            <Check className="size-3.5" weight="bold" />
                          ) : isEnPrep ? (
                            <CookingPot className="size-3.5" weight="fill" />
                          ) : null}
                        </span>

                        <div>
                          <div className="flex flex-wrap items-baseline gap-1.5">
                            <span className="font-mono text-base font-extrabold text-amber-300">
                              x{detalle.cantidad}
                            </span>
                            <span
                              className={cn(
                                'text-sm font-bold uppercase tracking-tight',
                                isTerminado && 'line-through opacity-85',
                              )}
                            >
                              {detalle.plato.nombre}
                            </span>
                          </div>

                          {/* Notas / Modificadores con viñetas (Video 1 Lycaios) */}
                          {noteBullets.length > 0 && (
                            <ul className="mt-1 space-y-0.5 pl-1">
                              {noteBullets.map((note, idx) => (
                                <li
                                  key={idx}
                                  className={cn(
                                    'flex items-center gap-1 text-xs font-semibold',
                                    isTerminado
                                      ? 'text-emerald-200/80'
                                      : 'text-rose-300',
                                  )}
                                >
                                  <WarningCircle
                                    className="size-3.5 shrink-0"
                                    weight="fill"
                                  />
                                  <span>* {note.toUpperCase()}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      {/* Etiqueta de estado del ítem */}
                      <Badge
                        variant="outline"
                        className={cn(
                          'shrink-0 text-[10px] uppercase',
                          isTerminado
                            ? 'border-emerald-400/50 bg-emerald-500/30 text-emerald-200'
                            : isEnPrep
                              ? 'border-amber-400/50 bg-amber-500/30 text-amber-200'
                              : 'border-slate-700 bg-slate-900/80 text-slate-400',
                        )}
                      >
                        {isTerminado
                          ? 'Listo'
                          : isEnPrep
                            ? 'Cocinando'
                            : 'Pendiente'}
                      </Badge>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* PIE DE TARJETA: BOTÓN "TERMINAR" INTELIGENTE (Video 1 Lycaios + Video 2 Clover) */}
      <footer className="border-t border-slate-800 bg-slate-950 p-2.5">
        {!comanda.listo ? (
          <div className="flex flex-col gap-1.5">
            {!allItemsReady && (
              <button
                type="button"
                onClick={() => onMarkAllItemsReady(comanda.id, filteredDetalles)}
                className="w-full rounded-md border border-slate-700 bg-slate-800/90 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                Marcar todos los platillos en verde ({progress.completed}/
                {progress.total})
              </button>
            )}

            <Button
              type="button"
              disabled={!allItemsReady}
              onClick={() => onCompleteComanda(comanda)}
              className={cn(
                'h-11 w-full rounded-lg text-sm font-extrabold uppercase tracking-wider transition-all',
                allItemsReady
                  ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-600/30' // Azul brillante activo como en Lycaios cuando todos están en verde
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed', // Gris deshabilitado mientras falten ítems
              )}
            >
              <CheckCircle className="mr-1.5 size-5" weight="bold" />
              {allItemsReady
                ? 'Terminar Comanda'
                : `Terminar (${progress.completed}/${progress.total} listos)`}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => onReopenComanda(comanda)}
            className="h-10 w-full rounded-lg border-amber-500/50 bg-amber-500/10 text-xs font-bold uppercase text-amber-300 hover:bg-amber-500/20"
          >
            <ArrowCounterClockwise className="mr-1.5 size-4" weight="bold" />
            Reabrir Comanda (Recall)
          </Button>
        )}
      </footer>
    </article>
  )
}
