import type { Ticket } from './mock-tickets'
export const FEE_PER_SEAT = 50
export const CREDIT_PER_SEAT = 150
export function canCancel(ticket: Ticket, now = new Date()) { if (ticket.status !== 'CONFIRMED') return false; const travel = new Date(`${ticket.travelDate}T00:00:00`); if (ticket.route.from === 'Pune' && ticket.bookedAt.slice(0, 10) === ticket.travelDate) return false; const cutoff = new Date(travel); cutoff.setDate(cutoff.getDate() - 1); cutoff.setHours(20, 0, 0, 0); return now < cutoff }
export function computeRefund(ticket: Ticket) { return { fee: FEE_PER_SEAT * ticket.fare.seats, credit: CREDIT_PER_SEAT * ticket.fare.seats } }
