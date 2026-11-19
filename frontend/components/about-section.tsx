'use client'

import { useState } from 'react'

const aboutTopics = [
  {
    question: 'What does Uday Travels do?',
    answer: 'Uday Travels provides reliable, convenient and affordable bus transportation between Ahilyanagar and Pune. We serve students, working professionals, families and business travellers with comfort and an easier journey in mind.',
  },
  {
    question: 'What pick-up and drop-off locations do you serve?',
    answer: 'We connect 20 pick-up points across Ahilyanagar, including Ekvira Chowk, Delhigate, Nepti Naka and Ambika Nagar, with 12 drop-off locations across Pune, including Wakadewadi, Yerwada, Viman Nagar, Kharadi Bye Pass and Wagholi.',
  },
  {
    question: 'How much does a ticket cost?',
    answer: 'Seats on our 3+2 coaches have a flat fare of ₹200 each. You will see the fare before payment, with no unnecessary complications.',
  },
  {
    question: 'What seating arrangements do you offer?',
    answer: 'Women are seated alongside women and men alongside men. Families can book seats together, and every passenger receives an individual seat number. Choose available seats online; selected seats are held temporarily during payment.',
  },
  {
    question: 'How do I book a journey?',
    answer: 'Browse available buses, choose your route and date, select your seats, and complete payment online. Your confirmed ticket is sent through WhatsApp and SMS with a QR code for boarding verification.',
  },
  {
    question: 'How can I contact the support team?',
    answer: 'Call us at +91 98900 66580 or email udaytravels6787@gmail.com for booking questions and journey support.',
  },
  {
    question: 'What happens if I cancel my ticket?',
    answer: 'Under our cancellation policy, the value of a cancelled ticket is retained as travel credit for your next journey.',
  },
]

export default function AboutSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(1)

  return (
    <section id="about-us" className="about-section" aria-labelledby="about-heading">
      <div className="about-section-inner">
        <header className="about-section-intro">
          <p className="about-section-kicker">About Uday Travels</p>
          <h2 id="about-heading">A simpler way<br />to travel.</h2>
          <p>Thoughtful journeys between Ahilyanagar and Pune, with the details that make travel easier.</p>
        </header>

        <div className="about-accordion" aria-label="About Uday Travels">
          {aboutTopics.map((topic, index) => {
            const isOpen = openIndex === index
            const answerId = `about-answer-${index + 1}`

            return (
              <article className={`about-faq-item${isOpen ? ' is-open' : ''}`} key={topic.question}>
                <span className="about-faq-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <div className="about-faq-content">
                  <button
                    className="about-faq-trigger"
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                  >
                    <span>{topic.question}</span>
                    <span className="about-faq-dot" aria-hidden="true" />
                  </button>
                  <div className="about-faq-answer" id={answerId} hidden={!isOpen}>
                    <p>{topic.answer}</p>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
