import {
  ArrowCounterClockwise,
  Bag,
  CheckCircle,
  Clock,
  CookingPot,
  ForkKnife,
  Moped,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { KdsComanda } from '../api/kds-api'
import {
  formatElapsedTimer,
  getComandaProgress,
  getTicketUrgency,
  ORDER_TYPE_LABELS,
  type KdsTimingConfig,
} from '../logic/kds-logic'

export interface KdsExpoViewProps {
  activeComandas: KdsComanda[]
  readyComandas: KdsComanda[]
  nowMs: number
  timingConfig: KdsTimingConfig
  onCompleteComanda: (comanda: KdsComanda) => void
  onReopenComanda: (comanda: KdsComanda) => void
  onDismissReadyComanda: (comandaId: number) => void
}

/**
 * Vista de Pase / Entrega en 2 Columnas ("Pedidos en Preparación" vs "Pedidos Listos")
 * inspirada en el tercer video (TicknCook KDS Démo).
 */
export function KdsExpoView({
  activeComandas,
  readyComandas,
  nowMs,
  timingConfig,
  onCompleteComanda,
  onReopenComanda,
  onDismissReadyComanda,
}: KdsExpoViewProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* COLUMNA IZQUIERDA: PEDIDOS EN PREPARACIÓN */}
      <section
        aria-labelledby="expo-prep-title"
        className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/80 p-4"
      >
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <CookingPot className="size-5 text-amber-400" weight="duotone" />
            <h2
              id="expo-prep-title"
              className="text-sm font-extrabold uppercase tracking-wider text-amber-300"
            >
              Pedidos en Preparación
            </h2>
          </div>
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40">
            {activeComandas.length} en cocina
          </Badge>
        </div>

        {activeComandas.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-12 text-center text-slate-400">
            <p className="text-sm font-medium">
              No hay pedidos en preparación en este momento.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeComandas.map((comanda) => {
              const progress = getComandaProgress(comanda.detalles)
              const timer = formatElapsedTimer(
                comanda.fecha_hora_emision,
                nowMs,
              )
              const urgency = getTicketUrgency(
                timer.elapsedMinutes,
                false,
                timingConfig,
              )
              const TypeIcon =
                comanda.pedido.tipo === 'local'
                  ? ForkKnife
                  : comanda.pedido.tipo === 'para_llevar'
                    ? Bag
                    : Moped

              return (
                <div
                  key={comanda.id}
                  className={cn(
                    'flex flex-col justify-between gap-3 rounded-lg border p-3.5 transition sm:flex-row sm:items-center',
                    urgency === 'delayed'
                      ? 'border-rose-500/60 bg-rose-950/30 text-rose-100'
                      : urgency === 'warning'
                        ? 'border-amber-400/60 bg-amber-950/30 text-amber-50'
                        : 'border-amber-200/30 bg-amber-100/10 text-slate-100',
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-extrabold text-amber-300">
                        #{comanda.codigo}
                      </span>
                      {comanda.pedido.mesa ? (
                        <Badge className="bg-slate-800 text-white border-slate-700">
                          Mesa {comanda.pedido.mesa.numero_mesa}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-sky-500/40 text-sky-300"
                        >
                          <TypeIcon className="mr-1 size-3" />
                          {ORDER_TYPE_LABELS[comanda.pedido.tipo]}
                        </Badge>
                      )}
                      <span className="text-xs text-slate-300">
                        {comanda.pedido.nombre_cliente_local ??
                          comanda.pedido.nombre_mozo}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">
                      {comanda.detalles
                        .map((d) => `${d.cantidad}x ${d.plato.nombre}`)
                        .join(' • ')}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="text-right font-mono">
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-300">
                        <Clock className="size-3.5" />
                        <span>{timer.formatted}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {progress.completed}/{progress.total} platos listos
                      </span>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => onCompleteComanda(comanda)}
                      className="rounded-md bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-500"
                    >
                      <CheckCircle className="mr-1 size-4" weight="bold" />
                      Pasar a Listo
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* COLUMNA DERECHA: PEDIDOS LISTOS (Estilo TicknCook Verde) */}
      <section
        aria-labelledby="expo-ready-title"
        className="flex flex-col rounded-xl border border-emerald-800/50 bg-slate-900/80 p-4"
      >
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle
              className="size-5 text-emerald-400"
              weight="duotone"
            />
            <h2
              id="expo-ready-title"
              className="text-sm font-extrabold uppercase tracking-wider text-emerald-300"
            >
              Pedidos Listos para Entregar
            </h2>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
            {readyComandas.length} listos
          </Badge>
        </div>

        {readyComandas.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-12 text-center text-slate-400">
            <p className="text-sm font-medium">
              Aún no hay pedidos listos para entregar.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {readyComandas.map((comanda) => {
              const timer = formatElapsedTimer(
                comanda.fecha_hora_emision,
                nowMs,
                comanda.fecha_hora_listo,
              )

              return (
                <div
                  key={comanda.id}
                  className="flex flex-col justify-between gap-3 rounded-lg border border-emerald-500/50 bg-emerald-500/15 p-3.5 text-emerald-50 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-extrabold text-emerald-300">
                        #{comanda.codigo}
                      </span>
                      {comanda.pedido.mesa ? (
                        <Badge className="bg-emerald-600 text-white border-transparent">
                          Mesa {comanda.pedido.mesa.numero_mesa}
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-700 text-white border-transparent">
                          {ORDER_TYPE_LABELS[comanda.pedido.tipo]}
                        </Badge>
                      )}
                      <span className="text-xs text-emerald-200">
                        Mozo: {comanda.pedido.nombre_mozo ?? 'Mostrador'}
                      </span>
                    </div>

                    <p className="text-xs text-emerald-100/90">
                      {comanda.detalles
                        .map((d) => `${d.cantidad}x ${d.plato.nombre}`)
                        .join(' • ')}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <span className="font-mono text-xs font-semibold text-emerald-300 mr-2">
                      Prep: {timer.formatted}
                    </span>

                    <Button
                      size="sm"
                      onClick={() => onDismissReadyComanda(comanda.id)}
                      className="rounded-md bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-500"
                    >
                      Entregado al Cliente
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onReopenComanda(comanda)}
                      title="Devolver a cocina"
                      className="rounded-md bg-rose-600 px-2.5 text-xs font-bold text-white hover:bg-rose-500"
                    >
                      <ArrowCounterClockwise className="size-4" weight="bold" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
