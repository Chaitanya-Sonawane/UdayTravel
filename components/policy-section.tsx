const policies = [
  {
    id: 'terms',
    title: 'Terms of Service',
    answer: 'Please review your route, travel date, passenger details and selected seats before payment. A booking is confirmed after successful payment. Keep your ticket and QR code available for boarding verification.',
  },
  {
    id: 'shipping',
    title: 'Shipping Policy',
    answer: 'Tickets are delivered digitally through WhatsApp and SMS after a booking is confirmed. Each ticket includes a QR code for boarding verification; no physical delivery is required.',
  },
  {
    id: 'refund',
    title: 'Cancellation & Refund Policy',
    answer: 'As per the cancellation policy, the value of a cancelled ticket is retained as travel credit for your next journey.',
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    answer: 'For questions or requests about passenger information associated with a booking, contact our support team at udaytravels6787@gmail.com or +91 9890066580.',
  },
]

export default function PolicySection() {
  return (
    <section id="travel-policies" className="policy-section" aria-labelledby="policy-heading">
      <div className="policy-section-inner">
        <header className="policy-section-intro">
          <p className="policy-section-kicker">Travel policies</p>
          <h2 id="policy-heading">The details,<br />made clear.</h2>
          <p>Quick answers about booking, tickets and cancellations.</p>
        </header>

        <div className="policy-accordion">
          {policies.map((policy, index) => (
            <details className="policy-item" id={policy.id} key={policy.id}>
              <summary className="policy-trigger">
                <span className="policy-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <span className="policy-title">{policy.title}</span>
                <span className="policy-dot" aria-hidden="true" />
              </summary>
              <p className="policy-answer">{policy.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
