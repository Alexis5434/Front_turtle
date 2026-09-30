import { request } from '@/lib/http/http'
import { validateEnv } from '@/lib/env/env'

const baseUrl = validateEnv().VITE_API_BASE_URL

/** Shape returned by GET /api/tables */
export interface Table {
  id: number
  codigo: string
  numero_mesa: number
  capacidad: number
  ocupado: boolean
  piso: 'piso_1' | 'piso_2'
  created_at: string
  updated_at: string | null
}

/** Fetches all active tables */
export function getTables(token: string): Promise<Table[]> {
  return request<Table[]>('/api/tables', {
    baseUrl,
    headers: { Authorization: `Bearer ${token}` },
  })
}

/** Sets the occupied flag of a table */
export function setTableOcupado(
  tableNumber: number,
  ocupado: boolean,
  token: string,
): Promise<Table> {
  return request<Table>(`/api/tables/${tableNumber}/ocupado`, {
    baseUrl,
    method: 'PATCH',
    body: { ocupado },
    headers: { Authorization: `Bearer ${token}` },
  })
}
