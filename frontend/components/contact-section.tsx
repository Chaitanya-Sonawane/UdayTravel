import { ArrowUpRight } from 'lucide-react'

export default function ContactSection() {
  return (
    <footer id="contact" className="contact-section">
      <div className="contact-section-inner">
        <header className="contact-intro">
          <p className="contact-kicker">Contact Uday Travels</p>
          <h2>We&apos;re here<br />to help.</h2>
        </header>

        <address className="contact-address">
          <h3>Visit our office</h3>
          <p>Shop no. 13, Santachaya Apartment,<br />Opposite Kohinoor Maangal Karyalaya,<br />Gulmohar Road, Savedi,<br />Ahilyanagar, Maharashtra 414003</p>
          <a href="https://www.google.com/maps/search/?api=1&query=Shop+no.+13%2C+Santachaya+Apartment%2C+Gulmohar+Road%2C+Savedi%2C+Ahilyanagar%2C+Maharashtra+414003" target="_blank" rel="noreferrer">Open in Google Maps <ArrowUpRight aria-hidden="true" /></a>
        </address>

        <div className="contact-details">
          <h3>Get in touch</h3>
          <a href="tel:+919890066580">+91 9890066580</a>
          <a href="mailto:udaytravels6787@gmail.com">udaytravels6787@gmail.com</a>
          <p>For booking questions, cancellations and journey support.</p>
        </div>
      </div>

      <div className="contact-bottom">
        <nav className="contact-policy-links" aria-label="Travel policy links">
          <a href="#terms">Terms</a>
          <a href="#shipping">Shipping Policy</a>
          <a href="#refund">Cancellation</a>
          <a href="#privacy">Privacy</a>
        </nav>
        <p>© 2026 Uday Travels. All rights reserved.</p>
      </div>
    </footer>
  )
}
