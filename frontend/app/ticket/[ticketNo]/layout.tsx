import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Uday Travels eTicket', robots: { index: false, follow: false } }

export default function TicketLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children }
