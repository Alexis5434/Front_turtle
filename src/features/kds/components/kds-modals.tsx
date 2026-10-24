import { useState } from 'react'
import {
  Gear,
  Plus,
  Trash,
  PaperPlaneRight,
  X,
  Clock,
  SquaresFour,
  Columns,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { KdsComanda, PedidoTipo } from '../api/kds-api'
import {
  CATEGORY_LABELS,
  DEMO_MENU_ITEMS,
  ORDER_TYPE_LABELS,
  type KdsLayoutMode,
  type KdsTimingConfig,
  type StationFilter,
} from '../logic/kds-logic'

export interface KdsSettingsModalProps {
  open: boolean
  stationFilter: StationFilter
  timingConfig: KdsTimingConfig
  layoutMode: KdsLayoutMode
  onClose: () => void
  onSave: (settings: {
    stationFilter: StationFilter
    timingConfig: KdsTimingConfig
    layoutMode: KdsLayoutMode
  }) => void
}

const STATION_OPTIONS: Array<{ value: StationFilter; label: string; desc: string }> = [
  {
    value: 'TODAS',
    label: 'COCINA GENERAL (TODAS)',
    desc: 'Muestra todos los platillos y bebidas de cada comanda.',
  },
  {
    value: 'principal',
    label: 'COCINA CALIENTE / PRINCIPAL',
    desc: 'Filtra únicamente platos fuertes (Lomo Saltado, Ají de Gallina, etc.).',
  },
  {
    value: 'entrada',
    label: 'ENTRADAS Y FRÍOS',
    desc: 'Filtra ceviches, causas y entradas frías.',
  },
  {
    value: 'postre',
    label: 'ESTACIÓN DE POSTRES',
    desc: 'Filtra postres y repostería.',
  },
  {
    value: 'refresco',
    label: 'BARRA Y REFRESCOS',
    desc: 'Filtra jarras, bebidas y refrescos.',
  },
]

export function KdsSettingsModal({
  open,
  stationFilter,
  timingConfig,
  layoutMode,
  onClose,
  onSave,
}: KdsSettingsModalProps) {
  const [selectedStation, setSelectedStation] =
    useState<StationFilter>(stationFilter)
  const [warningMin, setWarningMin] = useState(timingConfig.warningMinutes)
  const [delayedMin, setDelayedMin] = useState(timingConfig.delayedMinutes)
  const [selectedLayout, setSelectedLayout] =
    useState<KdsLayoutMode>(layoutMode)

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validWarning = Math.max(1, warningMin)
    const validDelayed = Math.max(validWarning + 1, delayedMin)
    onSave({
      stationFilter: selectedStation,
      timingConfig: {
        warningMinutes: validWarning,
        delayedMinutes: validDelayed,
      },
      layoutMode: selectedLayout,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="kds-settings-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Gear className="size-5 text-sky-400" weight="duotone" />
            <h2 id="kds-settings-title" className="text-lg font-bold">
              Configuración de Comanda y Monitor KDS
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Identificador de Estación (Estilo Lycaios Video 1) */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">
              1. Seleccione el identificador de la estación (Cocina / Barra)
            </label>
            <div className="space-y-1.5">
              {STATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedStation(opt.value)}
                  className={cn(
                    'flex w-full flex-col rounded-lg border px-3 py-2 text-left transition',
                    selectedStation === opt.value
                      ? 'border-sky-500 bg-sky-500/15 text-white'
                      : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700',
                  )}
                >
                  <span className="text-xs font-bold">{opt.label}</span>
                  <span className="text-[11px] text-slate-400">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Semáforo de Tiempos (Ticket Timing estilo Clover KDS Video 2) */}
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Clock className="size-4 text-amber-400" />
              2. Umbrales del Semáforo de Demora (Ticket Timing)
            </label>
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div>
                <label
                  htmlFor="warning-min"
                  className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-300"
                >
                  <span className="size-2.5 rounded-full bg-amber-400" />
                  Alerta Amarilla (min)
                </label>
                <input
                  id="warning-min"
                  type="number"
                  min={1}
                  max={60}
                  value={warningMin}
                  onChange={(e) => setWarningMin(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-sm text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="delayed-min"
                  className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-rose-400"
                >
                  <span className="size-2.5 rounded-full bg-rose-500" />
                  Retrasado Rojo (min)
                </label>
                <input
                  id="delayed-min"
                  type="number"
                  min={2}
                  max={120}
                  value={delayedMin}
                  onChange={(e) => setDelayedMin(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-sm text-white"
                />
              </div>
            </div>
          </div>

          {/* 3. Disposición de Tickets (Ticket Layout estilo Clover KDS) */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">
              3. Disposición de Tickets en Pantalla (Ticket Layout)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedLayout('GRID_10')}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border p-3 text-left transition',
                  selectedLayout === 'GRID_10'
                    ? 'border-sky-500 bg-sky-500/15 text-white'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700',
                )}
              >
                <SquaresFour className="size-6 shrink-0 text-sky-400" />
                <div>
                  <p className="text-xs font-bold">Cuadrícula Clover (2×4)</p>
                  <p className="text-[11px] opacity-80">
                    Casillas fijas con espacios
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedLayout('COLUMNAS')}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border p-3 text-left transition',
                  selectedLayout === 'COLUMNAS'
                    ? 'border-sky-500 bg-sky-500/15 text-white'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700',
                )}
              >
                <Columns className="size-6 shrink-0 text-emerald-400" />
                <div>
                  <p className="text-xs font-bold">Columnas TicknCook</p>
                  <p className="text-[11px] opacity-80">
                    Tarjetas verticales completas
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 font-bold text-white hover:bg-blue-500"
            >
              Guardar Cambios
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export interface KdsSimulatorModalProps {
  open: boolean
  onClose: () => void
  onCreateComanda: (newComanda: KdsComanda) => void
}

interface DraftItem {
  menuItemId: number
  nombre: string
  categoria: (typeof DEMO_MENU_ITEMS)[number]['categoria']
  precio: number
  cantidad: number
  notas: string
}

/**
 * Simulador de Comandas integrado (como al final del video 3 de TicknCook y Video 1 de Lycaios)
 * para enviar un pedido desde comandero/POS y ver cómo entra al instante al KDS.
 */
export function KdsSimulatorModal({
  open,
  onClose,
  onCreateComanda,
}: KdsSimulatorModalProps) {
  const [tipo, setTipo] = useState<PedidoTipo>('local')
  const [numeroMesa, setNumeroMesa] = useState(5)
  const [cliente, setCliente] = useState('Mesa Rápida')
  const [mozo, setMozo] = useState('Carlos Mendoza')
  const [draftItems, setDraftItems] = useState<DraftItem[]>([
    {
      menuItemId: DEMO_MENU_ITEMS[0].id,
      nombre: DEMO_MENU_ITEMS[0].nombre,
      categoria: DEMO_MENU_ITEMS[0].categoria,
      precio: DEMO_MENU_ITEMS[0].precio,
      cantidad: 1,
      notas: 'SIN CEBOLLA',
    },
    {
      menuItemId: DEMO_MENU_ITEMS[2].id,
      nombre: DEMO_MENU_ITEMS[2].nombre,
      categoria: DEMO_MENU_ITEMS[2].categoria,
      precio: DEMO_MENU_ITEMS[2].precio,
      cantidad: 2,
      notas: 'TÉRMINO 3/4',
    },
  ])

  if (!open) return null

  function handleAddDish(dish: (typeof DEMO_MENU_ITEMS)[number]) {
    setDraftItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === dish.id)
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === dish.id ? { ...i, cantidad: i.cantidad + 1 } : i,
        )
      }
      return [
        ...prev,
        {
          menuItemId: dish.id,
          nombre: dish.nombre,
          categoria: dish.categoria,
          precio: dish.precio,
          cantidad: 1,
          notas: '',
        },
      ]
    })
  }

  function handleUpdateNote(menuItemId: number, notas: string) {
    setDraftItems((prev) =>
      prev.map((i) => (i.menuItemId === menuItemId ? { ...i, notas } : i)),
    )
  }

  function handleRemoveItem(menuItemId: number) {
    setDraftItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId))
  }

  function handleSendOrder(e: React.FormEvent) {
    e.preventDefault()
    if (draftItems.length === 0) return

    const now = new Date().toISOString()
    const randomId = Math.floor(200 + Math.random() * 800)
    const newComanda: KdsComanda = {
      id: Date.now(),
      codigo: `COM-0${randomId}`,
      listo: false,
      fecha_hora_emision: now,
      fecha_hora_listo: null,
      id_pedido: randomId,
      pedido: {
        id: randomId,
        codigo: `PED-${randomId}`,
        nombre_cliente_local: cliente.trim() || 'Cliente Local',
        comensales: 2,
        nombre_mozo: mozo.trim() || 'Mozo Turno',
        tipo,
        id_mesa: tipo === 'local' ? numeroMesa : null,
        mesa:
          tipo === 'local'
            ? {
                id: numeroMesa,
                codigo: `M-0${numeroMesa}`,
                numero_mesa: numeroMesa,
                capacidad: 4,
                ocupado: true,
                piso: numeroMesa <= 6 ? 'piso_1' : 'piso_2',
              }
            : null,
      },
      detalles: draftItems.map((item, idx) => ({
        id: Date.now() + idx + 1,
        id_menu_item: item.menuItemId,
        cantidad: item.cantidad,
        notas: item.notas.trim() ? item.notas.trim() : null,
        id_comanda: Date.now(),
        plato: {
          id: item.menuItemId,
          nombre: item.nombre,
          descripcion: '',
          precio: item.precio,
          categoria: item.categoria,
        },
        movimientos: [],
      })),
    }

    onCreateComanda(newComanda)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="kds-sim-title"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 id="kds-sim-title" className="text-lg font-bold text-emerald-400">
              Simulador de Comandero POS → KDS (Estilo TicknCook / Lycaios)
            </h2>
            <p className="text-xs text-slate-400">
              Crea una comanda de prueba y envíala en vivo a la pantalla KDS.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        <form
          onSubmit={handleSendOrder}
          className="grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          {/* Columna izquierda: Configuración del pedido y botones rápidos de platos */}
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-slate-300">
                Tipo de Pedido
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['local', 'para_llevar', 'delivery'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={cn(
                      'rounded-md border py-2 text-xs font-bold transition',
                      tipo === t
                        ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700',
                    )}
                  >
                    {ORDER_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {tipo === 'local' && (
                <div>
                  <label
                    htmlFor="sim-mesa"
                    className="mb-1 block text-xs font-medium text-slate-400"
                  >
                    N° Mesa
                  </label>
                  <input
                    id="sim-mesa"
                    type="number"
                    min={1}
                    max={20}
                    value={numeroMesa}
                    onChange={(e) => setNumeroMesa(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-sm text-white"
                  />
                </div>
              )}
              <div className={tipo === 'local' ? 'col-span-1' : 'col-span-2'}>
                <label
                  htmlFor="sim-cliente"
                  className="mb-1 block text-xs font-medium text-slate-400"
                >
                  Cliente
                </label>
                <input
                  id="sim-cliente"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-sm text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="sim-mozo"
                  className="mb-1 block text-xs font-medium text-slate-400"
                >
                  Mozo
                </label>
                <input
                  id="sim-mozo"
                  value={mozo}
                  onChange={(e) => setMozo(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-slate-300">
                Toca un plato para agregarlo a la comanda
              </label>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {DEMO_MENU_ITEMS.map((dish) => (
                  <button
                    key={dish.id}
                    type="button"
                    onClick={() => handleAddDish(dish)}
                    className="flex items-center justify-between rounded-md border border-emerald-600/40 bg-emerald-600/15 px-2.5 py-2 text-left text-xs font-semibold text-emerald-200 hover:bg-emerald-600/30 transition"
                  >
                    <span className="truncate">{dish.nombre}</span>
                    <Plus className="size-4 shrink-0 text-emerald-400" weight="bold" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Columna derecha: Vista previa del Ticket antes de enviar (Estilo TicknCook) */}
          <div className="flex flex-col rounded-xl border border-slate-700 bg-slate-950 p-4">
            <div className="mb-3 flex items-center justify-between rounded-lg bg-amber-300 px-3 py-2 text-slate-950">
              <span className="font-mono text-sm font-extrabold">
                NUEVA COMANDA
              </span>
              <span className="text-xs font-bold uppercase">
                {tipo === 'local'
                  ? `Mesa ${numeroMesa}`
                  : ORDER_TYPE_LABELS[tipo]}
              </span>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto max-h-64 pr-1">
              {draftItems.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">
                  Agrega al menos un platillo de la lista izquierda.
                </p>
              ) : (
                draftItems.map((item) => (
                  <div
                    key={item.menuItemId}
                    className="rounded-lg border border-slate-800 bg-slate-900 p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-sm font-bold text-amber-300">
                          x{item.cantidad}
                        </span>{' '}
                        <span className="text-xs font-bold uppercase text-white">
                          {item.nombre}
                        </span>
                        <Badge
                          variant="outline"
                          className="ml-2 border-slate-700 text-[9px] text-slate-400"
                        >
                          {CATEGORY_LABELS[item.categoria]}
                        </Badge>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.menuItemId)}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        <Trash className="size-4" />
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Notas para cocina (ej. SIN CEBOLLA, POCO PICANTE)…"
                      value={item.notas}
                      onChange={(e) =>
                        handleUpdateNote(item.menuItemId, e.target.value)
                      }
                      className="mt-2 w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-rose-300 placeholder:text-slate-600"
                    />
                  </div>
                ))
              )}
            </div>

            <Button
              type="submit"
              disabled={draftItems.length === 0}
              className="mt-4 h-11 w-full rounded-lg bg-emerald-600 text-sm font-extrabold uppercase tracking-wider text-white hover:bg-emerald-500"
            >
              <PaperPlaneRight className="mr-1.5 size-4" weight="bold" />
              Ordenar / Enviar a Cocina ({draftItems.length})
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
