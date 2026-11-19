'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, BadgePercent, BusFront, ChevronDown, CircleHelp, CreditCard, Headset, MapPinned, MessageCircle, Phone, Search, Ticket, UserRound, WalletCards, type LucideIcon } from 'lucide-react'

type HelpCategory = 'booking' | 'changes' | 'travel' | 'payments' | 'offers' | 'account' | 'other'
type HelpItem = { question: string; answer: string; category: HelpCategory }

const categories: { id: 'all' | HelpCategory; label: string; icon: LucideIcon }[] = [
  { id: 'all', label: 'All questions', icon: CircleHelp },
  { id: 'booking', label: 'Ticket booking', icon: Ticket },
  { id: 'changes', label: 'Cancellation & refunds', icon: WalletCards },
  { id: 'travel', label: 'Travel & bus issues', icon: BusFront },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'offers', label: 'Offers', icon: BadgePercent },
  { id: 'account', label: 'Account', icon: UserRound },
  { id: 'other', label: 'Other questions', icon: Headset },
]

const questions: HelpItem[] = [
  { category: 'booking', question: 'How much is a ticket between Ahilyanagar and Pune?', answer: 'The fare is a flat ₹200 per seat on our 3+2 air-cushioned coaches. You’ll see the total before you pay, with no hidden surcharges.' },
  { category: 'booking', question: 'Can I choose seats next to my family?', answer: 'Yes. Add all travellers to the same booking and choose their seats together. Family bookings can sit together.' },
  { category: 'booking', question: 'How long are selected seats held?', answer: 'Seats are held temporarily while you complete checkout. If the hold expires before payment, return to the seat map and choose available seats again.' },
  { category: 'changes', question: 'Can I cancel my ticket?', answer: 'You can request a cancellation from your digital ticket when the route rules allow it. Check the cancellation terms shown with your booking before confirming.' },
  { category: 'changes', question: 'How are eligible cancellations refunded?', answer: 'The value of a cancelled ticket is retained as Uday Travels credit for a future journey, according to the cancellation policy.' },
  { category: 'travel', question: 'Where can I find my pickup and drop-off points?', answer: 'Your e-ticket shows your selected pickup and drop-off locations, timings, and directions. Ahilyanagar pickup hubs include Ekvira Chowk, Delhigate, Nepti Naka, and Ambika Nagar; Pune drop-offs include Wakadewadi, Yerwada, Viman Nagar, Kharadi Bypass, and Wagholi.' },
  { category: 'travel', question: 'When can I track my bus?', answer: 'Live GPS tracking is available for eligible services from 60 minutes before departure. Open the tracking link on your ticket or use the Track page with your ticket details.' },
  { category: 'travel', question: 'What should I bring for boarding?', answer: 'Arrive at your pickup point at least 15 minutes before departure. Keep your digital ticket and a matching government photo ID ready. Up to 15 kg of personal luggage is permitted per traveller; hazardous materials are not allowed.' },
  { category: 'payments', question: 'What should I do if payment is pending?', answer: 'Please wait for the payment status to update before trying again. If money was debited but your booking is not confirmed, contact our support team with your payment reference so we can check it.' },
  { category: 'offers', question: 'Where can I find current offers?', answer: 'Any eligible offer will be shown during booking or checkout. Check the final fare before you pay to see whether a discount has been applied.' },
  { category: 'account', question: 'How do I find my ticket again?', answer: 'Open Bookings from the main menu and look up your trip using the booking details supplied when you booked.' },
  { category: 'other', question: 'How can I contact Uday Travels?', answer: 'Call or WhatsApp our support team at +91 98900 66580, or email udaytravels6787@gmail.com. We’re here to help with booking questions and journey updates.' },
]

export default function HelpCenter() {
  const [category, setCategory] = useState<'all' | HelpCategory>('all')
  const [query, setQuery] = useState('')
  const [openQuestion, setOpenQuestion] = useState(questions[0]?.question ?? '')
  const [showMobileTopics, setShowMobileTopics] = useState(false)

  const filteredQuestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return questions.filter((item) => {
      const matchesCategory = normalizedQuery.length > 0 || category === 'all' || item.category === category
      const matchesQuery = !normalizedQuery || `${item.question} ${item.answer}`.toLowerCase().includes(normalizedQuery)
      return matchesCategory && matchesQuery
    })
  }, [category, query])
  const activeCategory = categories.find((item) => item.id === category)?.label ?? 'All questions'
  const activeCategoryItem = categories.find((item) => item.id === category) ?? categories[0]
  const ActiveCategoryIcon = activeCategoryItem?.icon ?? CircleHelp

  const handleCategorySelect = (id: 'all' | HelpCategory) => {
    setCategory(id)
    setQuery('')
    setOpenQuestion(questions.find((item) => id === 'all' || item.category === id)?.question ?? '')
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      document.getElementById('faq-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <main className="help-page">
      <header className="help-header">
        <Link href="/" className="help-brand" aria-label="Uday Travels home"><span className="help-brand-mark">UT</span><span>UDAY TRAVELS</span></Link>
        <Link href="/availability" className="help-book-link">Plan a trip <ArrowUpRight size={15} aria-hidden="true" /></Link>
      </header>

      <section className="help-hero-band">
        <div className="help-hero-copy">
          <p className="help-kicker"><span /> UDAY TRAVELS · TRAVELLER SUPPORT</p>
          <h1>Good journeys<br />start with <em>good answers.</em></h1>
          <p>Quick help for every part of your trip, from picking a seat to reaching your destination.</p>
          <a href="tel:+919890066580" className="help-hero-phone"><Phone size={16} aria-hidden="true" /><span><small>NEED A PERSON?</small><strong>Call +91 98900 66580</strong></span><ArrowRight size={17} aria-hidden="true" /></a>
        </div>
        <div className="help-hero-art" aria-hidden="true"><span className="help-sun" /><span className="help-orbit help-orbit-one" /><span className="help-orbit help-orbit-two" /><span className="help-art-label">ON THE<br />ROAD, WITH YOU</span><BusFront className="help-art-bus" strokeWidth={1.2} /><span className="help-art-route"><i /> AHILYANAGAR <b>→</b> PUNE <i /></span></div>
      </section>

      <section className="help-workspace" aria-labelledby="faq-title">
        <aside className="help-sidebar">
          <div className="help-sidebar-heading"><span>SUPPORT MENU</span><strong>What can we help with?</strong></div>
          <nav aria-label="Help topics" className="help-category-list">
            {categories.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" className={`help-category ${category === id && !query ? 'active' : ''}`} onClick={() => handleCategorySelect(id)} aria-pressed={category === id && !query}>
                <Icon size={18} aria-hidden="true" /><span>{label}</span><ArrowRight className="help-category-arrow" size={16} aria-hidden="true" />
              </button>
            ))}
          </nav>
          <div className="help-sidebar-note"><span className="help-online-dot" /><span><strong>Real people, ready to help</strong><small>Call or message us any time</small><a href="https://wa.me/919890066580" target="_blank" rel="noreferrer"><MessageCircle size={14} aria-hidden="true" /> Chat on WhatsApp</a></span></div>
        </aside>

        <div className="help-faq-panel">
          <div className="help-faq-heading">
            <div><p className="help-kicker">ANSWERS FOR THE ROAD AHEAD</p><h2 id="faq-title">Frequently asked<br className="help-title-break" /> questions<span>.</span></h2></div>
            <div className="help-support-stamp"><Headset size={21} aria-hidden="true" /><span>Uday support<small>Always in your corner</small></span></div>
          </div>

          {/* MOBILE TOPIC SELECTOR */}
          <div className="help-mobile-topic-bar">
            <div className="help-mobile-topic-header">
              <span className="help-mobile-topic-kicker">SUPPORT TOPIC</span>
              <button 
                type="button" 
                className="help-mobile-topic-toggle"
                onClick={() => setShowMobileTopics(!showMobileTopics)}
                aria-expanded={showMobileTopics}
              >
                {showMobileTopics ? 'Close topics' : 'View all topics (8)'}
              </button>
            </div>
            
            <div className="help-mobile-select-wrap">
              <ActiveCategoryIcon size={18} className="help-mobile-select-icon" aria-hidden="true" />
              <select
                id="help-mobile-category-select"
                value={category}
                onChange={(event) => {
                  handleCategorySelect(event.target.value as any)
                  setShowMobileTopics(false)
                }}
                className="help-mobile-select"
                aria-label="Filter questions by topic"
              >
                {categories.map(({ id, label }) => {
                  const count = id === 'all' ? questions.length : questions.filter(q => q.category === id).length
                  return (
                    <option key={id} value={id}>
                      {label} ({count} answers)
                    </option>
                  )
                })}
              </select>
              <ChevronDown size={16} className="help-mobile-chevron" aria-hidden="true" />
            </div>

            {showMobileTopics && (
              <div className="help-mobile-topics-grid">
                {categories.map(({ id, label, icon: Icon }) => {
                  const isSelected = category === id && !query
                  const count = id === 'all' ? questions.length : questions.filter(q => q.category === id).length
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`help-mobile-grid-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        handleCategorySelect(id)
                        setShowMobileTopics(false)
                      }}
                    >
                      <Icon size={16} aria-hidden="true" />
                      <span className="help-mobile-grid-label">{label}</span>
                      <span className="help-mobile-grid-count">{count}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <label className="help-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Search help questions</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search for an answer..." /></label>
          <div className="help-list-heading"><span>{query ? 'SEARCH RESULTS' : activeCategory.toUpperCase()}</span><span>{String(filteredQuestions.length).padStart(2, '0')} ANSWERS</span></div>
          <div className="help-faq-list">
            {filteredQuestions.length ? filteredQuestions.map((item) => {
              const isOpen = openQuestion === item.question
              const number = String(questions.indexOf(item) + 1).padStart(2, '0')
              const answerId = `help-answer-${number}`
              return <article className={`help-faq-row ${isOpen ? 'open' : ''}`} key={item.question}>
                <span className="help-faq-number">{number}</span>
                <div className="help-faq-body">
                  <button type="button" className="help-faq-question" aria-expanded={isOpen} aria-controls={answerId} onClick={() => setOpenQuestion(isOpen ? '' : item.question)}><span>{item.question}</span><i aria-hidden="true" /></button>
                  <div className="help-faq-answer" id={answerId} hidden={!isOpen}><p>{item.answer}</p></div>
                </div>
              </article>
            }) : <div className="help-empty"><CircleHelp size={24} aria-hidden="true" /><strong>No matching answers yet</strong><p>Try another search or reach our support team directly.</p><a href="tel:+919890066580">Call support</a></div>}
          </div>
          <div className="help-bottom-note">
            <span>Still need a hand?</span>
            <div className="help-bottom-links">
              <a href="https://wa.me/919890066580" target="_blank" rel="noreferrer" className="help-bottom-wa">
                <MessageCircle size={14} aria-hidden="true" /> Chat on WhatsApp
              </a>
              <a href="tel:+919890066580" className="help-bottom-phone">
                <Phone size={14} aria-hidden="true" /> Call support
              </a>
              <a href="mailto:udaytravels6787@gmail.com" className="help-bottom-mail">
                Email team <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="help-footer"><span>© 2026 Uday Travels</span><span>MADE FOR THE ROAD AHEAD</span><Link href="/">Back home <ArrowLeft size={14} aria-hidden="true" /></Link></footer>
    </main>
  )
}
