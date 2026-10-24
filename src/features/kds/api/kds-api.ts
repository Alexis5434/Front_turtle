import { request } from '@/lib/http/http'
import { validateEnv } from '@/lib/env/env'

const baseUrl = validateEnv().VITE_API_BASE_URL

export type PedidoTipo = 'local' | 'para_llevar' | 'delivery'
export type PlatoCategoria = 'entrada' | 'principal' | 'postre' | 'refresco'
export type MovimientoEstado = 'pendiente' | 'en_preparacion' | 'terminado'
export type MesaPiso = 'piso_1' | 'piso_2'

export interface KdsPlato {
  id: number
  nombre: string
  descripcion: string
  precio: string | number
  categoria: PlatoCategoria
  imagen_url?: string | null
  codigo?: string | null
}

export interface KdsMovimientoCocina {
  id: number
  fecha_hora: string
  estado_platillo: MovimientoEstado
  cantidad: number
  id_detalle_comanda: number
}

export interface KdsDetalleComanda {
  id: number
  id_menu_item: number
  cantidad: number
  notas: string | null
  id_comanda: number
  plato: KdsPlato
  movimientos: KdsMovimientoCocina[]
}

export interface KdsMesa {
  id: number
  codigo: string
  numero_mesa: number
  capacidad: number
  ocupado: boolean
  piso: MesaPiso
}

export interface KdsPedido {
  id: number
  codigo: string
  nombre_cliente_local: string | null
  comensales: number | null
  nombre_mozo: string | null
  tipo: PedidoTipo
  id_mesa: number | null
  mesa: KdsMesa | null
}

export interface KdsComanda {
  id: number
  codigo: string
  listo: boolean
  fecha_hora_emision: string
  fecha_hora_listo: string | null
  id_pedido: number
  pedido: KdsPedido
  detalles: KdsDetalleComanda[]
}

export interface CreateKitchenMovementInput {
  itemId: number
  estado: MovimientoEstado
  quantity: number
}

export interface UpdateComandaListoInput {
  comandaId: number
  listo: boolean
}

/** Obtiene todas las comandas desde GET /api/comandas */
export function getComandas(token: string): Promise<KdsComanda[]> {
  return request<KdsComanda[]>('/api/comandas', {
    baseUrl,
    headers: { Authorization: `Bearer ${token}` },
  })
}

/** Registra un movimiento de cocina en POST /api/comandas/items/:itemId/movements */
export function createKitchenMovement(
  token: string,
  input: CreateKitchenMovementInput,
): Promise<KdsMovimientoCocina> {
  return request<KdsMovimientoCocina>(
    `/api/comandas/items/${input.itemId}/movements`,
    {
      baseUrl,
      method: 'POST',
      body: {
        estado: input.estado,
        quantity: input.quantity,
      },
      headers: { Authorization: `Bearer ${token}` },
    },
  )
}

/** Actualiza el estado listo de la comanda en PATCH /api/comandas/:id */
export function updateComandaListo(
  token: string,
  input: UpdateComandaListoInput,
): Promise<KdsComanda> {
  return request<KdsComanda>(`/api/comandas/${input.comandaId}`, {
    baseUrl,
    method: 'PATCH',
    body: { listo: input.listo },
    headers: { Authorization: `Bearer ${token}` },
  })
}
