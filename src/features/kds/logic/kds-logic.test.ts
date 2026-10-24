import { describe, expect, it } from 'vitest'
import {
  areAllItemsTerminados,
  buildInitialDemoComandas,
  calculateAvgPrepTimeMinutes,
  calculateProductionSummary,
  formatElapsedTimer,
  getComandaProgress,
  getItemCurrentState,
  getNextItemState,
  getTicketUrgency,
  groupDetallesByCategoria,
} from './kds-logic'

describe('kds-logic', () => {
  it('cycles item state pendiente -> en_preparacion -> terminado -> pendiente', () => {
    expect(getNextItemState('pendiente')).toBe('en_preparacion')
    expect(getNextItemState('en_preparacion')).toBe('terminado')
    expect(getNextItemState('terminado')).toBe('pendiente')
  })

  it('determines item state from latest movement and checks if all are terminado', () => {
    const demo = buildInitialDemoComandas(Date.now())
    const activeTicket = demo[0]
    expect(getItemCurrentState(activeTicket.detalles[0])).toBe('terminado')
    expect(getItemCurrentState(activeTicket.detalles[1])).toBe('en_preparacion')
    expect(areAllItemsTerminados(activeTicket.detalles)).toBe(false)

    const readyTicket = demo[4]
    expect(areAllItemsTerminados(readyTicket.detalles)).toBe(true)
  })

  it('formats elapsed timer and computes semaphore urgency levels', () => {
    const now = Date.now()
    const eightMinsAgo = new Date(now - (8 * 60 + 15) * 1000).toISOString()
    const timer = formatElapsedTimer(eightMinsAgo, now)
    expect(timer.formatted).toBe('0:08:15')
    expect(timer.elapsedMinutes).toBe(8)

    const config = { warningMinutes: 5, delayedMinutes: 10 }
    expect(getTicketUrgency(2, false, config)).toBe('normal')
    expect(getTicketUrgency(6, false, config)).toBe('warning')
    expect(getTicketUrgency(11, false, config)).toBe('delayed')
    expect(getTicketUrgency(15, true, config)).toBe('ready')
  })

  it('groups items by course category and computes progress and production summary', () => {
    const demo = buildInitialDemoComandas(Date.now())
    const groups = groupDetallesByCategoria(demo[0].detalles)
    expect(groups.map((g) => g.categoria)).toEqual([
      'entrada',
      'principal',
      'refresco',
    ])

    const progress = getComandaProgress(demo[0].detalles)
    expect(progress.completed).toBe(2)
    expect(progress.inPrep).toBe(1)
    expect(progress.total).toBe(3)

    const summary = calculateProductionSummary(demo, 'TODAS')
    expect(summary.length).toBeGreaterThan(0)
    expect(calculateAvgPrepTimeMinutes(demo)).toBe(7)
  })
})
