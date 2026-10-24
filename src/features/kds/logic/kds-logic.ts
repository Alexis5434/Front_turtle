import type {
  KdsComanda,
  KdsDetalleComanda,
  MovimientoEstado,
  PedidoTipo,
  PlatoCategoria,
} from '../api/kds-api'

export type StationFilter = 'TODAS' | PlatoCategoria
export type OrderTypeFilter = 'TODOS' | PedidoTipo
export type KdsViewMode = 'COCINA' | 'PASE' | 'TERMINADAS'
export type KdsLayoutMode = 'GRID_10' | 'COLUMNAS'
export type TicketUrgency = 'normal' | 'warning' | 'delayed' | 'ready'
export type ChefPinColor = 'none' | 'blue' | 'red' | 'amber' | 'purple' | 'emerald'

export interface KdsTimingConfig {
  warningMinutes: number
  delayedMinutes: number
}

export interface ProductionSummaryItem {
  menuItemId: number
  nombre: string
  categoria: PlatoCategoria
  pendingQuantity: number
  inPrepQuantity: number
}

const CATEGORY_ORDER: PlatoCategoria[] = [
  'entrada',
  'principal',
  'postre',
  'refresco',
]

export const CATEGORY_LABELS: Record<PlatoCategoria, string> = {
  entrada: 'Entradas y Fríos',
  principal: 'Cocina Principal',
  postre: 'Postres',
  refresco: 'Barra y Refrescos',
}

export const ORDER_TYPE_LABELS: Record<PedidoTipo, string> = {
  local: 'En Salón',
  para_llevar: 'Para Llevar',
  delivery: 'Delivery',
}

/**
 * Obtiene el estado actual de un ítem de comanda según su último movimiento de cocina.
 */
export function getItemCurrentState(
  detalle: KdsDetalleComanda,
): MovimientoEstado {
  if (!detalle.movimientos || detalle.movimientos.length === 0) {
    return 'pendiente'
  }
  const sorted = [...detalle.movimientos].sort((a, b) => {
    const timeDiff =
      new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime()
    return timeDiff !== 0 ? timeDiff : b.id - a.id
  })
  return sorted[0].estado_platillo
}

/**
 * Determina el siguiente estado al tocar un platillo en la tarjeta KDS.
 * Ciclo: pendiente -> en_preparacion -> terminado -> pendiente
 */
export function getNextItemState(current: MovimientoEstado): MovimientoEstado {
  if (current === 'pendiente') return 'en_preparacion'
  if (current === 'en_preparacion') return 'terminado'
  return 'pendiente'
}

/**
 * Verifica si todos los ítems visibles de la comanda están marcados como 'terminado'.
 * (Regla de validación del Video 1 Lycaios y Video 2 Clover KDS).
 */
export function areAllItemsTerminados(detalles: KdsDetalleComanda[]): boolean {
  if (detalles.length === 0) return false
  return detalles.every((d) => getItemCurrentState(d) === 'terminado')
}

/**
 * Calcula el progreso de ítems terminados en una comanda.
 */
export function getComandaProgress(detalles: KdsDetalleComanda[]): {
  completed: number
  inPrep: number
  total: number
  percent: number
} {
  const total = detalles.length
  if (total === 0) {
    return { completed: 0, inPrep: 0, total: 0, percent: 0 }
  }
  let completed = 0
  let inPrep = 0
  for (const d of detalles) {
    const st = getItemCurrentState(d)
    if (st === 'terminado') completed++
    else if (st === 'en_preparacion') inPrep++
  }
  return {
    completed,
    inPrep,
    total,
    percent: Math.round((completed / total) * 100),
  }
}

/**
 * Formatea el cronómetro en formato H:MM:SS como en el monitor KDS (ej. 0:04:12).
 */
export function formatElapsedTimer(
  emisionIso: string,
  nowMs: number,
  listoIso?: string | null,
): {
  formatted: string
  elapsedMinutes: number
  elapsedSeconds: number
} {
  const startMs = new Date(emisionIso).getTime()
  const endMs = listoIso ? new Date(listoIso).getTime() : nowMs
  const totalSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const formatted = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return {
    formatted,
    elapsedMinutes: Math.floor(totalSeconds / 60),
    elapsedSeconds: totalSeconds,
  }
}

/**
 * Determina el nivel de urgencia (semáforo Clover KDS / TicknCook) según los minutos transcurridos.
 */
export function getTicketUrgency(
  elapsedMinutes: number,
  listo: boolean,
  config: KdsTimingConfig,
): TicketUrgency {
  if (listo) return 'ready'
  if (elapsedMinutes >= config.delayedMinutes) return 'delayed'
  if (elapsedMinutes >= config.warningMinutes) return 'warning'
  return 'normal'
}

/**
 * Agrupa los platillos de una comanda por su categoría (Entradas, Principales, Postres, Refrescos)
 * como en TicknCook KDS (Video 3).
 */
export function groupDetallesByCategoria(
  detalles: KdsDetalleComanda[],
): Array<{ categoria: PlatoCategoria; label: string; items: KdsDetalleComanda[] }> {
  const groups: Array<{
    categoria: PlatoCategoria
    label: string
    items: KdsDetalleComanda[]
  }> = []

  for (const cat of CATEGORY_ORDER) {
    const items = detalles.filter((d) => d.plato.categoria === cat)
    if (items.length > 0) {
      groups.push({
        categoria: cat,
        label: CATEGORY_LABELS[cat],
        items,
      })
    }
  }

  return groups
}

/**
 * Calcula el resumen total de producción de platos pendientes y en preparación
 * (Barra inferior de producción estilo TicknCook).
 */
export function calculateProductionSummary(
  comandas: KdsComanda[],
  stationFilter: StationFilter = 'TODAS',
): ProductionSummaryItem[] {
  const map = new Map<number, ProductionSummaryItem>()

  for (const comanda of comandas) {
    if (comanda.listo) continue
    for (const detalle of comanda.detalles) {
      if (
        stationFilter !== 'TODAS' &&
        detalle.plato.categoria !== stationFilter
      ) {
        continue
      }
      const state = getItemCurrentState(detalle)
      if (state === 'terminado') continue

      const existing = map.get(detalle.plato.id) ?? {
        menuItemId: detalle.plato.id,
        nombre: detalle.plato.nombre,
        categoria: detalle.plato.categoria,
        pendingQuantity: 0,
        inPrepQuantity: 0,
      }

      if (state === 'pendiente') {
        existing.pendingQuantity += detalle.cantidad
      } else if (state === 'en_preparacion') {
        existing.inPrepQuantity += detalle.cantidad
      }

      map.set(detalle.plato.id, existing)
    }
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      b.pendingQuantity +
      b.inPrepQuantity -
      (a.pendingQuantity + a.inPrepQuantity),
  )
}

/**
 * Calcula el tiempo promedio de preparación (en minutos) de las comandas terminadas
 * (Métrica "Avg prep time" de Clover KDS).
 */
export function calculateAvgPrepTimeMinutes(comandas: KdsComanda[]): number {
  const completed = comandas.filter(
    (c) => c.listo && c.fecha_hora_listo && c.fecha_hora_emision,
  )
  if (completed.length === 0) return 4

  const totalMinutes = completed.reduce((acc, c) => {
    const diffMs =
      new Date(c.fecha_hora_listo!).getTime() -
      new Date(c.fecha_hora_emision).getTime()
    return acc + Math.max(1, Math.round(diffMs / 60_000))
  }, 0)

  return Math.round(totalMinutes / completed.length)
}

/**
 * Catálogo base de platos del menú de TP TURTLE para el simulador de comandas y modo demo.
 */
export const DEMO_MENU_ITEMS = [
  {
    id: 1,
    nombre: 'Ceviche Clásico',
    descripcion: 'Pescado del día con limón sutil, choclo y camote glaseado',
    precio: 38,
    categoria: 'entrada' as PlatoCategoria,
  },
  {
    id: 2,
    nombre: 'Causa Limeña de Pollo',
    descripcion: 'Papa amarilla prensada con ají amarillo, palta y pollo',
    precio: 24,
    categoria: 'entrada' as PlatoCategoria,
  },
  {
    id: 3,
    nombre: 'Lomo Saltado Tradicional',
    descripcion: 'Lomo fino salteado al wok con cebolla, tomate y papas nativas',
    precio: 45,
    categoria: 'principal' as PlatoCategoria,
  },
  {
    id: 4,
    nombre: 'Ají de Gallina',
    descripcion: 'Pechuga deshilachada en crema de ají amarillo y pecanas',
    precio: 36,
    categoria: 'principal' as PlatoCategoria,
  },
  {
    id: 5,
    nombre: 'Arroz con Mariscos',
    descripcion: 'Arroz cremoso al coral con mariscos de estación y sarsa criolla',
    precio: 42,
    categoria: 'principal' as PlatoCategoria,
  },
  {
    id: 6,
    nombre: 'Suspiro a la Limeña',
    descripcion: 'Manjar de yemas con merengue al oporto y canela',
    precio: 18,
    categoria: 'postre' as PlatoCategoria,
  },
  {
    id: 7,
    nombre: 'Picarones con Miel de Chancaca',
    descripcion: 'Anillos de zapallo y camote recién fritos con miel de hoja de higo',
    precio: 16,
    categoria: 'postre' as PlatoCategoria,
  },
  {
    id: 8,
    nombre: 'Jarra de Chicha Morada 1L',
    descripcion: 'Maíz morado hervido con piña, membrillo, canela y clavo',
    precio: 18,
    categoria: 'refresco' as PlatoCategoria,
  },
  {
    id: 9,
    nombre: 'Limonada Frozen',
    descripcion: 'Limón sutil frappeado con hierbabuena fresca',
    precio: 14,
    categoria: 'refresco' as PlatoCategoria,
  },
]

/**
 * Construye comandas iniciales realistas para demostración interactiva.
 */
export function buildInitialDemoComandas(nowMs = Date.now()): KdsComanda[] {
  const minAgo = (m: number) => new Date(nowMs - m * 60_000).toISOString()

  return [
    {
      id: 101,
      codigo: 'COM-0022',
      listo: false,
      fecha_hora_emision: minAgo(12), // En estado retrasado (Rojo) si delayedMinutes <= 10
      fecha_hora_listo: null,
      id_pedido: 501,
      pedido: {
        id: 501,
        codigo: 'PED-501',
        nombre_cliente_local: 'Familia Rojas',
        comensales: 4,
        nombre_mozo: 'Carlos Mendoza',
        tipo: 'local',
        id_mesa: 1,
        mesa: {
          id: 1,
          codigo: 'M-01',
          numero_mesa: 1,
          capacidad: 4,
          ocupado: true,
          piso: 'piso_1',
        },
      },
      detalles: [
        {
          id: 1001,
          id_menu_item: 1,
          cantidad: 2,
          notas: 'SIN CULANTRO • 1 POCO PICANTE',
          id_comanda: 101,
          plato: DEMO_MENU_ITEMS[0],
          movimientos: [
            {
              id: 1,
              fecha_hora: minAgo(6),
              estado_platillo: 'terminado',
              cantidad: 2,
              id_detalle_comanda: 1001,
            },
          ],
        },
        {
          id: 1002,
          id_menu_item: 3,
          cantidad: 2,
          notas: 'TÉRMINO MEDIO • PAPAS BIEN DORADAS',
          id_comanda: 101,
          plato: DEMO_MENU_ITEMS[2],
          movimientos: [
            {
              id: 2,
              fecha_hora: minAgo(4),
              estado_platillo: 'en_preparacion',
              cantidad: 2,
              id_detalle_comanda: 1002,
            },
          ],
        },
        {
          id: 1003,
          id_menu_item: 8,
          cantidad: 1,
          notas: 'POCO HIELO',
          id_comanda: 101,
          plato: DEMO_MENU_ITEMS[7],
          movimientos: [
            {
              id: 3,
              fecha_hora: minAgo(8),
              estado_platillo: 'terminado',
              cantidad: 1,
              id_detalle_comanda: 1003,
            },
          ],
        },
      ],
    },
    {
      id: 102,
      codigo: 'COM-0023',
      listo: false,
      fecha_hora_emision: minAgo(6), // En alerta amarilla (Approaching delayed)
      fecha_hora_listo: null,
      id_pedido: 502,
      pedido: {
        id: 502,
        codigo: 'PED-502',
        nombre_cliente_local: 'Lucía Paredes',
        comensales: 2,
        nombre_mozo: 'Ana Torres',
        tipo: 'local',
        id_mesa: 4,
        mesa: {
          id: 4,
          codigo: 'M-04',
          numero_mesa: 4,
          capacidad: 2,
          ocupado: true,
          piso: 'piso_1',
        },
      },
      detalles: [
        {
          id: 1004,
          id_menu_item: 2,
          cantidad: 1,
          notas: null,
          id_comanda: 102,
          plato: DEMO_MENU_ITEMS[1],
          movimientos: [
            {
              id: 4,
              fecha_hora: minAgo(2),
              estado_platillo: 'terminado',
              cantidad: 1,
              id_detalle_comanda: 1004,
            },
          ],
        },
        {
          id: 1005,
          id_menu_item: 5,
          cantidad: 1,
          notas: 'ALERGIA A CAMARONES (SOLO CONCHAS Y CALAMAR)',
          id_comanda: 102,
          plato: DEMO_MENU_ITEMS[4],
          movimientos: [],
        },
        {
          id: 1006,
          id_menu_item: 9,
          cantidad: 2,
          notas: 'SIN AZÚCAR (ENDULZAR CON STEVIA)',
          id_comanda: 102,
          plato: DEMO_MENU_ITEMS[8],
          movimientos: [],
        },
      ],
    },
    {
      id: 103,
      codigo: 'COM-0024',
      listo: false,
      fecha_hora_emision: minAgo(2), // En tiempo (Normal)
      fecha_hora_listo: null,
      id_pedido: 503,
      pedido: {
        id: 503,
        codigo: 'PED-503',
        nombre_cliente_local: 'Diego Vargas',
        comensales: 1,
        nombre_mozo: 'Carlos Mendoza',
        tipo: 'para_llevar',
        id_mesa: null,
        mesa: null,
      },
      detalles: [
        {
          id: 1007,
          id_menu_item: 3,
          cantidad: 1,
          notas: 'EMPAQUE PARA LLEVAR • AJÍ APARTE',
          id_comanda: 103,
          plato: DEMO_MENU_ITEMS[2],
          movimientos: [],
        },
        {
          id: 1008,
          id_menu_item: 7,
          cantidad: 1,
          notas: 'MIEL EN ENVASE SEPARADO',
          id_comanda: 103,
          plato: DEMO_MENU_ITEMS[6],
          movimientos: [],
        },
      ],
    },
    {
      id: 104,
      codigo: 'COM-0025',
      listo: false,
      fecha_hora_emision: minAgo(1), // Recién ingresada
      fecha_hora_listo: null,
      id_pedido: 504,
      pedido: {
        id: 504,
        codigo: 'PED-504',
        nombre_cliente_local: 'Valeria Gómez',
        comensales: 3,
        nombre_mozo: 'Pedro Salazar',
        tipo: 'delivery',
        id_mesa: null,
        mesa: null,
      },
      detalles: [
        {
          id: 1009,
          id_menu_item: 1,
          cantidad: 1,
          notas: 'EXTRA CANCHITA Y CHOCLO',
          id_comanda: 104,
          plato: DEMO_MENU_ITEMS[0],
          movimientos: [],
        },
        {
          id: 1010,
          id_menu_item: 4,
          cantidad: 2,
          notas: 'SIN ACEITUNA',
          id_comanda: 104,
          plato: DEMO_MENU_ITEMS[3],
          movimientos: [],
        },
        {
          id: 1011,
          id_menu_item: 6,
          cantidad: 2,
          notas: null,
          id_comanda: 104,
          plato: DEMO_MENU_ITEMS[5],
          movimientos: [],
        },
      ],
    },
    {
      id: 100,
      codigo: 'COM-0021',
      listo: true,
      fecha_hora_emision: minAgo(22),
      fecha_hora_listo: minAgo(15), // Tardó 7 min
      id_pedido: 500,
      pedido: {
        id: 500,
        codigo: 'PED-500',
        nombre_cliente_local: 'Jorge Ramírez',
        comensales: 2,
        nombre_mozo: 'Ana Torres',
        tipo: 'local',
        id_mesa: 2,
        mesa: {
          id: 2,
          codigo: 'M-02',
          numero_mesa: 2,
          capacidad: 2,
          ocupado: true,
          piso: 'piso_2',
        },
      },
      detalles: [
        {
          id: 1000,
          id_menu_item: 4,
          cantidad: 2,
          notas: null,
          id_comanda: 100,
          plato: DEMO_MENU_ITEMS[3],
          movimientos: [
            {
              id: 10,
              fecha_hora: minAgo(15),
              estado_platillo: 'terminado',
              cantidad: 2,
              id_detalle_comanda: 1000,
            },
          ],
        },
      ],
    },
  ]
}
